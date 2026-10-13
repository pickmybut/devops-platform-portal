"""
GitHub platform service.

File upload — single commit via git/trees + git/commits:

  1. Create repo (auto_init=True).
  2. Wait for GitHub's git backend to initialise (typically 10-45 seconds
     after creation; we retry every 15 s up to 90 s total).
  3. POST /git/trees with ALL files in content= mode — GitHub creates every
     blob atomically on a single server, no replication race.
  4. POST /git/commits (parents=[]) — orphan commit, no history baggage.
  5. PATCH /git/refs force-update — branch points to the single clean commit.

Fallback (if git/trees still 404 after 90 s of retries):
  Contents API for all files + orphan-squash in one extra step.
  Still results in a single commit on the branch.

Post-creation:
  - Branch protection (non-fatal — needs GitHub Pro for private repos).
"""

import base64
import logging
import os
import time
from typing import Dict, List

import httpx
from github import Github, GithubException

from .base import BasePlatformService

logger = logging.getLogger(__name__)


class GitHubService(BasePlatformService):

    def __init__(self) -> None:
        self._token = os.getenv("GITHUB_TOKEN")

    def _client(self) -> Github:
        if not self._token:
            raise ValueError(
                "GITHUB_TOKEN is not configured. "
                "Create a Classic Personal Access Token with 'repo' scope: "
                "https://github.com/settings/tokens/new?scopes=repo"
            )
        return Github(self._token)

    def _hdrs(self) -> dict:
        return {
            "Authorization":        f"Bearer {self._token}",
            "Accept":               "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    # ── Repository creation ───────────────────────────────────────────────────

    def create_repository(
        self,
        name:           str,
        namespace_id:   str,
        description:    str,
        default_branch: str,
        visibility:     str,
        files:          Dict[str, str],
    ) -> dict:
        logger.info("GitHub: creating repo '%s' under '%s'", name, namespace_id)

        g = self._client()
        if namespace_id.isdigit():
            raise ValueError(
                f"GitHub namespace must be an org login or username, "
                f"not a number ('{namespace_id}'). "
                "Re-select the namespace after choosing the GitHub platform."
            )

        auth_user = g.get_user()
        if namespace_id == auth_user.login:
            owner = auth_user
        else:
            try:
                owner = g.get_organization(namespace_id)
            except GithubException:
                owner = auth_user

        try:
            repo = owner.create_repo(
                name=name,
                description=description,
                private=(visibility == "private"),
                auto_init=True,
                allow_squash_merge=True,
                allow_rebase_merge=True,
                allow_merge_commit=False,
                delete_branch_on_merge=True,
            )
        except GithubException as exc:
            if exc.status == 403 and "secondary rate limit" in str(exc.data).lower():
                raise ValueError(
                    "GitHub secondary rate limit — too many repos created recently. "
                    "Wait 5–10 minutes and try again."
                ) from exc
            raise

        repo = g.get_repo(repo.full_name)
        logger.info("GitHub: repo created — %s", repo.html_url)

        if not files:
            return {
                "project_id":     str(repo.id),
                "project_name":   repo.name,
                "project_url":    repo.html_url,
                "namespace_path": namespace_id,
            }

        actual_branch = repo.default_branch
        work_branch   = default_branch or actual_branch

        if actual_branch != default_branch:
            try:
                init_sha = repo.get_branch(actual_branch).commit.sha
                repo.create_git_ref(f"refs/heads/{default_branch}", init_sha)
            except GithubException:
                pass

        hdrs = self._hdrs()
        base = f"https://api.github.com/repos/{namespace_id}/{name}"

        tree_payload = {
            "tree": [
                {
                    "path":    path,
                    "mode":    "100644",
                    "type":    "blob",
                    "content": content if isinstance(content, str)
                               else content.decode("utf-8"),
                }
                for path, content in files.items()
            ]
        }

        # ── Primary: git/trees + orphan commit (single clean commit) ─────────
        # GitHub's git backend initialises ~10-45 s after repo creation.
        # Retry every 15 s up to 90 s. No per-file uploads — everything in
        # one atomic tree operation.
        tree_sha = None
        for wait_s in [15, 15, 15, 15, 30]:
            time.sleep(wait_s)
            tree_resp = httpx.post(
                f"{base}/git/trees", headers=hdrs,
                json=tree_payload, timeout=120,
            )
            if tree_resp.is_success:
                tree_sha = tree_resp.json()["sha"]
                logger.info(
                    "GitHub: git/trees ready after %ds — creating commit",
                    wait_s,
                )
                break
            logger.info(
                "GitHub: git backend not ready yet (HTTP %d, waited %ds) — retrying…",
                tree_resp.status_code, wait_s,
            )

        if tree_sha:
            commit_resp = httpx.post(
                f"{base}/git/commits", headers=hdrs,
                json={
                    "message": "feat: initial scaffold from DevOps Self-Service Portal",
                    "tree":    tree_sha,
                    "parents": [],
                },
                timeout=30,
            )
            commit_resp.raise_for_status()
            orphan_sha = commit_resp.json()["sha"]

            httpx.patch(
                f"{base}/git/refs/heads/{work_branch}", headers=hdrs,
                json={"sha": orphan_sha, "force": True},
                timeout=15,
            ).raise_for_status()

            logger.info(
                "GitHub: pushed %d files to '%s' in 1 commit",
                len(files), work_branch,
            )

        else:
            # ── Fallback: Contents API + squash ───────────────────────────────
            # git/trees unavailable after 90 s (heavy rate limiting).
            # Upload via Contents API then squash to a single orphan commit.
            logger.warning(
                "GitHub: git/trees still not ready after 90s — "
                "falling back to Contents API + squash"
            )
            readme_sha = None
            r = httpx.get(f"{base}/contents/README.md", headers=hdrs,
                          params={"ref": work_branch}, timeout=10)
            if r.status_code == 200:
                readme_sha = r.json().get("sha")

            for path, content in sorted(files.items()):
                encoded = base64.b64encode(
                    content.encode("utf-8") if isinstance(content, str) else content
                ).decode("utf-8")
                payload: dict = {
                    "message": "feat: initial scaffold from DevOps Self-Service Portal",
                    "content": encoded, "branch": work_branch,
                }
                if path == "README.md" and readme_sha:
                    payload["sha"] = readme_sha

                resp = httpx.put(f"{base}/contents/{path}", headers=hdrs,
                                 json=payload, timeout=30)
                if resp.status_code == 422:
                    ex = httpx.get(f"{base}/contents/{path}", headers=hdrs,
                                   params={"ref": work_branch}, timeout=10)
                    if ex.status_code == 200:
                        payload["sha"] = ex.json()["sha"]
                        resp = httpx.put(f"{base}/contents/{path}", headers=hdrs,
                                         json=payload, timeout=30)

                if resp.status_code in (403, 404) and ".github/workflows/" in path:
                    logger.warning("GitHub: skipped '%s' (needs 'workflow' scope)", path)
                    continue
                resp.raise_for_status()

            # Squash N staging commits into one orphan commit
            latest_sha = g.get_repo(f"{namespace_id}/{name}").get_branch(work_branch).commit.sha
            c_info = httpx.get(f"{base}/git/commits/{latest_sha}", headers=hdrs, timeout=15)
            c_info.raise_for_status()

            squash = httpx.post(
                f"{base}/git/commits", headers=hdrs,
                json={
                    "message": "feat: initial scaffold from DevOps Self-Service Portal",
                    "tree":    c_info.json()["tree"]["sha"],
                    "parents": [],
                },
                timeout=30,
            )
            squash.raise_for_status()

            httpx.patch(
                f"{base}/git/refs/heads/{work_branch}", headers=hdrs,
                json={"sha": squash.json()["sha"], "force": True},
                timeout=15,
            ).raise_for_status()

            logger.info(
                "GitHub: fallback complete — %d files in 1 squashed commit",
                len(files),
            )

        return {
            "project_id":     str(repo.id),
            "project_name":   repo.name,
            "project_url":    repo.html_url,
            "namespace_path": namespace_id,
        }

    # ── Branch protection ─────────────────────────────────────────────────────

    def configure_branch_protection(
        self,
        project_id:   str,
        namespace_id: str,
        branch:       str,
        **kwargs,
    ) -> None:
        try:
            g         = self._client()
            repo_name = kwargs.get("repo_name", "")
            repo      = (
                g.get_repo(f"{namespace_id}/{repo_name}")
                if repo_name
                else g.get_repo(int(project_id))
            )
            repo.get_branch(branch).edit_protection(
                required_approving_review_count=1,
                enforce_admins=False,
                dismiss_stale_reviews=True,
                require_code_owner_reviews=False,
            )
            logger.info("GitHub: branch protection configured for '%s'", branch)
        except Exception as exc:
            logger.warning("GitHub: could not configure branch protection — %s", exc)

    # ── Namespaces ────────────────────────────────────────────────────────────

    def list_namespaces(self, search: str = "") -> List[dict]:
        g    = self._client()
        user = g.get_user()
        result = [
            {"id": user.login, "name": user.login,
             "full_path": user.login, "kind": "user"},
        ]
        for org in user.get_orgs():
            display = org.name or org.login
            if not search or search.lower() in org.login.lower() or search.lower() in display.lower():
                result.append({
                    "id": org.login, "name": display,
                    "full_path": org.login, "kind": "organization",
                })
        return sorted(result, key=lambda n: n["full_path"])

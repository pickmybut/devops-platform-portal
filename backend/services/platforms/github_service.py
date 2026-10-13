"""
GitHub platform service.

File upload — two-phase approach for a single clean commit:

  Phase 1: Contents API for all non-workflow files.
    Works immediately on fresh repos, no timing issues.
    N files → N commits (temporary staging commits).

  Phase 2: Squash into one orphan commit.
    a. POST /git/commits with latest tree SHA, parents=[] → instant!
       (POST /git/commits has no init delay unlike POST /git/trees)
    b. PATCH /git/refs force-update → branch points to single clean commit.

  Workflow files (.github/workflows/):
    Need POST /git/trees (base_tree + new file), which has a ~2-minute
    init delay on fresh repos. We retry for up to 90 s after Phase 1.
    If git/trees becomes available: add workflow files into the squash tree.
    If it times out: fall back to Contents API for workflow files (skips
    if token lacks 'workflow' scope, adds a separate commit otherwise).

Result: repo with 1 commit containing all scaffold files.

Post-creation:
  - Branch protection (non-fatal — requires GitHub Pro for private repos).
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
                    "Wait 5–10 minutes and try again. This only happens during rapid testing."
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

        # ── Phase 1: Contents API for non-workflow files ──────────────────────
        # Splits files into regular (upload now) and workflow (needs git/trees).
        workflow_files = {p: c for p, c in files.items()
                         if p.startswith(".github/workflows/")}
        regular_files  = {p: c for p, c in files.items()
                         if not p.startswith(".github/workflows/")}

        # README.md already exists from auto_init — need its SHA to update it.
        readme_sha = None
        r = httpx.get(f"{base}/contents/README.md", headers=hdrs,
                      params={"ref": work_branch}, timeout=10)
        if r.status_code == 200:
            readme_sha = r.json().get("sha")

        for path, content in sorted(regular_files.items()):
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
            resp.raise_for_status()

        logger.info("GitHub: Phase 1 complete — %d files staged", len(regular_files))

        # ── Phase 2a: Get current tree SHA ────────────────────────────────────
        latest_sha = g.get_repo(f"{namespace_id}/{name}").get_branch(work_branch).commit.sha
        commit_info = httpx.get(f"{base}/git/commits/{latest_sha}", headers=hdrs, timeout=15)
        commit_info.raise_for_status()
        latest_tree_sha = commit_info.json()["tree"]["sha"]

        # ── Phase 2b: Add workflow files via git/trees (if needed) ───────────
        # POST /git/trees has a ~2-minute init delay on fresh repos.
        # Retry for up to 90s to stay within the frontend's 180s timeout.
        final_tree_sha = latest_tree_sha

        if workflow_files:
            wf_items = [
                {"path": p, "mode": "100644", "type": "blob",
                 "content": c if isinstance(c, str) else c.decode("utf-8")}
                for p, c in workflow_files.items()
            ]
            tree_added = False
            for wait_s in [10, 15, 20, 25, 30]:
                time.sleep(wait_s)
                wf_tree = httpx.post(
                    f"{base}/git/trees", headers=hdrs,
                    json={"base_tree": latest_tree_sha, "tree": wf_items},
                    timeout=30,
                )
                if wf_tree.is_success:
                    final_tree_sha = wf_tree.json()["sha"]
                    tree_added = True
                    logger.info("GitHub: workflow file(s) added via git/trees")
                    break
                logger.info(
                    "GitHub: git/trees not ready yet (waited %ds) — retrying…", wait_s
                )

            if not tree_added:
                logger.warning(
                    "GitHub: git/trees not ready within 90s — adding workflow files "
                    "via Contents API instead (needs 'workflow' token scope)."
                )
                for path, content in workflow_files.items():
                    encoded = base64.b64encode(
                        content.encode("utf-8") if isinstance(content, str) else content
                    ).decode("utf-8")
                    resp = httpx.put(
                        f"{base}/contents/{path}", headers=hdrs,
                        json={"message": "feat: add CI workflow", "content": encoded,
                              "branch": work_branch},
                        timeout=30,
                    )
                    if resp.status_code in (403, 404):
                        logger.warning(
                            "GitHub: skipped '%s' — add 'workflow' scope to your token",
                            path,
                        )
                    else:
                        resp.raise_for_status()

                # Re-fetch tree SHA (after possible Contents API workflow upload)
                latest_sha2 = g.get_repo(f"{namespace_id}/{name}").get_branch(work_branch).commit.sha
                c2 = httpx.get(f"{base}/git/commits/{latest_sha2}", headers=hdrs, timeout=15)
                if c2.is_success:
                    final_tree_sha = c2.json()["tree"]["sha"]

        # ── Phase 2c: Squash into a single orphan commit ──────────────────────
        # POST /git/commits works immediately — no 2-minute delay.
        # Orphan commit (parents=[]) gives a single clean history.
        squash = httpx.post(
            f"{base}/git/commits", headers=hdrs,
            json={
                "message": "feat: initial scaffold from DevOps Self-Service Portal",
                "tree":    final_tree_sha,
                "parents": [],
            },
            timeout=30,
        )
        squash.raise_for_status()
        final_sha = squash.json()["sha"]

        ref_patch = httpx.patch(
            f"{base}/git/refs/heads/{work_branch}", headers=hdrs,
            json={"sha": final_sha, "force": True},
            timeout=15,
        )
        ref_patch.raise_for_status()

        logger.info(
            "GitHub: squashed into 1 clean commit on '%s' (%d files)",
            work_branch, len(files),
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

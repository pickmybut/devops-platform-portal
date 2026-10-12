"""
GitHub platform service.

File upload: single commit via the Git Data API using content= mode.

  InputGitTreeElement(path, mode, type, content=...)
  — tells GitHub to create each blob atomically inside the tree operation,
    all on the same server. No separate create_git_blob() calls, no
    replication race condition, no 'workflow' scope requirement.

  Result: repo + all scaffold files in exactly 2 commits:
    1. GitHub auto-init commit (README)
    2. "feat: initial scaffold" (all our files)

Post-creation:
  - Branch protection (non-fatal — requires GitHub Pro for private repos).
"""

import logging
import os
import time
from typing import Dict, List

import httpx
from github import Github, GithubException, InputGitTreeElement

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

        repo = owner.create_repo(
            name=name,
            description=description,
            private=(visibility == "private"),
            auto_init=True,          # creates the default branch immediately
            allow_squash_merge=True,
            allow_rebase_merge=True,
            allow_merge_commit=False,
            delete_branch_on_merge=True,
        )

        # Re-fetch for a clean, fully-authenticated object
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

        # ── Upload all files via direct REST calls (httpx) ────────────────────
        # GitHub's Git Data API (/git/trees) takes 1-2 minutes to initialise
        # after repo creation — unless you "wake it up" by creating a blob first.
        # Creating one primer blob forces the git DB to initialise in ~2-3 seconds.

        api_headers = {
            "Authorization":        f"Bearer {self._token}",
            "Accept":               "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        base = f"https://api.github.com/repos/{namespace_id}/{name}"

        # ── Primer blob: forces git DB initialisation ─────────────────────────
        primer_path, primer_content = next(iter(files.items()))
        try:
            repo.create_git_blob(
                primer_content if isinstance(primer_content, str)
                else primer_content.decode("utf-8"),
                "utf-8",
            )
            logger.info("GitHub: git DB initialised (primer blob created)")
            time.sleep(5)   # 5s gives the git tree server time to mount
        except GithubException as exc:
            logger.warning("GitHub: primer blob failed (%s) — waiting 8s", exc)
            time.sleep(8)

        # ── Tree + commit + ref (3 API calls for all files) ───────────────────
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

        for attempt in range(6):   # up to 6 × 5s = 30s extra
            tree_resp = httpx.post(
                f"{base}/git/trees", headers=api_headers,
                json=tree_payload, timeout=120,
            )
            if tree_resp.is_success:
                break
            if tree_resp.status_code == 404 and attempt < 5:
                logger.warning("GitHub: git/trees not ready yet (attempt %d/6) — waiting 5s", attempt + 1)
                time.sleep(5)
            else:
                tree_resp.raise_for_status()
        tree_resp.raise_for_status()
        tree_sha = tree_resp.json()["sha"]

        commit_resp = httpx.post(
            f"{base}/git/commits", headers=api_headers,
            json={
                "message": "feat: initial scaffold from DevOps Self-Service Portal",
                "tree":    tree_sha,
                "parents": [],
            },
            timeout=30,
        )
        commit_resp.raise_for_status()
        commit_sha = commit_resp.json()["sha"]

        ref_resp = httpx.patch(
            f"{base}/git/refs/heads/{work_branch}", headers=api_headers,
            json={"sha": commit_sha, "force": True},
            timeout=15,
        )
        ref_resp.raise_for_status()

        logger.info("GitHub: pushed %d files to '%s' (1 commit)", len(files), work_branch)

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
            {
                "id":        user.login,
                "name":      user.login,
                "full_path": user.login,
                "kind":      "user",
            }
        ]
        for org in user.get_orgs():
            display = org.name or org.login
            if not search or search.lower() in org.login.lower() or search.lower() in display.lower():
                result.append(
                    {
                        "id":        org.login,
                        "name":      display,
                        "full_path": org.login,
                        "kind":      "organization",
                    }
                )
        return sorted(result, key=lambda n: n["full_path"])

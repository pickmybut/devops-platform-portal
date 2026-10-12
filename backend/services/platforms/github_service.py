"""
GitHub platform service.

File upload strategy:
  Primary — Git Data API (single commit, fast):
    1. Create all blobs in parallel (10 workers)
    2. Wait 3 s for GitHub's distributed backend to replicate blobs
    3. Create tree + commit + update ref (retry up to 3×)
  Fallback — Contents API (one call per file, reliable):
    Used if the Git Data API still fails after retries.
    Note: .github/workflows/ files require 'workflow' token scope here.

Post-creation:
  - Configures branch protection (non-fatal — needs GitHub Pro for private repos)
"""

import base64
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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
                "Please re-select the namespace after choosing the GitHub platform."
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
            auto_init=True,          # creates default branch so Git Data API works immediately
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

        # Create requested branch if it differs from what auto_init made
        if actual_branch != default_branch:
            init_sha = repo.get_branch(actual_branch).commit.sha
            try:
                repo.create_git_ref(f"refs/heads/{default_branch}", init_sha)
            except GithubException:
                pass   # already exists

        # Auto-init commit — used as parent so our commit builds on it
        init_commit = repo.get_git_commit(
            repo.get_branch(work_branch).commit.sha
        )

        # ── Primary: Git Data API ─────────────────────────────────────────────
        # Single commit for all files. Git Data API has no path restrictions —
        # .github/workflows/ uploads fine here unlike the Contents API.
        try:
            def _make_blob(item):
                path, content = item
                blob = repo.create_git_blob(content, "utf-8")
                return path, blob.sha

            tree_elements: List[InputGitTreeElement] = []
            with ThreadPoolExecutor(max_workers=6) as pool:
                futures = {
                    pool.submit(_make_blob, item): item[0]
                    for item in files.items()
                }
                for future in as_completed(futures):
                    path, sha = future.result()
                    tree_elements.append(
                        InputGitTreeElement(path, "100644", "blob", sha=sha)
                    )
            logger.info("GitHub: created %d blobs in parallel", len(tree_elements))

            # Wait for GitHub's distributed git backend to replicate all blobs
            # before the tree creation request references them.
            time.sleep(3)

            # Retry tree creation up to 3 times with exponential backoff
            tree = None
            for attempt in range(3):
                try:
                    tree = repo.create_git_tree(tree_elements)
                    break
                except GithubException as exc:
                    if exc.status == 404 and attempt < 2:
                        wait = 3 * (attempt + 1)
                        logger.warning(
                            "GitHub: create_git_tree 404 (attempt %d/3) — waiting %ds for replication",
                            attempt + 1, wait,
                        )
                        time.sleep(wait)
                    else:
                        raise

            commit = repo.create_git_commit(
                message="feat: initial scaffold from DevOps Self-Service Portal",
                tree=tree,
                parents=[init_commit],
            )
            repo.get_git_ref(f"heads/{work_branch}").edit(commit.sha)
            logger.info(
                "GitHub: pushed %d files to '%s' (1 commit via Git Data API)",
                len(files), work_branch,
            )

        except GithubException as exc:
            # ── Fallback: Contents API ────────────────────────────────────────
            # One API call per file. Reliable but slow.
            # Note: .github/workflows/ requires 'workflow' token scope here.
            logger.warning(
                "GitHub: Git Data API failed (%s), falling back to Contents API",
                exc,
            )
            rest_headers = {
                "Authorization":        f"Bearer {self._token}",
                "Accept":               "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }

            for path, content in sorted(files.items()):
                encoded  = base64.b64encode(
                    content.encode("utf-8") if isinstance(content, str) else content
                ).decode("utf-8")
                file_url = f"https://api.github.com/repos/{namespace_id}/{name}/contents/{path}"
                check    = httpx.get(file_url, headers=rest_headers,
                                     params={"ref": work_branch}, timeout=15)
                payload: dict = {
                    "message": "feat: initial scaffold from DevOps Self-Service Portal",
                    "content": encoded,
                    "branch":  work_branch,
                }
                if check.status_code == 200:
                    payload["sha"] = check.json()["sha"]

                resp = httpx.put(file_url, headers=rest_headers, json=payload, timeout=30)

                # .github/workflows/ requires 'workflow' scope on the token
                # when using the Contents API — skip gracefully
                if resp.status_code in (403, 404) and ".github/workflows/" in path:
                    logger.warning(
                        "GitHub: skipping '%s' — Contents API needs 'workflow' scope "
                        "(add at https://github.com/settings/tokens). "
                        "Git Data API would have uploaded this file without that scope.",
                        path,
                    )
                    continue

                resp.raise_for_status()
                logger.debug("GitHub: uploaded '%s'", path)

            logger.info(
                "GitHub: uploaded %d files to '%s' via Contents API fallback",
                len(files), work_branch,
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

"""
GitHub platform service.

Uses PyGithub.  Multi-file atomic commits are done via the Git Data API:
  blob per file → tree → commit → create branch ref

Post-creation:
  - Configures branch protection (require PR, 1 review, status checks)
  - Sets repo settings (squash + rebase merge, delete branch on merge)
"""

import base64
import logging
import os
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
                "Create a personal access token with 'repo' scope."
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
                f"GitHub namespace must be an organisation login or username, "
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

        if files:
            actual_branch = repo.default_branch
            work_branch   = default_branch or actual_branch

            # Create requested branch if it differs from what auto_init made
            if actual_branch != default_branch:
                init_sha = repo.get_branch(actual_branch).commit.sha
                try:
                    repo.create_git_ref(f"refs/heads/{default_branch}", init_sha)
                except GithubException:
                    pass   # already exists

            # Auto-init commit — used as parent for our scaffold commit
            init_commit = repo.get_git_commit(
                repo.get_branch(work_branch).commit.sha
            )

            # Separate workflow files (need 'workflow' scope) from the rest
            workflow_paths = {p for p in files if p.startswith(".github/workflows/")}
            upload_files   = {p: c for p, c in files.items() if p not in workflow_paths}

            if workflow_paths:
                logger.warning(
                    "GitHub: skipping %d .github/workflows/ file(s) — requires 'workflow' "
                    "scope on the token. Add it at https://github.com/settings/tokens",
                    len(workflow_paths),
                )

            # ── Primary: Git Data API — single commit for all files ───────────
            # N blobs + 1 tree + 1 commit + 1 ref = N+3 calls total.
            # Uses init_commit.tree as base so README from auto_init is replaced.
            try:
                tree_elements: List[InputGitTreeElement] = []
                for path, content in upload_files.items():
                    blob = repo.create_git_blob(content, "utf-8")
                    tree_elements.append(
                        InputGitTreeElement(path, "100644", "blob", sha=blob.sha)
                    )

                tree   = repo.create_git_tree(tree_elements, init_commit.tree)
                commit = repo.create_git_commit(
                    message="feat: initial scaffold from DevOps Self-Service Portal",
                    tree=tree,
                    parents=[init_commit],
                )
                ref = repo.get_git_ref(f"heads/{work_branch}")
                ref.edit(commit.sha)
                logger.info(
                    "GitHub: pushed %d files to '%s' (1 commit via Git Data API)",
                    len(upload_files), work_branch,
                )

            except GithubException as exc:
                # ── Fallback: Contents API — one call per file ────────────────
                logger.warning(
                    "GitHub: Git Data API failed (%s), falling back to Contents API",
                    exc,
                )
                rest_headers = {
                    "Authorization":        f"Bearer {self._token}",
                    "Accept":               "application/vnd.github.v3+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                }
                owner_login = namespace_id
                repo_name   = name

                for path, content in sorted(upload_files.items()):
                    encoded  = base64.b64encode(
                        content.encode("utf-8") if isinstance(content, str) else content
                    ).decode("utf-8")
                    file_url = f"https://api.github.com/repos/{owner_login}/{repo_name}/contents/{path}"
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
                    resp.raise_for_status()
                    logger.debug("GitHub: uploaded '%s'", path)

                logger.info(
                    "GitHub: uploaded %d files to '%s' via Contents API fallback",
                    len(upload_files), work_branch,
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
        """
        Protect *branch*:
          - Require at least 1 approving review
          - Dismiss stale reviews on new pushes
          - Block force-pushes
          - Do not restrict who can push (allow admins)
        """
        try:
            g        = self._client()
            repo_name = kwargs.get("repo_name", "")
            if not repo_name:
                # project_id is the numeric repo ID — look it up
                repo = g.get_repo(int(project_id))
            else:
                repo = g.get_repo(f"{namespace_id}/{repo_name}")

            branch_ref = repo.get_branch(branch)
            branch_ref.edit_protection(
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
        result = []

        result.append(
            {
                "id":        user.login,
                "name":      user.login,
                "full_path": user.login,
                "kind":      "user",
            }
        )

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

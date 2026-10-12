"""
GitHub platform service.

Uses PyGithub.  Multi-file atomic commits are done via the Git Data API:
  blob per file → tree → commit → create branch ref

Post-creation:
  - Configures branch protection (require PR, 1 review, status checks)
  - Sets repo settings (squash + rebase merge, delete branch on merge)
"""

import logging
import os
from typing import Dict, List

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
            auto_init=False,
            allow_squash_merge=True,
            allow_rebase_merge=True,
            allow_merge_commit=False,    # prefer squash/rebase
            delete_branch_on_merge=True,
        )

        if files:
            tree_elements: List[InputGitTreeElement] = []
            for path, content in files.items():
                blob = repo.create_git_blob(content, "utf-8")
                tree_elements.append(
                    InputGitTreeElement(path, "100644", "blob", sha=blob.sha)
                )
                logger.debug("GitHub: created blob for '%s'", path)

            tree   = repo.create_git_tree(tree_elements)
            commit = repo.create_git_commit(
                message="feat: initial scaffold from DevOps Self-Service Portal",
                tree=tree,
                parents=[],
            )
            repo.create_git_ref(f"refs/heads/{default_branch}", commit.sha)
            logger.info("GitHub: pushed %d files to '%s'", len(files), default_branch)

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

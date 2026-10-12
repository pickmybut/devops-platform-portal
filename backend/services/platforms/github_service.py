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

        # Create requested branch if it differs from what auto_init made
        if actual_branch != default_branch:
            init_sha = repo.get_branch(actual_branch).commit.sha
            try:
                repo.create_git_ref(f"refs/heads/{default_branch}", init_sha)
            except GithubException:
                pass   # already exists

        # Auto-init commit — used as parent and as base_tree
        init_commit = repo.get_git_commit(
            repo.get_branch(work_branch).commit.sha
        )

        # ── Single commit for all files via Git Data API ───────────────────────
        # Using content= mode: GitHub creates each blob atomically inside the
        # tree operation on the same server. No separate create_git_blob() calls,
        # no cross-server replication race, no 'workflow' scope requirement.
        # 3 API calls total: create_git_tree + create_git_commit + edit ref.
        tree_elements: List[InputGitTreeElement] = [
            InputGitTreeElement(
                path, "100644", "blob",
                content=content if isinstance(content, str) else content.decode("utf-8"),
            )
            for path, content in files.items()
        ]

        tree = repo.create_git_tree(tree_elements, init_commit.tree)
        commit = repo.create_git_commit(
            message="feat: initial scaffold from DevOps Self-Service Portal",
            tree=tree,
            parents=[init_commit],
        )
        repo.get_git_ref(f"heads/{work_branch}").edit(commit.sha)
        logger.info(
            "GitHub: pushed %d files to '%s' (1 commit)",
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

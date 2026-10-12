"""
GitHub platform service.

Uses PyGithub.  Multi-file atomic commits are done via the Git Data API:
  blob per file → tree → commit → create branch ref
This mirrors how `git push` works and avoids rate-limit issues from
creating files one-by-one.
"""

import logging
import os
from typing import Dict, List

from github import Github, GithubException, InputGitTreeElement

from .base import BasePlatformService

logger = logging.getLogger(__name__)


class GitHubService(BasePlatformService):

    def __init__(self) -> None:
        # Token is validated lazily in _client() so an unconfigured
        # platform doesn't crash the app on startup or on unrelated requests.
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
        # namespace_id is an org login or personal username — never numeric
        if namespace_id.isdigit():
            raise ValueError(
                f"GitHub namespace must be an organisation login or username, not a number ('{namespace_id}'). "
                "Please re-select the namespace after choosing the GitHub platform."
            )

        # Try org first; fall back to user.
        # When it's a personal namespace, use get_user() with no args so we
        # get an AuthenticatedUser (which has create_repo), not a NamedUser.
        auth_user = g.get_user()
        if namespace_id == auth_user.login:
            owner = auth_user
        else:
            try:
                owner = g.get_organization(namespace_id)
            except GithubException:
                owner = auth_user   # best-effort fallback

        repo = owner.create_repo(
            name=name,
            description=description,
            private=(visibility == "private"),
            auto_init=False,
        )

        if files:
            # ── Git Data API: blobs → tree → commit → ref ────────────────────
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
                parents=[],  # no parent = initial commit
            )
            repo.create_git_ref(f"refs/heads/{default_branch}", commit.sha)
            logger.info("GitHub: pushed %d files to '%s'", len(files), default_branch)

        return {
            "project_id":     str(repo.id),
            "project_name":   repo.name,
            "project_url":    repo.html_url,
            "namespace_path": namespace_id,
        }

    # ── Namespaces ────────────────────────────────────────────────────────────

    def list_namespaces(self, search: str = "") -> List[dict]:
        g    = self._client()
        user = g.get_user()
        result = []

        # Personal namespace first
        result.append(
            {
                "id":        user.login,
                "name":      user.login,
                "full_path": user.login,
                "kind":      "user",
            }
        )

        # Organizations
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

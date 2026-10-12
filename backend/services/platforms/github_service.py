"""
GitHub platform service.

File upload strategy:
  Step 1 — Contents API for all non-workflow files (N calls, ~1s each).
            Only README.md needs a pre-GET (to get its SHA for update).
            All other files are new, so PUT directly without checking first.

  Step 2 — Git Data API for .github/workflows/ files.
            After Step 1 the repo has a stable, replicated tree. Using
            that tree as base_tree makes create_git_tree reliable — no
            more 404 race conditions from parallel blob creation.
            The Git Data API has no 'workflow' scope requirement.

Post-creation:
  - Branch protection (non-fatal — requires GitHub Pro for private repos).
"""

import base64
import logging
import os
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

    def _rest_headers(self) -> dict:
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
            init_sha = repo.get_branch(actual_branch).commit.sha
            try:
                repo.create_git_ref(f"refs/heads/{default_branch}", init_sha)
            except GithubException:
                pass

        headers   = self._rest_headers()
        base_url  = f"https://api.github.com/repos/{namespace_id}/{name}"

        # ── Step 1: Contents API for non-workflow files ───────────────────────
        # Only README.md (from auto_init) needs a pre-GET to retrieve its SHA.
        # All other files don't exist yet — PUT directly, no GET needed.

        readme_sha = None
        check = httpx.get(
            f"{base_url}/contents/README.md",
            headers=headers, params={"ref": work_branch}, timeout=10,
        )
        if check.status_code == 200:
            readme_sha = check.json().get("sha")

        workflow_files: Dict[str, str] = {}
        uploaded = 0

        for path, content in sorted(files.items()):
            # Workflow files are handled in Step 2 via Git Data API
            if path.startswith(".github/workflows/"):
                workflow_files[path] = content
                continue

            encoded = base64.b64encode(
                content.encode("utf-8") if isinstance(content, str) else content
            ).decode("utf-8")

            payload: dict = {
                "message": "feat: initial scaffold from DevOps Self-Service Portal",
                "content": encoded,
                "branch":  work_branch,
            }
            if path == "README.md" and readme_sha:
                payload["sha"] = readme_sha

            resp = httpx.put(
                f"{base_url}/contents/{path}",
                headers=headers, json=payload, timeout=30,
            )

            if resp.status_code == 422:
                # File already exists but we don't have its SHA — fetch and retry
                existing = httpx.get(
                    f"{base_url}/contents/{path}",
                    headers=headers, params={"ref": work_branch}, timeout=10,
                )
                if existing.status_code == 200:
                    payload["sha"] = existing.json()["sha"]
                    resp = httpx.put(
                        f"{base_url}/contents/{path}",
                        headers=headers, json=payload, timeout=30,
                    )

            resp.raise_for_status()
            uploaded += 1
            logger.debug("GitHub: uploaded '%s'", path)

        logger.info("GitHub: uploaded %d files to '%s' via Contents API", uploaded, work_branch)

        # ── Step 2: Git Data API for .github/workflows/ files ────────────────
        # The repo now has a stable, replicated tree. Using it as base_tree
        # makes create_git_tree reliable — no 404 race conditions.
        # The Git Data API bypasses the 'workflow' scope restriction.
        if workflow_files:
            try:
                latest_sha    = repo.get_branch(work_branch).commit.sha
                latest_commit = repo.get_git_commit(latest_sha)

                tree_elements: List[InputGitTreeElement] = []
                for path, content in workflow_files.items():
                    blob = repo.create_git_blob(content, "utf-8")
                    tree_elements.append(
                        InputGitTreeElement(path, "100644", "blob", sha=blob.sha)
                    )

                tree = repo.create_git_tree(tree_elements, latest_commit.tree)
                commit = repo.create_git_commit(
                    message="feat: add CI/CD workflow files",
                    tree=tree,
                    parents=[latest_commit],
                )
                repo.get_git_ref(f"heads/{work_branch}").edit(commit.sha)
                logger.info(
                    "GitHub: added %d workflow file(s) via Git Data API",
                    len(workflow_files),
                )
            except GithubException as exc:
                logger.warning(
                    "GitHub: could not add workflow files (%s). "
                    "Add 'workflow' scope to your token or push manually.",
                    exc,
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

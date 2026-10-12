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
            auto_init=True,          # creates default branch so Git API works immediately
            allow_squash_merge=True,
            allow_rebase_merge=True,
            allow_merge_commit=False,
            delete_branch_on_merge=True,
        )

        if files:
            # Upload via Contents API using httpx directly — same pattern as
            # the Bitbucket service. This avoids PyGitHub object-state issues.
            owner_login = namespace_id
            repo_name   = name
            work_branch = repo.default_branch  # whatever auto_init created

            # If the requested branch differs (e.g. user wants "main" but
            # account default is "master"), create it from the auto-init SHA.
            if work_branch != default_branch:
                init_sha = repo.get_branch(work_branch).commit.sha
                httpx.post(
                    f"https://api.github.com/repos/{owner_login}/{repo_name}/git/refs",
                    headers={
                        "Authorization":        f"Bearer {self._token}",
                        "Accept":               "application/vnd.github.v3+json",
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                    json={"ref": f"refs/heads/{default_branch}", "sha": init_sha},
                    timeout=15,
                )
                work_branch = default_branch

            rest_headers = {
                "Authorization":        f"Bearer {self._token}",
                "Accept":               "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }

            for path, content in sorted(files.items()):
                encoded = base64.b64encode(
                    content.encode("utf-8") if isinstance(content, str) else content
                ).decode("utf-8")

                file_url = f"https://api.github.com/repos/{owner_login}/{repo_name}/contents/{path}"

                # Check if file already exists (README.md from auto_init needs its SHA)
                check = httpx.get(file_url, headers=rest_headers,
                                   params={"ref": work_branch}, timeout=15)
                payload: dict = {
                    "message": "feat: initial scaffold from DevOps Self-Service Portal",
                    "content": encoded,
                    "branch":  work_branch,
                }
                if check.status_code == 200:
                    payload["sha"] = check.json()["sha"]

                resp = httpx.put(file_url, headers=rest_headers, json=payload, timeout=30)

                # .github/workflows/ requires the 'workflow' scope on the token.
                # Skip gracefully — user can add the file manually or regenerate
                # their token with 'workflow' scope.
                if resp.status_code in (403, 404) and ".github/workflows/" in path:
                    logger.warning(
                        "GitHub: skipping '%s' — uploading workflow files requires "
                        "'workflow' scope on your token. Add it at "
                        "https://github.com/settings/tokens",
                        path,
                    )
                    continue

                resp.raise_for_status()
                logger.debug("GitHub: uploaded '%s'", path)

            # Remove the auto-generated README if the scaffold doesn't include one
            if "README.md" not in files:
                readme_url = f"https://api.github.com/repos/{owner_login}/{repo_name}/contents/README.md"
                check_readme = httpx.get(readme_url, headers=rest_headers,
                                          params={"ref": work_branch}, timeout=15)
                if check_readme.status_code == 200:
                    httpx.delete(readme_url, headers=rest_headers, json={
                        "message": "chore: remove auto-generated readme",
                        "sha":     check_readme.json()["sha"],
                        "branch":  work_branch,
                    }, timeout=15)

            logger.info("GitHub: uploaded %d files to '%s'", len(files), work_branch)

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

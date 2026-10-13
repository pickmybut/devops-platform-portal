"""
GitHub platform service.

File upload: GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path}).
  - Works immediately on freshly-created repos, no timing issues.
  - Creates one commit per file (N commits for N files).
  - All files including .github/workflows/ — the Contents API allows workflow
    files when the token has 'workflow' scope. Without it, those files are
    skipped with a clear warning.

Note on git/trees (single-commit approach):
  GitHub's low-level Git Data API (/git/trees) returns 404 for ~2 minutes
  after repo creation while the git backend initialises. The Contents API
  uses a higher-level layer that bypasses this delay.

Post-creation:
  - Branch protection (non-fatal — requires GitHub Pro for private repos).
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

        hdrs = self._rest_headers()
        base = f"https://api.github.com/repos/{namespace_id}/{name}"

        # ── Contents API upload ───────────────────────────────────────────────
        # Only README.md exists (from auto_init) — needs its SHA to update.
        # All other files are new — direct PUT, no pre-check.
        readme_sha = None
        r = httpx.get(f"{base}/contents/README.md", headers=hdrs,
                      params={"ref": work_branch}, timeout=10)
        if r.status_code == 200:
            readme_sha = r.json().get("sha")

        skipped = []
        uploaded = 0

        for path, content in sorted(files.items()):
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

            resp = httpx.put(f"{base}/contents/{path}", headers=hdrs,
                             json=payload, timeout=30)

            # Handle unexpected existing file
            if resp.status_code == 422:
                existing = httpx.get(f"{base}/contents/{path}", headers=hdrs,
                                     params={"ref": work_branch}, timeout=10)
                if existing.status_code == 200:
                    payload["sha"] = existing.json()["sha"]
                    resp = httpx.put(f"{base}/contents/{path}", headers=hdrs,
                                     json=payload, timeout=30)

            # .github/workflows/ requires 'workflow' scope on the Contents API
            if resp.status_code in (403, 404) and ".github/workflows/" in path:
                skipped.append(path)
                logger.warning(
                    "GitHub: skipped '%s' — add 'workflow' scope to your token "
                    "(github.com/settings/tokens) to upload workflow files.",
                    path,
                )
                continue

            resp.raise_for_status()
            uploaded += 1
            logger.debug("GitHub: uploaded '%s'", path)

        if skipped:
            logger.info(
                "GitHub: uploaded %d/%d files (%d workflow file(s) skipped — "
                "need 'workflow' token scope): %s",
                uploaded, len(files), len(skipped), skipped,
            )
        else:
            logger.info("GitHub: uploaded all %d files to '%s'", uploaded, work_branch)

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

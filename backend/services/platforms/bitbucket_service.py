"""
Bitbucket Cloud platform service.

Uses the Bitbucket REST API v2 directly via httpx.
Creating multiple files atomically is done via the /src endpoint which
accepts multipart form data.

Post-creation:
  - Configures branch restrictions (block direct push to main)
  - Sets default merge strategy (squash)
"""

import logging
import os
from typing import Dict, List

import httpx

from .base import BasePlatformService

logger = logging.getLogger(__name__)

_BASE = "https://api.bitbucket.org/2.0"


class BitbucketService(BasePlatformService):

    def __init__(self) -> None:
        self._username = os.getenv("BITBUCKET_USERNAME")
        self._password = os.getenv("BITBUCKET_APP_PASSWORD")

    def _auth(self):
        if not self._username or not self._password:
            raise ValueError(
                "BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD are required. "
                "Create an App Password with 'Repositories: Read + Write' permissions."
            )
        return (self._username, self._password)

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
        logger.info("Bitbucket: creating repo '%s' in workspace '%s'", name, namespace_id)

        auth = self._auth()
        create_resp = httpx.post(
            f"{_BASE}/repositories/{namespace_id}/{name}",
            auth=auth,
            json={
                "scm":         "git",
                "description": description,
                "is_private":  (visibility == "private"),
                "mainbranch":  {"name": default_branch},
            },
            timeout=30,
        )
        create_resp.raise_for_status()
        repo_data = create_resp.json()
        logger.info("Bitbucket: repo created — %s", repo_data.get("full_name"))

        if files:
            form_data: dict = {path: content for path, content in files.items()}
            form_data["message"] = "feat: initial scaffold from DevOps Self-Service Portal"
            form_data["branch"]  = default_branch
            form_data["author"]  = "DevOps Portal <devops@portal.internal>"

            src_resp = httpx.post(
                f"{_BASE}/repositories/{namespace_id}/{name}/src",
                auth=auth,
                data=form_data,
                timeout=60,
            )
            src_resp.raise_for_status()
            logger.info("Bitbucket: committed %d files to '%s'", len(files), default_branch)

        return {
            "project_id":     repo_data["uuid"],
            "project_name":   name,
            "project_url":    repo_data["links"]["html"]["href"],
            "namespace_path": namespace_id,
        }

    # ── Branch protection ─────────────────────────────────────────────────────

    def configure_branch_protection(
        self,
        project_id:   str,   # repo UUID
        namespace_id: str,   # workspace slug
        branch:       str,
        **kwargs,
    ) -> None:
        """
        Restrict direct pushes to *branch* — only merges allowed.
        Also sets the default merge strategy to squash.
        """
        repo_slug = kwargs.get("repo_name", "")
        if not repo_slug:
            logger.warning("Bitbucket: repo_name not provided, skipping branch protection")
            return

        try:
            auth = self._auth()

            # Restrict direct pushes (Bitbucket branch restrictions)
            httpx.post(
                f"{_BASE}/repositories/{namespace_id}/{repo_slug}/branch-restrictions",
                auth=auth,
                json={
                    "kind":              "push",
                    "branch_match_kind": "explicit",
                    "pattern":           branch,
                    "users":             [],
                    "groups":            [],
                },
                timeout=15,
            ).raise_for_status()

            # Require PR for merging (prevent direct commits)
            httpx.post(
                f"{_BASE}/repositories/{namespace_id}/{repo_slug}/branch-restrictions",
                auth=auth,
                json={
                    "kind":              "require_passing_builds_to_merge",
                    "branch_match_kind": "explicit",
                    "pattern":           branch,
                    "value":             0,  # 0 = no required builds (can set higher)
                },
                timeout=15,
            )

            # Set default merge strategy to squash
            httpx.put(
                f"{_BASE}/repositories/{namespace_id}/{repo_slug}",
                auth=auth,
                json={"merge_strategies": ["squash", "merge_commit", "fast_forward"]},
                timeout=15,
            )

            logger.info("Bitbucket: branch protection configured for '%s'", branch)

        except Exception as exc:
            logger.warning("Bitbucket: could not configure branch protection — %s", exc)

    # ── Workspaces ────────────────────────────────────────────────────────────

    def list_namespaces(self, search: str = "") -> List[dict]:
        auth = self._auth()
        resp = httpx.get(
            f"{_BASE}/workspaces",
            auth=auth,
            params={"pagelen": 100},
            timeout=15,
        )
        resp.raise_for_status()

        result = []
        for ws in resp.json().get("values", []):
            slug = ws["slug"]
            name = ws.get("name", slug)
            if not search or search.lower() in slug.lower() or search.lower() in name.lower():
                result.append(
                    {
                        "id":        slug,
                        "name":      name,
                        "full_path": slug,
                        "kind":      "workspace",
                    }
                )

        return sorted(result, key=lambda n: n["full_path"])

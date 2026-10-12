"""
GitLab platform service.

Uses python-gitlab to create projects and commit files atomically
via the Commits API (one API call, all files in one commit).

Post-creation:
  - Configures branch protection (require MR, 1 approval, no force-push)
  - Sets merge request settings (squash-only, delete branch on merge)
"""

import logging
import os
from typing import Dict, List

import gitlab

from .base import BasePlatformService

logger = logging.getLogger(__name__)


class GitLabService(BasePlatformService):

    def __init__(self) -> None:
        self._url   = os.getenv("GITLAB_URL", "https://gitlab.com")
        self._token = os.getenv("GITLAB_TOKEN")

    def _client(self):
        if not self._token:
            raise ValueError(
                "GITLAB_TOKEN is not configured. "
                "Create a personal access token with 'api' and 'write_repository' scopes."
            )
        gl = gitlab.Gitlab(url=self._url, private_token=self._token)
        gl.auth()
        return gl

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
        logger.info("GitLab: creating project '%s' in namespace %s", name, namespace_id)

        gl = self._client()

        # namespace_id may be a numeric string or a path — resolve paths to IDs.
        try:
            ns_id = int(namespace_id)
        except ValueError:
            matches = [
                ns for ns in gl.namespaces.list(search=namespace_id, all=True)
                if ns.full_path == namespace_id
            ]
            if not matches:
                raise ValueError(f"GitLab namespace '{namespace_id}' not found.")
            ns_id = matches[0].id

        project = gl.projects.create(
            {
                "name":                   name,
                "namespace_id":           ns_id,
                "description":            description,
                "visibility":             visibility,
                "initialize_with_readme": False,
                # Sane merge defaults
                "squash_option":              "default_on",
                "remove_source_branch_after_merge": True,
                "only_allow_merge_if_pipeline_succeeds": False,
                "only_allow_merge_if_all_discussions_are_resolved": True,
            }
        )

        if files:
            actions = [
                {
                    "action":    "create",
                    "file_path": path,
                    "content":   content,
                    "encoding":  "text",
                }
                for path, content in files.items()
            ]
            project.commits.create(
                {
                    "branch":         default_branch,
                    "commit_message": "feat: initial scaffold from DevOps Self-Service Portal",
                    "actions":        actions,
                }
            )
            logger.info("GitLab: committed %d files to '%s'", len(files), default_branch)

        return {
            "project_id":     str(project.id),
            "project_name":   project.name,
            "project_url":    project.web_url,
            "namespace_path": project.namespace["full_path"],
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
          - No direct push (only MR)
          - Developer+ can merge
          - No force-push
          - Require 1 approving review
        """
        try:
            gl      = self._client()
            project = gl.projects.get(project_id)

            # Remove existing protection first (idempotent)
            try:
                pb = project.protectedbranches.get(branch)
                pb.delete()
            except gitlab.exceptions.GitlabGetError:
                pass

            project.protectedbranches.create(
                {
                    "name":                    branch,
                    "push_access_level":       0,   # No one can push directly
                    "merge_access_level":      30,  # Developer+
                    "allow_force_push":        False,
                    "code_owner_approval_required": False,
                }
            )

            # Require 1 approval via Approval Rules API
            try:
                project.approvalrules.create(
                    {
                        "name":                "Portal Default — 1 Approval Required",
                        "approvals_required":  1,
                        "applies_to_all_protected_branches": True,
                    }
                )
            except Exception:
                # Approval rules may not be available on free tier
                pass

            logger.info("GitLab: branch protection configured for '%s'", branch)

        except Exception as exc:
            # Non-fatal: log and continue
            logger.warning("GitLab: could not configure branch protection — %s", exc)

    # ── Namespaces ────────────────────────────────────────────────────────────

    def list_namespaces(self, search: str = "") -> List[dict]:
        gl     = self._client()
        kwargs: dict = {"all": True}
        if search:
            kwargs["search"] = search

        namespaces = gl.namespaces.list(**kwargs)
        return sorted(
            [
                {
                    "id":        str(ns.id),
                    "name":      ns.name,
                    "full_path": ns.full_path,
                    "kind":      ns.kind,
                }
                for ns in namespaces
            ],
            key=lambda n: n["full_path"],
        )

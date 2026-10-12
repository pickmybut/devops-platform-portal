"""Abstract base class for all platform services."""

import logging
from abc import ABC, abstractmethod
from typing import Dict, List

logger = logging.getLogger(__name__)


class BasePlatformService(ABC):
    """
    Every platform service must implement:
      create_repository()        — create a repo and commit the scaffold files
      list_namespaces()          — return groups / orgs / workspaces / regions

    Optionally override:
      configure_branch_protection() — set up branch protection rules
      configure_repo_settings()     — merge strategy, delete-branch-on-merge, etc.
    """

    @abstractmethod
    def create_repository(
        self,
        name:           str,
        namespace_id:   str,
        description:    str,
        default_branch: str,
        visibility:     str,
        files:          Dict[str, str],
    ) -> dict:
        """
        Create a repository and commit *files* atomically.

        Returns:
            {
                "project_id":     str,
                "project_name":   str,
                "project_url":    str,
                "namespace_path": str,
            }
        """

    @abstractmethod
    def list_namespaces(self, search: str = "") -> List[dict]:
        """
        Return the namespaces accessible to the configured credentials.
        Each item:  { id, name, full_path, kind }
        """

    def configure_branch_protection(
        self,
        project_id:     str,
        namespace_id:   str,
        branch:         str,
        **kwargs,
    ) -> None:
        """
        Configure branch protection rules for *branch*.
        Default: no-op — platforms that support it override this.
        """
        logger.debug(
            "%s: branch protection not implemented, skipping",
            self.__class__.__name__,
        )

    def configure_repo_settings(
        self,
        project_id:   str,
        namespace_id: str,
        **kwargs,
    ) -> None:
        """
        Configure repository settings (merge strategy, webhooks, etc.).
        Default: no-op — platforms that support it override this.
        """
        logger.debug(
            "%s: repo settings not implemented, skipping",
            self.__class__.__name__,
        )

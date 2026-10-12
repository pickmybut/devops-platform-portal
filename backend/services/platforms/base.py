"""Abstract base class for all platform services."""

from abc import ABC, abstractmethod
from typing import Dict, List


class BasePlatformService(ABC):
    """
    Every platform service must implement:
      create_repository()  — create a repo and commit the scaffold files
      list_namespaces()    — return groups / orgs / workspaces / regions
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

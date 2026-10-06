"""
Platform service factory.

Usage:
    from services.platforms import get_platform_service

    svc = get_platform_service("gitlab")
    result = svc.create_repository(...)
"""

from .aws_service       import AWSCodeCommitService
from .bitbucket_service import BitbucketService
from .github_service    import GitHubService
from .gitlab_service    import GitLabService

_REGISTRY = {
    "gitlab":           GitLabService,
    "github":           GitHubService,
    "bitbucket":        BitbucketService,
    "aws-codepipeline": AWSCodeCommitService,
}


def get_platform_service(platform: str):
    """
    Return an instantiated platform service for *platform*.

    Raises ValueError for unknown platform ids.
    Raises ValueError (from the service __init__) when required env vars
    are missing.
    """
    cls = _REGISTRY.get(platform)
    if cls is None:
        supported = ", ".join(_REGISTRY.keys())
        raise ValueError(
            f"Unsupported platform '{platform}'. Supported: {supported}"
        )
    return cls()

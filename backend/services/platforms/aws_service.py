"""
AWS CodeCommit platform service.

Uses boto3.  CodeCommit does not have the concept of a "namespace" —
the "namespace" in this portal maps to an AWS region.

Committing multiple files:
  - put_file()     creates the first file (and the initial commit on the empty repo)
  - create_commit() adds all remaining files in one further commit
"""

import logging
import os
from typing import Dict, List

import boto3
from botocore.exceptions import ClientError

from .base import BasePlatformService

logger = logging.getLogger(__name__)

# Regions where CodeCommit is available
_REGIONS: List[dict] = [
    {"id": "eu-west-2",       "name": "EU West 2 — London",        "full_path": "eu-west-2",       "kind": "region"},
    {"id": "eu-west-1",       "name": "EU West 1 — Ireland",        "full_path": "eu-west-1",       "kind": "region"},
    {"id": "eu-central-1",    "name": "EU Central 1 — Frankfurt",   "full_path": "eu-central-1",    "kind": "region"},
    {"id": "us-east-1",       "name": "US East 1 — N. Virginia",    "full_path": "us-east-1",       "kind": "region"},
    {"id": "us-east-2",       "name": "US East 2 — Ohio",           "full_path": "us-east-2",       "kind": "region"},
    {"id": "us-west-2",       "name": "US West 2 — Oregon",         "full_path": "us-west-2",       "kind": "region"},
    {"id": "ap-southeast-1",  "name": "AP Southeast 1 — Singapore", "full_path": "ap-southeast-1",  "kind": "region"},
    {"id": "ap-southeast-2",  "name": "AP Southeast 2 — Sydney",    "full_path": "ap-southeast-2",  "kind": "region"},
    {"id": "ap-northeast-1",  "name": "AP Northeast 1 — Tokyo",     "full_path": "ap-northeast-1",  "kind": "region"},
]


class AWSCodeCommitService(BasePlatformService):

    def __init__(self) -> None:
        self.default_region = os.getenv("AWS_DEFAULT_REGION", "eu-west-2")

    def _client(self, region: str):
        return boto3.client("codecommit", region_name=region)

    # ── Repository creation ───────────────────────────────────────────────────

    def create_repository(
        self,
        name:           str,
        namespace_id:   str,   # region, e.g. "eu-west-2"
        description:    str,
        default_branch: str,
        visibility:     str,   # ignored — CodeCommit uses IAM for access control
        files:          Dict[str, str],
    ) -> dict:
        region = namespace_id or self.default_region
        client = self._client(region)
        repo_url = f"https://git-codecommit.{region}.amazonaws.com/v1/repos/{name}"

        logger.info("AWS CodeCommit: creating repo '%s' in %s", name, region)

        try:
            client.create_repository(
                repositoryName=name,
                repositoryDescription=description,
                tags={"CreatedBy": "DevOps Self-Service Portal"},
            )
        except ClientError as exc:
            raise RuntimeError(
                f"Failed to create CodeCommit repository: {exc.response['Error']['Message']}"
            ) from exc

        if files:
            sorted_files = sorted(files.items())

            # put_file creates the initial commit on an empty repository
            first_path, first_content = sorted_files[0]
            logger.info("CodeCommit: creating initial commit with '%s'", first_path)
            init_resp = client.put_file(
                repositoryName=name,
                branchName=default_branch,
                fileContent=first_content.encode("utf-8"),
                filePath=first_path,
                commitMessage="feat: initial scaffold from DevOps Self-Service Portal",
                name="DevOps Portal",
                email="devops@portal.internal",
            )
            parent_commit_id = init_resp["commitId"]

            # Remaining files in one additional commit
            if len(sorted_files) > 1:
                logger.info(
                    "CodeCommit: committing %d remaining files", len(sorted_files) - 1
                )
                client.create_commit(
                    repositoryName=name,
                    branchName=default_branch,
                    parentCommitId=parent_commit_id,
                    authorName="DevOps Portal",
                    email="devops@portal.internal",
                    commitMessage="feat: initial scaffold (remaining files)",
                    putFiles=[
                        {
                            "filePath":    path,
                            "fileContent": content.encode("utf-8"),
                        }
                        for path, content in sorted_files[1:]
                    ],
                )

        return {
            "project_id":     name,
            "project_name":   name,
            "project_url":    repo_url,
            "namespace_path": region,
        }

    # ── Regions (used as "namespaces") ────────────────────────────────────────

    def list_namespaces(self, search: str = "") -> List[dict]:
        if not search:
            return _REGIONS
        q = search.lower()
        return [r for r in _REGIONS if q in r["full_path"] or q in r["name"].lower()]

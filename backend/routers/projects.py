"""
Projects endpoint — creates a repository on the chosen platform and commits
the scaffold files sent by the frontend.
"""

import logging

from fastapi import APIRouter, HTTPException

from models.project import CreateProjectRequest, CreateProjectResponse
from services.platforms import get_platform_service

logger = logging.getLogger(__name__)
router  = APIRouter(tags=["projects"])


@router.post("/projects", response_model=CreateProjectResponse, status_code=201)
def create_project(request: CreateProjectRequest):
    """
    Full workflow:
      1. Select the platform service based on request.platform
      2. Call service.create_repository() — creates the repo + commits files atomically
      3. Return the project URL and metadata
    """
    logger.info(
        "Creating '%s' on %s in namespace '%s' (%d files)",
        request.projectName,
        request.platform,
        request.namespaceId,
        len(request.files),
    )

    try:
        svc    = get_platform_service(request.platform)
        result = svc.create_repository(
            name           = request.projectName,
            namespace_id   = request.namespaceId,
            description    = request.description,
            default_branch = request.defaultBranch,
            visibility     = request.visibility,
            files          = request.files,
        )

        return CreateProjectResponse(
            **result,
            platform   = request.platform,
            file_count = len(request.files),
        )

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "Unexpected error creating '%s' on %s", request.projectName, request.platform
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc

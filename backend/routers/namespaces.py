"""
Namespaces endpoint — returns the list of namespace options for the
namespace/org/workspace dropdown in the frontend form.

Each platform has a different concept of "namespace":
  GitLab      → groups + personal namespace
  GitHub      → organizations + authenticated user
  Bitbucket   → workspaces
  AWS         → list of available regions
"""

import logging
from typing import List

from fastapi import APIRouter, HTTPException, Query

from models.project import NamespaceItem
from services.platforms import get_platform_service

logger = logging.getLogger(__name__)
router  = APIRouter(tags=["namespaces"])


@router.get("/namespaces", response_model=List[NamespaceItem])
def list_namespaces(
    platform: str = Query(..., description="Platform id: gitlab | github | bitbucket | aws-codepipeline"),
    search:   str = Query(default="", description="Optional search/filter string"),
):
    """Return namespaces for the given platform."""
    try:
        svc = get_platform_service(platform)
        return svc.list_namespaces(search=search)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to list namespaces for platform '%s'", platform)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

"""
Projects router — create + list repositories.

POST /api/projects
  Full workflow:
    1. Inject server-side scaffold files (PR/MR template, catalog-info.yaml)
    2. Create the repository on the chosen platform and commit all files
    3. Configure branch protection rules (non-fatal if it fails)
    4. Persist the project record to the database

GET /api/projects
  Returns all persisted project records (Dashboard data).
"""

import logging
import textwrap
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import ProjectRecord
from models.project import CreateProjectRequest, CreateProjectResponse, ProjectListItem
from services.platforms import get_platform_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["projects"])


# ─────────────────────────────────────────────────────────────────────────────
# File injection helpers
# ─────────────────────────────────────────────────────────────────────────────

_PR_TEMPLATE_MD = textwrap.dedent("""\
    ## What does this PR do?
    <!-- Brief, clear description of the change -->

    ## Why is this change needed?
    <!-- Link to ticket / user story if applicable -->

    ## How was this tested?
    <!-- Unit tests, manual steps, environment -->

    ## Checklist
    - [ ] Tests added / updated
    - [ ] Documentation updated
    - [ ] No breaking changes, or breaking changes are documented
    - [ ] CI pipeline passes
    - [ ] Reviewed for security implications
""")

_PLATFORM_PR_PATHS = {
    "github":    ".github/PULL_REQUEST_TEMPLATE.md",
    "gitlab":    ".gitlab/merge_request_templates/Default.md",
    "bitbucket": None,           # Bitbucket has no native PR template file
    "aws-codepipeline": None,
}


def _inject_pr_template(platform: str, files: dict) -> dict:
    """Add PR/MR template file if not already provided."""
    path = _PLATFORM_PR_PATHS.get(platform)
    if path and path not in files:
        files[path] = _PR_TEMPLATE_MD
    return files


def _generate_catalog_info(req: CreateProjectRequest) -> str:
    """Generate a Backstage catalog-info.yaml for the project."""
    platform_annotation = {
        "gitlab":           f"gitlab.com/project-slug: {req.namespaceId}/{req.projectName}",
        "github":           f"github.com/project-slug: {req.namespaceId}/{req.projectName}",
        "bitbucket":        f"bitbucket.org/repo-url: https://bitbucket.org/{req.namespaceId}/{req.projectName}",
        "aws-codepipeline": f"amazon.aws.com/codecommit-url: https://git-codecommit.{req.namespaceId}.amazonaws.com/v1/repos/{req.projectName}",
    }.get(req.platform, "")

    tags = []
    if req.projectTypeId:
        tags.append(req.projectTypeId)
    if req.iacId and req.iacId != "none":
        tags.append(req.iacId)
    if req.infraId and req.infraId != "none":
        tags.append(req.infraId)

    tags_yaml = "\n".join(f"    - {t}" for t in tags) if tags else "    []"

    return textwrap.dedent(f"""\
        apiVersion: backstage.io/v1alpha1
        kind: Component
        metadata:
          name: {req.projectName}
          description: "{req.description or req.projectName}"
          annotations:
            {platform_annotation}
            backstage.io/techdocs-ref: dir:.
          tags:
        {tags_yaml}
          labels:
            platform: devops-portal
            cost-center: "{req.costCenter or 'unknown'}"
            team: "{req.team or 'unknown'}"
        spec:
          type: service
          lifecycle: development
          owner: {req.team or 'unknown'}
          system: platform
    """)


def _inject_catalog_info(req: CreateProjectRequest, files: dict) -> dict:
    """Add catalog-info.yaml if not already present."""
    if "catalog-info.yaml" not in files:
        files["catalog-info.yaml"] = _generate_catalog_info(req)
    return files


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/projects
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/projects", response_model=CreateProjectResponse, status_code=201)
def create_project(
    request: CreateProjectRequest,
    db: Session = Depends(get_db),
):
    logger.info(
        "Creating '%s' on %s in namespace '%s' (%d files)",
        request.projectName,
        request.platform,
        request.namespaceId,
        len(request.files),
    )

    try:
        svc = get_platform_service(request.platform)

        # ── 1. Inject server-side scaffold files ──────────────────────────────
        files = dict(request.files)
        files = _inject_pr_template(request.platform, files)
        files = _inject_catalog_info(request, files)

        # ── 2. Create the repository ──────────────────────────────────────────
        result = svc.create_repository(
            name           = request.projectName,
            namespace_id   = request.namespaceId,
            description    = request.description,
            default_branch = request.defaultBranch,
            visibility     = request.visibility,
            files          = files,
        )

        # ── 3. Configure branch protection (non-fatal) ────────────────────────
        svc.configure_branch_protection(
            project_id   = result["project_id"],
            namespace_id = request.namespaceId,
            branch       = request.defaultBranch,
            repo_name    = request.projectName,
        )

        # ── 4. Persist to database ────────────────────────────────────────────
        record = ProjectRecord(
            project_id        = result["project_id"],
            project_name      = result["project_name"],
            platform          = request.platform,
            namespace_path    = result["namespace_path"],
            project_url       = result["project_url"],
            description       = request.description,
            file_count        = len(files),
            default_branch    = request.defaultBranch,
            visibility        = request.visibility,
            project_type_id   = request.projectTypeId,
            iac_id            = request.iacId,
            infra_id          = request.infraId,
            cicd_id           = request.cicdId,
            selected_features = request.selectedFeatures,
            team              = request.team,
            cost_center       = request.costCenter,
            created_at        = datetime.utcnow(),
            status            = "active",
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.info("Persisted project record id=%d", record.id)

        return CreateProjectResponse(
            **result,
            platform   = request.platform,
            file_count = len(files),
        )

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "Unexpected error creating '%s' on %s", request.projectName, request.platform
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/projects
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=List[ProjectListItem])
def list_projects(
    db:       Session = Depends(get_db),
    platform: Optional[str] = Query(default=None, description="Filter by platform"),
    team:     Optional[str] = Query(default=None, description="Filter by team"),
    search:   Optional[str] = Query(default=None, description="Search by project name"),
    limit:    int           = Query(default=100, ge=1, le=500),
    skip:     int           = Query(default=0, ge=0),
):
    """Return all persisted project records, newest first."""
    query = db.query(ProjectRecord).filter(ProjectRecord.status == "active")

    if platform:
        query = query.filter(ProjectRecord.platform == platform)
    if team:
        query = query.filter(ProjectRecord.team == team)
    if search:
        query = query.filter(ProjectRecord.project_name.ilike(f"%{search}%"))

    records = query.order_by(ProjectRecord.created_at.desc()).offset(skip).limit(limit).all()
    return [ProjectListItem(**r.to_dict()) for r in records]


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/projects/{project_id}  (soft-delete)
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/projects/{project_id}", status_code=204)
def archive_project(
    project_id: str,
    db: Session = Depends(get_db),
):
    """Soft-delete (archive) a project record. Does not touch the remote repo."""
    record = db.query(ProjectRecord).filter(ProjectRecord.project_id == project_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Project not found")
    record.status = "archived"
    db.commit()

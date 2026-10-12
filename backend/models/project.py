from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class CreateProjectRequest(BaseModel):
    """
    Payload sent by the portal when the user clicks "Create Project".

    The frontend renders all scaffold files locally (preview = source of truth)
    and sends the complete file tree here.  The backend's job is to:
      1. Inject any server-side files (PR templates, catalog-info.yaml)
      2. Create the repository on the chosen platform and commit the files
      3. Configure branch protection rules
      4. Persist the project record to the database
    """

    platform: Literal["gitlab", "github", "bitbucket", "aws-codepipeline"] = Field(
        ..., description="Hosting + CI platform"
    )
    projectName: str = Field(..., min_length=1, max_length=100)
    namespaceId: str = Field(
        ...,
        description=(
            "GitLab: numeric namespace ID  |  "
            "GitHub: org or username  |  "
            "Bitbucket: workspace slug  |  "
            "AWS: region (e.g. eu-west-2)"
        ),
    )
    description: str   = Field(default="", max_length=500)
    defaultBranch: str = Field(default="main")
    visibility: Literal["private", "internal", "public"] = Field(default="private")

    # Rendered scaffold files { "path/to/file.py": "file content", ... }
    files: Dict[str, str] = Field(default_factory=dict)

    # Selected template options — stored in DB for Dashboard + clone
    projectTypeId: Optional[str] = Field(default=None)
    iacId:         Optional[str] = Field(default=None)
    infraId:       Optional[str] = Field(default=None)
    cicdId:        Optional[str] = Field(default=None)
    selectedFeatures: List[str] = Field(default_factory=list)

    # Governance
    team:       Optional[str] = Field(default=None, max_length=100)
    costCenter: Optional[str] = Field(default=None, max_length=50)


class CreateProjectResponse(BaseModel):
    """Returned after successful repository creation."""

    project_id:    str
    project_name:  str
    project_url:   str
    namespace_path: str
    platform:      str
    file_count:    int


class NamespaceItem(BaseModel):
    id:        str   # Numeric string (GitLab), slug/username (GitHub/Bitbucket), region (AWS)
    name:      str   # Display name
    full_path: str   # Full path shown in the dropdown
    kind:      str   # 'group' | 'user' | 'workspace' | 'region'


class ProjectListItem(BaseModel):
    """Lightweight project record for the Dashboard."""

    id:             int
    project_id:     str
    project_name:   str
    platform:       str
    namespace_path: str
    project_url:    str
    description:    str
    file_count:     int
    project_type_id:  Optional[str]
    iac_id:           Optional[str]
    infra_id:         Optional[str]
    cicd_id:          Optional[str]
    selected_features: List[str]
    team:             Optional[str]
    cost_center:      Optional[str]
    created_at:       Optional[str]
    status:           str

"""
SQLAlchemy ORM models for the portal database.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from database import Base


class ProjectRecord(Base):
    """One row per created repository."""

    __tablename__ = "projects"

    id             = Column(Integer, primary_key=True, index=True)
    project_id     = Column(String, unique=True, index=True)   # platform-assigned ID
    project_name   = Column(String, nullable=False, index=True)
    platform       = Column(String, nullable=False)            # gitlab|github|bitbucket|aws-codepipeline
    namespace_path = Column(String, nullable=False)
    project_url    = Column(String, nullable=False)
    description    = Column(Text, default="")
    file_count     = Column(Integer, default=0)
    default_branch = Column(String, default="main")
    visibility     = Column(String, default="private")

    # Selected template options (stored for Dashboard/clone)
    project_type_id    = Column(String, nullable=True)
    iac_id             = Column(String, nullable=True)
    infra_id           = Column(String, nullable=True)
    cicd_id            = Column(String, nullable=True)
    selected_features  = Column(JSON, default=list)

    # Governance metadata
    team        = Column(String, nullable=True)
    cost_center = Column(String, nullable=True)
    created_by  = Column(String, nullable=True)   # reserved for auth

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    status     = Column(String, default="active")  # active | archived

    def to_dict(self) -> dict:
        return {
            "id":               self.id,
            "project_id":       self.project_id,
            "project_name":     self.project_name,
            "platform":         self.platform,
            "namespace_path":   self.namespace_path,
            "project_url":      self.project_url,
            "description":      self.description,
            "file_count":       self.file_count,
            "default_branch":   self.default_branch,
            "visibility":       self.visibility,
            "project_type_id":  self.project_type_id,
            "iac_id":           self.iac_id,
            "infra_id":         self.infra_id,
            "cicd_id":          self.cicd_id,
            "selected_features": self.selected_features or [],
            "team":             self.team,
            "cost_center":      self.cost_center,
            "created_by":       self.created_by,
            "created_at":       self.created_at.isoformat() if self.created_at else None,
            "status":           self.status,
        }

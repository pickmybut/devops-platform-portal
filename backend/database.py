"""
Database setup — SQLAlchemy with SQLite (dev) or PostgreSQL (prod).

Swap via DATABASE_URL env var:
  sqlite:///./portal.db        (default — local file)
  postgresql://user:pw@host/db (production)
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./portal.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables on startup (idempotent)."""
    from models import db_models  # noqa: F401 — registers ORM models
    Base.metadata.create_all(bind=engine)

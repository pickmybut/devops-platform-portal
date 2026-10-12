"""
Platform API — DevOps Self-Service Portal backend.

Receives rendered scaffold files from the frontend, creates repositories
on the chosen platform (GitLab, GitHub, Bitbucket, AWS CodeCommit),
configures branch protection, and persists project records to the database.
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables
from routers import health, namespaces, projects

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all database tables exist before serving requests
    logger.info("Platform API starting — creating database tables if needed")
    create_tables()
    logger.info("Platform API ready — supported platforms: GitLab, GitHub, Bitbucket, AWS CodeCommit")
    yield
    logger.info("Platform API shutting down")


app = FastAPI(
    title="Platform API",
    description="DevOps Self-Service — multi-platform repository scaffolding",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
_cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router,     prefix="/api")
app.include_router(namespaces.router, prefix="/api")
app.include_router(projects.router,   prefix="/api")

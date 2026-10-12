"""
Platform API — DevOps Self-Service Portal backend.

Receives rendered scaffold files from the frontend and creates repositories
on the chosen platform (GitLab, GitHub, Bitbucket, AWS CodeCommit).
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import health, namespaces, projects

# Load .env before anything reads os.getenv()
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Platform API starting — supported platforms: GitLab, GitHub, Bitbucket, AWS CodeCommit")
    yield
    logger.info("Platform API shutting down")


app = FastAPI(
    title="Platform API",
    description="DevOps Self-Service — multi-platform repository scaffolding",
    version="1.0.0",
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
app.include_router(health.router,      prefix="/api")
app.include_router(namespaces.router,  prefix="/api")
app.include_router(projects.router,    prefix="/api")

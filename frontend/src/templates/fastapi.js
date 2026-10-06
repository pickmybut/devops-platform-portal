/**
 * FastAPI project template.
 * Async Python API with health endpoint, pytest, Docker.
 */

export function buildFastApiFiles({ projectName, appName, description, config = {} }) {
  const pyVer  = config.pythonVersion ?? '3.14';
  const db     = config.database      ?? 'postgresql';
  const auth   = config.auth          ?? 'none';

  const needsPostgres = db === 'postgresql';
  const needsMysql    = db === 'mysql';
  const needsDb       = db !== 'none';

  const dbDep = needsPostgres ? 'asyncpg==0.30.0\nsqlalchemy[asyncio]==2.0.36\nalembic==1.14.0'
              : needsMysql    ? 'aiomysql==0.2.0\nsqlalchemy[asyncio]==2.0.36\nalembic==1.14.0'
              : '';

  const dbEnvVar = needsPostgres ? `DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/${appName}`
                 : needsMysql    ? `DATABASE_URL=mysql+aiomysql://user:pass@localhost:3306/${appName}`
                 : '';

  const authDeps = auth === 'jwt' ? 'python-jose[cryptography]==3.3.0\npasslib[bcrypt]==1.7.4' : '';

  return [
    {
      path: 'main.py',
      content: `"""${projectName} — ${description || 'FastAPI service'}"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialise DB connections, caches, etc.
    yield
    # Shutdown: close connections


app = FastAPI(title="${projectName}", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)


@app.get("/")
def root():
    return {"service": "${projectName}", "status": "ok"}
`,
    },
    {
      path: 'routers/__init__.py',
      content: '',
    },
    {
      path: 'routers/health.py',
      content: `from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {"status": "ok"}
`,
    },
    {
      path: 'models/__init__.py',
      content: '',
    },
    {
      path: 'requirements.txt',
      content: `fastapi==0.115.5
uvicorn[standard]==0.32.1
pydantic==2.10.3
python-dotenv==1.0.1
${dbDep}
${authDeps}
`.trim() + '\n',
    },
    {
      path: 'requirements-dev.txt',
      content: `-r requirements.txt

pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.1
ruff==0.8.4
`,
    },
    {
      path: 'Dockerfile',
      content: `FROM python:${pyVer}-slim AS build
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

FROM python:${pyVer}-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY --from=build /usr/local/lib/python${pyVer}/site-packages /usr/local/lib/python${pyVer}/site-packages
COPY --from=build /usr/local/bin /usr/local/bin
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
    },
    {
      path: '.env.example',
      content: `# App
DEBUG=true
${dbEnvVar ? '\n# Database\n' + dbEnvVar : ''}
${auth === 'jwt' ? '\n# Auth\nSECRET_KEY=change-me\nALGORITHM=HS256\nACCESS_TOKEN_EXPIRE_MINUTES=30' : ''}
`.trim() + '\n',
    },
    {
      path: '.gitignore',
      content: `__pycache__/\n*.py[cod]\n.venv/\nvenv/\n.env\n*.log\n.DS_Store\n.pytest_cache/\nhtmlcov/\n.coverage\n`,
    },
    {
      path: 'pytest.ini',
      content: `[pytest]\nasyncio_mode = auto\ntestpaths = tests\naddopts = -q --strict-markers\n`,
    },
    {
      path: 'tests/__init__.py',
      content: '',
    },
    {
      path: 'tests/test_health.py',
      content: `import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_health_returns_ok():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
`,
    },
    {
      path: 'README.md',
      content: `# ${projectName}

${description || 'FastAPI service.'}

## Stack

Python ${pyVer} · FastAPI · ${db !== 'none' ? db.charAt(0).toUpperCase() + db.slice(1) + ' · ' : ''}Docker

## Quick start

\`\`\`bash
cp .env.example .env
docker compose up
# API:  http://localhost:8000
# Docs: http://localhost:8000/docs
\`\`\`

## Tests

\`\`\`bash
pip install -r requirements-dev.txt
pytest -v
\`\`\`
`,
    },
  ];
}

export const FASTAPI_PREVIEW_VARS = {
  projectName: 'my-fastapi-service',
  appName:     'my_fastapi_service',
  description: 'Async Python API built with FastAPI',
  config:      { pythonVersion: '3.14', database: 'postgresql', auth: 'none' },
};

export const FASTAPI_META = {
  id:          'fastapi',
  label:       'FastAPI',
  description: 'Python 3.14 · FastAPI · pytest-asyncio · Docker',
  fileCount:   13,
};

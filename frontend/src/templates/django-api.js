/**
 * Django API scaffold template.
 *
 * Call buildDjangoApiFiles({ projectName, appName, description }) to get the
 * full file list.  Use DJANGO_API_PREVIEW to show a preview before the user
 * has typed a project name.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Template builder — returns [{ path, content }]
// ─────────────────────────────────────────────────────────────────────────────

// Maps semver "family" → latest known patch version for pinning
const DJANGO_PINS = { '6.1': '6.1.1', '6.0': '6.0.9', '5.2': '5.2.18' };
const PYTHON_IMAGES = { '3.14': '3.14-slim', '3.13': '3.13-slim', '3.12': '3.12-slim' };

// Database-specific deps / driver
const DB_DEPS = {
  postgresql: 'psycopg2-binary==2.9.10',
  mysql:      'PyMySQL==1.1.1',
  sqlite:     '',          // built-in, no extra dep needed
};

const DB_URL_EXAMPLE = {
  postgresql: (name) => `postgres://postgres:postgres@localhost:5432/${name}`,
  mysql:      (name) => `mysql+pymysql://root:root@localhost:3306/${name}`,
  sqlite:     ()     => 'sqlite:///db.sqlite3',
};

const DB_COMPOSE_SERVICE = {
  postgresql: (name) => `
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${name}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data`,
  mysql: (name) => `
  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: ${name}
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - mysql_data:/var/lib/mysql`,
  sqlite: () => '',
};

const DB_VOLUMES = {
  postgresql: '\nvolumes:\n  postgres_data:',
  mysql:      '\nvolumes:\n  mysql_data:',
  sqlite:     '',
};

export function buildDjangoApiFiles({ projectName, appName, description, config = {} }) {
  const djangoVersion = config.djangoVersion ?? '5.1';
  const pythonVersion = config.pythonVersion ?? '3.12';
  const database      = config.database      ?? 'postgresql';

  const djangoPin  = DJANGO_PINS[djangoVersion]   ?? '5.1.4';
  const pythonImg  = PYTHON_IMAGES[pythonVersion]  ?? '3.12-slim';
  const dbDep      = DB_DEPS[database];
  const dbUrlEx    = DB_URL_EXAMPLE[database](appName);
  const dbCompose  = DB_COMPOSE_SERVICE[database](appName);
  const dbVolumes  = DB_VOLUMES[database];
  const hasDb      = database !== 'sqlite';
  return [
    // ── Root files ──────────────────────────────────────────────────────────
    {
      path: 'manage.py',
      content: `#!/usr/bin/env python3
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
`,
    },

    {
      path: 'requirements.txt',
      content: `Django==${djangoPin}
djangorestframework==3.15.2
django-cors-headers==4.6.0
django-environ==0.11.2
drf-spectacular==0.27.2
gunicorn==23.0.0
${dbDep ? dbDep + '\n' : ''}whitenoise==6.8.2
`,
    },

    {
      path: 'requirements-dev.txt',
      content: `-r requirements.txt

pytest==8.3.4
pytest-django==4.9.0
pytest-cov==6.0.0
factory-boy==3.3.1
faker==33.1.0
ruff==0.8.4
pre-commit==4.0.1
httpx==0.28.1
`,
    },

    {
      path: 'Dockerfile',
      content: `# ── Build stage ────────────────────────────────────────────────────────────
FROM python:${pythonImg} AS build

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ── Runtime stage ───────────────────────────────────────────────────────────
FROM python:${pythonImg} AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    DJANGO_SETTINGS_MODULE=config.settings.production

COPY --from=build /usr/local/lib/python${pythonVersion}/site-packages /usr/local/lib/python${pythonVersion}/site-packages
COPY --from=build /usr/local/bin /usr/local/bin
COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
`,
    },

    {
      path: 'docker-compose.yml',
      content: `version: '3.9'

services:
  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.development
      - DATABASE_URL=${database === 'sqlite' ? 'sqlite:///db.sqlite3' : `${database === 'postgresql' ? 'postgres' : 'mysql+pymysql'}://\${DB_USER}:\${DB_PASS}@db:${database === 'postgresql' ? '5432' : '3306'}/${appName}`}
    ${hasDb ? `depends_on:
      db:
        condition: service_healthy` : ''}
${dbCompose}
${dbVolumes}
`,
    },

    {
      path: '.env.example',
      content: `# Django
SECRET_KEY=replace-me-with-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=${dbUrlEx}

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
`,
    },

    {
      path: '.gitignore',
      content: `# Python
__pycache__/
*.py[cod]
*.pyo
*.pyd
.Python
*.egg
*.egg-info/
dist/
build/
eggs/
.eggs/

# Virtual environments
.venv/
venv/
ENV/

# Django
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal
media/
staticfiles/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
.coverage
htmlcov/
.pytest_cache/
.mypy_cache/

# OS
.DS_Store
Thumbs.db
`,
    },

    {
      path: '.gitlab-ci.yml',
      content: `stages:
  - lint
  - test
  - build

variables:
  PYTHON_IMAGE: python:3.12-slim
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  POSTGRES_DB: ${appName}_test
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres
  DATABASE_URL: "postgres://postgres:postgres@postgres:5432/${appName}_test"
  DJANGO_SETTINGS_MODULE: config.settings.development
  SECRET_KEY: ci-test-secret-key

.python_cache:
  cache:
    key: "\${CI_COMMIT_REF_SLUG}-pip"
    paths:
      - .cache/pip/

Lint:
  stage: lint
  image: $PYTHON_IMAGE
  extends: .python_cache
  script:
    - pip install ruff --cache-dir .cache/pip
    - ruff check .
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

Test:
  stage: test
  image: $PYTHON_IMAGE
  extends: .python_cache
  services:
    - postgres:16-alpine
  script:
    - pip install -r requirements-dev.txt --cache-dir .cache/pip
    - pytest --cov=apps --cov-report=xml --cov-report=term-missing -v
  coverage: '/TOTAL.*\\s(\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

Build Docker Image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
`,
    },

    {
      path: 'README.md',
      content: `# ${projectName}

${description || 'A Django REST Framework API service.'}

## Stack

Python ${pythonVersion} · Django ${djangoVersion} · Django REST Framework · ${database === 'postgresql' ? 'PostgreSQL' : database === 'mysql' ? 'MySQL' : 'SQLite'} · Docker · drf-spectacular

## Quick start

\`\`\`bash
# 1. Copy and fill in env vars
cp .env.example .env

# 2. Start with Docker Compose
docker compose up

# API:  http://localhost:8000
# Docs: http://localhost:8000/api/schema/swagger-ui/
\`\`\`

## Local development (without Docker)

\`\`\`bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver
\`\`\`

## Running tests

\`\`\`bash
pytest --cov=apps -v
\`\`\`

## Project structure

\`\`\`
config/             Django project configuration
  settings/
    base.py         Shared settings
    development.py  Local development overrides
    production.py   Production overrides
  urls.py           Root URL configuration

apps/               Django applications
  health/           Health check endpoint → GET /health/
\`\`\`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | \`/health/\` | Health check |
| GET | \`/api/schema/\` | OpenAPI schema |
| GET | \`/api/schema/swagger-ui/\` | Swagger UI |
| GET | \`/api/schema/redoc/\` | ReDoc |

## CI/CD

The GitLab pipeline runs on every MR and push to main:
1. **Lint** — ruff static analysis
2. **Test** — pytest with coverage (PostgreSQL service)
3. **Build** — Docker image pushed to GitLab Container Registry
`,
    },

    // ── config/ ─────────────────────────────────────────────────────────────
    {
      path: 'config/__init__.py',
      content: '',
    },

    {
      path: 'config/urls.py',
      content: `from django.conf import settings
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path('health/', include('apps.health.urls')),
    # OpenAPI / Swagger
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    from django.contrib import admin
    urlpatterns += [path('admin/', admin.site.urls)]
`,
    },

    {
      path: 'config/wsgi.py',
      content: `"""WSGI config for ${projectName}."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
application = get_wsgi_application()
`,
    },

    {
      path: 'config/asgi.py',
      content: `"""ASGI config for ${projectName}."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
application = get_asgi_application()
`,
    },

    {
      path: 'config/settings/__init__.py',
      content: '',
    },

    {
      path: 'config/settings/base.py',
      content: `"""
Base Django settings for ${projectName}.
All other settings files import from here.
"""
from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ['*']),
)

# Read .env file when present
environ.Env.read_env(BASE_DIR / '.env')

# ── Security ────────────────────────────────────────────────────────────────
SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

# ── Applications ────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'django.contrib.auth',

    # Third-party
    'rest_framework',
    'corsheaders',
    'drf_spectacular',

    # Local apps
    'apps.health',
]

# ── Middleware ───────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ── Database ────────────────────────────────────────────────────────────────
DATABASES = {
    'default': env.db('DATABASE_URL', default='sqlite:///db.sqlite3')
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Internationalisation ────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ── Static files ─────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
CORS_ALLOW_ALL_ORIGINS = DEBUG  # allow all in development

# ── OpenAPI (drf-spectacular) ────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': '${projectName} API',
    'DESCRIPTION': '${description || ''}',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# ── Templates (needed for admin / browsable API) ─────────────────────────────
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]
`,
    },

    {
      path: 'config/settings/development.py',
      content: `"""Development settings — DEBUG on, SQLite fallback, verbose logging."""
from .base import *  # noqa: F401,F403

DEBUG = True

INSTALLED_APPS += ['django.contrib.admin']  # noqa: F405

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}
`,
    },

    {
      path: 'config/settings/production.py',
      content: `"""Production settings — security hardened, no DEBUG."""
from .base import *  # noqa: F401,F403

DEBUG = False

# Security headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'format': '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
`,
    },

    // ── apps/ ─────────────────────────────────────────────────────────────
    {
      path: 'apps/__init__.py',
      content: '',
    },

    {
      path: 'apps/health/__init__.py',
      content: '',
    },

    {
      path: 'apps/health/apps.py',
      content: `from django.apps import AppConfig


class HealthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.health'
    label = 'health'
`,
    },

    {
      path: 'apps/health/urls.py',
      content: `from django.urls import path
from . import views

app_name = 'health'

urlpatterns = [
    path('', views.health_check, name='health-check'),
]
`,
    },

    {
      path: 'apps/health/views.py',
      content: `from django.db import connection
from django.db.utils import OperationalError
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def health_check(request):
    """
    Returns 200 when the service is healthy.
    Checks database connectivity — returns 503 if the database is unreachable.
    """
    db_status = 'ok'
    try:
        connection.ensure_connection()
    except OperationalError:
        db_status = 'unavailable'

    status_code = 200 if db_status == 'ok' else 503
    return Response(
        {
            'status': 'ok' if db_status == 'ok' else 'degraded',
            'checks': {
                'database': db_status,
            },
        },
        status=status_code,
    )
`,
    },

    // ── Tests ─────────────────────────────────────────────────────────────
    {
      path: 'tests/__init__.py',
      content: '',
    },

    {
      path: 'tests/test_health.py',
      content: `import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_health_check_returns_200(client):
    url = reverse('health:health-check')
    response = client.get(url)
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
    assert response.json()['checks']['database'] == 'ok'


@pytest.mark.django_db
def test_health_check_method_not_allowed(client):
    url = reverse('health:health-check')
    response = client.post(url)
    assert response.status_code == 405
`,
    },

    {
      path: 'pytest.ini',
      content: `[pytest]
DJANGO_SETTINGS_MODULE = config.settings.development
python_files = tests/test_*.py
python_classes = Test*
python_functions = test_*
addopts = --strict-markers -q
`,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview — default vars used when no project name has been typed yet
// ─────────────────────────────────────────────────────────────────────────────

export const DJANGO_API_PREVIEW_VARS = {
  projectName: 'my-django-api',
  appName: 'my_django_api',
  description: 'A Django REST Framework API service',
};

export const DJANGO_API_META = {
  id: 'django-api',
  label: 'Django API',
  description: 'Django 5.1 · DRF · PostgreSQL · Docker · drf-spectacular',
  fileCount: 26,
};

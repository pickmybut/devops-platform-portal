# Platform — DevOps Self-Service Portal

An internal portal that lets developers scaffold new repositories from project templates without needing to ask the DevOps team. Choose your platform, project type, infrastructure, and CI/CD pipeline — then click **Create Project** to get a fully scaffolded repo committed in seconds.

---

## Architecture

```
platform/
├── frontend/   React MFE — the portal UI
└── backend/    FastAPI — multi-platform repo creation engine
```

---

## Frontend

**Stack:** React 19 · Tailwind CSS v4 · Zustand · Webpack Module Federation  
**Dev server:** `http://localhost:3005`

### Pages

| Page | Description |
|---|---|
| **Create Project** | 6-step form — Platform → Project Details → Project Type → IaC → Infra Architecture → CI/CD → Features → Create |
| **Dashboard** | Stats, recent projects, template usage chart |
| **CI Templates** | Browse reusable `.gitlab-ci.yml` job snippets by category |

### Create Project — step by step

| Step | What you pick |
|---|---|
| 1 · Platform | GitLab · GitHub · Bitbucket · AWS CodePipeline |
| ↳ Project Details | Repo name · Namespace/Org · Description · Visibility |
| 2 · Project Type | Django API · FastAPI · Python Lambda · Serverless · API Gateway · Java Spring Boot · Java Lambda · React MFE · React Shell · Node.js API · Node.js Lambda · .NET API |
| 3 · IaC | Python CDK · TypeScript CDK · C# CDK · Terraform · CloudFormation · Pulumi · AWS SAM · None |
| 4 · Infra Architecture | ECS Fargate · ECS on EC2 · EKS · Lambda · K8s on EC2 · S3+CloudFront · EC2 · None |
| 5 · CI/CD Pipeline | None · Basic Pipeline (adaptive — generated from your selections above) |
| 6 · Additional Features | Mend SAST · Mend SCA · GitLab SAST · Dependency Scanning · Slack Notifications · Unit Test Setup · Dockerfile · Full README |

### Live preview

The right-hand panel updates in real-time as you make selections:

- **Project Type selected** → file tree of the full scaffold (e.g. Django API: 26 files including settings, health endpoint, Dockerfile, pytest config)
- **IaC selected** → file tree of the `devops/cdk/` infrastructure (Python CDK: app.py, stacks/, tests/, cdk.json)
- **CI/CD selected** → the generated `.gitlab-ci.yml` (adapts stages based on project type + infra architecture)
- **Infra Architecture selected** → info card showing AWS resources provisioned + pipeline deploy stage

---

## Backend

**Stack:** Python 3.14 · FastAPI · python-gitlab · PyGithub · httpx · boto3  
**Dev server:** `http://localhost:8000`  
**API docs:** `http://localhost:8000/docs`

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/projects` | Create a repo and commit all scaffold files |
| `GET` | `/api/namespaces?platform=gitlab` | List namespaces / orgs / workspaces / regions |
| `GET` | `/api/health` | Health check |

### Supported platforms

| Platform | Repo creation | Namespace concept | Required credentials |
|---|---|---|---|
| **GitLab** | python-gitlab — single atomic commit via Commits API | Groups + personal namespace | `GITLAB_TOKEN` (api + write_repository scopes) |
| **GitHub** | PyGithub Git Data API — blobs → tree → commit → ref | Orgs + personal account | `GITHUB_TOKEN` (classic `repo` scope, or fine-grained Contents+Administration write) |
| **Bitbucket** | httpx REST v2 — POST `/repositories/{ws}/{slug}/src` multipart | Workspaces | `BITBUCKET_USERNAME` + `BITBUCKET_APP_PASSWORD` (Repositories: Read+Write) |
| **AWS CodeCommit** | boto3 — `put_file` (init commit) + `create_commit` (remaining files) | AWS Regions | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_DEFAULT_REGION` |

---

## Running locally

### Backend

```bash
cd platform/backend

# Create virtualenv
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure credentials
cp .env.example .env
# Fill in at least one platform token in .env

# Start
uvicorn main:app --reload --port 8000
```

**Minimum `.env` for GitLab:**
```env
GITLAB_URL=https://gitlab.your-domain.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

**For GitHub (classic token):**
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

**For Bitbucket:**
```env
BITBUCKET_USERNAME=your-username
BITBUCKET_APP_PASSWORD=xxxxxxxxxxxxxxxxxxxx
```

**For AWS CodeCommit:**
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=eu-west-2
```

> You only need to configure the platforms you intend to use. Unconfigured platforms return a clear error when selected.

### Frontend

```bash
cd platform/frontend

nvm use          # node 20 (see .nvmrc)
npm install
cp .env.example .env
# Set PLATFORM_API_URL=http://localhost:8000 (already the default)

npm start        # → http://localhost:3005
```

---

## Integrating with `velocity-shell-application`

The portal is a Webpack Module Federation remote named `velocity_microfrontend_platform`.

**1. Add to the shell's `.env`:**
```env
PLATFORM_URL=http://localhost:3005/remoteEntry.js
```

**2. Register in `velocity-shell-application/webpack.config.js`:**
```js
remotes: {
  // ... existing remotes
  platform: 'velocity_microfrontend_platform@' + process.env.PLATFORM_URL,
}
```

**3. Route is already registered** at `src/routes/app/platform/_mfe.jsx` which lazy-loads `platform/PlatformApp`.

**4. Home page tile** is already added to `src/pages/IndexPage.jsx` — the "DevOps Self-Service" card links to the portal.

---

## How repo creation works

```
User fills form → frontend renders all scaffold files locally (preview = source of truth)
                ↓
         POST /api/projects
         {
           platform: "github",
           projectName: "my-django-api",
           namespaceId: "my-org",
           files: { "README.md": "...", "manage.py": "...", ... }   ← all 26+ files
         }
                ↓
         Backend selects platform service → creates repo → commits all files atomically
                ↓
         Returns { project_url, project_name, namespace_path, file_count }
                ↓
         Success modal shows repo URL + scaffold summary
```

The frontend renders files using JavaScript template builders (same code that drives the live preview). The backend receives the complete rendered file tree and only handles the platform API calls — no template logic is duplicated.

---

## Project templates

| Template ID | Language | Files committed |
|---|---|---|
| `django-api` | Python | `manage.py`, `config/settings/{base,dev,prod}.py`, `apps/health/`, `Dockerfile`, `docker-compose.yml`, `requirements.txt`, `.gitlab-ci.yml`, `pytest.ini`, `README.md` — ~26 files |
| `python-cdk` *(IaC)* | Python | `devops/cdk/app.py`, `stacks/main_stack.py`, `constructs/`, `tests/unit/`, `cdk.json`, `requirements.txt`, `README.md` — 13 files |
| `basic` *(CI/CD)* | YAML | `.gitlab-ci.yml` — adapts stages based on project type + infra arch |

More templates (FastAPI, Java Spring Boot, React MFE, Node.js) display previews but generation is coming soon.

---

## Adding a new project template

1. Create `platform/frontend/src/templates/my-template.js`:

```js
export function buildMyTemplateFiles({ projectName, appName, description, config }) {
  return [
    { path: 'README.md', content: `# ${projectName}\n\n${description}` },
    // ... more files
  ];
}

export const MY_TEMPLATE_PREVIEW_VARS = {
  projectName: 'my-project',
  appName: 'my_project',
  description: 'Example project',
};

export const MY_TEMPLATE_META = {
  id: 'my-template',
  label: 'My Template',
  description: 'Short description for the preview header',
  fileCount: 1,
};
```

2. Register in `platform/frontend/src/templates/index.js`:

```js
import { buildMyTemplateFiles, MY_TEMPLATE_PREVIEW_VARS, MY_TEMPLATE_META } from './my-template';

export const TEMPLATE_REGISTRY = {
  // ... existing
  'my-template-id': {
    meta:        MY_TEMPLATE_META,
    previewVars: MY_TEMPLATE_PREVIEW_VARS,
    build:       buildMyTemplateFiles,
  },
};
```

3. Add the project type card to `PLATFORM_OPTIONS` in `templateCategories.js`.

The portal will automatically show the file tree preview and include the files in the creation request.

---

## Tech decisions

| Decision | Rationale |
|---|---|
| Frontend renders all files | Single source of truth — preview and actual commit use identical code |
| FastAPI backend | Thin adapter layer; all business logic is in the platform SDKs |
| No template duplication | JS builders in frontend, Python just commits whatever it receives |
| MFE pattern | Loads inside `velocity-shell-application` without a full rebuild |
| Adaptive CI/CD pipeline | One `gitlab-basic.js` generator handles all combos (Python+ECS+CDK → 13-stage pipeline) |

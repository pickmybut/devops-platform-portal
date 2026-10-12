// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY METADATA
// Each category has id, label, icon, description, required, multiple
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  {
    id: 'platform',
    label: 'Platform',
    icon: '🔧',
    description: 'Where your code is hosted and which CI/CD system runs your pipelines',
    required: true,
    multiple: false,
  },
  {
    id: 'projectType',
    label: 'Project Type',
    icon: '📦',
    description: 'The type of application or service you are building',
    required: true,
    multiple: false,
  },
  {
    id: 'iac',
    label: 'Infrastructure as Code',
    icon: '☁️',
    description: 'How infrastructure will be provisioned and managed',
    required: false,
    multiple: false,
  },
  {
    id: 'infra',
    label: 'Infrastructure Architecture',
    icon: '🏗️',
    description: 'Where and how your application will run on AWS',
    required: false,
    multiple: false,
  },
  {
    id: 'cicd',
    label: 'CI / CD Pipeline',
    icon: '⚙️',
    description: 'Your build, test and deployment pipeline template',
    required: false,
    multiple: false,
  },
  {
    id: 'features',
    label: 'Additional Features',
    icon: '✨',
    description: 'Optional add-ons — security scanning, notifications, and more',
    required: false,
    multiple: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const PLATFORM_OPTIONS = [
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: '🦊',
    description: 'GitLab.com or self-hosted — .gitlab-ci.yml pipelines',
    tags: ['GitLab CI', 'MR Pipelines', 'Self-hosted'],
    accent: '#fc6d26',
    bg: '#fff7f4',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    description: 'GitHub.com — GitHub Actions workflows',
    tags: ['GitHub Actions', 'Workflows', 'PR Checks'],
    accent: '#1f2937',
    bg: '#f9fafb',
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    icon: '🪣',
    description: 'Bitbucket Cloud — Bitbucket Pipelines',
    tags: ['Bitbucket Pipelines', 'Jira Integration'],
    accent: '#0052cc',
    bg: '#eff5ff',
  },
  {
    id: 'aws-codepipeline',
    name: 'AWS CodePipeline',
    icon: '⚡',
    description: 'AWS-native CI/CD — CodeBuild + CodeDeploy',
    tags: ['CodePipeline', 'CodeBuild', 'CodeDeploy'],
    accent: '#f97316',
    bg: '#fff7ed',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const PROJECT_TYPES = [
  {
    id: 'django-api',
    name: 'Django API',
    icon: '🌐',
    description: 'Django REST Framework with Docker',
    tags: ['Python', 'Django', 'DRF', 'Docker'],
    accent: '#3776AB',
    bg: '#f0f9ff',
    configOptions: [
      {
        id: 'djangoVersion',
        label: 'Django Version',
        type: 'select',
        choices: [
          { value: '6.1', label: 'Django 6.1', badge: 'Latest' },
          { value: '6.0', label: 'Django 6.0' },
          { value: '5.2', label: 'Django 5.2', badge: 'LTS' },
        ],
        default: '6.1',
      },
      {
        id: 'pythonVersion',
        label: 'Python Version',
        type: 'select',
        choices: [
          { value: '3.14', label: 'Python 3.14', badge: 'Latest' },
          { value: '3.13', label: 'Python 3.13' },
          { value: '3.12', label: 'Python 3.12' },
        ],
        default: '3.14',
      },
      {
        id: 'database',
        label: 'Database',
        type: 'radio',
        choices: [
          { value: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
          { value: 'mysql',      label: 'MySQL',      icon: '🐬' },
          { value: 'sqlite',     label: 'SQLite',     icon: '📦' },
        ],
        default: 'postgresql',
      },
    ],
  },
  {
    id: 'fastapi',
    name: 'FastAPI',
    icon: '⚡',
    description: 'Async Python API with FastAPI',
    tags: ['Python', 'FastAPI', 'Async'],
    accent: '#059669',
    bg: '#f0fdf4',
    configOptions: [
      {
        id: 'pythonVersion',
        label: 'Python Version',
        type: 'select',
        choices: [
          { value: '3.14', label: 'Python 3.14', badge: 'Latest' },
          { value: '3.13', label: 'Python 3.13' },
          { value: '3.12', label: 'Python 3.12' },
        ],
        default: '3.14',
      },
      {
        id: 'database',
        label: 'Database',
        type: 'radio',
        choices: [
          { value: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
          { value: 'mongodb',    label: 'MongoDB',    icon: '🍃' },
          { value: 'none',       label: 'None',       icon: '⬜' },
        ],
        default: 'postgresql',
      },
      {
        id: 'auth',
        label: 'Authentication',
        type: 'select',
        choices: [
          { value: 'none',  label: 'None' },
          { value: 'jwt',   label: 'JWT' },
          { value: 'basic', label: 'HTTP Basic' },
        ],
        default: 'none',
      },
    ],
  },
  {
    id: 'python-lambda',
    name: 'Python Lambda',
    icon: 'λ',
    description: 'AWS Lambda function in Python',
    tags: ['Python', 'Lambda', 'Serverless'],
    accent: '#f59e0b',
    bg: '#fffbeb',
    configOptions: [
      {
        id: 'pythonVersion',
        label: 'Python Version',
        type: 'select',
        choices: [
          { value: '3.14', label: 'Python 3.14', badge: 'Latest' },
          { value: '3.13', label: 'Python 3.13' },
          { value: '3.12', label: 'Python 3.12' },
        ],
        default: '3.14',
      },
      {
        id: 'trigger',
        label: 'Trigger',
        type: 'radio',
        choices: [
          { value: 'api-gateway', label: 'API Gateway',  icon: '🔀' },
          { value: 'sqs',         label: 'SQS Queue',    icon: '📬' },
          { value: 's3',          label: 'S3 Event',     icon: '🪣' },
          { value: 'scheduled',   label: 'Scheduled',    icon: '⏰' },
        ],
        default: 'api-gateway',
      },
    ],
  },
  {
    id: 'serverless',
    name: 'Serverless',
    icon: '⚡',
    description: 'AWS SAM / Serverless Framework app',
    tags: ['Serverless', 'SAM', 'API GW'],
    accent: '#ec4899',
    bg: '#fdf4ff',
    configOptions: [
      {
        id: 'framework',
        label: 'Framework',
        type: 'radio',
        choices: [
          { value: 'sam',         label: 'AWS SAM',             icon: '☁️' },
          { value: 'serverless',  label: 'Serverless Framework', icon: '⚡' },
        ],
        default: 'sam',
      },
      {
        id: 'runtime',
        label: 'Runtime',
        type: 'select',
        choices: [
          { value: 'python3.12', label: 'Python 3.12' },
          { value: 'nodejs20.x', label: 'Node.js 20' },
          { value: 'java21',     label: 'Java 21' },
        ],
        default: 'python3.12',
      },
    ],
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    icon: '🔀',
    description: 'REST or HTTP API Gateway integration',
    tags: ['API Gateway', 'REST', 'HTTP API'],
    accent: '#8b5cf6',
    bg: '#f5f3ff',
    configOptions: [
      {
        id: 'apiType',
        label: 'API Type',
        type: 'radio',
        choices: [
          { value: 'rest', label: 'REST API',  icon: '📡' },
          { value: 'http', label: 'HTTP API',  icon: '⚡' },
        ],
        default: 'rest',
      },
      {
        id: 'auth',
        label: 'Authorizer',
        type: 'select',
        choices: [
          { value: 'none',     label: 'None' },
          { value: 'iam',      label: 'IAM' },
          { value: 'cognito',  label: 'Cognito User Pool' },
          { value: 'lambda',   label: 'Lambda Authorizer' },
        ],
        default: 'none',
      },
    ],
  },
  {
    id: 'java-spring',
    name: 'Java Spring Boot',
    icon: '☕',
    description: 'Spring Boot 3 microservice with Maven',
    tags: ['Java 17', 'Spring Boot', 'Maven'],
    accent: '#ef4444',
    bg: '#fff1f2',
    configOptions: [
      {
        id: 'javaVersion',
        label: 'Java Version',
        type: 'radio',
        choices: [
          { value: '21', label: 'Java 21', badge: 'LTS' },
          { value: '17', label: 'Java 17', badge: 'LTS' },
        ],
        default: '21',
      },
      {
        id: 'buildTool',
        label: 'Build Tool',
        type: 'radio',
        choices: [
          { value: 'maven',  label: 'Maven',  icon: '📦' },
          { value: 'gradle', label: 'Gradle', icon: '🐘' },
        ],
        default: 'maven',
      },
      {
        id: 'database',
        label: 'Database',
        type: 'radio',
        choices: [
          { value: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
          { value: 'mysql',      label: 'MySQL',      icon: '🐬' },
          { value: 'h2',         label: 'H2 (dev)',   icon: '📦' },
        ],
        default: 'postgresql',
      },
    ],
  },
  {
    id: 'java-lambda',
    name: 'Java Lambda',
    icon: '☕',
    description: 'AWS Lambda function in Java',
    tags: ['Java 17', 'Lambda', 'Maven'],
    accent: '#dc2626',
    bg: '#fef2f2',
    configOptions: [
      {
        id: 'javaVersion',
        label: 'Java Version',
        type: 'radio',
        choices: [
          { value: '21', label: 'Java 21', badge: 'LTS' },
          { value: '17', label: 'Java 17', badge: 'LTS' },
        ],
        default: '21',
      },
      {
        id: 'buildTool',
        label: 'Build Tool',
        type: 'radio',
        choices: [
          { value: 'maven',  label: 'Maven',  icon: '📦' },
          { value: 'gradle', label: 'Gradle', icon: '🐘' },
        ],
        default: 'maven',
      },
    ],
  },
  {
    id: 'react-mfe',
    name: 'React MFE',
    icon: '⚛️',
    description: 'Micro-frontend with Module Federation',
    tags: ['React 19', 'MF', 'Tailwind'],
    accent: '#6366f1',
    bg: '#eef2ff',
    configOptions: [
      {
        id: 'reactVersion',
        label: 'React Version',
        type: 'radio',
        choices: [
          { value: '19', label: 'React 19', badge: 'Latest' },
          { value: '18', label: 'React 18' },
        ],
        default: '19',
      },
      {
        id: 'css',
        label: 'Styling',
        type: 'radio',
        choices: [
          { value: 'tailwind', label: 'Tailwind CSS', icon: '🎨' },
          { value: 'modules',  label: 'CSS Modules',  icon: '📄' },
          { value: 'none',     label: 'None',          icon: '⬜' },
        ],
        default: 'tailwind',
      },
    ],
  },
  {
    id: 'react-shell',
    name: 'React Shell',
    icon: '🐚',
    description: 'MF host with TanStack Router',
    tags: ['React 19', 'TanStack Router'],
    accent: '#0ea5e9',
    bg: '#f0f9ff',
    configOptions: [
      {
        id: 'reactVersion',
        label: 'React Version',
        type: 'radio',
        choices: [
          { value: '19', label: 'React 19', badge: 'Latest' },
          { value: '18', label: 'React 18' },
        ],
        default: '19',
      },
      {
        id: 'css',
        label: 'Styling',
        type: 'radio',
        choices: [
          { value: 'tailwind', label: 'Tailwind CSS', icon: '🎨' },
          { value: 'modules',  label: 'CSS Modules',  icon: '📄' },
        ],
        default: 'tailwind',
      },
    ],
  },
  {
    id: 'nodejs-api',
    name: 'Node.js API',
    icon: '🟢',
    description: 'Express / Fastify REST service',
    tags: ['Node.js', 'Express', 'Docker'],
    accent: '#16a34a',
    bg: '#f0fdf4',
    configOptions: [
      {
        id: 'nodeVersion',
        label: 'Node Version',
        type: 'select',
        choices: [
          { value: '26', label: 'Node 26', badge: 'LTS' },
          { value: '24', label: 'Node 24', badge: 'LTS' },
          { value: '22', label: 'Node 22' },
        ],
        default: '26',
      },
      {
        id: 'framework',
        label: 'Framework',
        type: 'radio',
        choices: [
          { value: 'express',  label: 'Express',  icon: '🚂' },
          { value: 'fastify',  label: 'Fastify',  icon: '⚡' },
        ],
        default: 'express',
      },
      {
        id: 'database',
        label: 'Database',
        type: 'radio',
        choices: [
          { value: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
          { value: 'mongodb',    label: 'MongoDB',    icon: '🍃' },
          { value: 'none',       label: 'None',       icon: '⬜' },
        ],
        default: 'postgresql',
      },
    ],
  },
  {
    id: 'nodejs-lambda',
    name: 'Node.js Lambda',
    icon: '🟢',
    description: 'AWS Lambda function in Node.js',
    tags: ['Node.js', 'Lambda', 'Serverless'],
    accent: '#15803d',
    bg: '#f0fdf4',
    configOptions: [
      {
        id: 'nodeVersion',
        label: 'Node Version',
        type: 'select',
        choices: [
          { value: '26', label: 'Node 26', badge: 'LTS' },
          { value: '24', label: 'Node 24', badge: 'LTS' },
          { value: '22', label: 'Node 22' },
        ],
        default: '26',
      },
      {
        id: 'trigger',
        label: 'Trigger',
        type: 'radio',
        choices: [
          { value: 'api-gateway', label: 'API Gateway', icon: '🔀' },
          { value: 'sqs',         label: 'SQS Queue',   icon: '📬' },
          { value: 's3',          label: 'S3 Event',    icon: '🪣' },
          { value: 'scheduled',   label: 'Scheduled',   icon: '⏰' },
        ],
        default: 'api-gateway',
      },
    ],
  },
  {
    id: 'dotnet-api',
    name: '.NET API',
    icon: '💜',
    description: 'ASP.NET Core minimal API',
    tags: ['.NET 8', 'C#', 'Docker'],
    accent: '#7c3aed',
    bg: '#f5f3ff',
    configOptions: [
      {
        id: 'dotnetVersion',
        label: '.NET Version',
        type: 'radio',
        choices: [
          { value: '9.0', label: '.NET 9', badge: 'Latest' },
          { value: '8.0', label: '.NET 8', badge: 'LTS' },
        ],
        default: '8.0',
      },
      {
        id: 'auth',
        label: 'Authentication',
        type: 'select',
        choices: [
          { value: 'none', label: 'None' },
          { value: 'jwt',  label: 'JWT Bearer' },
        ],
        default: 'none',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE AS CODE
// ─────────────────────────────────────────────────────────────────────────────

export const IAC_OPTIONS = [
  {
    id: 'none',
    name: 'None',
    icon: '⬜',
    description: 'No infrastructure code',
    tags: [],
    accent: '#94a3b8',
    bg: '#f8fafc',
  },
  {
    id: 'python-cdk',
    name: 'Python CDK',
    icon: '🔶',
    description: 'AWS CDK v2 in Python',
    tags: ['Python', 'CDK v2', 'AWS'],
    accent: '#f97316',
    bg: '#fff7ed',
  },
  {
    id: 'typescript-cdk',
    name: 'TypeScript CDK',
    icon: '🟦',
    description: 'AWS CDK v2 in TypeScript',
    tags: ['TypeScript', 'CDK v2', 'AWS'],
    accent: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    id: 'csharp-cdk',
    name: 'C# CDK',
    icon: '💜',
    description: 'AWS CDK v2 in C#',
    tags: ['C#', '.NET', 'CDK v2', 'AWS'],
    accent: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    id: 'terraform',
    name: 'Terraform',
    icon: '🏗️',
    description: 'HashiCorp Terraform modules',
    tags: ['Terraform', 'HCL', 'Multi-cloud'],
    accent: '#7b3fbe',
    bg: '#faf5ff',
  },
  {
    id: 'cloudformation',
    name: 'CloudFormation',
    icon: '📄',
    description: 'AWS CloudFormation template (YAML)',
    tags: ['CloudFormation', 'YAML', 'AWS'],
    accent: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    id: 'pulumi-python',
    name: 'Pulumi Python',
    icon: '🌊',
    description: 'Pulumi infrastructure in Python',
    tags: ['Pulumi', 'Python', 'Multi-cloud'],
    accent: '#8b5cf6',
    bg: '#f5f3ff',
  },
  {
    id: 'pulumi-ts',
    name: 'Pulumi TypeScript',
    icon: '🌊',
    description: 'Pulumi infrastructure in TypeScript',
    tags: ['Pulumi', 'TypeScript', 'Multi-cloud'],
    accent: '#6d28d9',
    bg: '#f5f3ff',
  },
  {
    id: 'sam',
    name: 'AWS SAM',
    icon: '⚡',
    description: 'Serverless Application Model template',
    tags: ['SAM', 'Serverless', 'Lambda'],
    accent: '#ea580c',
    bg: '#fff7ed',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────

export const INFRA_OPTIONS = [
  {
    id: 'none',
    name: 'None',
    icon: '⬜',
    description: 'No specific target — decide later',
    tags: [],
    accent: '#94a3b8',
    bg: '#f8fafc',
  },
  {
    id: 'ecs-fargate',
    name: 'ECS Fargate',
    icon: '🐳',
    description: 'Serverless containers on AWS Fargate',
    tags: ['Docker', 'ECS', 'Fargate', 'ALB'],
    accent: '#2496ed',
    bg: '#eff8ff',
  },
  {
    id: 'ecs-ec2',
    name: 'ECS on EC2',
    icon: '🖥️',
    description: 'Containers on self-managed EC2 instances via ECS',
    tags: ['Docker', 'ECS', 'EC2'],
    accent: '#f97316',
    bg: '#fff7ed',
  },
  {
    id: 'eks',
    name: 'EKS',
    icon: '⎈',
    description: 'Managed Kubernetes cluster on AWS',
    tags: ['Kubernetes', 'EKS', 'Helm'],
    accent: '#326ce5',
    bg: '#eff4ff',
  },
  {
    id: 'lambda',
    name: 'Lambda',
    icon: 'λ',
    description: 'Event-driven serverless functions',
    tags: ['Lambda', 'Serverless', 'API GW'],
    accent: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    id: 'k8s-ec2',
    name: 'K8s on EC2',
    icon: '⎈',
    description: 'Self-managed Kubernetes cluster on EC2 instances',
    tags: ['Kubernetes', 'EC2', 'Helm', 'Self-managed'],
    accent: '#1d6fa4',
    bg: '#f0f7ff',
  },
  {
    id: 's3-cloudfront',
    name: 'S3 + CloudFront',
    icon: '☁️',
    description: 'Static site or SPA served via CloudFront CDN',
    tags: ['S3', 'CloudFront', 'CDN'],
    accent: '#f97316',
    bg: '#fff7ed',
  },
  {
    id: 'ec2',
    name: 'EC2',
    icon: '💻',
    description: 'Traditional virtual machines on AWS EC2',
    tags: ['EC2', 'VMs', 'CodeDeploy'],
    accent: '#78350f',
    bg: '#fefce8',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CI / CD
// ─────────────────────────────────────────────────────────────────────────────

export const CICD_OPTIONS = [
  {
    id: 'none',
    name: 'None',
    icon: '⬜',
    description: 'No pipeline — add your own later',
    tags: [],
    accent: '#94a3b8',
    bg: '#f8fafc',
  },
  {
    id: 'basic',
    name: 'Basic Pipeline',
    icon: '⚙️',
    description: 'Adapts test + deploy stages to your Project Type and IaC selections',
    tags: ['GitLab CI', 'Adaptive'],
    accent: '#6366f1',
    bg: '#eef2ff',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL FEATURES  (multiple-select checkboxes)
// ─────────────────────────────────────────────────────────────────────────────

export const ADDITIONAL_FEATURES = [
  {
    id: 'mend-sast',
    name: 'Mend SAST',
    icon: '🔍',
    description: 'Static Application Security Testing via Mend',
    tag: 'Security',
    tagColor: '#dc2626',
    tagBg: '#fee2e2',
  },
  {
    id: 'mend-sca',
    name: 'Mend SCA',
    icon: '📦',
    description: 'Software Composition Analysis — third-party dependency CVEs',
    tag: 'Security',
    tagColor: '#dc2626',
    tagBg: '#fee2e2',
  },
  {
    id: 'gitlab-sast',
    name: 'GitLab SAST',
    icon: '🛡️',
    description: 'Built-in GitLab static security scanning',
    tag: 'Security',
    tagColor: '#dc2626',
    tagBg: '#fee2e2',
  },
  {
    id: 'dependency-scan',
    name: 'Dependency Scanning',
    icon: '🔎',
    description: 'GitLab dependency vulnerability scanning',
    tag: 'Security',
    tagColor: '#dc2626',
    tagBg: '#fee2e2',
  },
  {
    id: 'ai-code-review',
    name: 'AI Code Review',
    icon: '🤖',
    description: 'Automated PR/MR review via Amazon Bedrock (Claude) — posts inline comments',
    tag: 'AI',
    tagColor: '#7c3aed',
    tagBg: '#ede9fe',
  },
  {
    id: 'slack-notifications',
    name: 'Slack Notifications',
    icon: '💬',
    description: 'Pipeline status notifications to a Slack channel',
    tag: 'Observability',
    tagColor: '#7c3aed',
    tagBg: '#ede9fe',
  },
  {
    id: 'readme',
    name: 'Full README',
    icon: '📄',
    description: 'Detailed README with setup, usage and architecture sections',
    tag: 'Docs',
    tagColor: '#4d7c0f',
    tagBg: '#ecfccb',
  },
];

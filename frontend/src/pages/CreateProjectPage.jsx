import { useState, useMemo, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import ProjectTypeSelector from '../components/ProjectTypeSelector';
import TemplateCard from '../components/TemplateCard';
import CategorySection from '../components/CategorySection';
import SuccessModal from '../components/SuccessModal';
import TemplatePreview from '../components/TemplatePreview';
import { getTemplate, getIacTemplate, getCicdTemplate } from '../templates';
import { IAC_PREVIEWS, CICD_PREVIEWS } from '../data/sectionPreviews';
import { createProject, getNamespaces } from '../api/projectsApi';
import {
  CATEGORIES,
  PLATFORM_OPTIONS,
  IAC_OPTIONS,
  INFRA_OPTIONS,
  CICD_OPTIONS,
  ADDITIONAL_FEATURES,
} from '../data/templateCategories';
import { NAMESPACES as FALLBACK_NAMESPACES } from '../data/mockData';
import ResizableLayout from '../components/ResizableLayout';

const SLUG_RE = /^[a-z0-9][a-z0-9._-]*$/;

// Per-platform field labels + URL preview builder
const PLATFORM_FIELD_CONFIG = {
  gitlab: {
    nsLabel:       'GitLab Namespace',
    nsPlaceholder: 'Select a namespace…',
    visibility:    ['private', 'internal', 'public'],
  },
  github: {
    nsLabel:       'GitHub Organization / User',
    nsPlaceholder: 'Select an organization or user…',
    visibility:    ['private', 'public'],
  },
  bitbucket: {
    nsLabel:       'Bitbucket Workspace',
    nsPlaceholder: 'Select a workspace…',
    visibility:    ['private', 'public'],
  },
  'aws-codepipeline': {
    nsLabel:       'AWS Region',
    nsPlaceholder: 'Select a region…',
    visibility:    [],
  },
};

// ── Feature checkbox ──────────────────────────────────────────────────────────
const FeatureCheckbox = ({ feature, checked, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(feature.id)}
    className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all
      focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        checked
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
  >
    <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center
      rounded border-2 transition-colors ${
        checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 bg-white'
      }`}>
      {checked && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12.5px] font-semibold text-slate-800">
          {feature.icon} {feature.name}
        </span>
        <span
          style={{ color: feature.tagColor, background: feature.tagBg }}
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
        >
          {feature.tag}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{feature.description}</p>
    </div>
  </button>
);

// ── Summary chips ─────────────────────────────────────────────────────────────
const SelectionSummary = ({ form, active, onActivate, totalFiles }) => {
  const chips = [
    form.platform  && { label: form.platform.name,  icon: form.platform.icon,  accent: form.platform.accent,  bg: form.platform.bg  },
    form.projectType && { label: form.projectType.name, icon: form.projectType.icon, accent: form.projectType.accent, bg: form.projectType.bg },
    form.iac  && form.iac.id  !== 'none' && { label: form.iac.name,  icon: form.iac.icon,  accent: form.iac.accent,  bg: form.iac.bg  },
    form.infra && form.infra.id !== 'none' && { label: form.infra.name, icon: form.infra.icon, accent: form.infra.accent, bg: form.infra.bg },
    form.cicd && form.cicd.id !== 'none' && { label: form.cicd.name, icon: form.cicd.icon, accent: form.cicd.accent, bg: form.cicd.bg },
    ...ADDITIONAL_FEATURES.filter((f) => form.features.includes(f.id)).map((f) => ({
      label: f.name, icon: f.icon, accent: f.tagColor, bg: f.tagBg,
    })),
  ].filter(Boolean);

  if (!chips.length) return null;

  const hasFiles = totalFiles > 0;

  return (
    <button
      type="button"
      onClick={hasFiles ? onActivate : undefined}
      className={`w-full text-left rounded-xl p-3 transition-all ${
        active
          ? 'bg-indigo-50 border-2 border-indigo-400 ring-2 ring-indigo-100'
          : hasFiles
            ? 'bg-slate-50 border-2 border-transparent hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer'
            : 'bg-slate-50 border-2 border-transparent cursor-default'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Your selections
        </p>
        {hasFiles && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            active ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'
          }`}>
            📂 {totalFiles} files — click to preview all
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <span
            key={i}
            style={{ color: c.accent, background: c.bg, borderColor: c.accent + '33' }}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1
              text-[12px] font-semibold"
          >
            {c.icon} {c.label}
          </span>
        ))}
      </div>
    </button>
  );
};

// ── Right panel: empty prompt ─────────────────────────────────────────────────
const EmptyPreviewPanel = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl
    border-2 border-dashed border-slate-200 p-8 text-center">
    <span className="text-4xl opacity-30">📂</span>
    <p className="text-[13px] font-semibold text-slate-400">Preview</p>
    <p className="text-[12px] text-slate-400 max-w-[200px] leading-relaxed">
      Interact with any section to see a live preview of the files it generates.
    </p>
  </div>
);

// ── Right panel: coming soon ──────────────────────────────────────────────────
const ComingSoonPanel = ({ name }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl
    border-2 border-dashed border-amber-200 bg-amber-50/50 p-8 text-center">
    <span className="text-3xl">⏳</span>
    <p className="text-[13px] font-semibold text-amber-700">Coming soon</p>
    <p className="text-[12px] text-amber-600 max-w-[220px] leading-relaxed">
      The <strong>{name}</strong> scaffold is being built out. The repo will be created
      with a starter README for now.
    </p>
  </div>
);

// ── Right panel: platform info ────────────────────────────────────────────────
const PLATFORM_DETAILS = {
  gitlab: {
    ciFile:    '.gitlab-ci.yml',
    status:    'supported',
    features:  ['MR Pipelines', 'Environments', 'Container Registry', 'GitLab Pages', 'Mend Security Scans'],
    note:      'Full pipeline generation is available — all templates in this portal support GitLab CI.',
    color:     '#fc6d26',
  },
  github: {
    ciFile:    '.github/workflows/ci.yml',
    status:    'supported',
    features:  ['Pull Request Checks', 'GitHub Packages', 'Environments', 'OIDC for AWS', 'Dependabot'],
    note:      'GitHub Actions workflow generation is available. Select a CI/CD pipeline to scaffold your workflow.',
    color:     '#1f2937',
  },
  bitbucket: {
    ciFile:    'bitbucket-pipelines.yml',
    status:    'supported',
    features:  ['PR Pipelines', 'Deployments', 'Jira Integration', 'Pipes (pre-built steps)'],
    note:      'Bitbucket Pipelines generation is available. Select a CI/CD pipeline to scaffold your workflow.',
    color:     '#0052cc',
  },
  'aws-codepipeline': {
    ciFile:    'buildspec.yml + pipeline.json',
    status:    'supported',
    features:  ['CodeBuild', 'CodeDeploy', 'ECR Integration', 'ECS Deploy Actions', 'CloudFormation Deploy'],
    note:      'AWS CodePipeline + CodeBuild scaffolding is available. Select a CI/CD pipeline to generate buildspec.yml and pipeline definition.',
    color:     '#f97316',
  },
};

const PlatformInfoPanel = ({ platform }) => {
  const detail = PLATFORM_DETAILS[platform.id];
  if (!detail) return null;

  const isSupported = detail.status === 'supported';

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200
      bg-white p-5 shadow-sm overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center
          rounded-xl text-2xl" style={{ background: platform.bg }}>
          {platform.icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-800">{platform.name}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isSupported
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isSupported ? '✓ Supported' : '⏳ Coming soon'}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">{platform.description}</p>
        </div>
      </div>

      {/* CI file */}
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
          Pipeline file generated
        </p>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <code className="text-[12.5px] font-mono" style={{ color: detail.color }}>
            {detail.ciFile}
          </code>
        </div>
      </div>

      {/* Key features */}
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Key CI/CD features
        </p>
        <div className="flex flex-wrap gap-1.5">
          {detail.features.map((f) => (
            <span key={f} className="rounded-lg border border-slate-100 bg-slate-50
              px-2.5 py-1 text-[12px] font-medium text-slate-600">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className={`rounded-xl border px-4 py-3 mt-auto ${
        isSupported
          ? 'border-green-100 bg-green-50'
          : 'border-amber-100 bg-amber-50'
      }`}>
        <p className={`text-[12px] leading-relaxed ${
          isSupported ? 'text-green-700' : 'text-amber-700'
        }`}>
          {isSupported ? '✓' : '⏳'} {detail.note}
        </p>
      </div>
    </div>
  );
};

// ── Right panel: infra info ───────────────────────────────────────────────────
const INFRA_DETAILS = {
  'ecs-fargate':    { provisions: ['ECS Cluster', 'Fargate Task Definition', 'ALB', 'ECR Repository', 'IAM Roles', 'CloudWatch Logs'], pipeline: 'Docker Build → ECR Push → ECS service rolling update', note: 'No EC2 to manage — AWS handles all compute.' },
  'ecs-ec2':        { provisions: ['ECS Cluster', 'EC2 Auto Scaling Group', 'Task Definition', 'ALB', 'ECR Repository'], pipeline: 'Docker Build → ECR Push → ECS rolling update (EC2)', note: 'More control over instance types vs. Fargate.' },
  'eks':            { provisions: ['EKS Cluster', 'Managed Node Group', 'ECR Repository', 'OIDC Provider'], pipeline: 'Docker Build → ECR Push → kubectl apply / Helm upgrade', note: 'Full Kubernetes. Best for teams already using K8s.' },
  'lambda':         { provisions: ['Lambda Function', 'IAM Execution Role', 'CloudWatch Log Group'], pipeline: 'Package zip → CDK deploy / lambda update-function-code', note: 'Pay-per-invocation. Best for event-driven workloads.' },
  'k8s-ec2':       { provisions: ['EC2 Node Instances', 'kubeadm Cluster', 'ECR Repository', 'Helm Charts', 'Ingress Controller'], pipeline: 'Docker Build → ECR Push → Helm upgrade / kubectl apply', note: 'Full K8s control on EC2. More overhead than EKS but lower cost at scale.' },
  's3-cloudfront':  { provisions: ['S3 Bucket', 'CloudFront Distribution', 'ACM Certificate', 'Route 53 record'], pipeline: 'Build (npm) → s3 sync dist/ → CloudFront invalidation', note: 'Best for SPAs and static frontends.' },
  'ec2':            { provisions: ['EC2 Instance(s)', 'Security Groups', 'Elastic IP', 'CodeDeploy Agent'], pipeline: 'Build artifact → S3 upload → CodeDeploy deployment', note: 'Maximum control. Best for legacy apps needing full OS access.' },
};

// ── Right panel: section prompt (section active, nothing selected yet) ────────
const InfraInfoPanel = ({ infra }) => {
  const detail = INFRA_DETAILS[infra.id];
  if (!detail) return null;

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200
      bg-white p-5 shadow-sm overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <span
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center
            rounded-xl text-xl"
          style={{ background: infra.bg }}
        >
          {infra.icon}
        </span>
        <div>
          <p className="font-bold text-slate-800">{infra.name}</p>
          <p className="text-[12px] text-slate-500">{infra.description}</p>
        </div>
      </div>

      {/* What gets provisioned */}
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
          AWS resources provisioned
        </p>
        <div className="flex flex-wrap gap-1.5">
          {detail.provisions.map((p) => (
            <span key={p}
              className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1
                text-[12px] font-medium text-slate-600">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Pipeline impact */}
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Pipeline deploy stage
        </p>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="text-[12.5px] text-indigo-700 font-medium leading-relaxed">
            {detail.pipeline}
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 mt-auto">
        <p className="text-[12px] text-slate-500 leading-relaxed">
          💡 {detail.note}
        </p>
      </div>
    </div>
  );
};

const SectionPromptPanel = ({ label, icon }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl
    border-2 border-dashed border-slate-200 p-8 text-center">
    <span className="text-3xl opacity-50">{icon}</span>
    <p className="text-[13px] font-semibold text-slate-400">{label} Preview</p>
    <p className="text-[12px] text-slate-400 max-w-[200px] leading-relaxed">
      Select a <strong>{label}</strong> option on the left to preview its generated files.
    </p>
  </div>
);

// ── Pipeline Flow Diagram ─────────────────────────────────────────────────────
// Base stage definitions - dynamically customized per project type
const getStageDefinitions = (projectTypeId) => {
  // Project-type specific test/build stage customizations
  const projectStages = {
    // Python projects
    'python-fastapi': { 
      install: { icon: '📦', label: 'pip install', color: '#3776ab', bg: '#e0f2fe' },
      lint:    { icon: '🔍', label: 'flake8',      color: '#3776ab', bg: '#dbeafe' },
      test:    { icon: '🧪', label: 'pytest',      color: '#818cf8', bg: '#eef2ff' },
    },
    'python-django': { 
      install: { icon: '📦', label: 'pip install', color: '#3776ab', bg: '#e0f2fe' },
      lint:    { icon: '🔍', label: 'flake8',      color: '#3776ab', bg: '#dbeafe' },
      test:    { icon: '🧪', label: 'pytest',      color: '#818cf8', bg: '#eef2ff' },
    },
    'python-flask': { 
      install: { icon: '📦', label: 'pip install', color: '#3776ab', bg: '#e0f2fe' },
      lint:    { icon: '🔍', label: 'flake8',      color: '#3776ab', bg: '#dbeafe' },
      test:    { icon: '🧪', label: 'pytest',      color: '#818cf8', bg: '#eef2ff' },
    },
    
    // Node.js projects
    'node-express': {
      install: { icon: '📦', label: 'npm install', color: '#68a063', bg: '#ecfdf5' },
      lint:    { icon: '🔍', label: 'eslint',      color: '#4b32c3', bg: '#ede9fe' },
      test:    { icon: '🧪', label: 'jest',        color: '#818cf8', bg: '#eef2ff' },
    },
    'node-nestjs': {
      install: { icon: '📦', label: 'npm install', color: '#68a063', bg: '#ecfdf5' },
      lint:    { icon: '🔍', label: 'eslint',      color: '#4b32c3', bg: '#ede9fe' },
      test:    { icon: '🧪', label: 'jest',        color: '#818cf8', bg: '#eef2ff' },
    },
    
    // Frontend projects
    'react': {
      install: { icon: '📦', label: 'npm install', color: '#68a063', bg: '#ecfdf5' },
      lint:    { icon: '🔍', label: 'eslint',      color: '#4b32c3', bg: '#ede9fe' },
      test:    { icon: '🧪', label: 'vitest',      color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'npm build',   color: '#f59e0b', bg: '#fffbeb' },
    },
    'vue': {
      install: { icon: '📦', label: 'npm install', color: '#68a063', bg: '#ecfdf5' },
      lint:    { icon: '🔍', label: 'eslint',      color: '#4b32c3', bg: '#ede9fe' },
      test:    { icon: '🧪', label: 'vitest',      color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'npm build',   color: '#f59e0b', bg: '#fffbeb' },
    },
    'angular': {
      install: { icon: '📦', label: 'npm install', color: '#68a063', bg: '#ecfdf5' },
      lint:    { icon: '🔍', label: 'ng lint',     color: '#dd0031', bg: '#fee2e2' },
      test:    { icon: '🧪', label: 'ng test',     color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'ng build',    color: '#f59e0b', bg: '#fffbeb' },
    },
    
    // Java projects
    'java-springboot': {
      install: { icon: '📦', label: 'mvn install', color: '#007396', bg: '#e0f2fe' },
      lint:    { icon: '🔍', label: 'checkstyle',  color: '#007396', bg: '#dbeafe' },
      test:    { icon: '🧪', label: 'JUnit',       color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'mvn package', color: '#f59e0b', bg: '#fffbeb' },
    },
    'java-quarkus': {
      install: { icon: '📦', label: 'mvn install', color: '#007396', bg: '#e0f2fe' },
      lint:    { icon: '🔍', label: 'checkstyle',  color: '#007396', bg: '#dbeafe' },
      test:    { icon: '🧪', label: 'JUnit',       color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'mvn package', color: '#f59e0b', bg: '#fffbeb' },
    },
    
    // Go projects
    'go-gin': {
      install: { icon: '📦', label: 'go mod',   color: '#00add8', bg: '#e0f7fa' },
      lint:    { icon: '🔍', label: 'golint',   color: '#00add8', bg: '#e0f7fa' },
      test:    { icon: '🧪', label: 'go test',  color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'go build', color: '#f59e0b', bg: '#fffbeb' },
    },
    'go-fiber': {
      install: { icon: '📦', label: 'go mod',   color: '#00add8', bg: '#e0f7fa' },
      lint:    { icon: '🔍', label: 'golint',   color: '#00add8', bg: '#e0f7fa' },
      test:    { icon: '🧪', label: 'go test',  color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'go build', color: '#f59e0b', bg: '#fffbeb' },
    },
    
    // .NET projects
    'dotnet-webapi': {
      install: { icon: '📦', label: 'dotnet restore', color: '#512bd4', bg: '#ede9fe' },
      lint:    { icon: '🔍', label: 'dotnet format',  color: '#512bd4', bg: '#ede9fe' },
      test:    { icon: '🧪', label: 'dotnet test',    color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'dotnet build',   color: '#f59e0b', bg: '#fffbeb' },
    },
    
    // Rust projects
    'rust-actix': {
      install: { icon: '📦', label: 'cargo fetch', color: '#dea584', bg: '#fff7ed' },
      lint:    { icon: '🔍', label: 'clippy',      color: '#dea584', bg: '#fff7ed' },
      test:    { icon: '🧪', label: 'cargo test',  color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'cargo build', color: '#f59e0b', bg: '#fffbeb' },
    },

    // Terraform (IaC-only)
    'terraform': {
      install: { icon: '📦', label: 'tf init',     color: '#7b42bc', bg: '#ede9fe' },
      lint:    { icon: '🔍', label: 'tf validate', color: '#7b42bc', bg: '#ede9fe' },
      test:    { icon: '🧪', label: 'tf plan',     color: '#818cf8', bg: '#eef2ff' },
      build:   { icon: '🔨', label: 'tf apply',    color: '#f59e0b', bg: '#fffbeb' },
    },
  };

  // Get project-specific stages or defaults
  const projectSpecific = projectStages[projectTypeId] || {};
  
  // Base/common stage definitions
  return {
    source:     { icon: '📥', label: 'Source',     color: '#64748b', bg: '#f1f5f9' },
    install:    projectSpecific.install || { icon: '📦', label: 'Install',    color: '#64748b', bg: '#f1f5f9' },
    lint:       projectSpecific.lint    || { icon: '🔍', label: 'Lint',       color: '#64748b', bg: '#f1f5f9' },
    test:       projectSpecific.test    || { icon: '🧪', label: 'Test',       color: '#818cf8', bg: '#eef2ff' },
    build:      projectSpecific.build   || { icon: '🔨', label: 'Build',      color: '#f59e0b', bg: '#fffbeb' },
    package:    { icon: '📦', label: 'Package',    color: '#f59e0b', bg: '#fffbeb' },
    docker:     { icon: '🐳', label: 'Docker',     color: '#0ea5e9', bg: '#e0f2fe' },
    push:       { icon: '⬆️', label: 'Push ECR',   color: '#06b6d4', bg: '#cffafe' },
    staging:    { icon: '🚀', label: 'Staging',    color: '#10b981', bg: '#ecfdf5' },
    'load-test':{ icon: '📊', label: 'Load Test',  color: '#6366f1', bg: '#eef2ff' },
    approval:   { icon: '✋', label: 'Approval',   color: '#ef4444', bg: '#fef2f2' },
    production: { icon: '🌐', label: 'Production', color: '#059669', bg: '#d1fae5' },
    sync:       { icon: '☁️', label: 'S3 Sync',    color: '#0ea5e9', bg: '#e0f2fe' },
    invalidate: { icon: '🔄', label: 'CDN Flush',  color: '#8b5cf6', bg: '#ede9fe' },
    upload:     { icon: '📤', label: 'Upload',     color: '#f59e0b', bg: '#fffbeb' },
    codedeploy: { icon: '🚀', label: 'CodeDeploy', color: '#10b981', bg: '#ecfdf5' },
    helm:       { icon: '⎈', label: 'Helm',       color: '#0ea5e9', bg: '#e0f2fe' },
    kubectl:    { icon: '☸️', label: 'kubectl',    color: '#326ce5', bg: '#dbeafe' },
  };
};

// Infrastructure-specific pipeline flows (with install/lint/test prefix)
const INFRA_PIPELINES = {
  // Container-based (ECS Fargate, ECS EC2)
  'ecs-fargate': ['install', 'lint', 'test', 'docker', 'push', 'staging', 'load-test', 'approval', 'production'],
  'ecs-ec2':     ['install', 'lint', 'test', 'docker', 'push', 'staging', 'load-test', 'approval', 'production'],

  // Kubernetes
  'eks':         ['install', 'lint', 'test', 'docker', 'push', 'helm', 'staging', 'load-test', 'approval', 'production'],
  'k8s-ec2':     ['install', 'lint', 'test', 'docker', 'push', 'kubectl', 'staging', 'load-test', 'approval', 'production'],

  // Serverless
  'lambda':      ['install', 'lint', 'test', 'package', 'staging', 'load-test', 'approval', 'production'],

  // Static hosting (frontend apps)
  's3-cloudfront': ['install', 'lint', 'test', 'build', 'sync', 'invalidate', 'staging', 'approval', 'production'],

  // Traditional EC2
  'ec2':         ['install', 'lint', 'test', 'build', 'upload', 'codedeploy', 'staging', 'approval', 'production'],

  // Default (no infra selected)
  'default':     ['install', 'lint', 'test', 'build', 'staging', 'load-test', 'approval', 'production'],
};

// AWS CodePipeline has Source stage first
const CODEPIPELINE_INFRA_PIPELINES = {
  'ecs-fargate':   ['source', 'install', 'lint', 'test', 'docker', 'push', 'staging', 'approval', 'production'],
  'ecs-ec2':       ['source', 'install', 'lint', 'test', 'docker', 'push', 'staging', 'approval', 'production'],
  'eks':           ['source', 'install', 'lint', 'test', 'docker', 'push', 'helm', 'staging', 'approval', 'production'],
  'k8s-ec2':       ['source', 'install', 'lint', 'test', 'docker', 'push', 'kubectl', 'staging', 'approval', 'production'],
  'lambda':        ['source', 'install', 'lint', 'test', 'package', 'staging', 'approval', 'production'],
  's3-cloudfront': ['source', 'install', 'build', 'sync', 'invalidate', 'approval', 'production'],
  'ec2':           ['source', 'install', 'test', 'build', 'upload', 'codedeploy', 'approval', 'production'],
  'default':       ['source', 'install', 'lint', 'test', 'build', 'staging', 'approval', 'production'],
};

// Tooltips based on project type and infrastructure
const getStageTooltips = (projectTypeId, infraId) => {
  const projectTooltips = {
    'python-fastapi': { install: 'pip install -r requirements.txt', lint: 'flake8 + black', test: 'pytest with coverage' },
    'python-django':  { install: 'pip install -r requirements.txt', lint: 'flake8 + black', test: 'pytest + Django tests' },
    'python-flask':   { install: 'pip install -r requirements.txt', lint: 'flake8 + black', test: 'pytest with coverage' },
    'node-express':   { install: 'npm ci', lint: 'eslint + prettier', test: 'jest with coverage' },
    'node-nestjs':    { install: 'npm ci', lint: 'eslint + prettier', test: 'jest e2e + unit tests' },
    'react':          { install: 'npm ci', lint: 'eslint + prettier', test: 'vitest + RTL', build: 'vite build' },
    'vue':            { install: 'npm ci', lint: 'eslint + prettier', test: 'vitest', build: 'vite build' },
    'angular':        { install: 'npm ci', lint: 'ng lint', test: 'karma + jasmine', build: 'ng build --prod' },
    'java-springboot':{ install: 'mvn dependency:resolve', lint: 'checkstyle', test: 'JUnit 5 + Mockito', build: 'mvn package -DskipTests' },
    'java-quarkus':   { install: 'mvn dependency:resolve', lint: 'checkstyle', test: 'JUnit 5', build: 'mvn package -Pnative' },
    'go-gin':         { install: 'go mod download', lint: 'golangci-lint', test: 'go test ./...', build: 'go build -o app' },
    'go-fiber':       { install: 'go mod download', lint: 'golangci-lint', test: 'go test ./...', build: 'go build -o app' },
    'dotnet-webapi':  { install: 'dotnet restore', lint: 'dotnet format --verify-no-changes', test: 'dotnet test', build: 'dotnet publish' },
    'rust-actix':     { install: 'cargo fetch', lint: 'cargo clippy', test: 'cargo test', build: 'cargo build --release' },
    'terraform':      { install: 'terraform init', lint: 'terraform validate + tflint', test: 'terraform plan', build: 'terraform apply -auto-approve' },
  };

  const pt = projectTooltips[projectTypeId] || {};

  return {
    source:     'CodeCommit / GitHub / S3 source',
    install:    pt.install || 'Install dependencies',
    lint:       pt.lint || 'Code linting & formatting',
    test:       pt.test || 'Unit tests with coverage',
    build:      pt.build || (infraId === 's3-cloudfront' ? 'Build static assets' : 'Compile application'),
    package:    'Package Lambda deployment zip',
    docker:     'Build Docker image',
    push:       'Push image to ECR registry',
    sync:       'Sync build artifacts to S3 bucket',
    invalidate: 'Invalidate CloudFront cache',
    upload:     'Upload artifact to S3 for CodeDeploy',
    codedeploy: 'CodeDeploy to EC2 instances',
    helm:       'Helm upgrade to EKS cluster',
    kubectl:    'kubectl apply to K8s cluster',
    staging:    'Deploy to staging environment',
    'load-test': 'k6/Artillery load tests',
    approval:   'Manual approval gate',
    production: 'Deploy to production',
  };
};

const PipelineFlowDiagram = ({ platform, cicd, infra, iac, projectType }) => {
  // No diagram if no CI/CD or "none" selected
  if (!cicd || cicd.id === 'none') return null;

  // Get infrastructure-specific pipeline stages
  const infraId = infra?.id && infra.id !== 'none' ? infra.id : 'default';
  const projectTypeId = projectType?.id || 'default';
  const isCodePipeline = platform?.id === 'aws-codepipeline';
  
  const pipelineStages = isCodePipeline
    ? (CODEPIPELINE_INFRA_PIPELINES[infraId] || CODEPIPELINE_INFRA_PIPELINES.default)
    : (INFRA_PIPELINES[infraId] || INFRA_PIPELINES.default);

  // Get project-type aware stage definitions
  const STAGE_DEFS = getStageDefinitions(projectTypeId);
  
  // Build stages array with definitions
  const stages = pipelineStages.map(id => ({ id, ...STAGE_DEFS[id] }));
  const tooltips = getStageTooltips(projectTypeId, infraId);

  return (
    <div className="flex-shrink-0 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Pipeline Flow
        </p>
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          {platform?.icon} {platform?.name || 'GitLab'} CI/CD
        </span>
      </div>

      {/* Pipeline stages flow */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {stages.map((stage, idx) => {
          const tooltip = tooltips[stage.id] || '';

          return (
            <div key={stage.id} className="flex items-center">
              {/* Stage node */}
              <div className="group relative flex flex-col items-center">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg border-2 
                    transition-all duration-200 shadow-sm"
                  style={{ 
                    borderColor: stage.color, 
                    backgroundColor: stage.bg 
                  }}
                >
                  <span className="text-[14px]">{stage.icon}</span>
                </div>
                <span className="mt-1 text-[9px] font-semibold whitespace-nowrap text-slate-600">
                  {stage.label}
                </span>

                {/* Tooltip on hover */}
                {tooltip && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-white 
                      whitespace-nowrap shadow-lg">
                      {tooltip}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 
                      border-4 border-transparent border-t-slate-800" />
                  </div>
                )}
              </div>

              {/* Arrow connector */}
              {idx < stages.length - 1 && (
                <div className="flex items-center px-0.5">
                  <div className="h-0.5 w-3 bg-slate-300" />
                  <div className="h-0 w-0 border-y-[3px] border-y-transparent border-l-[5px] border-l-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context footer: Project type + Infrastructure + IaC */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1">
        {projectType && (
          <p className="text-[10px] text-slate-400">
            <span className="font-medium text-slate-500">Stack:</span> {projectType.icon} {projectType.name}
          </p>
        )}
        {infra && infra.id !== 'none' && (
          <p className="text-[10px] text-slate-400">
            <span className="font-medium text-slate-500">Target:</span> {infra.icon} {infra.name}
          </p>
        )}
        {iac && iac.id !== 'none' && (
          <p className="text-[10px] text-slate-400">
            <span className="font-medium text-slate-500">IaC:</span> {iac.icon} {iac.name}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Right panel: combined all-files preview ───────────────────────────────────
const CombinedPreviewPanel = ({ form, previewFiles, iacPreviewFiles, cicdPreviewFiles, projectName }) => {
  // Merge all files, removing duplicates by path (later files win)
  const allFiles = useMemo(() => {
    const fileMap = new Map();
    [...previewFiles, ...iacPreviewFiles, ...cicdPreviewFiles].forEach((file) => {
      fileMap.set(file.path, file);
    });
    return Array.from(fileMap.values());
  }, [previewFiles, iacPreviewFiles, cicdPreviewFiles]);

  // Group files by source for summary
  const summary = [
    form.projectType && previewFiles.length > 0 && {
      icon: form.projectType.icon,
      name: form.projectType.name,
      count: previewFiles.length,
      accent: form.projectType.accent,
      bg: form.projectType.bg,
    },
    form.iac && form.iac.id !== 'none' && iacPreviewFiles.length > 0 && {
      icon: form.iac.icon,
      name: form.iac.name,
      count: iacPreviewFiles.length,
      accent: form.iac.accent,
      bg: form.iac.bg,
    },
    form.cicd && form.cicd.id !== 'none' && cicdPreviewFiles.length > 0 && {
      icon: form.cicd.icon,
      name: form.cicd.name,
      count: cicdPreviewFiles.length,
      accent: form.cicd.accent,
      bg: form.cicd.bg,
    },
  ].filter(Boolean);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex-shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-bold text-indigo-700">
            📦 Complete Project Scaffold
          </p>
          <span className="rounded-full bg-indigo-200 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
            {allFiles.length} total files
          </span>
        </div>
        {/* Source breakdown */}
        <div className="flex flex-wrap gap-1.5">
          {summary.map((s, i) => (
            <span
              key={i}
              style={{ color: s.accent, background: s.bg, borderColor: s.accent + '33' }}
              className="flex items-center gap-1.5 rounded-lg border px-2 py-0.5
                text-[11px] font-medium"
            >
              {s.icon} {s.name}
              <span className="rounded bg-white/50 px-1.5 text-[10px] font-bold">
                {s.count}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Pipeline Flow Diagram */}
      <PipelineFlowDiagram
        platform={form.platform}
        cicd={form.cicd}
        infra={form.infra}
        iac={form.iac}
        projectType={form.projectType}
      />

      {/* File tree */}
      <div className="flex-1 min-h-0">
        <TemplatePreview
          files={allFiles}
          projectName={projectName}
          fillHeight
        />
      </div>
    </div>
  );
};

// ── Right panel: IaC / CI-CD code preview ─────────────────────────────────────
const SectionCodePreview = ({ preview }) => {
  const files = [
    { key: 'main', filename: preview.filename, content: preview.content },
    ...(preview.secondFile
      ? [{ key: 'second', filename: preview.secondFile.filename, content: preview.secondFile.content }]
      : []),
  ];

  const [activeKey, setActiveKey] = useState('main');
  const [copied, setCopied] = useState(false);

  const current = files.find((f) => f.key === activeKey) ?? files[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-700">
      {/* Toolbar */}
      <div
        className="flex flex-shrink-0 items-center justify-between gap-4 px-4 py-2"
        style={{ background: '#1e2535', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* macOS dots */}
        <div className="flex gap-1.5 flex-shrink-0">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        </div>

        {/* File tabs */}
        <div className="flex flex-1 gap-1 overflow-hidden">
          {files.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveKey(f.key)}
              className={`rounded px-2.5 py-1 text-[11px] font-mono truncate transition-colors ${
                activeKey === f.key
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.filename}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex-shrink-0 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <pre className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-[12px]
        leading-relaxed text-slate-200">
        {current.content}
      </pre>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const CreateProjectPage = () => {
  const { form, updateForm, toggleFeature, resetForm, openSuccess } = useAppStore();
  const { setProjectTypeConfig, resetProjectTypeConfig } = useAppStore();
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // ── Dynamic namespaces — reload whenever platform changes ─────────────────
  const [NAMESPACES, setNAMESPACES] = useState(FALLBACK_NAMESPACES);
  const [namespacesLoading, setNamespacesLoading] = useState(false);

  useEffect(() => {
    if (!form.platform?.id) {
      setNAMESPACES(FALLBACK_NAMESPACES);
      return;
    }
    // Reset the selected namespace whenever platform switches
    updateForm({ namespaceId: '' });
    setNamespacesLoading(true);
    setNAMESPACES([]);
    getNamespaces(form.platform.id)
      .then((res) =>
        setNAMESPACES(
          res.data.map((ns) => ({
            id:    ns.id,           // GitLab: numeric; GitHub: login; Bitbucket: slug; AWS: region
            label: ns.full_path,
            value: ns.id,           // always the right value to send per platform
          }))
        )
      )
      .catch(() => setNAMESPACES(FALLBACK_NAMESPACES))
      .finally(() => setNamespacesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.platform?.id]);

  // 'platform' | 'projectType' | 'iac' | 'infra' | 'cicd' | null
  const [activeSection, setActiveSection] = useState(
    form.platform ? 'platform' : 'platform'   // always start on platform step
  );

  // Force the right panel to re-render when re-selecting the same section.
  // (React bails out of a setState with the same value, so we use a separate
  //  signal counter that always increments.)
  const activateSection = (section) => {
    setActiveSection(section);
  };

  // Resolve template definition (null if not yet implemented)
  const templateDef = form.projectType ? getTemplate(form.projectType.id) : null;

  // Build preview files live — re-runs whenever name, description, OR config changes
  const previewFiles = useMemo(() => {
    if (!templateDef) return [];
    const slug = form.repoName.trim() || templateDef.previewVars.projectName;
    return templateDef.build({
      projectName: slug,
      appName:     slug.replace(/-/g, '_').replace(/\./g, '_'),
      description: form.description.trim() || templateDef.previewVars.description,
      config:      form.projectTypeConfig,   // ← drives version / database changes
    });
  }, [templateDef, form.repoName, form.description, form.projectTypeConfig]);

  // ── IaC template (null when not yet implemented) ──────────────────────────
  const iacTemplateDef = form.iac ? getIacTemplate(form.iac.id) : null;

  const iacPreviewFiles = useMemo(() => {
    if (!iacTemplateDef) return [];
    const slug = form.repoName.trim() || iacTemplateDef.previewVars.projectName;
    const snake = slug.replace(/-/g, '_').replace(/\./g, '_');
    const pascal = snake.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    return iacTemplateDef.build({
      projectName:       slug,
      appName:           snake,
      pascalName:        pascal,
      projectType:       form.projectType,        // drives runtime, handler language
      infra:             form.infra,              // drives architecture-specific constructs
      projectTypeConfig: form.projectTypeConfig,  // drives version numbers
    });
  }, [iacTemplateDef, form.repoName, form.projectType, form.infra, form.projectTypeConfig]);

  // ── CI/CD template — re-runs whenever project type, IaC, or config changes ─
  const cicdTemplateDef = form.cicd ? getCicdTemplate(form.cicd.id, form.platform?.id) : null;

  const cicdPreviewFiles = useMemo(() => {
    if (!cicdTemplateDef) return [];
    const vars = cicdTemplateDef.previewVars;
    const slug   = form.repoName.trim() || vars.projectName;
    const snake  = slug.replace(/-/g, '_').replace(/\./g, '_');
    const pascal = snake.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    return cicdTemplateDef.build({
      projectName:       slug,
      appName:           snake,
      pascalName:        pascal,
      projectType:       form.projectType,        // drives test stage
      iac:               form.iac,                // drives IaC deploy stage
      infra:             form.infra,              // drives architecture-specific deploy jobs
      projectTypeConfig: form.projectTypeConfig,  // drives image versions + db service
    });
  }, [cicdTemplateDef, form.repoName, form.projectType, form.iac, form.infra, form.projectTypeConfig]);

  const validate = () => {
    const e = {};
    if (!form.platform)            e.platform    = 'Please select a platform';
    if (!form.repoName.trim())     e.repoName    = 'Repository name is required';
    else if (!SLUG_RE.test(form.repoName)) e.repoName = 'Lowercase letters, numbers, hyphens, dots and underscores only';
    if (!form.projectType)         e.projectType = 'Please select a project type';
    if (!form.namespaceId)         e.namespaceId = 'Please select a namespace';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    setCreateError(null);

    try {
      // ── Collect all rendered scaffold files ──────────────────────────────
      const allFiles = {};
      [...previewFiles, ...iacPreviewFiles, ...cicdPreviewFiles].forEach(({ path, content }) => {
        allFiles[path] = content ?? '';
      });

      // ── Call the backend ─────────────────────────────────────────────────
      const response = await createProject({
        platform:      form.platform?.id ?? 'gitlab',
        projectName:   form.repoName.trim(),
        namespaceId:   String(form.namespaceId),
        description:   form.description,
        defaultBranch: 'main',
        visibility:    form.visibility,
        files:         allFiles,
      });

      const data = response.data;

      openSuccess({
        name:        data.project_name,
        projectType: form.projectType,
        iac:         form.iac,
        cicd:        form.cicd,
        features:    ADDITIONAL_FEATURES.filter((f) => form.features.includes(f.id)),
        namespace:   data.namespace_path,
        url:         data.project_url,
        fileCount:   data.file_count,
      });
      resetForm();
      setErrors({});

    } catch (err) {
      setCreateError(err.response?.data?.detail ?? err.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleNameInput = (raw) => {
    const slug = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');
    updateForm({ repoName: slug });
    if (errors.repoName) setErrors((e) => ({ ...e, repoName: undefined }));
  };

  const selectedNs = NAMESPACES.find((n) => String(n.id) === String(form.namespaceId));

  // ── Left Panel Content (Form) ───────────────────────────────────────────────
  const leftPanelContent = (
    <div className="space-y-5">
      {/* Template categories card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-7">
        <div>
          <h2 className="text-[16px] font-bold text-slate-800">Configure Your Project</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            Only Platform and Project Type are required — everything else is optional.
          </p>
        </div>

        {/* 1 — Platform */}
        <CategorySection step={1} icon={CATEGORIES[0].icon} label={CATEGORIES[0].label}
          description={CATEGORIES[0].description} required error={errors.platform}
          active={activeSection === 'platform'}
          onActivate={() => setActiveSection('platform')}
        >
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map((t) => (
                  <TemplateCard key={t.id} template={t} compact
                    selected={form.platform?.id === t.id}
                    onSelect={(v) => {
                      updateForm({ platform: v });
                      setErrors((e) => ({ ...e, platform: undefined }));
                      activateSection('platform');
                    }}
                  />
                ))}
              </div>
            </CategorySection>

            {/* ── Project Details — inline, after Platform ─────────────────── */}
            {(() => {
              const pCfg = PLATFORM_FIELD_CONFIG[form.platform?.id] ?? {
                nsLabel:       'Namespace',
                nsPlaceholder: 'Select a namespace…',
                visibility:    ['private', 'public'],
              };
              return (
                <>
                  <div className="h-px bg-slate-100" />

                  <div className="space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Project Details
                    </p>

                    {/* Repo name */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase
                        tracking-wide text-slate-500">
                        Repository Name <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={form.repoName}
                        onChange={(e) => handleNameInput(e.target.value)}
                        placeholder="e.g. my-new-service" autoFocus
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5
                          text-[13.5px] text-slate-800 outline-none transition
                          focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                      {errors.repoName && (
                        <p className="mt-1 text-[11.5px] text-red-500">{errors.repoName}</p>
                      )}
                    </div>

                    {/* Namespace / Org / Workspace */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase
                        tracking-wide text-slate-500">
                        {pCfg.nsLabel} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select value={form.namespaceId}
                          onChange={(e) => { updateForm({ namespaceId: e.target.value }); setErrors((er) => ({ ...er, namespaceId: undefined })); }}
                          disabled={namespacesLoading}
                          className="w-full appearance-none rounded-lg border border-slate-200
                            bg-white px-3 py-2.5 pr-8 text-[13.5px] text-slate-800 outline-none
                            transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                            cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >
                          <option value="">
                            {namespacesLoading ? 'Loading…' : pCfg.nsPlaceholder}
                          </option>
                          {NAMESPACES.map((ns) => (
                            <option key={ns.id} value={ns.id}>{ns.label}</option>
                          ))}                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2
                          -translate-y-1/2 text-slate-400 text-xs">▾</span>
                      </div>
                      {errors.namespaceId && (
                        <p className="mt-1 text-[11.5px] text-red-500">{errors.namespaceId}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase
                        tracking-wide text-slate-500">
                        Description
                        <span className="ml-1.5 normal-case font-normal text-slate-400">optional</span>
                      </label>
                      <input type="text" value={form.description}
                        onChange={(e) => updateForm({ description: e.target.value })}
                        placeholder="Brief description of this project"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5
                          text-[13.5px] text-slate-800 outline-none transition
                          focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* Visibility */}
                    {pCfg.visibility.length > 0 && (
                      <div>
                        <label className="mb-2 block text-[11px] font-semibold uppercase
                          tracking-wide text-slate-500">Visibility</label>
                        <div className="flex gap-5">
                          {pCfg.visibility.map((v) => (
                            <label key={v} className="flex cursor-pointer items-center gap-2">
                              <input type="radio" name="visibility" value={v}
                                checked={form.visibility === v}
                                onChange={() => updateForm({ visibility: v })}
                                className="accent-indigo-600"
                              />
                              <span className="text-[13px] capitalize text-slate-700">{v}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {form.platform?.id === 'aws-codepipeline' && (
                      <p className="text-[11.5px] text-slate-400 italic">
                        Visibility is managed via AWS IAM policies.
                      </p>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="h-px bg-slate-100" />

            {/* 2 — Project Type */}
            <CategorySection
              step={2} icon={CATEGORIES[1].icon} label={CATEGORIES[1].label}
              description={CATEGORIES[1].description} required error={errors.projectType}
              active={activeSection === 'projectType'}
              onActivate={() => form.projectType && setActiveSection('projectType')}
            >
              <ProjectTypeSelector
                selected={form.projectType}
                onSelect={(v) => {
                  const defaults = {};
                  (v?.configOptions ?? []).forEach((opt) => { defaults[opt.id] = opt.default; });
                  updateForm({ projectType: v });
                  resetProjectTypeConfig(defaults);
                  setErrors((e) => ({ ...e, projectType: undefined }));
                  activateSection(v ? 'projectType' : null);
                }}
                config={form.projectTypeConfig}
                onConfigChange={(key, val) => {
                  setProjectTypeConfig(key, val);
                  activateSection('projectType');
                }}
                onActivate={() => activateSection('projectType')}
                error={errors.projectType}
              />
            </CategorySection>

            <div className="h-px bg-slate-100" />

            {/* 3 — IaC */}
            <CategorySection
              step={3} icon={CATEGORIES[2].icon} label={CATEGORIES[2].label}
              description={CATEGORIES[2].description}
              active={activeSection === 'iac'}
              onActivate={() => setActiveSection('iac')}
            >
              <div className="grid grid-cols-3 gap-2">
                {IAC_OPTIONS.map((t) => (
                  <TemplateCard key={t.id} template={t} compact
                    selected={form.iac?.id === t.id}
                    onSelect={(v) => { updateForm({ iac: v }); activateSection('iac'); }}
                  />
                ))}
              </div>
            </CategorySection>

            <div className="h-px bg-slate-100" />

            {/* 4 — Infrastructure Architecture */}
            <CategorySection
              step={4} icon={CATEGORIES[3].icon} label={CATEGORIES[3].label}
              description={CATEGORIES[3].description}
              active={activeSection === 'infra'}
              onActivate={() => setActiveSection('infra')}
            >
              <div className="grid grid-cols-4 gap-2">
                {INFRA_OPTIONS.map((t) => (
                  <TemplateCard key={t.id} template={t} compact
                    selected={form.infra?.id === t.id}
                    onSelect={(v) => { updateForm({ infra: v }); activateSection('infra'); }}
                  />
                ))}
              </div>
            </CategorySection>

            <div className="h-px bg-slate-100" />

            {/* 5 — CI/CD */}
            <CategorySection
              step={5} icon={CATEGORIES[4].icon} label={CATEGORIES[4].label}
              description={CATEGORIES[4].description}
              active={activeSection === 'cicd'}
              onActivate={() => setActiveSection('cicd')}
            >
              <div className="grid grid-cols-3 gap-2">
                {CICD_OPTIONS.map((t) => (
                  <TemplateCard key={t.id} template={t} compact
                    selected={form.cicd?.id === t.id}
                    onSelect={(v) => { updateForm({ cicd: v }); activateSection('cicd'); }}
                  />
                ))}
              </div>
            </CategorySection>

            <div className="h-px bg-slate-100" />

            {/* 6 — Additional Features */}
            <CategorySection
              step={6} icon={CATEGORIES[5].icon} label={CATEGORIES[5].label}
              description={CATEGORIES[5].description}
            >
              <div className="grid grid-cols-2 gap-2">
                {ADDITIONAL_FEATURES.map((f) => (
                  <FeatureCheckbox key={f.id} feature={f}
                    checked={form.features.includes(f.id)}
                    onToggle={toggleFeature}
                  />
                ))}
              </div>
            </CategorySection>
          </div>

          {/* Actions card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <SelectionSummary
              form={form}
              active={activeSection === 'summary'}
              onActivate={() => setActiveSection('summary')}
              totalFiles={previewFiles.length + iacPreviewFiles.length + cicdPreviewFiles.length}
            />

            {/* API error */}
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12.5px]
                text-red-700">
                <span className="font-semibold">Error: </span>{createError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button type="button"
                onClick={() => { resetForm(); setErrors({}); }}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-[13px]
                  font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Clear All
              </button>
              <button type="button" onClick={handleCreate} disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5
                  text-[13px] font-semibold text-white hover:bg-indigo-700
                  disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2
                      border-white/30 border-t-white animate-spin" />
                    Creating…
                  </>
                ) : '✦ Create Project'}
              </button>
            </div>
          </div>
        </div>
    );

  // ── Right Panel Content ─────────────────────────────────────────────────────
  const rightPanelContent = (
    <>
      {/* Nothing interacted yet */}
      {activeSection === null && <EmptyPreviewPanel />}

      {/* ── Project Type ─────────────────────────────────────────────── */}
      {activeSection === 'projectType' && (
        <>
          {!form.projectType && <EmptyPreviewPanel />}
          {form.projectType && !templateDef && (
            <ComingSoonPanel name={form.projectType.name} />
          )}
          {templateDef && (
            <div className="flex h-full flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11.5px] font-semibold text-slate-500">
                  {form.projectType.icon} {form.projectType.name} scaffold
                  <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5
                    text-[10px] font-bold text-slate-500">
                    {previewFiles.length} files
                  </span>
                </p>
                <p className="text-[11px] text-slate-400">{templateDef.meta.description}</p>
              </div>
              <div className="flex-1 min-h-0">
                <TemplatePreview
                  files={previewFiles}
                  projectName={form.repoName.trim() || templateDef.previewVars.projectName}
                  fillHeight
                />
              </div>
            </div>
              )}
            </>
          )}

          {/* ── Platform ─────────────────────────────────────────────────── */}
          {activeSection === 'platform' && (
            <>
              {!form.platform && (
                <div className="flex h-full flex-col items-center justify-center gap-3
                  rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <span className="text-4xl opacity-30">🔧</span>
                  <p className="text-[13px] font-semibold text-slate-400">Choose a Platform</p>
                  <p className="text-[12px] text-slate-400 max-w-[200px] leading-relaxed">
                    Select where your code will be hosted and which CI/CD system will run your pipelines.
                  </p>
                </div>
              )}
              {form.platform && <PlatformInfoPanel platform={form.platform} />}
            </>
          )}

          {/* ── Infrastructure as Code ───────────────────────────────────── */}
          {activeSection === 'iac' && (
            <>
              {!form.iac && (
                <SectionPromptPanel label="IaC" icon={CATEGORIES[1].icon} />
              )}

              {form.iac && !IAC_PREVIEWS[form.iac.id] && !iacTemplateDef && (
                <div className="flex h-full flex-col items-center justify-center gap-3
                  rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <span className="text-3xl opacity-40">⬜</span>
                  <p className="text-[13px] font-semibold text-slate-400">No IaC selected</p>
                  <p className="text-[12px] text-slate-400">
                    Infrastructure will not be included in the scaffold.
                  </p>
                </div>
              )}

              {/* ── Full file-tree preview (Python CDK and future IaC templates) */}
              {form.iac && iacTemplateDef && (
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11.5px] font-semibold text-slate-500">
                      {form.iac.icon} {form.iac.name}
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5
                        text-[10px] font-bold text-slate-500">
                        {iacPreviewFiles.length} files
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">{iacTemplateDef.meta.description}</p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TemplatePreview
                      files={iacPreviewFiles}
                      projectName={
                        form.repoName.trim() || iacTemplateDef.previewVars.projectName
                      }
                      fillHeight
                    />
                  </div>
                </div>
              )}

              {/* ── Code-snippet fallback for IaC options without a full template */}
              {form.iac && !iacTemplateDef && IAC_PREVIEWS[form.iac.id] && (
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11.5px] font-semibold text-slate-500">
                      {form.iac.icon} {form.iac.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {IAC_PREVIEWS[form.iac.id].description}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <SectionCodePreview preview={IAC_PREVIEWS[form.iac.id]} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Infrastructure Architecture ───────────────────────────── */}
          {activeSection === 'infra' && (
            <>
              {!form.infra && (
                <SectionPromptPanel label="Infrastructure Architecture" icon={CATEGORIES[2].icon} />
              )}
              {form.infra && form.infra.id === 'none' && (
                <div className="flex h-full flex-col items-center justify-center gap-3
                  rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <span className="text-3xl opacity-40">⬜</span>
                  <p className="text-[13px] font-semibold text-slate-400">No architecture selected</p>
                  <p className="text-[12px] text-slate-400 max-w-[200px] leading-relaxed">
                    Choose an architecture to see what will be provisioned and how the
                    pipeline deploy stage will work.
                  </p>
                </div>
              )}
              {form.infra && form.infra.id !== 'none' && (
                <>
                  {/* When IaC is also selected, show the infra-aware IaC file tree */}
                  {iacTemplateDef ? (
                    <div className="flex h-full flex-col gap-2">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[11.5px] font-semibold text-slate-500">
                          {form.infra.icon} {form.infra.name}
                          {form.iac && form.iac.id !== 'none' && (
                            <span className="ml-2 text-slate-400">+ {form.iac.name}</span>
                          )}
                          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5
                            text-[10px] font-bold text-slate-500">
                            {iacPreviewFiles.length} files
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400">{iacTemplateDef.meta.description}</p>
                      </div>
                      <div className="flex-1 min-h-0">
                        <TemplatePreview
                          files={iacPreviewFiles}
                          projectName={form.repoName.trim() || iacTemplateDef.previewVars.projectName}
                          fillHeight
                        />
                      </div>
                    </div>
                  ) : (
                    /* No IaC selected — show the info card */
                    <InfraInfoPanel infra={form.infra} />
                  )}
                </>
              )}
            </>
          )}

          {/* ── CI / CD ──────────────────────────────────────────────────── */}          {activeSection === 'cicd' && (
            <>
              {!form.cicd && (
                <SectionPromptPanel label="CI / CD" icon={CATEGORIES[2].icon} />
              )}

              {form.cicd && form.cicd.id === 'none' && (
                <div className="flex h-full flex-col items-center justify-center gap-3
                  rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <span className="text-3xl opacity-40">⬜</span>
                  <p className="text-[13px] font-semibold text-slate-400">No pipeline selected</p>
                  <p className="text-[12px] text-slate-400 max-w-[200px] leading-relaxed">
                    No CI/CD pipeline will be included in the scaffold.
                  </p>
                </div>
              )}

              {/* ── Full file-tree preview (Basic pipeline — shown for all platforms) */}
              {form.cicd && cicdTemplateDef && (
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11.5px] font-semibold text-slate-500">
                      {form.cicd.icon} {form.cicd.name}
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5
                        text-[10px] font-bold text-slate-500">
                        {cicdPreviewFiles.length} file
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {form.projectType
                        ? `${form.projectType.name}${form.iac && form.iac.id !== 'none' ? ` + ${form.iac.name}` : ''}`
                        : cicdTemplateDef.meta.description}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TemplatePreview
                      files={cicdPreviewFiles}
                      projectName={form.repoName.trim() || cicdTemplateDef.previewVars.projectName}
                      fillHeight
                    />
                  </div>
                </div>
              )}

              {/* ── Fallback: old snippet preview for any non-registered options */}
              {form.cicd && !cicdTemplateDef && form.cicd.id !== 'none' && CICD_PREVIEWS[form.cicd.id] && (
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11.5px] font-semibold text-slate-500">
                      {form.cicd.icon} {form.cicd.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {CICD_PREVIEWS[form.cicd.id].description}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <SectionCodePreview preview={CICD_PREVIEWS[form.cicd.id]} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Summary: Combined All Files Preview ──────────────────────── */}
          {activeSection === 'summary' && (
            <CombinedPreviewPanel
              form={form}
              previewFiles={previewFiles}
              iacPreviewFiles={iacPreviewFiles}
              cicdPreviewFiles={cicdPreviewFiles}
              projectName={form.repoName.trim() || (templateDef?.previewVars?.projectName ?? 'my-project')}
            />
          )}
        </>
      );

  return (
    <>
      <ResizableLayout
        leftPanel={leftPanelContent}
        rightPanel={rightPanelContent}
        minLeftWidth={450}
        minRightWidth={320}
        defaultRightWidth={460}
      />
      <SuccessModal />
    </>
  );
};

export default CreateProjectPage;

export const NAMESPACES = [
  { id: 1, label: 'innovation',                 value: 'innovation' },
  { id: 2, label: 'innovation / velocity',       value: 'innovation/velocity' },
  { id: 3, label: 'innovation / platform',       value: 'innovation/platform' },
  { id: 4, label: 'radius-engineering',          value: 'radius-engineering' },
  { id: 5, label: 'radius-engineering / devops', value: 'radius-engineering/devops' },
];

export const STATS = [
  { label: 'Projects Created', value: 14, sub: '+3 this month' },
  { label: 'Active Pipelines', value: 7,  sub: 'across all projects' },
  { label: 'Templates Used',   value: 6,  sub: 'MFE most popular' },
];

export const RECENT_PROJECTS = [
  {
    id: 1,
    name: 'velocity-micro-frontend-reports',
    template: 'Micro-Frontend',
    templateIcon: '⚛️',
    templateBg: '#eef2ff',
    namespace: 'innovation/velocity',
    createdAt: '2 days ago',
    status: 'active',
    url: '#'
  },
  {
    id: 2,
    name: 'fleet-tracking-service',
    template: 'Java Service',
    templateIcon: '☕',
    templateBg: '#fff1f2',
    namespace: 'innovation',
    createdAt: '5 days ago',
    status: 'active',
    url: '#'
  },
  {
    id: 3,
    name: 'card-fraud-api',
    template: 'Python API',
    templateIcon: '🌐',
    templateBg: '#f0fdf4',
    namespace: 'radius-engineering',
    createdAt: '1 week ago',
    status: 'active',
    url: '#'
  },
  {
    id: 4,
    name: 'auth-infrastructure',
    template: 'CDK Stack',
    templateIcon: '☁️',
    templateBg: '#fff7ed',
    namespace: 'innovation/platform',
    createdAt: '2 weeks ago',
    status: 'idle',
    url: '#'
  },
  {
    id: 5,
    name: 'driver-scoring-lambda',
    template: 'Python Lambda',
    templateIcon: 'λ',
    templateBg: '#fffbeb',
    namespace: 'innovation',
    createdAt: '3 weeks ago',
    status: 'active',
    url: '#'
  },
];

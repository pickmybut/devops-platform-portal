import axios from 'axios';

const API_BASE = process.env.PLATFORM_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,  // repo creation + file commits can take a while
});

/**
 * POST /api/projects
 *
 * @param {{
 *   platform:      'gitlab'|'github'|'bitbucket'|'aws-codepipeline',
 *   projectName:   string,
 *   namespaceId:   string,
 *   description?:  string,
 *   defaultBranch?:string,
 *   visibility?:   'private'|'internal'|'public',
 *   files:         Record<string, string>   // { 'path/to/file': 'content' }
 * }} data
 */
export const createProject = (data) => api.post('/api/projects', data);

/**
 * GET /api/namespaces?platform=...&search=...
 *
 * Returns groups/orgs/workspaces/regions for the given platform.
 *
 * @param {string} platform
 * @param {string} [search]
 */
export const getNamespaces = (platform, search = '') =>
  api.get('/api/namespaces', { params: { platform, search } });

/**
 * GET /api/health
 */
export const getHealth = () => api.get('/api/health');

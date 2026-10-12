import axios from 'axios';

const API_BASE = process.env.PLATFORM_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,  // repo creation + file commits can take a while
});

/**
 * POST /api/projects
 */
export const createProject = (data) => api.post('/api/projects', data);

/**
 * GET /api/projects
 * Returns all persisted project records (newest first).
 *
 * @param {{ platform?: string, team?: string, search?: string, limit?: number }} [params]
 */
export const getProjects = (params = {}) =>
  api.get('/api/projects', { params });

/**
 * DELETE /api/projects/:projectId  (soft-delete / archive)
 */
export const archiveProject = (projectId) =>
  api.delete(`/api/projects/${encodeURIComponent(projectId)}`);

/**
 * GET /api/namespaces?platform=...&search=...
 */
export const getNamespaces = (platform, search = '') =>
  api.get('/api/namespaces', { params: { platform, search } });

/**
 * GET /api/health
 */
export const getHealth = () => api.get('/api/health');

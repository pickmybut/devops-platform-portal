import { useState, useEffect, useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import ResizableLayout from '../components/ResizableLayout';
import { getProjects, archiveProject } from '../api/projectsApi';
import {
  PLATFORM_OPTIONS,
  PROJECT_TYPES,
  IAC_OPTIONS,
  INFRA_OPTIONS,
  CICD_OPTIONS,
} from '../data/templateCategories';

const PLATFORM_ICONS = {
  gitlab:           '🦊',
  github:           '🐙',
  bitbucket:        '🪣',
  'aws-codepipeline': '⚡',
};

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <span className="text-xl">{icon}</span>
    </div>
    <p className="mt-1.5 text-[30px] font-bold leading-none text-slate-800">{value}</p>
    <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
  </div>
);

// ── Project row ───────────────────────────────────────────────────────────────
const ProjectRow = ({ project, onClone, onArchive }) => {
  const ptIcon = PROJECT_TYPES.find((t) => t.id === project.project_type_id)?.icon ?? '📦';

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-slate-100
      bg-white px-5 py-4 shadow-sm hover:border-slate-200 transition-colors">
      {/* Platform + type icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center
        rounded-lg bg-slate-100 text-xl">
        {PLATFORM_ICONS[project.platform] ?? '🔧'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13.5px] font-semibold text-slate-800 truncate">
            {project.project_name}
          </p>
          {project.team && (
            <span className="rounded-full bg-indigo-50 border border-indigo-100
              px-2 py-0.5 text-[10px] font-medium text-indigo-600">
              {project.team}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px] text-slate-400 truncate">
          {ptIcon} {project.project_type_id || '—'} ·
          {project.namespace_path} ·
          {timeAgo(project.created_at)}
          {project.cost_center && ` · ${project.cost_center}`}
        </p>
      </div>

      {/* File count badge */}
      <span className="flex-shrink-0 rounded-lg bg-slate-100 px-2 py-1
        text-[11px] font-medium text-slate-500">
        {project.file_count} files
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onClone(project)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px]
            font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-200
            hover:text-indigo-700 transition-colors"
          title="Clone settings to Create Project"
        >
          🔁 Clone
        </button>
        <a
          href={project.project_url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px]
            font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Open ↗
        </a>
        <button
          onClick={() => onArchive(project)}
          className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-400
            hover:text-red-500 transition-colors"
          title="Archive project"
        >
          🗑
        </button>
      </div>
    </div>
  );
};

// ── Usage chart ───────────────────────────────────────────────────────────────
const UsageChart = ({ projects }) => {
  const counts = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      const key  = p.project_type_id || 'unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => {
        const t = PROJECT_TYPES.find((x) => x.id === id);
        return { label: t?.name ?? id, count, color: t?.accent ?? '#818cf8' };
      });
  }, [projects]);

  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[13px] font-semibold text-slate-700 mb-4">Template Usage</p>
      {counts.length === 0 ? (
        <p className="text-[12px] text-slate-400 py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-3">
          {counts.map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-3">
              <p className="w-28 flex-shrink-0 text-[12px] text-slate-500 truncate">{label}</p>
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(count / max) * 100}%`, background: color }}
                />
              </div>
              <p className="w-4 flex-shrink-0 text-[12px] font-semibold text-slate-500 text-right">
                {count}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { setCurrentPage, presetForm } = useAppStore();
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

  const loadProjects = () => {
    setLoading(true);
    setError(null);
    getProjects({ limit: 200 })
      .then((res) => setProjects(res.data))
      .catch((err) => setError(err.message ?? 'Failed to load projects'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  const filtered = useMemo(() =>
    projects.filter((p) => {
      const matchesSearch   = !search || p.project_name.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform = !platformFilter || p.platform === platformFilter;
      return matchesSearch && matchesPlatform;
    }),
    [projects, search, platformFilter]
  );

  const stats = useMemo(() => [
    { label: 'Projects Created', value: projects.length,   sub: 'total repos scaffolded',    icon: '📦' },
    { label: 'Platforms Used',   value: new Set(projects.map((p) => p.platform)).size, sub: 'unique platforms', icon: '🔧' },
    { label: 'Teams',            value: new Set(projects.map((p) => p.team).filter(Boolean)).size, sub: 'across all projects', icon: '👥' },
  ], [projects]);

  const handleClone = (project) => {
    // Resolve full option objects from IDs so the form pre-fills correctly
    const findOpt = (arr, id) => arr.find((o) => o.id === id) ?? null;
    presetForm({
      description:    project.description ?? '',
      platform:       findOpt(PLATFORM_OPTIONS, project.platform),
      projectType:    findOpt(PROJECT_TYPES, project.project_type_id),
      iac:            findOpt(IAC_OPTIONS, project.iac_id),
      infra:          findOpt(INFRA_OPTIONS, project.infra_id),
      cicd:           findOpt(CICD_OPTIONS, project.cicd_id),
      features:       project.selected_features ?? [],
      team:           project.team ?? '',
      costCenter:     project.cost_center ?? '',
    });
  };

  const handleArchive = async (project) => {
    if (!window.confirm(`Archive "${project.project_name}"? This removes it from the portal but does not delete the remote repository.`)) return;
    try {
      await archiveProject(project.project_id);
      setProjects((prev) => prev.filter((p) => p.project_id !== project.project_id));
    } catch {
      alert('Failed to archive project');
    }
  };

  // ── Left Panel ──────────────────────────────────────────────────────────────
  const leftPanel = (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5
              text-[12.5px] text-slate-700 outline-none focus:border-indigo-400
              focus:ring-2 focus:ring-indigo-100 transition"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-[12.5px]
            text-slate-700 outline-none focus:border-indigo-400 transition"
        >
          <option value="">All platforms</option>
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
          ))}
        </select>
        <button
          onClick={() => { setCurrentPage('create'); }}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5
            text-[12.5px] font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          + New
        </button>
      </div>

      {/* Project list */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
            {(search || platformFilter) && ' (filtered)'}
          </p>
          {error && (
            <p className="text-[11.5px] text-red-500">{error} —
              <button onClick={loadProjects} className="ml-1 underline">retry</button>
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block h-6 w-6 animate-spin rounded-full
              border-2 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
            <span className="text-3xl opacity-30">📭</span>
            <p className="mt-2 text-[13px] text-slate-400">
              {search || platformFilter ? 'No projects match your filters' : 'No projects yet — create your first one!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                onClone={handleClone}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Right Panel ─────────────────────────────────────────────────────────────
  const rightPanel = (
    <div className="space-y-4">
      <UsageChart projects={projects} />

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[13px] font-semibold text-slate-700 mb-3">Quick Actions</p>
        <div className="space-y-2">
          <button
            onClick={() => setCurrentPage('create')}
            className="w-full flex items-center gap-3 rounded-lg border border-slate-200
              px-4 py-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="text-lg">🛠️</span>
            <div>
              <p className="text-[13px] font-semibold text-slate-700">Create Project</p>
              <p className="text-[11px] text-slate-400">Scaffold a new repository</p>
            </div>
          </button>
          <button
            onClick={() => setCurrentPage('ci-templates')}
            className="w-full flex items-center gap-3 rounded-lg border border-slate-200
              px-4 py-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="text-lg">📋</span>
            <div>
              <p className="text-[13px] font-semibold text-slate-700">CI Templates</p>
              <p className="text-[11px] text-slate-400">Browse pipeline snippets</p>
            </div>
          </button>
        </div>
      </div>

      {/* Platform breakdown */}
      {projects.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[13px] font-semibold text-slate-700 mb-3">By Platform</p>
          <div className="space-y-2">
            {Object.entries(
              projects.reduce((acc, p) => {
                acc[p.platform] = (acc[p.platform] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .map(([platform, count]) => {
                const opt = PLATFORM_OPTIONS.find((o) => o.id === platform);
                return (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-600">
                      {PLATFORM_ICONS[platform]} {opt?.name ?? platform}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5
                      text-[11px] font-semibold text-slate-500">
                      {count}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );

  // ── Collapsed sidebar icon panel ────────────────────────────────────────────
  const leftPanelCollapsed = (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl" title="Stats">📊</div>
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl" title="Projects">📁</div>
      <div className="w-6 h-px bg-slate-200 my-1" />
      <button onClick={() => setCurrentPage('create')} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg hover:bg-indigo-700 transition-colors" title="Create Project">🛠️</button>
      <button onClick={() => setCurrentPage('ci-templates')} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl hover:bg-slate-200 transition-colors" title="CI Templates">📋</button>
    </div>
  );

  return (
    <ResizableLayout
      leftPanel={leftPanel}
      leftPanelCollapsed={leftPanelCollapsed}
      rightPanel={rightPanel}
      minLeftWidth={500}
      minRightWidth={260}
      defaultRightWidth={300}
      collapsedLeftWidth={60}
    />
  );
};

export default DashboardPage;

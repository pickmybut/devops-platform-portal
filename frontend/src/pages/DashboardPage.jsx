import useAppStore from '../store/useAppStore';
import { STATS, RECENT_PROJECTS } from '../data/mockData';
import ResizableLayout from '../components/ResizableLayout';

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1.5 text-[30px] font-bold leading-none text-slate-800">{value}</p>
    <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
  </div>
);

// ── Recent project row ────────────────────────────────────────────────────────
const ProjectRow = ({ project }) => (
  <div className="flex items-center gap-4 rounded-xl border border-slate-100
    bg-white px-5 py-4 shadow-sm">
    {/* Template icon */}
    <div
      style={{ background: project.templateBg }}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center
        rounded-lg text-xl"
    >
      {project.templateIcon}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className="truncate text-[13.5px] font-semibold text-slate-800">{project.name}</p>
      <p className="mt-0.5 text-[11.5px] text-slate-400">
        {project.template} · {project.namespace} · {project.createdAt}
      </p>
    </div>

    {/* Status dot */}
    <div
      className="h-2 w-2 flex-shrink-0 rounded-full"
      style={{ background: project.status === 'active' ? '#22c55e' : '#94a3b8' }}
      title={project.status === 'active' ? 'Active' : 'Idle'}
    />

    {/* Link */}
    <a
      href={project.url}
      target="_blank"
      rel="noreferrer"
      className="flex-shrink-0 text-[12px] font-semibold text-indigo-500
        hover:text-indigo-700 transition-colors"
    >
      Open →
    </a>
  </div>
);

// ── Template usage bar chart (simple) ────────────────────────────────────────
const USAGE = [
  { label: 'MFE',           count: 5, color: '#6366f1' },
  { label: 'Python API',    count: 3, color: '#22c55e' },
  { label: 'Java Service',  count: 2, color: '#ef4444' },
  { label: 'CDK Stack',     count: 2, color: '#f97316' },
  { label: 'Python Lambda', count: 1, color: '#f59e0b' },
  { label: 'Shell App',     count: 1, color: '#0ea5e9' },
];
const MAX_COUNT = Math.max(...USAGE.map((u) => u.count));

const UsageChart = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-[13px] font-semibold text-slate-700 mb-4">Template Usage</p>
    <div className="space-y-3">
      {USAGE.map(({ label, count, color }) => (
        <div key={label} className="flex items-center gap-3">
          <p className="w-28 flex-shrink-0 text-[12px] text-slate-500 truncate">{label}</p>
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(count / MAX_COUNT) * 100}%`, background: color }}
            />
          </div>
          <p className="w-4 flex-shrink-0 text-[12px] font-semibold text-slate-500 text-right">
            {count}
          </p>
        </div>
      ))}
    </div>
  </div>
);

// ── Page ────────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  // ── Left Panel: Stats + Recent Projects ─────────────────────────────────────
  const leftPanelContent = (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Recent projects */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Recently Created
          </p>
          <button
            onClick={() => setCurrentPage('create')}
            className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700"
          >
            + New Project
          </button>
        </div>
        <div className="space-y-2">
          {RECENT_PROJECTS.map((p) => <ProjectRow key={p.id} project={p} />)}
        </div>
      </div>
    </div>
  );

  // ── Right Panel: Usage chart + Quick actions ─────────────────────────────────
  const rightPanelContent = (
    <div className="space-y-4">
      <UsageChart />
      
      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[13px] font-semibold text-slate-700 mb-3">Quick Actions</p>
        <div className="space-y-2">
          <button
            onClick={() => setCurrentPage('create')}
            className="w-full flex items-center gap-3 rounded-lg border border-slate-200 
              px-4 py-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="text-lg">✦</span>
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
            <span className="text-lg">📄</span>
            <div>
              <p className="text-[13px] font-semibold text-slate-700">CI Templates</p>
              <p className="text-[11px] text-slate-400">Browse pipeline snippets</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // ── Collapsed Left Panel (Icons only) ───────────────────────────────────────
  const leftPanelCollapsed = (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Stats icons */}
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl"
        title="Projects">
        📊
      </div>
      
      {/* Recent projects icon */}
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl"
        title="Recent Projects">
        📁
      </div>
      
      {/* Divider */}
      <div className="w-6 h-px bg-slate-200 my-1" />
      
      {/* Quick action buttons */}
      <button
        onClick={() => setCurrentPage('create')}
        className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg
          hover:bg-indigo-700 transition-colors"
        title="Create Project"
      >
        ✦
      </button>
      <button
        onClick={() => setCurrentPage('ci-templates')}
        className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl
          hover:bg-slate-200 transition-colors"
        title="CI Templates"
      >
        📄
      </button>
    </div>
  );

  return (
    <ResizableLayout
      leftPanel={leftPanelContent}
      leftPanelCollapsed={leftPanelCollapsed}
      rightPanel={rightPanelContent}
      minLeftWidth={500}
      minRightWidth={260}
      defaultRightWidth={300}
      collapsedLeftWidth={60}
    />
  );
};

export default DashboardPage;

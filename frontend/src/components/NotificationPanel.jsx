import { useState, useEffect, useRef } from 'react';
import { getProjects } from '../api/projectsApi';

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
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const NotificationPanel = () => {
  const [open, setOpen]         = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(false);
  const panelRef                = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch recent projects when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getProjects({ limit: 8 })
      .then((res) => setProjects(res.data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [open]);

  const unreadCount = projects.length;

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-1.5 text-lg hover:bg-slate-100 transition-colors"
        title="Recent activity"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center
            justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 rounded-xl border border-slate-200
          bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-[13px] font-semibold text-slate-700">Recent Projects</p>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px]
              font-bold text-indigo-600">
              {projects.length}
            </span>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="inline-block h-5 w-5 animate-spin rounded-full
                  border-2 border-indigo-200 border-t-indigo-600" />
              </div>
            ) : projects.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-slate-400">
                No projects created yet
              </div>
            ) : (
              projects.map((p) => (
                <a
                  key={p.id}
                  href={p.project_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 border-b border-slate-50 px-4 py-3
                    hover:bg-slate-50 transition-colors"
                >
                  <span className="mt-0.5 text-lg flex-shrink-0">
                    {PLATFORM_ICONS[p.platform] || '🔧'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-slate-800">
                      {p.project_name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {p.namespace_path} · {timeAgo(p.created_at)}
                    </p>
                  </div>
                  <span className="mt-0.5 text-[10px] text-indigo-500 flex-shrink-0">↗</span>
                </a>
              ))
            )}
          </div>

          {/* Footer */}
          {projects.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); }}
                className="text-[11.5px] font-semibold text-indigo-500 hover:text-indigo-700"
              >
                View all in Dashboard →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;

import useAppStore from '../store/useAppStore';

const PLATFORM_LABELS = {
  gitlab:           { name: 'GitLab',           icon: '🦊' },
  github:           { name: 'GitHub',            icon: '🐙' },
  bitbucket:        { name: 'Bitbucket',         icon: '🪣' },
  'aws-codepipeline': { name: 'AWS CodeCommit', icon: '⚡' },
};

const SuccessModal = () => {
  const { showSuccess, createdProject: p, closeSuccess, setCurrentPage, resetForm } = useAppStore();

  if (!showSuccess || !p) return null;

  const platform = PLATFORM_LABELS[p.platform] ?? { name: p.platform ?? 'platform', icon: '🔧' };

  const handleCreateAnother = () => {
    closeSuccess();
    resetForm();
    setCurrentPage('create');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && closeSuccess()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Gradient header */}
        <div
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
          className="px-6 pt-6 pb-7 text-center"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center
            rounded-full bg-white/20 text-2xl">
            🎉
          </div>
          <h2 className="text-lg font-bold text-white">Repository Created!</h2>
          <p className="mt-1 text-indigo-200 text-[12.5px]">
            Your project is live on {platform.icon} {platform.name}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Repo name + URL */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Repository
            </p>
            <p className="font-semibold text-slate-800">{p.name}</p>
            <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Repository URL
              </p>
              <p className="font-mono text-[12px] text-indigo-600 break-all">{p.url}</p>
            </div>
          </div>

          {/* Scaffold summary */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Scaffold includes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                p.projectType && { label: p.projectType.name, icon: p.projectType.icon, accent: p.projectType.accent, bg: p.projectType.bg },
                p.iac && p.iac.id !== 'none' && { label: p.iac.name, icon: p.iac.icon, accent: p.iac.accent, bg: p.iac.bg },
                p.cicd && p.cicd.id !== 'none' && { label: p.cicd.name, icon: p.cicd.icon, accent: p.cicd.accent, bg: p.cicd.bg },
                ...p.features.map((f) => ({ label: f.name, icon: f.icon, accent: f.tagColor, bg: f.tagBg })),
              ]
                .filter(Boolean)
                .map((chip, i) => (
                  <span
                    key={i}
                    style={{ color: chip.accent, background: chip.bg }}
                    className="rounded-lg px-2.5 py-1 text-[11.5px] font-semibold"
                  >
                    {chip.icon} {chip.label}
                  </span>
                ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-center text-[13px]
                font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Open in {platform.name} →
            </a>
            <button
              onClick={handleCreateAnother}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px]
                font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;

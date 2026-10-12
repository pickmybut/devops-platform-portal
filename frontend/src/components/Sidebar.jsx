import { useState } from 'react';
import useAppStore from '../store/useAppStore';

const NAV = [
  {
    section: 'Main',
    items: [
      { id: 'create',       icon: '✦', label: 'Create Project' },
      { id: 'dashboard',    icon: '⊞', label: 'Dashboard' },
    ],
  },
  {
    section: 'Resources',
    items: [
      { id: 'ci-templates', icon: '📄', label: 'CI Templates' },
    ],
  },
];

// ── Confirm Reset Modal ───────────────────────────────────────────────────────
const ResetConfirmModal = ({ onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ background: 'rgba(15,15,30,0.65)', backdropFilter: 'blur(4px)' }}
  >
    <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white
      p-6 shadow-2xl">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl leading-none">🚀</span>
        <div>
          <h2 className="text-[15px] font-bold text-slate-800">Reset all selections?</h2>
          <p className="mt-1 text-[12.5px] text-slate-500 leading-relaxed">
            Going back to the home screen will clear your current project
            configuration — platform, project type, IaC, infrastructure,
            CI/CD pipeline, and all chosen features.
          </p>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-[13px]
            font-medium text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-[13px]
            font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Reset &amp; go home
        </button>
      </div>
    </div>
  </div>
);

const Sidebar = () => {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar, resetForm } = useAppStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleLogoClick = () => {
    // Only ask for confirmation if the user is on the create page with data entered,
    // or on any other page where going home would navigate away
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    resetForm();
    setCurrentPage('create');
    setShowResetConfirm(false);
  };

  return (
    <>
      {showResetConfirm && (
        <ResetConfirmModal
          onConfirm={handleConfirmReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      <aside
        style={{ 
          width: sidebarCollapsed ? 60 : 220, 
          background: '#1e1b4b', 
          flexShrink: 0,
          transition: 'width 0.2s ease-in-out',
        }}
        className="flex flex-col h-full relative"
      >
        {/* Logo — clickable, resets to home */}
        <button
          type="button"
          onClick={handleLogoClick}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          className={`w-full text-left py-5 transition-colors hover:bg-white/[0.05]
            ${sidebarCollapsed ? 'px-3' : 'px-[18px]'}`}
          title="Go to home — reset all selections"
        >
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2 mb-1'}`}>
            <span className="text-xl">🚀</span>
            {!sidebarCollapsed && (
              <span className="text-white font-bold text-[15px] tracking-tight">Platform</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <p style={{ color: '#a5b4fc' }} className="text-[11px]">
              DevOps Self-Service Portal
            </p>
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              {!sidebarCollapsed && (
                <p
                  style={{ color: '#6366f1' }}
                  className="text-[10px] font-semibold uppercase tracking-widest px-2.5 pt-4 pb-1.5"
                >
                  {section}
                </p>
              )}
              {sidebarCollapsed && <div className="pt-3" />}
              {items.map(({ id, icon, label }) => {
                const active = currentPage === id;
                return (
                  <button
                    key={id}
                    onClick={() => setCurrentPage(id)}
                    style={{
                      background: active ? 'rgba(99,102,241,0.28)' : 'transparent',
                      color: active ? '#fff' : '#c7d2fe',
                    }}
                    className={`w-full flex items-center rounded-lg text-[13px] mb-0.5
                      text-left cursor-pointer transition-all hover:bg-white/[0.07]
                      ${sidebarCollapsed 
                        ? 'justify-center px-2 py-2.5' 
                        : 'gap-2.5 px-2.5 py-2'
                      }`}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <span className={`text-[15px] leading-none ${sidebarCollapsed ? '' : 'w-[18px] text-center'}`}>
                      {icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className={active ? 'font-semibold' : ''}>{label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse/Expand button */}
        <div 
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          className={`py-3 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}
        >
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg
              text-[12px] text-indigo-300 hover:bg-white/[0.07] transition-all"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="text-sm">{sidebarCollapsed ? '→' : '←'}</span>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

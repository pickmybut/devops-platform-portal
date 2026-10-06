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

const Sidebar = () => {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <aside
      style={{ width: 220, background: '#1e1b4b', flexShrink: 0 }}
      className="flex flex-col h-full"
    >
      {/* Logo */}
      <div
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className="px-[18px] py-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🚀</span>
          <span className="text-white font-bold text-[15px] tracking-tight">Platform</span>
        </div>
        <p style={{ color: '#a5b4fc' }} className="text-[11px]">
          DevOps Self-Service Portal
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p
              style={{ color: '#6366f1' }}
              className="text-[10px] font-semibold uppercase tracking-widest px-2.5 pt-4 pb-1.5"
            >
              {section}
            </p>
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
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] mb-0.5
                    text-left cursor-pointer transition-all hover:bg-white/[0.07]"
                >
                  <span className="text-[15px] w-[18px] text-center leading-none">{icon}</span>
                  <span className={active ? 'font-semibold' : ''}>{label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

    </aside>
  );
};

export default Sidebar;

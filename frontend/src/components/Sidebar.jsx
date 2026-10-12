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
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      style={{ 
        width: sidebarCollapsed ? 60 : 220, 
        background: '#1e1b4b', 
        flexShrink: 0,
        transition: 'width 0.2s ease-in-out',
      }}
      className="flex flex-col h-full relative"
    >
      {/* Logo */}
      <div
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className={`py-5 ${sidebarCollapsed ? 'px-3' : 'px-[18px]'}`}
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
      </div>

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
  );
};

export default Sidebar;

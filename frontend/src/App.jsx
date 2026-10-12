import './index.css';
import useAppStore from './store/useAppStore';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationPanel from './components/NotificationPanel';
import CreateProjectPage from './pages/CreateProjectPage';
import DashboardPage from './pages/DashboardPage';
import CITemplatesPage from './pages/CITemplatesPage';

const PAGE_TITLES = {
  'create':       'Create New Project',
  'dashboard':    'Dashboard',
  'ci-templates': 'CI / CD Templates',
};

const PAGES = {
  'create':       <CreateProjectPage />,
  'dashboard':    <DashboardPage />,
  'ci-templates': <CITemplatesPage />,
};

const App = () => {
  const currentPage = useAppStore((s) => s.currentPage);

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* ── Left sidebar ──────────────────────────────── */}
        <Sidebar />

        {/* ── Main area ─────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 flex-shrink-0 items-center justify-between
            border-b border-slate-200 bg-white px-7">
            <h1 className="text-[15px] font-semibold text-slate-800">
              {PAGE_TITLES[currentPage]}
            </h1>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px]
                font-medium text-slate-500">
                DevOps Portal
              </span>
              <NotificationPanel />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-7">
            <ErrorBoundary>
              {PAGES[currentPage]}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;

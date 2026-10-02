import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Activity, BarChart3, Camera, ChevronRight, Clock3, LayoutDashboard, LogOut, Menu, Settings as SettingsIcon, X } from 'lucide-react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import LiveTracking from './pages/LiveTracking.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.jsx';
import { api, clearToken, getToken } from './services/api.js';

const Analytics = lazy(() => import('./pages/Analytics.jsx'));

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tracking', label: 'Live tracking', icon: Camera },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/history', label: 'History', icon: Clock3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon }
];

function AppShell({ user, onLogout, metrics, setMetrics, refreshKey, onEventRecorded, onSummary }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const page = navItems.find((item) => item.to === location.pathname)?.label || 'Dashboard';

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><span className="brand-mark"><Activity size={19} /></span><span>AI PEOPLE <b>TRACK</b></span><button className="sidebar-close icon-button" aria-label="Close menu" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
        <span className="nav-caption">WORKSPACE</span>
        <nav className="main-nav">{navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Live tracking' && metrics.status === 'live' && <i className="nav-live-dot" />}</NavLink>)}</nav>
        <div className="sidebar-bottom"><div className="workspace-label"><span className="workspace-indicator" />LOCAL WORKSPACE<ChevronRight size={14} /></div><div className="user-row"><span className="user-avatar">{user.email.slice(0, 1).toUpperCase()}</span><div><strong>{user.email}</strong><small>Administrator</small></div><button className="icon-button logout-button" title="Sign out" aria-label="Sign out" onClick={onLogout}><LogOut size={17} /></button></div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{page}</strong></div><div className="topbar-right"><span className={`top-status ${metrics.status === 'live' ? 'top-status-live' : ''}`}><i />{metrics.status === 'live' ? 'Camera live' : 'System ready'}</span><span className="topbar-date">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}</span></div></header>
        <div className="page-content"><Suspense fallback={<div className="boot-screen"><Activity size={22} /><span>Loading workspace view...</span></div>}><Routes>
          <Route path="/" element={<Dashboard metrics={metrics} setMetrics={setMetrics} refreshKey={refreshKey} onEventRecorded={onEventRecorded} onSummary={onSummary} />} />
          <Route path="/tracking" element={<LiveTracking metrics={metrics} setMetrics={setMetrics} onEventRecorded={onEventRecorded} />} />
          <Route path="/analytics" element={<Analytics key={refreshKey} />} />
          <Route path="/history" element={<History key={refreshKey} />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense></div>
        <footer className="app-footer"><span>AI PEOPLE TRACK <i /> REAL-TIME PEOPLE INTELLIGENCE</span><span>LOCAL INFERENCE · SECURE EVENT LOG</span></footer>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [metrics, setMetrics] = useState({ current: 0, active: 0, status: 'stopped' });
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setAuthChecked(true);
      return undefined;
    }
    api.me()
      .then((result) => { if (active) setUser(result.user); })
      .catch(() => { if (active) clearToken(); })
      .finally(() => { if (active) setAuthChecked(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const expire = () => { setUser(null); navigate('/login', { replace: true }); };
    window.addEventListener('auth-expired', expire);
    return () => window.removeEventListener('auth-expired', expire);
  }, [navigate]);

  const handleEventRecorded = useCallback(() => setRefreshKey((value) => value + 1), []);
  const handleSummary = useCallback(() => {}, []);
  const handleMetrics = useCallback((value) => setMetrics(value), []);
  const logout = () => {
    clearToken();
    setUser(null);
    setMetrics({ current: 0, active: 0, status: 'stopped' });
    navigate('/login', { replace: true });
  };

  if (!authChecked) return <main className="boot-screen"><Activity size={22} /><span>Opening secure workspace...</span></main>;
  if (!user) {
    if (location.pathname === '/register') {
      return <Register onRegister={(nextUser) => { setUser(nextUser); navigate('/', { replace: true }); }} />;
    }
    if (location.pathname !== '/login') return <Navigate to="/login" replace />;
    return <Login onLogin={(nextUser) => { setUser(nextUser); navigate('/', { replace: true }); }} />;
  }
  if (location.pathname === '/login') return <Navigate to="/" replace />;
  return <AppShell user={user} onLogout={logout} metrics={metrics} setMetrics={handleMetrics} refreshKey={refreshKey} onEventRecorded={handleEventRecorded} onSummary={handleSummary} />;
}
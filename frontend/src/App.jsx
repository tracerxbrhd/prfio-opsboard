import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import { Avatar } from './components';
import Editor from './Editor';
import { Icon, Logo } from './icons';
import {
  ActivityPage,
  AnalyticsPage,
  Dashboard,
  ProjectDetail,
  ProjectsPage,
  TaskDetail,
  TasksPage,
  TeamPage,
} from './pages';
import { WorkspaceContext } from './workspace';

const links = [
  ['/', 'overview', 'Overview'],
  ['/projects', 'projects', 'Projects'],
  ['/tasks', 'tasks', 'Tasks'],
  ['/team', 'team', 'Team'],
  ['/analytics', 'analytics', 'Analytics'],
  ['/activity', 'activity', 'Activity'],
];

async function fetchWorkspace() {
  const [projects, tasks, team, analytics, activity] = await Promise.all(
    ['projects/', 'tasks/', 'team/', 'analytics/', 'activity/'].map((path) => api(path)),
  );
  return { projects, tasks, team, analytics, activity };
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      onLogin(await api('auth/login/', { method: 'POST', body: { email, password } }));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Logo />
        <div className="login-story-main">
          <span className="eyebrow">THE TEAM OPERATING SYSTEM</span>
          <h1>
            Less chasing.
            <br />
            <span>More moving.</span>
          </h1>
          <p>
            Projects, people, and the next clear step.
            <br />A shared view of the work that matters.
          </p>
          <div className="login-diagram" aria-hidden="true">
            <div className="diagram-heading">
              <span className="live-dot" />
              WORK IN MOTION<span>01 — 03</span>
            </div>
            <div className="diagram-lane">
              <span className="diagram-number">01</span>
              <div>
                <small>ALIGN</small>
                <strong>A clear plan.</strong>
              </div>
              <Icon name="projects" size={26} />
            </div>
            <div className="diagram-lane">
              <span className="diagram-number">02</span>
              <div>
                <small>FOCUS</small>
                <strong>Room to do the work.</strong>
              </div>
              <Icon name="tasks" size={26} />
            </div>
            <div className="diagram-lane">
              <span className="diagram-number">03</span>
              <div>
                <small>DELIVER</small>
                <strong>Progress you can see.</strong>
              </div>
              <Icon name="analytics" size={26} />
            </div>
          </div>
        </div>
        <div className="login-story-footer">
          <span>Built for the way teams work.</span>
          <span>OPS / 01</span>
        </div>
      </section>
      <main className="login-form-side">
        <div className="login-form-wrap">
          <div className="mobile-brand">
            <Logo />
          </div>
          <div className="eyebrow">YOUR WORKSPACE, READY WHEN YOU ARE</div>
          <h2>Welcome back.</h2>
          <p>Sign in to see what’s moving.</p>
          <form onSubmit={submit}>
            <label>
              Work email
              <input
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to workspace'}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <div className="demo-panel">
            <div>
              <Icon name="overview" size={19} />
              <strong>Take a look around</strong>
            </div>
            <p>Explore a workspace with six teammates and real project workflows.</p>
            <button
              className="button secondary"
              onClick={() => {
                setEmail('admin@example.com');
                setPassword('demo-password');
                setError('');
              }}
            >
              Use admin demo
              <Icon name="arrow" size={16} />
            </button>
            <small>admin@example.com · demo-password</small>
          </div>
          <div className="login-security">
            <Icon name="shield" size={16} />
            Your session stays in a secure, private cookie.
          </div>
        </div>
        <footer>
          OpsBoard <span>Team operations, considered.</span>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 800px)').matches);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    const update = () => {
      setMobile(media.matches);
      setMenuOpen(false);
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', closeMenu);
    const previous = document.activeElement;
    document.querySelector('.sidebar nav a')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeMenu);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [menuOpen]);
  const reload = useCallback(async () => {
    setData(await fetchWorkspace());
    setError('');
  }, []);
  useEffect(() => {
    api('auth/me/')
      .then(setUser)
      .catch((failure) => {
        if (failure.status !== 403 && failure.status !== 401)
          setError('The workspace server is unavailable. Check your connection and try signing in.');
      })
      .finally(() => setInitializing(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchWorkspace()
      .then((workspace) => {
        if (!cancelled) setData(workspace);
      })
      .catch((failure) => {
        if (!cancelled) setError(failure.message);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function shortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  async function signOut() {
    try {
      await api('auth/logout/', { method: 'POST' });
      setUser(null);
      setData(null);
      navigate('/login');
    } catch (failure) {
      setToast(failure.message);
    }
  }
  if (initializing)
    return (
      <div className="loading-page">
        <Logo />
        <span className="loading-line" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (!user)
    return (
      <>
        <Login
          onLogin={(person) => {
            setUser(person);
            setError('');
            if (location.pathname === '/login') navigate('/');
          }}
        />
        {error && (
          <div className="toast" role="alert">
            {error}
          </div>
        )}
      </>
    );
  const section =
    links.find(([path]) => path !== '/' && location.pathname.startsWith(path))?.[2] || 'Overview';
  return (
    <WorkspaceContext.Provider
      value={{
        user,
        data,
        reload,
        notify: setToast,
        edit: setEditor,
        canManage: ['admin', 'manager'].includes(user.role),
      }}
    >
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <div className="app-shell">
        {menuOpen && (
          <button
            className="sidebar-overlay"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <aside
          id="workspace-sidebar"
          className={`sidebar ${menuOpen ? 'open' : ''}`}
          aria-label="Workspace navigation"
          inert={mobile && !menuOpen ? true : undefined}
          role={mobile && menuOpen ? 'dialog' : undefined}
          aria-modal={mobile && menuOpen ? true : undefined}
        >
          <Link to="/" className="brand-link" onClick={() => setMenuOpen(false)}>
            <Logo />
          </Link>
          <div className="workspace-switch">
            <span className="workspace-avatar">N</span>
            <span>
              <strong>Northstar team</strong>
              <small>Shared workspace</small>
            </span>
            <Icon name="shield" size={16} />
          </div>
          <div className="nav-label">WORKSPACE</div>
          <nav>
            {links.map(([path, icon, label]) => (
              <NavLink key={path} end={path === '/'} to={path} onClick={() => setMenuOpen(false)}>
                <Icon name={icon} size={19} />
                <span>{label}</span>
                {label === 'Tasks' && data && (
                  <span className="nav-count">
                    {data.tasks.filter((task) => task.status !== 'done' && !task.project_archived).length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY.</span>
            <p>
              Give every task an owner.
              <br />
              Give every day a focus.
            </p>
            <span className="sidebar-note-line" />
          </div>
          {user.can_access_admin && (
            <a className="admin-link" href="/admin/" target="_blank" rel="noreferrer">
              <Icon name="shield" size={16} />
              Django administration
              <Icon name="arrow" size={14} />
            </a>
          )}
          <div className="sidebar-user">
            <Avatar user={user} />
            <span>
              <strong>{user.name}</strong>
              <small>{user.role} account</small>
            </span>
            <button onClick={signOut} aria-label="Sign out" title="Sign out">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </aside>
        <div className="workspace-main" inert={mobile && menuOpen ? true : undefined}>
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                aria-expanded={menuOpen}
                aria-controls="workspace-sidebar"
                onClick={() => setMenuOpen(true)}
              >
                <Icon name="menu" />
              </button>
              <span>Workspace</span>
              <Icon name="chevron" size={13} />
              <strong>{section}</strong>
            </div>
            <form
              className="global-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(`/tasks?q=${encodeURIComponent(search)}`);
              }}
            >
              <Icon name="search" size={16} />
              <input
                ref={searchRef}
                aria-label="Search workspace"
                value={search}
                placeholder="Search work…"
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </form>
            <span className="workspace-live">
              <span className="live-dot" />
              Workspace live
            </span>
          </header>
          <main id="main" className="main-content" tabIndex="-1">
            {error && (
              <div className="error-banner" role="alert">
                {error}
                <button onClick={() => reload().catch((failure) => setError(failure.message))}>
                  Try again
                </button>
              </div>
            )}
            {!data ? (
              <div className="empty">
                <span className="loading-line" />
                <p>Loading projects and team activity…</p>
              </div>
            ) : (
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/tasks/:id" element={<TaskDetail />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route
                  path="*"
                  element={
                    <div className="empty">
                      <h1>This page isn’t in the workspace.</h1>
                      <Link className="button primary" to="/">
                        Back to overview
                      </Link>
                    </div>
                  }
                />
              </Routes>
            )}
          </main>
          <footer className="workspace-footer">
            <span>Northstar team / OpsBoard</span>
            <span>Good work starts with a clear view.</span>
          </footer>
        </div>
      </div>
      {editor && <Editor {...editor} close={() => setEditor(null)} />}{' '}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
          <button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </WorkspaceContext.Provider>
  );
}

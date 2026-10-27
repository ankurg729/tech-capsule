import { NavLink, Navigate, Outlet, useLocation } from 'react-router';
import { session, useSession } from '@/lib/session';
import { Button, Spinner } from './ui';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/lessons', label: 'Lessons' },
  { to: '/paths', label: 'Learning paths' },
  { to: '/news', label: 'News' },
  { to: '/reports', label: 'Reports' },
  { to: '/audit', label: 'Audit log' },
];

/** Client-side gate for UX only — every admin endpoint is authorized on the server. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="Restoring session…" />;
  if (status !== 'signedIn') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

export function Layout() {
  const { user } = useSession();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            TC
          </span>
          <div>
            <strong>TechCapsule</strong>
            <small>Admin</small>
          </div>
        </div>
        <nav aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <strong>{user?.displayName}</strong>
            <small>{user?.email}</small>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void session.signOut()}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

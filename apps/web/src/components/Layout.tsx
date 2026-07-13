import { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/auth-context';
import { PageLoader } from './PageLoader';

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined;
}

export function Layout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/home" className="app-logo">
          RatingApp
        </Link>
        <nav>
          <NavLink to="/home" className={navLinkClassName}>
            Today's movie
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/rankings" className={navLinkClassName}>
                Rankings
              </NavLink>
              <NavLink to="/groups" className={navLinkClassName}>
                Groups
              </NavLink>
              <NavLink to="/settings" className={navLinkClassName}>
                Settings
              </NavLink>
            </>
          )}
          {isAuthenticated ? (
            <button type="button" className="nav-logout" onClick={handleLogout}>
              Log out
            </button>
          ) : (
            <NavLink to="/auth" className={navLinkClassName}>
              Log in / Sign up
            </NavLink>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Suspense fallback={<PageLoader fullPage />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

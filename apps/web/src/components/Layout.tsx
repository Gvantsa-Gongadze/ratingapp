import { useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { fetchMe } from '../api/auth';
import { useAuth } from '../api/auth-context';
import { PageLoader } from './PageLoader';

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined;
}

export function Layout() {
  const { isAuthenticated } = useAuth();
  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    enabled: isAuthenticated,
    retry: false,
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/home" className="app-logo">
          DailyMovies
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
              {me?.role === 'admin' && (
                <NavLink to="/admin" className={navLinkClassName}>
                  Admin
                </NavLink>
              )}
            </>
          )}
          {!isAuthenticated && (
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

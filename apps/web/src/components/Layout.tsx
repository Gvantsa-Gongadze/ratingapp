import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/auth-context';

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
        <Link to="/" className="app-logo">
          RatingApp
        </Link>
        <nav>
          <Link to="/">Today's movie</Link>
          <Link to="/rankings">Rankings</Link>
          <Link to="/groups">Groups</Link>
          {isAuthenticated ? (
            <>
              <Link to="/my-ratings">My Ratings</Link>
              <button type="button" className="nav-logout" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <Link to="/auth">Log in / Sign up</Link>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

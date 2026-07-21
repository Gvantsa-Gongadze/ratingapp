import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CurrentMoviePage } from './features/current-movie/CurrentMoviePage';

// Code-split every route except the index page, which loads eagerly anyway
// since it's what most visits land on first.
const AuthPage = lazy(() => import('./features/auth/AuthPage').then((m) => ({ default: m.AuthPage })));
const ResetPasswordPage = lazy(() =>
  import('./features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const RankingsPage = lazy(() =>
  import('./features/rankings/RankingsPage').then((m) => ({ default: m.RankingsPage })),
);
const MovieDetailPage = lazy(() =>
  import('./features/movies/MovieDetailPage').then((m) => ({ default: m.MovieDetailPage })),
);
const GroupsPage = lazy(() => import('./features/groups/GroupsPage').then((m) => ({ default: m.GroupsPage })));
const GroupDetailPage = lazy(() =>
  import('./features/groups/GroupDetailPage').then((m) => ({ default: m.GroupDetailPage })),
);
const UserProfilePage = lazy(() =>
  import('./features/profile/UserProfilePage').then((m) => ({ default: m.UserProfilePage })),
);
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const AdminPage = lazy(() => import('./features/admin/AdminPage').then((m) => ({ default: m.AdminPage })));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<CurrentMoviePage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="movies/:id" element={<MovieDetailPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="groups/:id" element={<GroupDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="u/:username" element={<UserProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}

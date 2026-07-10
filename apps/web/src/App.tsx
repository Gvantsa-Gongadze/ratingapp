import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CurrentMoviePage } from './features/current-movie/CurrentMoviePage';
import { AuthPage } from './features/auth/AuthPage';
import { RankingsPage } from './features/rankings/RankingsPage';
import { MyRatingsPage } from './features/ratings/MyRatingsPage';
import { MovieDetailPage } from './features/movies/MovieDetailPage';
import { GroupsPage } from './features/groups/GroupsPage';
import { GroupDetailPage } from './features/groups/GroupDetailPage';
import { UserProfilePage } from './features/profile/UserProfilePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CurrentMoviePage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="my-ratings" element={<MyRatingsPage />} />
        <Route path="movies/:id" element={<MovieDetailPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="groups/:id" element={<GroupDetailPage />} />
        <Route path="u/:username" element={<UserProfilePage />} />
      </Route>
    </Routes>
  );
}

import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CurrentMoviePage } from './features/current-movie/CurrentMoviePage';
import { RegisterPage } from './features/auth/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CurrentMoviePage />} />
        <Route path="auth" element={<RegisterPage />} />
        {/* Coming next, in build order:
            /rankings
            /movies/:id
            /groups, /groups/:id
            /u/:username  */}
      </Route>
    </Routes>
  );
}

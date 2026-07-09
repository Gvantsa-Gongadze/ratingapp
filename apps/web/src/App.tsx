import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CurrentMoviePage } from './features/current-movie/CurrentMoviePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CurrentMoviePage />} />
        {/* Coming next, in build order:
            /rankings
            /movies/:id
            /groups, /groups/:id
            /u/:username
            /login, /register  */}
      </Route>
    </Routes>
  );
}

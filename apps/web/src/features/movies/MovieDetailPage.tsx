import { useParams } from 'react-router-dom';

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="movie-detail-page">
      <h1>Movie {id}</h1>
      <p className="placeholder-copy">
        This screen will show movie details, ratings, and links to IMDb and
        Letterboxd.
      </p>
    </section>
  );
}

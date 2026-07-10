import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchMyRatings } from '../../api/ratings';
import { ApiError } from '../../api/client';

export function MyRatingsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ratings', 'mine'],
    queryFn: fetchMyRatings,
    retry: false,
  });

  if (isLoading) {
    return (
      <section className="ratings-page">
        <h1>My Ratings</h1>
        <p className="placeholder-copy">Loading your ratings…</p>
      </section>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 401) {
      return (
        <section className="ratings-page">
          <h1>My Ratings</h1>
          <p className="placeholder-copy">
            <Link to="/auth">Log in</Link> to see your rating history.
          </p>
        </section>
      );
    }

    return (
      <section className="ratings-page">
        <h1>My Ratings</h1>
        <p className="status-error">
          {error instanceof ApiError ? error.message : 'Could not load your ratings.'}
        </p>
      </section>
    );
  }

  return (
    <section className="ratings-page">
      <h1>My Ratings</h1>

      {data && data.length === 0 && (
        <p className="placeholder-copy">
          You haven't rated any movies yet — head to <Link to="/">today's movie</Link> to get started.
        </p>
      )}

      {data && data.length > 0 && (
        <ol className="ranking-list">
          {data.map((rating) => (
            <li key={rating.id} className="ranking-row rating-row">
              {rating.movie.posterUrl && (
                <img
                  className="ranking-poster"
                  src={rating.movie.posterUrl}
                  alt={`${rating.movie.title} poster`}
                />
              )}
              <div className="ranking-info">
                <span className="ranking-title">
                  {rating.movie.title} <span className="movie-year">({rating.movie.year})</span>
                </span>
                {rating.review && <p className="rating-review">{rating.review}</p>}
                <span className="ranking-meta">
                  Rated {new Date(rating.ratedAt).toLocaleDateString()}
                </span>
              </div>
              <span className="ranking-score">{rating.score}/10</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCurrentAssignment, rateAssignment, skipAssignment } from '../../api/assignments';
import { ApiError } from '../../api/client';

const ASSIGNMENT_QUERY_KEY = ['assignment', 'current'];

export function CurrentMoviePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ASSIGNMENT_QUERY_KEY,
    queryFn: fetchCurrentAssignment,
    retry: false,
  });

  const [score, setScore] = useState(7);
  const [review, setReview] = useState('');

  const rateMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      rateAssignment(assignmentId, { score, review: review.trim() || undefined }),
    onSuccess: (next) => {
      queryClient.setQueryData(ASSIGNMENT_QUERY_KEY, next);
      setScore(7);
      setReview('');
    },
  });

  const skipMutation = useMutation({
    mutationFn: (assignmentId: string) => skipAssignment(assignmentId),
    onSuccess: (next) => {
      queryClient.setQueryData(ASSIGNMENT_QUERY_KEY, next);
    },
  });

  function handleRate(event: FormEvent) {
    event.preventDefault();
    if (data) rateMutation.mutate(data.id);
  }

  function handleSkip() {
    if (data) skipMutation.mutate(data.id);
  }

  if (isLoading) {
    return (
      <section className="current-movie">
        <h1>Your movie today</h1>
        <p className="placeholder-copy">Finding your movie…</p>
      </section>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 401) {
      return (
        <section className="current-movie">
          <h1>Your movie today</h1>
          <p className="placeholder-copy">
            <Link to="/auth">Sign up</Link> to get your daily movie assignment.
          </p>
        </section>
      );
    }

    return (
      <section className="current-movie">
        <h1>Your movie today</h1>
        <p className="status-error">
          {error instanceof ApiError ? error.message : 'Something went wrong loading your movie.'}
        </p>
        <button type="button" className="btn-secondary" onClick={() => refetch()}>
          Try again
        </button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="current-movie">
      <h1>Your movie today</h1>

      <div className="movie-card">
        {data.movie.posterUrl && (
          <img className="movie-poster" src={data.movie.posterUrl} alt={`${data.movie.title} poster`} />
        )}
        <div className="movie-details">
          <h2>
            {data.movie.title} <span className="movie-year">({data.movie.year})</span>
          </h2>
          {data.movie.genres.length > 0 && <p className="movie-genres">{data.movie.genres.join(', ')}</p>}
          {data.movie.runtime && <p className="movie-runtime">{data.movie.runtime} min</p>}
          {data.movie.overview && <p className="movie-overview">{data.movie.overview}</p>}

          <Countdown
            deadlineAt={data.deadlineAt}
            onExpire={() => queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEY })}
          />

          <div className="movie-links">
            <a href={data.movie.links.tmdb} target="_blank" rel="noreferrer">
              TMDB
            </a>
            {data.movie.links.imdb && (
              <a href={data.movie.links.imdb} target="_blank" rel="noreferrer">
                IMDb
              </a>
            )}
            <a href={data.movie.links.letterboxd} target="_blank" rel="noreferrer">
              Letterboxd
            </a>
          </div>
        </div>
      </div>

      <form className="rate-form" onSubmit={handleRate}>
        <label>
          Your rating
          <select value={score} onChange={(event) => setScore(Number(event.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label>
          Review (optional)
          <textarea
            rows={3}
            value={review}
            onChange={(event) => setReview(event.target.value)}
          />
        </label>

        {rateMutation.isError && (
          <p className="auth-error">
            {rateMutation.error instanceof ApiError ? rateMutation.error.message : 'Could not submit rating'}
          </p>
        )}
        {skipMutation.isError && (
          <p className="auth-error">
            {skipMutation.error instanceof ApiError ? skipMutation.error.message : "Could not skip"}
          </p>
        )}

        <div className="movie-actions">
          <button type="submit" disabled={rateMutation.isPending || skipMutation.isPending}>
            {rateMutation.isPending ? 'Saving…' : 'Rate'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSkip}
            disabled={rateMutation.isPending || skipMutation.isPending}
          >
            {skipMutation.isPending ? 'Skipping…' : "Didn't watch"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Countdown({ deadlineAt, onExpire }: { deadlineAt: string; onExpire: () => void }) {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const [remainingMs, setRemainingMs] = useState(() => new Date(deadlineAt).getTime() - Date.now());

  useEffect(() => {
    const deadline = new Date(deadlineAt).getTime();
    setRemainingMs(deadline - Date.now());

    const intervalId = setInterval(() => {
      const remaining = deadline - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0) {
        onExpireRef.current();
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [deadlineAt]);

  if (remainingMs <= 0) {
    return <p className="countdown countdown-expired">Time's up — fetching a new movie…</p>;
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <p className="countdown">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)} left to rate
    </p>
  );
}

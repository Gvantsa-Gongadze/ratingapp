import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AssignmentDto } from '@ratingapp/shared-types';
import { ChangeEvent, FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCurrentAssignment, rateAssignment, skipAssignment } from '../../api/assignments';
import { ApiError } from '../../api/client';
import { Countdown } from '../../components/Countdown';
import { Modal } from '../../components/Modal';
import { GenrePreferencesSection } from '../settings/GenrePreferencesSection';
import { RatingSection } from '../settings/RatingSection';
import { YearRangeSection } from '../settings/YearRangeSection';

const ASSIGNMENT_QUERY_KEY = ['assignment', 'current'];

const STATUS_COPY: Record<Exclude<AssignmentDto['status'], 'active'>, string> = {
  rated: "You've rated this one — your next movie unlocks when the countdown ends.",
  skipped: "You skipped this one — your next movie unlocks when the countdown ends.",
  expired: 'Fetching your next movie…',
};

export function CurrentMoviePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ASSIGNMENT_QUERY_KEY,
    queryFn: fetchCurrentAssignment,
    retry: false,
  });

  const [score, setScore] = useState<number | ''>(7);
  const [review, setReview] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  const isScoreValid =
    typeof score === 'number' && score >= 1 && score <= 10 && Number(score.toFixed(1)) === score;

  const rateMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      rateAssignment(assignmentId, {
        score: score as number,
        review: review.trim() || undefined,
        ratedAt: new Date().toISOString(),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(ASSIGNMENT_QUERY_KEY, next);
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'mine'] });
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

  function handleScoreChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    setScore(raw === '' ? '' : Number(raw));
  }

  function handleScoreBlur() {
    if (score === '') return;
    const clamped = Math.min(10, Math.max(1, score));
    setScore(Math.round(clamped * 10) / 10);
  }

  function handleRate(event: FormEvent) {
    event.preventDefault();
    if (data && isScoreValid) rateMutation.mutate(data.id);
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
      <div className="current-movie-header">
        <h1>Your movie today</h1>
        <button type="button" className="btn-accent" onClick={() => setShowPreferences(true)}>
          Movie preferences
        </button>
      </div>

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

          {data.status !== 'active' && <p className="countdown">{STATUS_COPY[data.status]}</p>}
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

          {data.movie.tmdbRating && (
            <p className="movie-tmdb-rating">
              TMDB rating: {data.movie.tmdbRating.average.toFixed(1)}/10 (
              {data.movie.tmdbRating.voteCount.toLocaleString()} votes)
            </p>
          )}

          {data.communityRating && (
            <p className="movie-community-rating">
              Community: {data.communityRating.averageScore.toFixed(1)}/10 (
              {data.communityRating.ratingsCount} rating
              {data.communityRating.ratingsCount === 1 ? '' : 's'})
            </p>
          )}
        </div>
      </div>

      {data.status === 'active' && (
        <form className="rate-form" onSubmit={handleRate}>
          <label>
            Your rating (1-10)
            <input
              type="number"
              min={1}
              max={10}
              step={0.1}
              required
              value={score}
              onChange={handleScoreChange}
              onBlur={handleScoreBlur}
            />
          </label>
          {score !== '' && !isScoreValid && (
            <p className="auth-error">Rating must be between 1 and 10, with at most one decimal place</p>
          )}

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
            <button
              type="submit"
              disabled={!isScoreValid || rateMutation.isPending || skipMutation.isPending}
            >
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
      )}

      {showPreferences && (
        <Modal title="Movie preferences" onClose={() => setShowPreferences(false)} fixedHeight>
          <div className="preferences-section">
            <h3>Categories</h3>
            <GenrePreferencesSection />
          </div>
          <div className="preferences-section">
            <h3>Time period</h3>
            <YearRangeSection />
          </div>
          <div className="preferences-section">
            <h3>Rating</h3>
            <RatingSection />
          </div>
        </Modal>
      )}
    </section>
  );
}

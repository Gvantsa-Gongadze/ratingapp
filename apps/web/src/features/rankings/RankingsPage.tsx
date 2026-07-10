import { useQuery } from '@tanstack/react-query';
import type { RankingPeriod } from '@ratingapp/shared-types';
import { useMemo, useState } from 'react';
import { fetchRankings } from '../../api/rankings';
import { fetchMyRatings } from '../../api/ratings';
import { ApiError } from '../../api/client';

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This week' },
  { value: 'monthly', label: 'This month' },
  { value: 'all', label: 'All time' },
];

function formatRelativeTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

export function RankingsPage() {
  const [period, setPeriod] = useState<RankingPeriod>('daily');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rankings', period],
    queryFn: () => fetchRankings(period),
  });

  // Best-effort: unauthenticated visitors just won't see a "You" score.
  const { data: myRatings } = useQuery({
    queryKey: ['ratings', 'mine'],
    queryFn: fetchMyRatings,
    retry: false,
  });

  const myRatingByMovieId = useMemo(() => {
    const map = new Map<string, { score: number; review: string | null }>();
    myRatings?.forEach((rating) => map.set(rating.movie.id, { score: rating.score, review: rating.review }));
    return map;
  }, [myRatings]);

  return (
    <section className="rankings-page">
      <h1>Rankings</h1>

      <div className="tabs">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={period === p.value ? 'active' : ''}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="placeholder-copy">Loading rankings…</p>}

      {isError && (
        <p className="status-error">
          {error instanceof ApiError ? error.message : 'Could not load rankings.'}
        </p>
      )}

      {data && data.length === 0 && (
        <p className="placeholder-copy">No ratings yet for this period.</p>
      )}

      {data && data.length > 0 && (
        <ol className="ranking-list">
          {data.map((entry) => {
            const myRating = myRatingByMovieId.get(entry.movieId);
            return (
              <li key={entry.movieId} className="ranking-row">
                <span className="ranking-rank">{entry.rank}</span>
                {entry.posterUrl && (
                  <img className="ranking-poster" src={entry.posterUrl} alt={`${entry.title} poster`} />
                )}
                <div className="ranking-info">
                  <span className="ranking-title">
                    {entry.title} <span className="movie-year">({entry.year})</span>
                  </span>
                  <span className="ranking-meta">
                    {entry.ratingsCount} rating{entry.ratingsCount === 1 ? '' : 's'}
                  </span>
                  {myRating?.review && <p className="rating-review">{myRating.review}</p>}
                </div>
                <div className="ranking-scores">
                  <div className="score-block">
                    <span className="score-value">{entry.weightedScore.toFixed(1)}</span>
                    <span className="score-label">Everyone</span>
                  </div>
                  <div className="score-block">
                    <span className="score-value">
                      {myRating !== undefined ? myRating.score.toFixed(1) : '—'}
                    </span>
                    <span className="score-label">You</span>
                  </div>
                </div>
                <span className="ranking-timestamp" title={new Date(entry.ratedAt).toLocaleString()}>
                  {formatRelativeTime(entry.ratedAt)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

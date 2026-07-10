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

  const myScoreByMovieId = useMemo(() => {
    const map = new Map<string, number>();
    myRatings?.forEach((rating) => map.set(rating.movie.id, rating.score));
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
            const myScore = myScoreByMovieId.get(entry.movieId);
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
                </div>
                <div className="ranking-scores">
                  <div className="score-block">
                    <span className="score-value">{entry.weightedScore.toFixed(1)}</span>
                    <span className="score-label">Everyone</span>
                  </div>
                  <div className="score-block">
                    <span className="score-value">{myScore ?? '—'}</span>
                    <span className="score-label">You</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

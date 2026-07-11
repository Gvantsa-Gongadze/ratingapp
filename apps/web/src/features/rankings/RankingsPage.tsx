import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { RankingEntryDto, RankingPeriod } from '@ratingapp/shared-types';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fetchMovieReviews, fetchRankings } from '../../api/rankings';
import { fetchMyRatings } from '../../api/ratings';
import { ApiError } from '../../api/client';
import { PageLoader } from '../../components/PageLoader';

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
  const [page, setPage] = useState(1);

  const tabRefs = useRef<Record<RankingPeriod, HTMLButtonElement | null>>({
    daily: null,
    weekly: null,
    monthly: null,
    all: null,
  });
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = tabRefs.current[period];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [period]);

  useEffect(() => {
    function handleResize() {
      const el = tabRefs.current[period];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [period]);

  function handlePeriodChange(next: RankingPeriod) {
    setPeriod(next);
    setPage(1);
  }

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['rankings', period, page],
    queryFn: () => fetchRankings(period, page),
    placeholderData: keepPreviousData,
  });

  // Best-effort: unauthenticated visitors just won't see a "You" score.
  const { data: myRatings } = useQuery({
    queryKey: ['ratings', 'mine'],
    queryFn: fetchMyRatings,
    retry: false,
  });

  const myRatingByMovieId = useMemo(() => {
    const map = new Map<string, { score: number }>();
    myRatings?.forEach((rating) => map.set(rating.movie.id, { score: rating.score }));
    return map;
  }, [myRatings]);

  return (
    <section className="rankings-page">
      <h1>Rankings</h1>

      <div className="tabs tabs--sliding">
        <span
          className="tab-indicator"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
        />
        {PERIODS.map((p) => (
          <button
            key={p.value}
            ref={(el) => {
              tabRefs.current[p.value] = el;
            }}
            type="button"
            className={period === p.value ? 'active' : ''}
            onClick={() => handlePeriodChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading && <PageLoader />}

      {isError && (
        <p className="status-error">
          {error instanceof ApiError ? error.message : 'Could not load rankings.'}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="placeholder-copy">No ratings yet for this period.</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <ol className={isFetching ? 'ranking-list ranking-list--fetching' : 'ranking-list'}>
            {data.items.map((entry) => (
              <RankingRow
                key={entry.movieId}
                entry={entry}
                period={period}
                myRating={myRatingByMovieId.get(entry.movieId)}
              />
            ))}
          </ol>

          {data.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((p) => p - 1)}
                disabled={data.page <= 1}
              >
                Previous
              </button>
              <span className="pagination-status">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.page >= data.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface RankingRowProps {
  entry: RankingEntryDto;
  period: RankingPeriod;
  myRating: { score: number } | undefined;
}

function RankingRow({ entry, period, myRating }: RankingRowProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['rankings', entry.movieId, 'reviews', period],
    queryFn: () => fetchMovieReviews(entry.movieId, period),
    enabled: expanded,
    staleTime: 60_000,
  });

  return (
    <li className="ranking-item">
      <div className="ranking-row">
        <span className="ranking-rank">{entry.rank}</span>
        {entry.posterUrl && (
          <img
            className="ranking-poster"
            src={entry.posterUrl}
            alt={`${entry.title} poster`}
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="ranking-info">
          <span className="ranking-title">
            {entry.title} <span className="movie-year">({entry.year})</span>
          </span>
          <div className="ranking-meta-row">
            <span className="ranking-meta">
              {entry.ratingsCount} rating{entry.ratingsCount === 1 ? '' : 's'}
            </span>
            {entry.ratingsCount > 0 && (
              <button type="button" className="reviews-toggle" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Hide reviews' : 'Show reviews'}
              </button>
            )}
          </div>
        </div>
        <div className="ranking-scores">
          <div className="score-block">
            <span className="score-value">{entry.weightedScore.toFixed(1)}</span>
            <span className="score-label">Everyone</span>
          </div>
          <div className="score-block">
            <span className="score-value">{myRating !== undefined ? myRating.score.toFixed(1) : '—'}</span>
            <span className="score-label">You</span>
          </div>
        </div>
        <span className="ranking-timestamp" title={new Date(entry.ratedAt).toLocaleString()}>
          {formatRelativeTime(entry.ratedAt)}
        </span>
      </div>

      {expanded && (
        <div className="movie-reviews">
          {reviewsLoading && <p className="reviews-status">Loading reviews…</p>}
          {reviews && reviews.length === 0 && <p className="reviews-status">No written reviews yet.</p>}
          {reviews?.map((review) => (
            <div key={review.userId} className="movie-review">
              <div className="movie-review-header">
                <span className="movie-review-author">{review.username}</span>
                <span className="movie-review-score">{review.score.toFixed(1)}</span>
              </div>
              <p className="movie-review-text">{review.review}</p>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

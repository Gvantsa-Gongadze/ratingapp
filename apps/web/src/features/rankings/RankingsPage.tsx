import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { RankingEntryDto, RankingPeriod } from '@ratingapp/shared-types';
import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fetchMovieReviews, fetchRankings } from '../../api/rankings';
import { fetchMyRatings } from '../../api/ratings';
import { ApiError } from '../../api/client';
import { getCurrentUserId } from '../../api/token-storage';
import { Modal } from '../../components/Modal';
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
  const periodIndexRef = useRef(PERIODS.findIndex((p) => p.value === period));
  const [slideDirection, setSlideDirection] = useState(1);
  const [transitionKey, setTransitionKey] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const el = tabRefs.current[period];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [period]);

  // Restart the slide-in animation on the existing DOM nodes (rather than
  // remounting via `key`) so posters don't flash/re-decode on every switch.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.classList.remove('ranking-list--sliding');
    void el.offsetWidth;
    el.classList.add('ranking-list--sliding');
  }, [transitionKey]);

  useEffect(() => {
    function handleResize() {
      const el = tabRefs.current[period];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [period]);

  function handlePeriodChange(next: RankingPeriod) {
    if (next === period) return;
    const nextIndex = PERIODS.findIndex((p) => p.value === next);
    setSlideDirection(nextIndex > periodIndexRef.current ? 1 : -1);
    periodIndexRef.current = nextIndex;
    setTransitionKey((k) => k + 1);
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

  const currentUserId = getCurrentUserId();

  const [openReviews, setOpenReviews] = useState<{ movieId: string; title: string } | null>(null);

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
          <ol
            ref={listRef}
            className={
              isFetching
                ? 'ranking-list ranking-list--fetching ranking-list--sliding'
                : 'ranking-list ranking-list--sliding'
            }
            style={{ '--slide-from': `${slideDirection * 24}px` } as CSSProperties}
          >
            {data.items.map((entry) => (
              <RankingRow
                key={entry.movieId}
                entry={entry}
                myRating={myRatingByMovieId.get(entry.movieId)}
                onShowReviews={() => setOpenReviews({ movieId: entry.movieId, title: entry.title })}
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

      {openReviews && (
        <MovieReviewsModal
          movieId={openReviews.movieId}
          title={openReviews.title}
          period={period}
          currentUserId={currentUserId}
          onClose={() => setOpenReviews(null)}
        />
      )}
    </section>
  );
}

interface RankingRowProps {
  entry: RankingEntryDto;
  myRating: { score: number } | undefined;
  onShowReviews: () => void;
}

function RankingRow({ entry, myRating, onShowReviews }: RankingRowProps) {
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
            {entry.reviewsCount > 0 && (
              <button type="button" className="reviews-toggle" onClick={onShowReviews}>
                Show reviews ({entry.reviewsCount})
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
    </li>
  );
}

interface MovieReviewsModalProps {
  movieId: string;
  title: string;
  period: RankingPeriod;
  currentUserId: string | null;
  onClose: () => void;
}

function MovieReviewsModal({ movieId, title, period, currentUserId, onClose }: MovieReviewsModalProps) {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['rankings', movieId, 'reviews', period],
    queryFn: () => fetchMovieReviews(movieId, period),
    staleTime: 60_000,
  });

  // Own review first, everyone else stays in the chronological order the API returns.
  const sortedReviews = useMemo(() => {
    if (!reviews || !currentUserId) return reviews;
    const mine = reviews.filter((r) => r.userId === currentUserId);
    const others = reviews.filter((r) => r.userId !== currentUserId);
    return [...mine, ...others];
  }, [reviews, currentUserId]);

  return (
    <Modal title={title} onClose={onClose}>
      {isLoading && <p className="reviews-status">Loading reviews…</p>}
      {reviews && reviews.length === 0 && <p className="reviews-status">No written reviews yet.</p>}
      {sortedReviews && sortedReviews.length > 0 && (
        <div className="movie-reviews">
          {sortedReviews.map((review) => (
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
    </Modal>
  );
}

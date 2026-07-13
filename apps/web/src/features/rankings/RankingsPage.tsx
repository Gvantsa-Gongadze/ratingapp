import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { MyRatingDto, RankingEntryDto, RankingPeriod } from '@ratingapp/shared-types';
import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const currentUserId = getCurrentUserId();
  const [openReviews, setOpenReviews] = useState<{ movieId: string; title: string } | null>(null);
  const [view, setView] = useState<'mine' | 'everyone'>('mine');

  return (
    <section className="rankings-page">
      <h1>Rankings</h1>

      <div className="tabs">
        <button type="button" className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>
          Me
        </button>
        <button type="button" className={view === 'everyone' ? 'active' : ''} onClick={() => setView('everyone')}>
          Everyone
        </button>
      </div>

      {view === 'mine' && <MyRankingsSection />}

      {view === 'everyone' && (
        <EveryoneRankingsSection
          currentUserId={currentUserId}
          openReviews={openReviews}
          onShowReviews={setOpenReviews}
        />
      )}
    </section>
  );
}

interface PeriodTabsProps {
  period: RankingPeriod;
  onChange: (next: RankingPeriod) => void;
}

/** Self-contained sliding period tab bar — each instance tracks its own indicator position. */
function PeriodTabs({ period, onChange }: PeriodTabsProps) {
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

  return (
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
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function MyRankingsSection() {
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [openReviews, setOpenReviews] = useState<{ movieId: string; title: string } | null>(null);
  const currentUserId = getCurrentUserId();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ratings', 'mine', period],
    queryFn: () => fetchMyRatings(period),
    retry: false,
  });

  const ranked = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.score - a.score);
  }, [data]);

  return (
    <>
      <PeriodTabs period={period} onChange={setPeriod} />

      {isLoading && <PageLoader />}

      {isError &&
        (error instanceof ApiError && error.status === 401 ? (
          <p className="placeholder-copy">
            <Link to="/auth">Log in</Link> to see your own rankings.
          </p>
        ) : (
          <p className="status-error">
            {error instanceof ApiError ? error.message : 'Could not load your ratings.'}
          </p>
        ))}

      {data && ranked.length === 0 && (
        <p className="placeholder-copy">You haven't rated anything yet for this period.</p>
      )}

      {data && ranked.length > 0 && (
        <ol className="ranking-list">
          {ranked.map((rating, index) => (
            <MyRankingRow
              key={rating.id}
              rating={rating}
              rank={index + 1}
              onShowReviews={() => setOpenReviews({ movieId: rating.movie.id, title: rating.movie.title })}
            />
          ))}
        </ol>
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
    </>
  );
}

function MyRankingRow({
  rating,
  rank,
  onShowReviews,
}: {
  rating: MyRatingDto;
  rank: number;
  onShowReviews: () => void;
}) {
  return (
    <li className="ranking-item">
      <div className="ranking-row">
        <span className="ranking-rank">{rank}</span>
        {rating.movie.posterUrl && (
          <img
            className="ranking-poster"
            src={rating.movie.posterUrl}
            alt={`${rating.movie.title} poster`}
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="ranking-info">
          <span className="ranking-title">
            {rating.movie.title} <span className="movie-year">({rating.movie.year})</span>
          </span>
          <div className="ranking-meta-row">
            <span className="ranking-meta">
              {rating.ratingsCount} rating{rating.ratingsCount === 1 ? '' : 's'}
            </span>
            {rating.reviewsCount > 0 && (
              <button type="button" className="reviews-toggle" onClick={onShowReviews}>
                Show reviews ({rating.reviewsCount})
              </button>
            )}
          </div>
        </div>
        <div className="ranking-scores">
          <div className="score-block">
            <span className="score-value">{rating.score.toFixed(1)}</span>
            <span className="score-label">You</span>
          </div>
        </div>
        <span className="ranking-timestamp" title={new Date(rating.ratedAt).toLocaleString()}>
          {formatRelativeTime(rating.ratedAt)}
        </span>
      </div>
    </li>
  );
}

interface EveryoneRankingsSectionProps {
  currentUserId: string | null;
  openReviews: { movieId: string; title: string } | null;
  onShowReviews: (value: { movieId: string; title: string } | null) => void;
}

function EveryoneRankingsSection({ currentUserId, openReviews, onShowReviews }: EveryoneRankingsSectionProps) {
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [page, setPage] = useState(1);

  const periodIndexRef = useRef(PERIODS.findIndex((p) => p.value === period));
  const [slideDirection, setSlideDirection] = useState(1);
  const [transitionKey, setTransitionKey] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  // Restart the slide-in animation on the existing DOM nodes (rather than
  // remounting via `key`) so posters don't flash/re-decode on every switch.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.classList.remove('ranking-list--sliding');
    void el.offsetWidth;
    el.classList.add('ranking-list--sliding');
  }, [transitionKey]);

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

  return (
    <>
      <PeriodTabs period={period} onChange={handlePeriodChange} />

      {isLoading && <PageLoader />}

      {isError && (
        <p className="status-error">{error instanceof ApiError ? error.message : 'Could not load rankings.'}</p>
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
                onShowReviews={() => onShowReviews({ movieId: entry.movieId, title: entry.title })}
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
          onClose={() => onShowReviews(null)}
        />
      )}
    </>
  );
}

interface RankingRowProps {
  entry: RankingEntryDto;
  onShowReviews: () => void;
}

function RankingRow({ entry, onShowReviews }: RankingRowProps) {
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

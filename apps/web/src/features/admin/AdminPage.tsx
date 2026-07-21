import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAdminReviews,
  fetchAdminStats,
  fetchAdminUsers,
  removeReview,
  setUserBanned,
  updateUserRole,
} from '../../api/admin';
import { fetchMe } from '../../api/auth';
import { ApiError } from '../../api/client';
import { PageLoader } from '../../components/PageLoader';

type AdminView = 'users' | 'moderation' | 'stats';

export function AdminPage() {
  const { data: me, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
  });
  const [view, setView] = useState<AdminView>('users');

  if (isLoading) return <PageLoader />;

  if (isError || !me) {
    return (
      <section className="admin-page">
        <h1>Admin</h1>
        <p className="placeholder-copy">
          <Link to="/auth">Log in</Link> to access the admin panel.
        </p>
      </section>
    );
  }

  if (me.role !== 'admin') {
    return (
      <section className="admin-page">
        <h1>Admin</h1>
        <p className="status-error">You don't have access to this page.</p>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <h1>Admin</h1>

      <div className="tabs">
        <button type="button" className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>
          Users
        </button>
        <button
          type="button"
          className={view === 'moderation' ? 'active' : ''}
          onClick={() => setView('moderation')}
        >
          Moderation
        </button>
        <button type="button" className={view === 'stats' ? 'active' : ''} onClick={() => setView('stats')}>
          Stats
        </button>
      </div>

      {view === 'users' && <AdminUsersSection currentUserId={me.id} />}
      {view === 'moderation' && <AdminModerationSection />}
      {view === 'stats' && <AdminStatsSection />}
    </section>
  );
}

function AdminUsersSection({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => fetchAdminUsers(page),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      updateUserRole(userId, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) => setUserBanned(userId, { banned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <p className="status-error">{error instanceof ApiError ? error.message : 'Could not load users.'}</p>
    );
  }

  if (!data || data.items.length === 0) {
    return <p className="placeholder-copy">No users yet.</p>;
  }

  return (
    <>
      <ul className="admin-list">
        {data.items.map((user) => (
          <li key={user.id} className="admin-row">
            <div className="admin-row-info">
              <span className="admin-row-title">
                {user.username}
                {user.role === 'admin' && <span className="admin-badge admin-badge--role">Admin</span>}
                {user.bannedAt && <span className="admin-badge admin-badge--banned">Suspended</span>}
              </span>
              <span className="admin-row-meta">
                {user.email} · {user.ratingsCount} rating{user.ratingsCount === 1 ? '' : 's'} · joined{' '}
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="admin-row-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={user.id === currentUserId || roleMutation.isPending}
                onClick={() =>
                  roleMutation.mutate({ userId: user.id, role: user.role === 'admin' ? 'user' : 'admin' })
                }
              >
                {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={user.id === currentUserId || banMutation.isPending}
                onClick={() => banMutation.mutate({ userId: user.id, banned: !user.bannedAt })}
              >
                {user.bannedAt ? 'Unban' : 'Ban'}
              </button>
            </div>
          </li>
        ))}
      </ul>

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
  );
}

function AdminModerationSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'reviews', page],
    queryFn: () => fetchAdminReviews(page),
  });

  const removeMutation = useMutation({
    mutationFn: (ratingId: string) => removeReview(ratingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <p className="status-error">{error instanceof ApiError ? error.message : 'Could not load reviews.'}</p>
    );
  }

  if (!data || data.items.length === 0) {
    return <p className="placeholder-copy">No written reviews yet.</p>;
  }

  return (
    <>
      <div className="movie-reviews">
        {data.items.map((review) => (
          <div key={review.ratingId} className="movie-review">
            <div className="movie-review-header">
              <span className="movie-review-author">{review.username}</span>
              <span className="movie-review-score">{review.score.toFixed(1)}</span>
            </div>
            <p className="admin-review-meta">
              {review.movieTitle} · {new Date(review.ratedAt).toLocaleDateString()}
            </p>
            <p className="movie-review-text">{review.review}</p>
            <div className="admin-row-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(review.ratingId)}
              >
                Remove review
              </button>
            </div>
          </div>
        ))}
      </div>

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
  );
}

function AdminStatsSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
  });

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <p className="status-error">{error instanceof ApiError ? error.message : 'Could not load stats.'}</p>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-value">{data.totalUsers}</span>
          <span className="admin-stat-label">Total users</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{data.newUsersLast7Days}</span>
          <span className="admin-stat-label">New users (7d)</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{data.totalRatings}</span>
          <span className="admin-stat-label">Total ratings</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{data.ratingsLast7Days}</span>
          <span className="admin-stat-label">Ratings (7d)</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{data.totalMovies}</span>
          <span className="admin-stat-label">Movies rated</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{data.totalGroups}</span>
          <span className="admin-stat-label">Groups</span>
        </div>
      </div>

      <h2>Top movies</h2>
      {data.topMovies.length === 0 ? (
        <p className="placeholder-copy">No ratings yet.</p>
      ) : (
        <ul className="admin-list">
          {data.topMovies.map((movie, index) => (
            <li key={movie.movieId} className="admin-row">
              <div className="admin-row-info">
                <span className="admin-row-title">
                  {index + 1}. {movie.title}
                </span>
                <span className="admin-row-meta">
                  {movie.ratingsCount} rating{movie.ratingsCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="score-block">
                <span className="score-value">{movie.averageScore.toFixed(1)}</span>
                <span className="score-label">Avg</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

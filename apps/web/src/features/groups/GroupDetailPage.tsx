import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AssignmentDto, GroupMode } from '@ratingapp/shared-types';
import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import {
  createInvite,
  fetchGroupAssignment,
  fetchGroupDetail,
  fetchGroupHistory,
  fetchGroupSettings,
  leaveGroup,
  rateGroupAssignment,
  skipGroupAssignment,
  updateGroupGenrePreferences,
  updateGroupMinRating,
  updateGroupYearRange,
} from '../../api/groups';
import { getCurrentUserId } from '../../api/token-storage';
import { Countdown } from '../../components/Countdown';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/PageLoader';
import { GenrePreferencesSection } from '../settings/GenrePreferencesSection';
import { RatingSection } from '../settings/RatingSection';
import { YearRangeSection } from '../settings/YearRangeSection';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['groups', id],
    queryFn: () => fetchGroupDetail(id as string),
    enabled: Boolean(id),
  });

  const inviteMutation = useMutation({
    mutationFn: () => createInvite(id as string),
    onSuccess: (invite) => setInviteCode(invite.code),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
      navigate('/groups');
    },
  });

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <p className="status-error">
        {error instanceof ApiError ? error.message : 'Could not load this group.'}
      </p>
    );
  }

  if (!data) return null;

  return (
    <section className="group-detail-page">
      <Link to="/groups" className="auth-link-button">
        ← Back to groups
      </Link>

      <div className="group-detail-header">
        <h1>{data.name}</h1>
        <button type="button" className="btn-secondary" onClick={() => setShowPreferences(true)}>
          Movie preferences
        </button>
      </div>
      <p className="placeholder-copy">
        <button type="button" className="group-members-link" onClick={() => setShowMembers(true)}>
          {data.memberCount} member{data.memberCount === 1 ? '' : 's'}
        </button>{' '}
        · {data.mode === 'sync' ? 'Synced' : 'Individual'} mode
      </p>

      {data.role === 'owner' && (
        <div className="group-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending ? 'Generating…' : 'Generate invite code'}
          </button>
          {inviteMutation.isError && (
            <p className="auth-error">
              {inviteMutation.error instanceof ApiError ? inviteMutation.error.message : 'Something went wrong'}
            </p>
          )}
          {inviteCode && (
            <p className="placeholder-copy">
              Invite code: <strong>{inviteCode}</strong>
            </p>
          )}
        </div>
      )}

      <GroupMovieSection groupId={data.id} />

      <GroupHistorySection groupId={data.id} mode={data.mode} />

      {showMembers && (
        <Modal title={`${data.name} — members`} onClose={() => setShowMembers(false)}>
          <ul className="group-member-list">
            {data.members.map((member) => (
              <li key={member.userId} className="group-member-row">
                <span className="group-member-name">{member.username}</span>
                {member.role === 'owner' && <span className="group-member-badge">Owner</span>}
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {showPreferences && (
        <Modal title="Movie preferences" onClose={() => setShowPreferences(false)} fixedHeight>
          <div className="preferences-section">
            <h3>Categories</h3>
            <GenrePreferencesSection
              fetchSettings={() => fetchGroupSettings(data.id)}
              updateSettings={(prefs) => updateGroupGenrePreferences(data.id, prefs)}
              queryKey={['groups', data.id, 'settings']}
              readOnly={data.role !== 'owner'}
            />
          </div>
          <div className="preferences-section">
            <h3>Time period</h3>
            <YearRangeSection
              fetchSettings={() => fetchGroupSettings(data.id)}
              updateSettings={(range) => updateGroupYearRange(data.id, range)}
              queryKey={['groups', data.id, 'settings']}
              readOnly={data.role !== 'owner'}
            />
          </div>
          <div className="preferences-section">
            <h3>Rating</h3>
            <RatingSection
              fetchSettings={() => fetchGroupSettings(data.id)}
              updateSettings={(rating) => updateGroupMinRating(data.id, rating)}
              queryKey={['groups', data.id, 'settings']}
              readOnly={data.role !== 'owner'}
            />
          </div>
        </Modal>
      )}

      {data.role === 'member' && (
        <div className="group-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
          >
            {leaveMutation.isPending ? 'Leaving…' : 'Leave group'}
          </button>
          {leaveMutation.isError && (
            <p className="auth-error">
              {leaveMutation.error instanceof ApiError ? leaveMutation.error.message : 'Something went wrong'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

const STATUS_COPY: Record<Exclude<AssignmentDto['status'], 'active'>, string> = {
  rated: "You've rated this one — waiting for the rest of the group to finish before the next movie.",
  skipped: "You skipped this one — waiting for the rest of the group to finish before the next movie.",
  expired: 'Fetching your next movie…',
};

function GroupMovieSection({ groupId }: { groupId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['groups', groupId, 'assignment'];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchGroupAssignment(groupId),
  });

  const [score, setScore] = useState<number | ''>(7);
  const [review, setReview] = useState('');

  const isScoreValid =
    typeof score === 'number' && score >= 1 && score <= 10 && Number(score.toFixed(1)) === score;

  const rateMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      rateGroupAssignment(groupId, assignmentId, {
        score: score as number,
        review: review.trim() || undefined,
        ratedAt: new Date().toISOString(),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'mine'] });
      setScore(7);
      setReview('');
    },
  });

  const skipMutation = useMutation({
    mutationFn: (assignmentId: string) => skipGroupAssignment(groupId, assignmentId),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
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
    return <p className="placeholder-copy">Finding this group's movie…</p>;
  }

  if (isError) {
    return (
      <div>
        <p className="status-error">
          {error instanceof ApiError ? error.message : "Could not load this group's movie."}
        </p>
        <button type="button" className="btn-secondary" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
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

          {data.status === 'active' ? (
            <Countdown deadlineAt={data.deadlineAt} onExpire={() => refetch()} />
          ) : (
            <p className="countdown">{STATUS_COPY[data.status]}</p>
          )}

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
            <textarea rows={3} value={review} onChange={(event) => setReview(event.target.value)} />
          </label>

          {rateMutation.isError && (
            <p className="auth-error">
              {rateMutation.error instanceof ApiError ? rateMutation.error.message : 'Could not submit rating'}
            </p>
          )}
          {skipMutation.isError && (
            <p className="auth-error">
              {skipMutation.error instanceof ApiError ? skipMutation.error.message : 'Could not skip'}
            </p>
          )}

          <div className="movie-actions">
            <button type="submit" disabled={!isScoreValid || rateMutation.isPending || skipMutation.isPending}>
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
    </>
  );
}

function GroupHistorySection({ groupId, mode }: { groupId: string; mode: GroupMode }) {
  const currentUserId = getCurrentUserId();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['groups', groupId, 'history'],
    queryFn: () => fetchGroupHistory(groupId),
  });

  if (isLoading || isError || !data) return null;

  return (
    <div className="group-history">
      <h2>{mode === 'sync' ? 'Watched together' : 'Movies watched'}</h2>

      {data.length === 0 ? (
        <p className="placeholder-copy">No completed movies yet.</p>
      ) : (
        <ul className="group-history-list">
          {data.map((entry) => (
            <li key={entry.id} className="group-history-row">
              {entry.movie.posterUrl && (
                <img
                  className="group-history-poster"
                  src={entry.movie.posterUrl}
                  alt={`${entry.movie.title} poster`}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="group-history-info">
                <span className="group-history-title">
                  {entry.movie.title} <span className="movie-year">({entry.movie.year})</span>
                </span>
                <span className="group-history-meta">
                  {new Date(entry.completedAt).toLocaleDateString()}
                  {entry.watchedBy && (
                    <> · {entry.watchedBy.userId === currentUserId ? 'You' : entry.watchedBy.username}</>
                  )}
                </span>
              </div>
              {entry.watchedBy && (
                <div className="score-block">
                  <span className="score-value">
                    {entry.watchedBy.score !== null ? entry.watchedBy.score.toFixed(1) : '—'}
                  </span>
                  <span className="score-label">{entry.watchedBy.score !== null ? 'Score' : 'Skipped'}</span>
                </div>
              )}
              {entry.groupScore && (
                <div className="score-block">
                  <span className="score-value">
                    {entry.groupScore.averageScore !== null ? entry.groupScore.averageScore.toFixed(1) : '—'}
                  </span>
                  <span className="score-label">Group</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

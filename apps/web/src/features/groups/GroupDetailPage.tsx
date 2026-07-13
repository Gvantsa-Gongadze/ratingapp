import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { createInvite, fetchGroupDetail, leaveGroup } from '../../api/groups';
import { PageLoader } from '../../components/PageLoader';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState<string | null>(null);

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

      <h1>{data.name}</h1>
      <p className="placeholder-copy">
        {data.memberCount} member{data.memberCount === 1 ? '' : 's'} ·{' '}
        {data.mode === 'sync' ? 'Synced' : 'Individual'} mode
      </p>

      <ul className="group-member-list">
        {data.members.map((member) => (
          <li key={member.userId} className="group-member-row">
            <span className="group-member-name">{member.username}</span>
            {member.role === 'owner' && <span className="group-member-badge">Owner</span>}
          </li>
        ))}
      </ul>

      <div className="group-actions">
        {data.role === 'owner' && (
          <div>
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

        {data.role === 'member' && (
          <div>
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
      </div>
    </section>
  );
}

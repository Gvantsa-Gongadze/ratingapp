import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GroupMode } from '@ratingapp/shared-types';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { createGroup, fetchMyGroups, joinGroup } from '../../api/groups';
import { PageLoader } from '../../components/PageLoader';

export function GroupsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['groups', 'mine'],
    queryFn: fetchMyGroups,
  });

  return (
    <section className="groups-page">
      <h1>Groups</h1>

      {isLoading && <PageLoader />}

      {isError && (
        <p className="status-error">{error instanceof ApiError ? error.message : 'Could not load groups.'}</p>
      )}

      {data && data.length === 0 && (
        <p className="placeholder-copy">You're not in any groups yet — create one or join with an invite code.</p>
      )}

      {data && data.length > 0 && (
        <ul className="group-list">
          {data.map((group) => (
            <li key={group.id} className="group-row">
              <Link to={`/groups/${group.id}`} className="group-row-link">
                <span className="group-row-name">{group.name}</span>
                <span className="group-row-meta">
                  {group.memberCount} member{group.memberCount === 1 ? '' : 's'} ·{' '}
                  {group.mode === 'sync' ? 'Synced' : 'Individual'}
                  {group.role === 'owner' ? ' · Owner' : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="group-forms">
        <CreateGroupForm />
        <JoinGroupForm />
      </div>
    </section>
  );
}

function CreateGroupForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GroupMode>('individual');

  const mutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
      navigate(`/groups/${group.id}`);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ name, mode });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Create a group</h2>

      <label>
        Name
        <input
          type="text"
          required
          minLength={2}
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label>
        Mode
        <select value={mode} onChange={(event) => setMode(event.target.value as GroupMode)}>
          <option value="individual">Individual — everyone gets their own random movie</option>
          <option value="sync">Sync — everyone gets the same movie</option>
        </select>
      </label>

      {mutation.isError && (
        <p className="auth-error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}
        </p>
      )}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating…' : 'Create group'}
      </button>
    </form>
  );
}

function JoinGroupForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');

  const mutation = useMutation({
    mutationFn: joinGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
      navigate(`/groups/${group.id}`);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ code: code.trim() });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Join a group</h2>

      <label>
        Invite code
        <input type="text" required value={code} onChange={(event) => setCode(event.target.value)} />
      </label>

      {mutation.isError && (
        <p className="auth-error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}
        </p>
      )}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Joining…' : 'Join group'}
      </button>
    </form>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { fetchMe } from '../../api/auth';
import { ApiError } from '../../api/client';
import { changeEmail, changePassword } from '../../api/users';
import { PageLoader } from '../../components/PageLoader';

export function SettingsPage() {
  return (
    <section className="settings-page">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Account</h2>
        <AccountSection />
      </div>
    </section>
  );
}

function AccountSection() {
  const { data: me, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
  });

  if (isLoading) return <PageLoader />;
  if (isError) return <p className="placeholder-copy">Log in to manage your account.</p>;

  return (
    <>
      {me && (
        <p className="placeholder-copy">
          Signed in as <strong>{me.username}</strong> ({me.email})
        </p>
      )}

      <div className="account-forms">
        <ChangePasswordForm />
        <ChangeEmailForm />
      </div>
    </>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ currentPassword, newPassword });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Change password</h2>

      <label>
        Current password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </label>

      <label>
        New password
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </label>

      {mutation.isError && (
        <p className="auth-error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Could not update password'}
        </p>
      )}
      {mutation.isSuccess && <p className="status-ok">{mutation.data.message}</p>}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}

function ChangeEmailForm() {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const mutation = useMutation({
    mutationFn: changeEmail,
    onSuccess: () => {
      setCurrentPassword('');
      setNewEmail('');
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ currentPassword, newEmail });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Change email</h2>

      <label>
        Current password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </label>

      <label>
        New email
        <input
          type="email"
          required
          autoComplete="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
        />
      </label>

      {mutation.isError && (
        <p className="auth-error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Could not update email'}
        </p>
      )}
      {mutation.isSuccess && <p className="status-ok">{mutation.data.message}</p>}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Updating…' : 'Update email'}
      </button>
    </form>
  );
}

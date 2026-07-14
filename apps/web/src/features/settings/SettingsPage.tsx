import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe } from '../../api/auth';
import { useAuth } from '../../api/auth-context';
import { ApiError } from '../../api/client';
import { changeEmail, changePassword } from '../../api/users';
import { PageLoader } from '../../components/PageLoader';

export function SettingsPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  return (
    <section className="settings-page">
      <h1>Settings</h1>

      <div className="settings-section settings-card">
        <h2>Account</h2>
        <AccountSection />
      </div>

      {isAuthenticated && (
        <div className="settings-section settings-card">
          <h2>Session</h2>
          <p className="placeholder-copy">Sign out of RatingApp on this device.</p>
          <button type="button" className="btn-secondary settings-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
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
        <div className="profile-summary">
          <div className="profile-avatar">{me.username.charAt(0).toUpperCase()}</div>
          <div>
            <p className="profile-username">{me.username}</p>
            <p className="profile-email">{me.email}</p>
          </div>
        </div>
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
    <form className="auth-form account-form-card" onSubmit={handleSubmit}>
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
    <form className="auth-form account-form-card" onSubmit={handleSubmit}>
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

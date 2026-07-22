import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import { ApiError } from '../../api/client';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: resetPassword,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (token) mutation.mutate({ token, newPassword });
  }

  if (!token) {
    return (
      <section className="auth-page">
        <h1>Reset password</h1>
        <p className="status-error">
          This reset link is missing its token. Request a new one from the{' '}
          <Link to="/auth">log in page</Link>.
        </p>
      </section>
    );
  }

  if (mutation.isSuccess) {
    return (
      <section className="auth-page">
        <h1>Reset password</h1>
        <p className="placeholder-copy">{mutation.data.message}</p>
        <Link to="/auth">Go to log in</Link>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <h1>Reset password</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="visually-hidden">
          Username
          <input type="text" autoComplete="username" readOnly value="" />
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
            {mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}
          </p>
        )}

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </section>
  );
}

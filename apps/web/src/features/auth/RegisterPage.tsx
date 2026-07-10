import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';
import { ApiError } from '../../api/client';
import { saveTokens } from '../../api/token-storage';

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      saveTokens(data.accessToken, data.refreshToken);
      navigate('/');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, username, password });
  }

  return (
    <section className="auth-page">
      <h1>Create your account</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          Username
          <input
            type="text"
            required
            autoComplete="username"
            pattern="[a-zA-Z0-9_]{3,20}"
            title="3-20 characters: letters, numbers, underscores"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {mutation.isError && (
          <p className="auth-error">
            {mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}
          </p>
        )}

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </section>
  );
}

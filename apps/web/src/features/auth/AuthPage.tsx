import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword, login, register } from '../../api/auth';
import { useAuth } from '../../api/auth-context';
import { ApiError } from '../../api/client';

type Mode = 'login' | 'register' | 'forgot';

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');

  return (
    <section className="auth-page">
      <div className="tabs">
        <button
          type="button"
          className={mode === 'login' || mode === 'forgot' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          Log in
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          Sign up
        </button>
      </div>

      {mode === 'login' && <LoginForm onForgotPassword={() => setMode('forgot')} />}
      {mode === 'register' && <RegisterForm />}
      {mode === 'forgot' && <ForgotPasswordForm onBackToLogin={() => setMode('login')} />}
    </section>
  );
}

function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const navigate = useNavigate();
  const { login: setAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuthenticated(data.accessToken, data.refreshToken);
      navigate('/home');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
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
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
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
        {mutation.isPending ? 'Logging in…' : 'Log in'}
      </button>

      <button type="button" className="auth-link-button" onClick={onForgotPassword}>
        Forgot password?
      </button>
    </form>
  );
}

function ForgotPasswordForm({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: forgotPassword,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email });
  }

  if (mutation.isSuccess) {
    return (
      <div className="auth-form">
        <p className="placeholder-copy">{mutation.data.message}</p>
        <button type="button" className="btn-secondary" onClick={onBackToLogin}>
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <p className="placeholder-copy">Enter your email and we'll send you a link to reset your password.</p>

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

      {mutation.isError && (
        <p className="auth-error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}
        </p>
      )}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Sending…' : 'Send reset link'}
      </button>

      <button type="button" className="auth-link-button" onClick={onBackToLogin}>
        Back to log in
      </button>
    </form>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const { login: setAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuthenticated(data.accessToken, data.refreshToken);
      navigate('/home');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, username, password });
  }

  return (
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
  );
}

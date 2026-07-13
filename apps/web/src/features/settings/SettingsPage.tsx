import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { fetchMe } from '../../api/auth';
import { ApiError } from '../../api/client';
import { changeEmail, changePassword, fetchUserSettings, updateGenrePreferences } from '../../api/users';
import { PageLoader } from '../../components/PageLoader';

type GenreState = 'neutral' | 'include' | 'exclude';

function nextState(current: GenreState): GenreState {
  if (current === 'neutral') return 'include';
  if (current === 'include') return 'exclude';
  return 'neutral';
}

export function SettingsPage() {
  return (
    <section className="settings-page">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Account</h2>
        <AccountSection />
      </div>

      <div className="settings-section">
        <h2>Movie categories</h2>
        <GenrePreferencesSection />
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

function GenrePreferencesSection() {
  const queryClient = useQueryClient();
  const queryKey = ['users', 'settings'];

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchUserSettings,
    retry: false,
  });

  const [genreStates, setGenreStates] = useState<Record<string, GenreState> | null>(null);

  useEffect(() => {
    if (data && genreStates === null) {
      const includeSet = new Set(data.settings.genresInclude ?? []);
      const excludeSet = new Set(data.settings.genresExclude ?? []);
      const initial: Record<string, GenreState> = {};
      for (const genre of data.availableGenres) {
        initial[genre] = includeSet.has(genre) ? 'include' : excludeSet.has(genre) ? 'exclude' : 'neutral';
      }
      setGenreStates(initial);
    }
  }, [data, genreStates]);

  const mutation = useMutation({
    mutationFn: updateGenrePreferences,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
    },
  });

  function cycleGenre(genre: string) {
    setGenreStates((prev) => {
      if (!prev) return prev;
      return { ...prev, [genre]: nextState(prev[genre]) };
    });
  }

  function handleSave() {
    if (!genreStates) return;
    const genresInclude = Object.entries(genreStates)
      .filter(([, state]) => state === 'include')
      .map(([genre]) => genre);
    const genresExclude = Object.entries(genreStates)
      .filter(([, state]) => state === 'exclude')
      .map(([genre]) => genre);
    mutation.mutate({ genresInclude, genresExclude });
  }

  if (isLoading) return <PageLoader />;

  if (isError) {
    if (error instanceof ApiError && error.status === 401) {
      return <p className="placeholder-copy">Log in to choose your favorite movie categories.</p>;
    }
    return (
      <p className="status-error">{error instanceof ApiError ? error.message : 'Could not load settings.'}</p>
    );
  }

  if (!data || !genreStates) return null;

  return (
    <>
      <p className="placeholder-copy">
        Tap a category to cycle it through no preference → prefer → avoid. Preferred categories show up more often
        in your daily picks; avoided ones are filtered out.
      </p>

      <div className="genre-chip-list">
        {data.availableGenres.map((genre) => (
          <button
            key={genre}
            type="button"
            className={`genre-chip genre-chip--${genreStates[genre]}`}
            onClick={() => cycleGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {mutation.isError && (
        <p className="auth-error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Could not save your preferences'}
        </p>
      )}
      {mutation.isSuccess && <p className="status-ok">Saved.</p>}

      <button type="button" className="btn-primary" onClick={handleSave} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save preferences'}
      </button>
    </>
  );
}

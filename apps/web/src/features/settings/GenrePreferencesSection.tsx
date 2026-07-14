import type { QueryKey } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateGenrePreferencesRequest } from '@ratingapp/shared-types';
import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { fetchUserSettings, updateGenrePreferences } from '../../api/users';
import { PageLoader } from '../../components/PageLoader';

type GenreState = 'neutral' | 'include' | 'exclude';

interface GenrePreferencesData {
  settings: { genresInclude: string[] | null; genresExclude: string[] | null };
  availableGenres: string[];
}

interface GenrePreferencesSectionProps {
  fetchSettings?: () => Promise<GenrePreferencesData>;
  updateSettings?: (data: UpdateGenrePreferencesRequest) => Promise<unknown>;
  queryKey?: QueryKey;
  /** Members other than the group owner can see these preferences but not edit them. */
  readOnly?: boolean;
}

function nextState(current: GenreState): GenreState {
  if (current === 'neutral') return 'include';
  if (current === 'include') return 'exclude';
  return 'neutral';
}

function sameGenreSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((genre) => setB.has(genre));
}

export function GenrePreferencesSection({
  fetchSettings = fetchUserSettings,
  updateSettings = updateGenrePreferences,
  queryKey = ['users', 'settings'],
  readOnly = false,
}: GenrePreferencesSectionProps = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchSettings,
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
    mutationFn: updateSettings,
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

  function getCurrentSelection(states: Record<string, GenreState>) {
    const genresInclude = Object.entries(states)
      .filter(([, state]) => state === 'include')
      .map(([genre]) => genre);
    const genresExclude = Object.entries(states)
      .filter(([, state]) => state === 'exclude')
      .map(([genre]) => genre);
    return { genresInclude, genresExclude };
  }

  function handleSave() {
    if (!genreStates) return;
    mutation.mutate(getCurrentSelection(genreStates));
  }

  function handleClear() {
    setGenreStates((prev) => {
      if (!prev) return prev;
      const cleared: Record<string, GenreState> = {};
      for (const genre of Object.keys(prev)) cleared[genre] = 'neutral';
      return cleared;
    });
  }

  if (isLoading) return <PageLoader />;

  if (isError) {
    if (error instanceof ApiError && error.status === 401) {
      return <p className="placeholder-copy">Log in to set your movie preferences.</p>;
    }
    return (
      <p className="status-error">{error instanceof ApiError ? error.message : 'Could not load settings.'}</p>
    );
  }

  if (!data || !genreStates) return null;

  const hasSelection = Object.values(genreStates).some((state) => state !== 'neutral');
  const currentSelection = getCurrentSelection(genreStates);
  const hasChanges =
    !sameGenreSet(currentSelection.genresInclude, data.settings.genresInclude ?? []) ||
    !sameGenreSet(currentSelection.genresExclude, data.settings.genresExclude ?? []);

  return (
    <>
      <p className="placeholder-copy">
        {readOnly
          ? 'Only the group owner can change these.'
          : 'Tap a category to cycle it through no preference → prefer → avoid. Preferred categories show up more often in your daily picks; avoided ones are filtered out.'}
      </p>

      <div className="genre-chip-list">
        {data.availableGenres.map((genre) => (
          <button
            key={genre}
            type="button"
            className={`genre-chip genre-chip--${genreStates[genre]}`}
            onClick={() => cycleGenre(genre)}
            disabled={readOnly}
          >
            {genre}
          </button>
        ))}
      </div>

      {!readOnly && (
        <>
          {mutation.isError && (
            <p className="auth-error">
              {mutation.error instanceof ApiError ? mutation.error.message : 'Could not save your preferences'}
            </p>
          )}
          <div className="preferences-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={mutation.isPending || !hasChanges}
            >
              {mutation.isPending ? 'Saving…' : 'Save preferences'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClear}
              disabled={mutation.isPending || !hasSelection}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </>
  );
}

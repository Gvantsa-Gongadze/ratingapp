import type { QueryKey } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateMinRatingRequest } from '@ratingapp/shared-types';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { fetchUserSettings, updateMinRating } from '../../api/users';
import { PageLoader } from '../../components/PageLoader';

const RATING_OPTIONS = Array.from({ length: 18 }, (_, i) => (1 + i * 0.5).toFixed(1));

interface RatingData {
  settings: { minTmdbRating: number | null };
}

interface RatingSectionProps {
  fetchSettings?: () => Promise<RatingData>;
  updateSettings?: (data: UpdateMinRatingRequest) => Promise<unknown>;
  queryKey?: QueryKey;
  /** Members other than the group owner can see this preference but not edit it. */
  readOnly?: boolean;
}

export function RatingSection({
  fetchSettings = fetchUserSettings,
  updateSettings = updateMinRating,
  queryKey = ['users', 'settings'],
  readOnly = false,
}: RatingSectionProps = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchSettings,
    retry: false,
  });

  const [minRating, setMinRating] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setMinRating(data.settings.minTmdbRating !== null ? String(data.settings.minTmdbRating) : '');
      setInitialized(true);
    }
  }, [data, initialized]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ minRating: minRating === '' ? null : Number(minRating) });
  }

  function handleClear() {
    setMinRating('');
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

  if (!data) return null;

  const hasChanges = (minRating === '' ? null : Number(minRating)) !== data.settings.minTmdbRating;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <p className="placeholder-copy">
        {readOnly ? 'Only the group owner can change this.' : 'Only get movies rated at least this high on TMDB.'}
      </p>

      <label>
        Minimum rating
        <select value={minRating} onChange={(event) => setMinRating(event.target.value)} disabled={readOnly}>
          <option value="">Any</option>
          {RATING_OPTIONS.map((rating) => (
            <option key={rating} value={rating}>
              {rating}+
            </option>
          ))}
        </select>
      </label>

      {!readOnly && (
        <>
          {mutation.isError && (
            <p className="auth-error">
              {mutation.error instanceof ApiError ? mutation.error.message : 'Could not save your preferences'}
            </p>
          )}
          <div className="preferences-actions">
            <button type="submit" className="btn-primary" disabled={mutation.isPending || !hasChanges}>
              {mutation.isPending ? 'Saving…' : 'Save rating filter'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClear}
              disabled={mutation.isPending || minRating === ''}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </form>
  );
}

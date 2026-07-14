import type { QueryKey } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateYearRangeRequest } from '@ratingapp/shared-types';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { fetchUserSettings, updateYearRange } from '../../api/users';
import { PageLoader } from '../../components/PageLoader';

const MIN_YEAR = 1874;
const MAX_YEAR = new Date().getFullYear() + 1;
const YEAR_OPTIONS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i);

interface YearRangeData {
  settings: { minYear: number | null; maxYear: number | null };
}

interface YearRangeSectionProps {
  fetchSettings?: () => Promise<YearRangeData>;
  updateSettings?: (data: UpdateYearRangeRequest) => Promise<unknown>;
  queryKey?: QueryKey;
  /** Members other than the group owner can see this preference but not edit it. */
  readOnly?: boolean;
}

export function YearRangeSection({
  fetchSettings = fetchUserSettings,
  updateSettings = updateYearRange,
  queryKey = ['users', 'settings'],
  readOnly = false,
}: YearRangeSectionProps = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchSettings,
    retry: false,
  });

  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setMinYear(data.settings.minYear !== null ? String(data.settings.minYear) : '');
      setMaxYear(data.settings.maxYear !== null ? String(data.settings.maxYear) : '');
      setInitialized(true);
    }
  }, [data, initialized]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
    },
  });

  const isRangeInvalid = minYear !== '' && maxYear !== '' && Number(minYear) > Number(maxYear);
  const hasRange = minYear !== '' || maxYear !== '';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isRangeInvalid) return;
    mutation.mutate({
      minYear: minYear === '' ? null : Number(minYear),
      maxYear: maxYear === '' ? null : Number(maxYear),
    });
  }

  function handleClear() {
    setMinYear('');
    setMaxYear('');
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

  const currentMinYear = minYear === '' ? null : Number(minYear);
  const currentMaxYear = maxYear === '' ? null : Number(maxYear);
  const hasChanges = currentMinYear !== data.settings.minYear || currentMaxYear !== data.settings.maxYear;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <p className="placeholder-copy">
        {readOnly
          ? 'Only the group owner can change this.'
          : 'Only get movies released in this range. Leave a field blank for no limit on that side.'}
      </p>

      <div className="year-range-inputs">
        <label>
          From year
          <select value={minYear} onChange={(event) => setMinYear(event.target.value)} disabled={readOnly}>
            <option value="">Any</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          To year
          <select value={maxYear} onChange={(event) => setMaxYear(event.target.value)} disabled={readOnly}>
            <option value="">Any</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!readOnly && (
        <>
          {isRangeInvalid && <p className="auth-error">"From year" must be before "To year".</p>}
          {mutation.isError && (
            <p className="auth-error">
              {mutation.error instanceof ApiError ? mutation.error.message : 'Could not save your preferences'}
            </p>
          )}
          <div className="preferences-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={mutation.isPending || isRangeInvalid || !hasChanges}
            >
              {mutation.isPending ? 'Saving…' : 'Save time period'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClear}
              disabled={mutation.isPending || !hasRange}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </form>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { fetchUserSettings, updateYearRange } from '../../api/users';
import { PageLoader } from '../../components/PageLoader';

const MIN_YEAR = 1874;
const MAX_YEAR = new Date().getFullYear() + 1;
const YEAR_OPTIONS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i);

export function YearRangeSection() {
  const queryClient = useQueryClient();
  const queryKey = ['users', 'settings'];

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchUserSettings,
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
    mutationFn: updateYearRange,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
    },
  });

  const isRangeInvalid = minYear !== '' && maxYear !== '' && Number(minYear) > Number(maxYear);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isRangeInvalid) return;
    mutation.mutate({
      minYear: minYear === '' ? null : Number(minYear),
      maxYear: maxYear === '' ? null : Number(maxYear),
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

  if (!data) return null;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <p className="placeholder-copy">
        Only get movies released in this range. Leave a field blank for no limit on that side.
      </p>

      <div className="year-range-inputs">
        <label>
          From year
          <select value={minYear} onChange={(event) => setMinYear(event.target.value)}>
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
          <select value={maxYear} onChange={(event) => setMaxYear(event.target.value)}>
            <option value="">Any</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isRangeInvalid && <p className="auth-error">"From year" must be before "To year".</p>}
      {mutation.isError && (
        <p className="auth-error">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Could not save your preferences'}
        </p>
      )}
      {mutation.isSuccess && <p className="status-ok">Saved.</p>}

      <button type="submit" className="btn-primary" disabled={mutation.isPending || isRangeInvalid}>
        {mutation.isPending ? 'Saving…' : 'Save time period'}
      </button>
    </form>
  );
}

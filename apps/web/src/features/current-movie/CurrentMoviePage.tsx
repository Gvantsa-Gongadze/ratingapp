import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../../api/health';

/**
 * Placeholder for the main "your movie today" screen.
 * For now it just proves the API connection works end to end.
 */
export function CurrentMoviePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <section className="current-movie">
      <h1>Your movie today</h1>
      <p className="placeholder-copy">
        The randomizer isn't wired up yet. This screen will show your assigned
        movie, the 24-hour countdown, rate / didn't-watch actions, and links to
        IMDb and Letterboxd.
      </p>
      <div className="api-status">
        {isLoading && <span>Checking API…</span>}
        {isError && <span className="status-error">API offline — start it with `pnpm dev:api`</span>}
        {data && <span className="status-ok">API connected ({data.service})</span>}
      </div>
    </section>
  );
}

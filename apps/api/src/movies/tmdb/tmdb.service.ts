import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { genreNameToId } from './tmdb-genres';
import type { TmdbMovie } from './tmdb.types';

export interface DiscoverFilters {
  page?: number;
  minVotes?: number;
  minYear?: number | null;
  maxYear?: number | null;
  minRuntime?: number | null;
  maxRuntime?: number | null;
  genresInclude?: string[] | null;
  genresExclude?: string[] | null;
}

/**
 * The ONLY place in the codebase that talks to the TMDB API.
 * Everything else works with our own Movie entities.
 */
@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('TMDB_BASE_URL', 'https://api.themoviedb.org/3');
    this.apiKey = config.get<string>('TMDB_API_KEY', '');
  }

  async getMovie(tmdbId: number): Promise<TmdbMovie> {
    return this.request<TmdbMovie>(`/movie/${tmdbId}`, {
      append_to_response: 'external_ids',
    });
  }

  /**
   * Discover movies for the randomizer pool.
   * Quality-filtered so users don't get assigned obscure titles, and
   * narrowed by the user's rating-pool preferences where set.
   */
  async discover(filters: DiscoverFilters = {}): Promise<{ results: TmdbMovie[]; total_pages: number }> {
    const params: Record<string, string> = {
      page: String(filters.page ?? 1),
      'vote_count.gte': String(filters.minVotes ?? 500),
      sort_by: 'popularity.desc',
      include_adult: 'false',
    };

    if (filters.minYear) params['primary_release_date.gte'] = `${filters.minYear}-01-01`;
    if (filters.maxYear) params['primary_release_date.lte'] = `${filters.maxYear}-12-31`;
    if (filters.minRuntime) params['with_runtime.gte'] = String(filters.minRuntime);
    if (filters.maxRuntime) params['with_runtime.lte'] = String(filters.maxRuntime);

    // TMDB treats comma-joined with_genres as AND (must match every genre) but
    // pipe-joined as OR — preferring multiple genres should widen the pool
    // ("any of these"), not narrow it to their near-empty intersection.
    const includeIds = (filters.genresInclude ?? []).map(genreNameToId).filter(Boolean);
    if (includeIds.length > 0) params.with_genres = includeIds.join('|');

    const excludeIds = (filters.genresExclude ?? []).map(genreNameToId).filter(Boolean);
    if (excludeIds.length > 0) params.without_genres = excludeIds.join(',');

    return this.request(`/discover/movie`, params);
  }

  private async request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      this.logger.error(`TMDB request failed: ${res.status} ${path}`);
      const reason = res.status === 401 ? 'TMDB_API_KEY is missing or invalid' : `TMDB returned ${res.status}`;
      throw new ServiceUnavailableException(`Movie provider unavailable: ${reason}`);
    }

    return res.json() as Promise<T>;
  }
}

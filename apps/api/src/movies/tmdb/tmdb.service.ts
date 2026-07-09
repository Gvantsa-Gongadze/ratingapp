import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TmdbMovie } from './tmdb.types';

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
   * Quality-filtered so users don't get assigned obscure titles.
   */
  async discover(page = 1, minVotes = 500): Promise<{ results: TmdbMovie[]; total_pages: number }> {
    return this.request(`/discover/movie`, {
      page: String(page),
      'vote_count.gte': String(minVotes),
      sort_by: 'popularity.desc',
      include_adult: 'false',
    });
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
      throw new Error(`TMDB request failed with status ${res.status}`);
    }

    return res.json() as Promise<T>;
  }
}

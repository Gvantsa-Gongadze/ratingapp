import { Injectable, NotFoundException } from '@nestjs/common';
import { Movie } from './entities/movie.entity';
import { MoviesService } from './movies.service';
import { DiscoverFilters, TmdbService } from './tmdb/tmdb.service';
import type { TmdbMovie } from './tmdb/tmdb.types';

export interface RandomizerFilters {
  minYear?: number | null;
  maxYear?: number | null;
  minRuntime?: number | null;
  maxRuntime?: number | null;
  minTmdbVotes?: number | null;
  genresInclude?: string[] | null;
  genresExclude?: string[] | null;
}

const MAX_PAGE = 20;
const MAX_ATTEMPTS = 3;

@Injectable()
export class MovieRandomizerService {
  constructor(
    private readonly tmdbService: TmdbService,
    private readonly moviesService: MoviesService,
  ) {}

  /** Picks a movie matching the user's pool filters that they haven't been assigned before. */
  async pickForUser(filters: RandomizerFilters, excludeTmdbIds: Set<number>): Promise<Movie> {
    const discoverFilters: DiscoverFilters = {
      minVotes: filters.minTmdbVotes ?? 500,
      minYear: filters.minYear,
      maxYear: filters.maxYear,
      minRuntime: filters.minRuntime,
      maxRuntime: filters.maxRuntime,
      genresInclude: filters.genresInclude,
      genresExclude: filters.genresExclude,
    };

    const first = await this.tmdbService.discover({ ...discoverFilters, page: 1 });
    if (first.total_pages === 0) {
      throw new NotFoundException('No movies match your rating pool filters right now');
    }

    const triedPages = new Set<number>();
    let candidates = this.excludeAssigned(first.results, excludeTmdbIds);

    for (let attempt = 0; candidates.length === 0 && attempt < MAX_ATTEMPTS; attempt++) {
      const page = this.randomPage(first.total_pages, triedPages);
      if (page === null) break;
      triedPages.add(page);

      const batch = await this.tmdbService.discover({ ...discoverFilters, page });
      candidates = this.excludeAssigned(batch.results, excludeTmdbIds);
    }

    if (candidates.length === 0) {
      throw new NotFoundException(
        'Ran out of new movies matching your rating pool filters — try loosening them',
      );
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const detail = await this.tmdbService.getMovie(chosen.id);
    return this.moviesService.upsertFromTmdb(detail);
  }

  private excludeAssigned(results: TmdbMovie[], excludeTmdbIds: Set<number>): TmdbMovie[] {
    return results.filter((movie) => !excludeTmdbIds.has(movie.id));
  }

  private randomPage(totalPages: number, tried: Set<number>): number | null {
    const cap = Math.min(totalPages, MAX_PAGE);
    if (tried.size >= cap) return null;

    let page: number;
    do {
      page = Math.floor(Math.random() * cap) + 1;
    } while (tried.has(page));
    return page;
  }
}

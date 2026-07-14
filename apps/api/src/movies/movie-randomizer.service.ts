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
  minTmdbRating?: number | null;
  genresInclude?: string[] | null;
  genresExclude?: string[] | null;
}

const MAX_PAGE = 40;
const PAGES_PER_ROUND = 3;
const MAX_ROUNDS = 5;

@Injectable()
export class MovieRandomizerService {
  constructor(
    private readonly tmdbService: TmdbService,
    private readonly moviesService: MoviesService,
  ) {}

  /**
   * Picks a movie matching the user's pool filters that they haven't been
   * assigned before. TMDB's discover endpoint has no "exclude these IDs"
   * param, so exclusion has to happen client-side after fetching — this
   * fetches a few random pages per round (in parallel) and keeps trying
   * new rounds until it finds a candidate or exhausts the pool, so a large
   * exclusion set (a long rating history) degrades gracefully instead of
   * failing after checking only a handful of movies.
   */
  async pickForUser(filters: RandomizerFilters, excludeTmdbIds: Set<number>): Promise<Movie> {
    const discoverFilters: DiscoverFilters = {
      minVotes: filters.minTmdbVotes ?? 500,
      minYear: filters.minYear,
      maxYear: filters.maxYear,
      minRuntime: filters.minRuntime,
      maxRuntime: filters.maxRuntime,
      minRating: filters.minTmdbRating,
      genresInclude: filters.genresInclude,
      genresExclude: filters.genresExclude,
    };

    const first = await this.tmdbService.discover({ ...discoverFilters, page: 1 });
    if (first.total_pages === 0) {
      throw new NotFoundException('No movies match your rating pool filters right now');
    }

    const cap = Math.min(first.total_pages, MAX_PAGE);
    const triedPages = new Set([1]);
    let candidates = this.excludeAssigned(first.results, excludeTmdbIds);

    for (let round = 0; candidates.length === 0 && round < MAX_ROUNDS && triedPages.size < cap; round++) {
      const pages = this.pickRandomPages(cap, triedPages, PAGES_PER_ROUND);
      if (pages.length === 0) break;
      pages.forEach((page) => triedPages.add(page));

      const batches = await Promise.all(
        pages.map((page) => this.tmdbService.discover({ ...discoverFilters, page })),
      );
      candidates = this.excludeAssigned(
        batches.flatMap((batch) => batch.results),
        excludeTmdbIds,
      );
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

  /** Up to `count` distinct page numbers (1..cap) not already in `tried`, in random order. */
  private pickRandomPages(cap: number, tried: Set<number>, count: number): number[] {
    const available: number[] = [];
    for (let page = 1; page <= cap; page++) {
      if (!tried.has(page)) available.push(page);
    }
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, count);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MovieDto } from '@ratingapp/shared-types';
import { Repository } from 'typeorm';
import { Movie } from './entities/movie.entity';
import { genreIdsToNames } from './tmdb/tmdb-genres';
import type { TmdbMovie } from './tmdb/tmdb.types';

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export function buildPosterUrl(posterPath: string | null): string | null {
  return posterPath ? `${TMDB_POSTER_BASE}${posterPath}` : null;
}

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
  ) {}

  findByTmdbId(tmdbId: number): Promise<Movie | null> {
    return this.moviesRepository.findOneBy({ tmdbId });
  }

  findByIds(ids: string[]): Promise<Movie[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.moviesRepository
      .createQueryBuilder('movie')
      .where('movie.id IN (:...ids)', { ids })
      .getMany();
  }

  /** Inserts or refreshes our local copy of a TMDB movie's details. */
  async upsertFromTmdb(tmdbMovie: TmdbMovie): Promise<Movie> {
    const existing = await this.findByTmdbId(tmdbMovie.id);

    const genres = tmdbMovie.genres?.map((g) => g.name) ?? genreIdsToNames(tmdbMovie.genre_ids ?? []);
    const year = tmdbMovie.release_date ? Number(tmdbMovie.release_date.slice(0, 4)) : null;

    const movie = this.moviesRepository.create({
      ...existing,
      tmdbId: tmdbMovie.id,
      imdbId: tmdbMovie.external_ids?.imdb_id ?? tmdbMovie.imdb_id ?? existing?.imdbId ?? null,
      title: tmdbMovie.title,
      originalTitle: tmdbMovie.original_title,
      year,
      posterPath: tmdbMovie.poster_path,
      overview: tmdbMovie.overview,
      genres,
      runtime: tmdbMovie.runtime ?? existing?.runtime ?? null,
      tmdbVoteAvg: tmdbMovie.vote_average,
      tmdbVoteCount: tmdbMovie.vote_count,
    });

    return this.moviesRepository.save(movie);
  }

  toDto(movie: Movie): MovieDto {
    return {
      id: movie.id,
      tmdbId: movie.tmdbId,
      imdbId: movie.imdbId,
      title: movie.title,
      year: movie.year ?? 0,
      posterUrl: buildPosterUrl(movie.posterPath),
      genres: movie.genres,
      runtime: movie.runtime,
      overview: movie.overview ?? '',
      links: {
        tmdb: `https://www.themoviedb.org/movie/${movie.tmdbId}`,
        imdb: movie.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/` : null,
        letterboxd: `https://letterboxd.com/tmdb/${movie.tmdbId}/`,
      },
    };
  }
}

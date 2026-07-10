import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RankingEntryDto, RankingPeriod } from '@ratingapp/shared-types';
import { Repository } from 'typeorm';
import { buildPosterUrl } from '../movies/movies.service';
import { Rating } from '../ratings/entities/rating.entity';

/** Bayesian prior weight — keeps a single 10/10 rating from topping the chart. */
const MIN_VOTES_FOR_CONFIDENCE = 3;
const MAX_RESULTS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

interface RawRankingRow {
  movieId: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  avgScore: string;
  ratingsCount: string;
  latestRatedAt: string;
}

@Injectable()
export class RankingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingsRepository: Repository<Rating>,
  ) {}

  async getRankings(period: RankingPeriod = 'all'): Promise<RankingEntryDto[]> {
    const cutoff = this.cutoffFor(period);

    const qb = this.ratingsRepository
      .createQueryBuilder('rating')
      .innerJoin('rating.movie', 'movie')
      .select('movie.id', 'movieId')
      .addSelect('movie.title', 'title')
      .addSelect('movie.year', 'year')
      .addSelect('movie.poster_path', 'posterPath')
      .addSelect('AVG(rating.score)', 'avgScore')
      .addSelect('COUNT(rating.id)', 'ratingsCount')
      .addSelect('MAX(rating.rated_at)', 'latestRatedAt')
      .groupBy('movie.id')
      .addGroupBy('movie.title')
      .addGroupBy('movie.year')
      .addGroupBy('movie.poster_path');

    if (cutoff) {
      qb.where('rating.rated_at >= :cutoff', { cutoff });
    }

    const rows = (await qb.getRawMany<RawRankingRow>()).map((row) => ({
      ...row,
      avgScore: Number(row.avgScore),
      ratingsCount: Number(row.ratingsCount),
    }));

    if (rows.length === 0) return [];

    const totalRatings = rows.reduce((sum, row) => sum + row.ratingsCount, 0);
    const globalMean = rows.reduce((sum, row) => sum + row.avgScore * row.ratingsCount, 0) / totalRatings;

    return rows
      .map((row) => ({ ...row, weightedScore: this.weightedScore(row.avgScore, row.ratingsCount, globalMean) }))
      .sort((a, b) => new Date(b.latestRatedAt).getTime() - new Date(a.latestRatedAt).getTime())
      .slice(0, MAX_RESULTS)
      .map((row, index) => ({
        rank: index + 1,
        movieId: row.movieId,
        title: row.title,
        year: row.year ?? 0,
        posterUrl: buildPosterUrl(row.posterPath),
        weightedScore: Math.round(row.weightedScore * 10) / 10,
        ratingsCount: row.ratingsCount,
      }));
  }

  private weightedScore(avgScore: number, ratingsCount: number, globalMean: number): number {
    const v = ratingsCount;
    const m = MIN_VOTES_FOR_CONFIDENCE;
    return (v / (v + m)) * avgScore + (m / (v + m)) * globalMean;
  }

  private cutoffFor(period: RankingPeriod): Date | null {
    switch (period) {
      case 'daily':
        return new Date(Date.now() - DAY_MS);
      case 'weekly':
        return new Date(Date.now() - 7 * DAY_MS);
      case 'monthly':
        return new Date(Date.now() - 30 * DAY_MS);
      case 'all':
        return null;
    }
  }
}

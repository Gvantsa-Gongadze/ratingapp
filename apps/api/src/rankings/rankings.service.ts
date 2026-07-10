import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RankingEntryDto, RankingPeriod } from '@ratingapp/shared-types';
import { Repository } from 'typeorm';
import { buildPosterUrl } from '../movies/movies.service';
import { Rating } from '../ratings/entities/rating.entity';

/** Bayesian prior weight — keeps a single 10/10 rating from topping the chart. */
const MIN_VOTES_FOR_CONFIDENCE = 3;
const MAX_RESULTS = 50;

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
        ratedAt: new Date(row.latestRatedAt).toISOString(),
      }));
  }

  private weightedScore(avgScore: number, ratingsCount: number, globalMean: number): number {
    const v = ratingsCount;
    const m = MIN_VOTES_FOR_CONFIDENCE;
    return (v / (v + m)) * avgScore + (m / (v + m)) * globalMean;
  }

  /**
   * Calendar boundaries (not rolling windows) so "Today" flips over at
   * midnight rather than 24 hours after your last rating. Uses the
   * server's local timezone since there's no per-user timezone yet.
   */
  private cutoffFor(period: RankingPeriod): Date | null {
    switch (period) {
      case 'daily':
        return this.startOfDay(new Date());
      case 'weekly':
        return this.startOfWeek(new Date());
      case 'monthly':
        return this.startOfMonth(new Date());
      case 'all':
        return null;
    }
  }

  private startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /** Monday-start week, per ISO 8601. */
  private startOfWeek(date: Date): Date {
    const result = this.startOfDay(date);
    const day = result.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    result.setDate(result.getDate() - daysSinceMonday);
    return result;
  }

  private startOfMonth(date: Date): Date {
    const result = this.startOfDay(date);
    result.setDate(1);
    return result;
  }
}

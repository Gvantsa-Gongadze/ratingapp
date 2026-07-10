import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginatedRankings, RankingPeriod } from '@ratingapp/shared-types';
import { Repository } from 'typeorm';
import { buildPosterUrl } from '../movies/movies.service';
import { Rating } from '../ratings/entities/rating.entity';

/** Bayesian prior weight — keeps a single 10/10 rating from topping the chart. */
const MIN_VOTES_FOR_CONFIDENCE = 3;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

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

  async getRankings(
    period: RankingPeriod = 'all',
    timeZone?: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedRankings> {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
    const cutoff = this.cutoffFor(period, this.resolveTimeZone(timeZone));

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

    if (rows.length === 0) {
      return { items: [], page: safePage, pageSize: safePageSize, total: 0, totalPages: 0 };
    }

    const totalRatings = rows.reduce((sum, row) => sum + row.ratingsCount, 0);
    const globalMean = rows.reduce((sum, row) => sum + row.avgScore * row.ratingsCount, 0) / totalRatings;

    const ranked = rows
      .map((row) => ({ ...row, weightedScore: this.weightedScore(row.avgScore, row.ratingsCount, globalMean) }))
      .sort((a, b) => new Date(b.latestRatedAt).getTime() - new Date(a.latestRatedAt).getTime());

    const total = ranked.length;
    const totalPages = Math.ceil(total / safePageSize);
    const offset = (safePage - 1) * safePageSize;

    const items = ranked.slice(offset, offset + safePageSize).map((row, index) => ({
      rank: offset + index + 1,
      movieId: row.movieId,
      title: row.title,
      year: row.year ?? 0,
      posterUrl: buildPosterUrl(row.posterPath),
      weightedScore: Math.round(row.weightedScore * 10) / 10,
      ratingsCount: row.ratingsCount,
      ratedAt: new Date(row.latestRatedAt).toISOString(),
    }));

    return { items, page: safePage, pageSize: safePageSize, total, totalPages };
  }

  private weightedScore(avgScore: number, ratingsCount: number, globalMean: number): number {
    const v = ratingsCount;
    const m = MIN_VOTES_FOR_CONFIDENCE;
    return (v / (v + m)) * avgScore + (m / (v + m)) * globalMean;
  }

  /**
   * Calendar boundaries (not rolling windows) so "Today" flips over at
   * the user's actual midnight rather than 24 hours after their last
   * rating.
   */
  private cutoffFor(period: RankingPeriod, timeZone: string): Date | null {
    const now = new Date();
    switch (period) {
      case 'daily':
        return this.startOfDayInZone(now, timeZone);
      case 'weekly':
        return this.startOfWeekInZone(now, timeZone);
      case 'monthly':
        return this.startOfMonthInZone(now, timeZone);
      case 'all':
        return null;
    }
  }

  /** Falls back to UTC if the client didn't send one or sent garbage. */
  private resolveTimeZone(timeZone?: string): string {
    if (!timeZone) return 'UTC';
    try {
      new Intl.DateTimeFormat('en-US', { timeZone });
      return timeZone;
    } catch {
      return 'UTC';
    }
  }

  /**
   * Offset (ms) such that `date.getTime() + offset`, read with the UTC
   * getters, yields the wall-clock date/time as observed in `timeZone`.
   * This is the standard trick for timezone math without a date library.
   */
  private getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .reduce<Record<string, string>>((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
      }, {});

    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return asUtc - date.getTime();
  }

  private startOfDayInZone(date: Date, timeZone: string): Date {
    const offsetMs = this.getTimeZoneOffsetMs(date, timeZone);
    const zoned = new Date(date.getTime() + offsetMs);
    zoned.setUTCHours(0, 0, 0, 0);
    return new Date(zoned.getTime() - offsetMs);
  }

  /** Monday-start week, per ISO 8601. */
  private startOfWeekInZone(date: Date, timeZone: string): Date {
    const offsetMs = this.getTimeZoneOffsetMs(date, timeZone);
    const zoned = new Date(date.getTime() + offsetMs);
    const day = zoned.getUTCDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    zoned.setUTCDate(zoned.getUTCDate() - daysSinceMonday);
    zoned.setUTCHours(0, 0, 0, 0);
    return new Date(zoned.getTime() - offsetMs);
  }

  private startOfMonthInZone(date: Date, timeZone: string): Date {
    const offsetMs = this.getTimeZoneOffsetMs(date, timeZone);
    const zoned = new Date(date.getTime() + offsetMs);
    zoned.setUTCDate(1);
    zoned.setUTCHours(0, 0, 0, 0);
    return new Date(zoned.getTime() - offsetMs);
  }
}

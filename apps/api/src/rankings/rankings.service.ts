import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MovieReviewDto, PaginatedRankings, RankingPeriod } from '@ratingapp/shared-types';
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { cutoffForPeriod } from '../common/period-cutoff.util';
import { buildPosterUrl } from '../movies/movies.service';
import { Rating } from '../ratings/entities/rating.entity';

const MAX_REVIEWS = 50;

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
  reviewsCount: string;
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
    const cutoff = cutoffForPeriod(period, timeZone);

    const qb = this.ratingsRepository
      .createQueryBuilder('rating')
      .innerJoin('rating.movie', 'movie')
      .select('movie.id', 'movieId')
      .addSelect('movie.title', 'title')
      .addSelect('movie.year', 'year')
      .addSelect('movie.poster_path', 'posterPath')
      .addSelect('AVG(rating.score)', 'avgScore')
      .addSelect('COUNT(rating.id)', 'ratingsCount')
      .addSelect('COUNT(rating.review_text)', 'reviewsCount')
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
      reviewsCount: Number(row.reviewsCount),
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
      reviewsCount: row.reviewsCount,
      ratedAt: new Date(row.latestRatedAt).toISOString(),
    }));

    return { items, page: safePage, pageSize: safePageSize, total, totalPages };
  }

  /** Most recent written reviews for a movie, scoped to the same period as the ranking list. */
  async getMovieReviews(
    movieId: string,
    period: RankingPeriod = 'all',
    timeZone?: string,
  ): Promise<MovieReviewDto[]> {
    const cutoff = cutoffForPeriod(period, timeZone);

    const ratings = await this.ratingsRepository.find({
      where: {
        movieId,
        reviewText: Not(IsNull()),
        ...(cutoff ? { ratedAt: MoreThanOrEqual(cutoff) } : {}),
      },
      relations: ['user'],
      order: { ratedAt: 'DESC' },
      take: MAX_REVIEWS,
    });

    return ratings.map((rating) => ({
      userId: rating.user.id,
      username: rating.user.username,
      score: rating.score,
      review: rating.reviewText as string,
      ratedAt: rating.ratedAt.toISOString(),
    }));
  }

  private weightedScore(avgScore: number, ratingsCount: number, globalMean: number): number {
    const v = ratingsCount;
    const m = MIN_VOTES_FOR_CONFIDENCE;
    return (v / (v + m)) * avgScore + (m / (v + m)) * globalMean;
  }
}

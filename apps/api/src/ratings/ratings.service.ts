import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MyRatingDto, RankingPeriod } from '@ratingapp/shared-types';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { cutoffForPeriod } from '../common/period-cutoff.util';
import { MoviesService } from '../movies/movies.service';
import { Rating } from './entities/rating.entity';

export interface CreateRatingInput {
  assignmentId: string;
  userId: string;
  movieId: string;
  score: number;
  reviewText: string | null;
  ratedAt: Date;
}

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingsRepository: Repository<Rating>,
    private readonly moviesService: MoviesService,
  ) {}

  create(data: CreateRatingInput): Promise<Rating> {
    const rating = this.ratingsRepository.create(data);
    return this.ratingsRepository.save(rating);
  }

  async findByUser(
    userId: string,
    period: RankingPeriod = 'all',
    timeZone?: string,
  ): Promise<MyRatingDto[]> {
    const cutoff = cutoffForPeriod(period, timeZone);

    const ratings = await this.ratingsRepository.find({
      where: {
        userId,
        ...(cutoff ? { ratedAt: MoreThanOrEqual(cutoff) } : {}),
      },
      relations: ['movie'],
      order: { ratedAt: 'DESC' },
    });
    if (ratings.length === 0) return [];

    const movieIds = [...new Set(ratings.map((r) => r.movieId))];
    const statsQb = this.ratingsRepository
      .createQueryBuilder('rating')
      .select('rating.movie_id', 'movieId')
      .addSelect('COUNT(rating.id)', 'ratingsCount')
      .addSelect('COUNT(rating.review_text)', 'reviewsCount')
      .where('rating.movie_id IN (:...movieIds)', { movieIds })
      .groupBy('rating.movie_id');
    if (cutoff) {
      statsQb.andWhere('rating.rated_at >= :cutoff', { cutoff });
    }
    const statsRows = await statsQb.getRawMany<{ movieId: string; ratingsCount: string; reviewsCount: string }>();
    const statsByMovieId = new Map(
      statsRows.map((r) => [r.movieId, { ratingsCount: Number(r.ratingsCount), reviewsCount: Number(r.reviewsCount) }]),
    );

    return ratings.map((rating) => ({
      id: rating.id,
      movie: this.moviesService.toDto(rating.movie),
      score: rating.score,
      review: rating.reviewText,
      ratedAt: rating.ratedAt.toISOString(),
      ratingsCount: statsByMovieId.get(rating.movieId)?.ratingsCount ?? 1,
      reviewsCount: statsByMovieId.get(rating.movieId)?.reviewsCount ?? 0,
    }));
  }

  async getMovieStats(movieId: string): Promise<{ averageScore: number; ratingsCount: number } | null> {
    const result = await this.ratingsRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.score)', 'avgScore')
      .addSelect('COUNT(rating.id)', 'ratingsCount')
      .where('rating.movie_id = :movieId', { movieId })
      .getRawOne<{ avgScore: string | null; ratingsCount: string }>();

    const ratingsCount = Number(result?.ratingsCount ?? 0);
    if (ratingsCount === 0) return null;

    return {
      averageScore: Math.round(Number(result?.avgScore) * 10) / 10,
      ratingsCount,
    };
  }
}

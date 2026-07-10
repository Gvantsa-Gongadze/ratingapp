import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MyRatingDto } from '@ratingapp/shared-types';
import { Repository } from 'typeorm';
import { MoviesService } from '../movies/movies.service';
import { Rating } from './entities/rating.entity';

export interface CreateRatingInput {
  assignmentId: string;
  userId: string;
  movieId: string;
  score: number;
  reviewText: string | null;
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

  async findByUser(userId: string): Promise<MyRatingDto[]> {
    const ratings = await this.ratingsRepository.find({
      where: { userId },
      relations: ['movie'],
      order: { ratedAt: 'DESC' },
    });

    return ratings.map((rating) => ({
      id: rating.id,
      movie: this.moviesService.toDto(rating.movie),
      score: rating.score,
      review: rating.reviewText,
      ratedAt: rating.ratedAt.toISOString(),
    }));
  }
}

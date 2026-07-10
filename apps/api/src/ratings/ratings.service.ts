import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  create(data: CreateRatingInput): Promise<Rating> {
    const rating = this.ratingsRepository.create(data);
    return this.ratingsRepository.save(rating);
  }
}

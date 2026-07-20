import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AssignmentDto } from '@ratingapp/shared-types';
import { Repository } from 'typeorm';
import { MoviesService } from '../movies/movies.service';
import { RatingsService } from '../ratings/ratings.service';
import { Assignment } from './entities/assignment.entity';

/** Shared by solo and group assignment flows. */
@Injectable()
export class AssignmentHelpersService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    private readonly moviesService: MoviesService,
    private readonly ratingsService: RatingsService,
  ) {}

  async toDto(assignment: Assignment): Promise<AssignmentDto> {
    const communityRating = await this.ratingsService.getMovieStats(assignment.movieId);
    return {
      id: assignment.id,
      movie: this.moviesService.toDto(assignment.movie),
      groupId: assignment.groupId,
      assignedAt: assignment.assignedAt.toISOString(),
      deadlineAt: assignment.deadlineAt.toISOString(),
      status: assignment.status,
      communityRating,
    };
  }

  /** Every movie a user has ever been assigned, anywhere (solo or any group). */
  async getExcludedTmdbIdsForUser(userId: string): Promise<Set<number>> {
    const rows = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.movie', 'movie')
      .where('assignment.user_id = :userId', { userId })
      .select('movie.tmdb_id', 'tmdbId')
      .getRawMany<{ tmdbId: number }>();
    return new Set(rows.map((r) => r.tmdbId));
  }
}

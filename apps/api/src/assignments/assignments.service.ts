import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AssignmentDto } from '@ratingapp/shared-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieRandomizerService } from '../movies/movie-randomizer.service';
import { MoviesService } from '../movies/movies.service';
import { RatingsService } from '../ratings/ratings.service';
import { UsersService } from '../users/users.service';
import { Assignment } from './entities/assignment.entity';

const ASSIGNMENT_DURATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    private readonly usersService: UsersService,
    private readonly moviesService: MoviesService,
    private readonly randomizer: MovieRandomizerService,
    private readonly ratingsService: RatingsService,
  ) {}

  async getCurrent(userId: string): Promise<AssignmentDto> {
    const assignment = await this.getOrCreateActive(userId);
    return this.toDto(assignment);
  }

  async skip(userId: string, assignmentId: string): Promise<AssignmentDto> {
    const assignment = await this.loadOwnedActive(userId, assignmentId);
    assignment.status = 'skipped';
    assignment.resolvedAt = new Date();
    await this.assignmentsRepository.save(assignment);

    const next = await this.getOrCreateActive(userId);
    return this.toDto(next);
  }

  async rate(
    userId: string,
    assignmentId: string,
    score: number,
    review: string | null,
    ratedAt: string,
  ): Promise<AssignmentDto> {
    const assignment = await this.loadOwnedActive(userId, assignmentId);

    await this.ratingsService.create({
      assignmentId: assignment.id,
      userId,
      movieId: assignment.movieId,
      score,
      reviewText: review,
      ratedAt: new Date(ratedAt),
    });

    assignment.status = 'rated';
    assignment.resolvedAt = new Date();
    await this.assignmentsRepository.save(assignment);

    const next = await this.getOrCreateActive(userId);
    return this.toDto(next);
  }

  private async loadOwnedActive(userId: string, assignmentId: string): Promise<Assignment> {
    const assignment = await this.assignmentsRepository.findOneBy({ id: assignmentId });
    if (!assignment || assignment.userId !== userId) {
      throw new NotFoundException('Assignment not found');
    }
    if (assignment.status !== 'active') {
      throw new BadRequestException('This assignment has already been resolved');
    }
    return assignment;
  }

  private async getOrCreateActive(userId: string): Promise<Assignment> {
    const existing = await this.assignmentsRepository.findOne({
      where: { userId, status: 'active' },
      relations: ['movie'],
    });

    if (existing) {
      if (existing.deadlineAt.getTime() > Date.now()) {
        return existing;
      }
      existing.status = 'expired';
      existing.resolvedAt = new Date();
      await this.assignmentsRepository.save(existing);
    }

    return this.createAssignment(userId);
  }

  private async createAssignment(userId: string): Promise<Assignment> {
    const [settings, excludeTmdbIds] = await Promise.all([
      this.usersService.findSettings(userId),
      this.getExcludedTmdbIds(userId),
    ]);

    const movie = await this.randomizer.pickForUser(
      {
        minYear: settings?.minYear,
        maxYear: settings?.maxYear,
        minRuntime: settings?.minRuntime,
        maxRuntime: settings?.maxRuntime,
        minTmdbVotes: settings?.minTmdbVotes,
        minTmdbRating: settings?.minTmdbRating,
        genresInclude: settings?.genresInclude,
        genresExclude: settings?.genresExclude,
      },
      excludeTmdbIds,
    );

    const assignment = this.assignmentsRepository.create({
      userId,
      movieId: movie.id,
      groupId: null,
      groupCycleId: null,
      assignedAt: new Date(),
      deadlineAt: new Date(Date.now() + ASSIGNMENT_DURATION_MS),
      status: 'active',
      resolvedAt: null,
    });
    const saved = await this.assignmentsRepository.save(assignment);
    saved.movie = movie;
    return saved;
  }

  private async getExcludedTmdbIds(userId: string): Promise<Set<number>> {
    const rows = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.movie', 'movie')
      .where('assignment.user_id = :userId', { userId })
      .select('movie.tmdb_id', 'tmdbId')
      .getRawMany<{ tmdbId: number }>();
    return new Set(rows.map((r) => r.tmdbId));
  }

  private async toDto(assignment: Assignment): Promise<AssignmentDto> {
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
}

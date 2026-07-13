import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AssignmentDto, GroupMode } from '@ratingapp/shared-types';
import { IsNull, Repository } from 'typeorm';
import { Assignment } from '../assignments/entities/assignment.entity';
import { MovieRandomizerService } from '../movies/movie-randomizer.service';
import { MoviesService } from '../movies/movies.service';
import { RatingsService } from '../ratings/ratings.service';
import { UsersService } from '../users/users.service';
import { GroupCycle } from './entities/group-cycle.entity';
import { GroupMember } from './entities/group-member.entity';

const ASSIGNMENT_DURATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GroupAssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(GroupCycle)
    private readonly groupCyclesRepository: Repository<GroupCycle>,
    @InjectRepository(GroupMember)
    private readonly groupMembersRepository: Repository<GroupMember>,
    private readonly usersService: UsersService,
    private readonly moviesService: MoviesService,
    private readonly randomizer: MovieRandomizerService,
    private readonly ratingsService: RatingsService,
  ) {}

  async getCurrent(userId: string, groupId: string): Promise<AssignmentDto> {
    const membership = await this.requireMembership(userId, groupId);
    const assignment = await this.getOrCreateActive(userId, groupId, membership.group.mode);
    return this.toDto(assignment);
  }

  async skip(userId: string, groupId: string, assignmentId: string): Promise<AssignmentDto> {
    const membership = await this.requireMembership(userId, groupId);
    const assignment = await this.loadOwnedActive(userId, groupId, assignmentId);

    assignment.status = 'skipped';
    assignment.resolvedAt = new Date();
    await this.assignmentsRepository.save(assignment);
    if (assignment.groupCycleId) {
      await this.maybeCompleteCycle(groupId, assignment.groupCycleId);
    }

    const next = await this.getOrCreateActive(userId, groupId, membership.group.mode);
    return this.toDto(next);
  }

  async rate(
    userId: string,
    groupId: string,
    assignmentId: string,
    score: number,
    review: string | null,
    ratedAt: string,
  ): Promise<AssignmentDto> {
    const membership = await this.requireMembership(userId, groupId);
    const assignment = await this.loadOwnedActive(userId, groupId, assignmentId);

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
    if (assignment.groupCycleId) {
      await this.maybeCompleteCycle(groupId, assignment.groupCycleId);
    }

    const next = await this.getOrCreateActive(userId, groupId, membership.group.mode);
    return this.toDto(next);
  }

  private async requireMembership(userId: string, groupId: string): Promise<GroupMember> {
    const membership = await this.groupMembersRepository.findOne({
      where: { groupId, userId },
      relations: ['group'],
    });
    if (!membership) {
      throw new NotFoundException('Group not found');
    }
    return membership;
  }

  private async loadOwnedActive(userId: string, groupId: string, assignmentId: string): Promise<Assignment> {
    const assignment = await this.assignmentsRepository.findOneBy({ id: assignmentId });
    if (!assignment || assignment.userId !== userId || assignment.groupId !== groupId) {
      throw new NotFoundException('Assignment not found');
    }
    if (assignment.status !== 'active') {
      throw new BadRequestException('This assignment has already been resolved');
    }
    return assignment;
  }

  private getOrCreateActive(userId: string, groupId: string, mode: GroupMode): Promise<Assignment> {
    return mode === 'individual'
      ? this.getOrCreateIndividual(userId, groupId)
      : this.getOrCreateSynced(userId, groupId);
  }

  /** Individual mode: each member gets their own random movie, same mechanics as solo assignments. */
  private async getOrCreateIndividual(userId: string, groupId: string): Promise<Assignment> {
    const existing = await this.assignmentsRepository.findOne({
      where: { userId, groupId, status: 'active' },
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

    const [settings, excludeTmdbIds] = await Promise.all([
      this.usersService.findSettings(userId),
      this.getUserExcludedTmdbIds(userId),
    ]);

    const movie = await this.randomizer.pickForUser(
      {
        minYear: settings?.minYear,
        maxYear: settings?.maxYear,
        minRuntime: settings?.minRuntime,
        maxRuntime: settings?.maxRuntime,
        minTmdbVotes: settings?.minTmdbVotes,
        genresInclude: settings?.genresInclude,
        genresExclude: settings?.genresExclude,
      },
      excludeTmdbIds,
    );

    const assignment = this.assignmentsRepository.create({
      userId,
      movieId: movie.id,
      groupId,
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

  /**
   * Sync mode: the whole group shares one movie per cycle. A member's expired
   * assignment just gets a fresh deadline on the same movie — it never rolls
   * a different movie for just one person. Once every member has rated or
   * skipped, the cycle closes and the next "current" fetch starts a new one.
   */
  private async getOrCreateSynced(userId: string, groupId: string): Promise<Assignment> {
    const cycle = await this.getOrCreateActiveCycle(groupId, userId);
    if (!cycle.movie) {
      // Invariant: getOrCreateActiveCycle always assigns a movie when it creates a cycle.
      throw new Error(`Group cycle ${cycle.id} has no movie`);
    }
    const cycleMovie = cycle.movie;

    const existing = await this.assignmentsRepository.findOne({
      where: { userId, groupId, groupCycleId: cycle.id },
      relations: ['movie'],
      order: { assignedAt: 'DESC' },
    });

    if (existing) {
      if (existing.status !== 'active' || existing.deadlineAt.getTime() > Date.now()) {
        return existing;
      }
      existing.deadlineAt = new Date(Date.now() + ASSIGNMENT_DURATION_MS);
      existing.assignedAt = new Date();
      return this.assignmentsRepository.save(existing);
    }

    const assignment = this.assignmentsRepository.create({
      userId,
      movieId: cycleMovie.id,
      groupId,
      groupCycleId: cycle.id,
      assignedAt: new Date(),
      deadlineAt: new Date(Date.now() + ASSIGNMENT_DURATION_MS),
      status: 'active',
      resolvedAt: null,
    });
    const saved = await this.assignmentsRepository.save(assignment);
    saved.movie = cycleMovie;
    return saved;
  }

  private async getOrCreateActiveCycle(groupId: string, requestingUserId: string): Promise<GroupCycle> {
    const active = await this.groupCyclesRepository.findOne({
      where: { groupId, completedAt: IsNull() },
      relations: ['movie'],
      order: { number: 'DESC' },
    });
    if (active) return active;

    const last = await this.groupCyclesRepository.findOne({
      where: { groupId },
      order: { number: 'DESC' },
    });

    const [settings, excludeTmdbIds] = await Promise.all([
      this.usersService.findSettings(requestingUserId),
      this.getGroupExcludedTmdbIds(groupId),
    ]);

    const movie = await this.randomizer.pickForUser(
      {
        minYear: settings?.minYear,
        maxYear: settings?.maxYear,
        minRuntime: settings?.minRuntime,
        maxRuntime: settings?.maxRuntime,
        minTmdbVotes: settings?.minTmdbVotes,
        genresInclude: settings?.genresInclude,
        genresExclude: settings?.genresExclude,
      },
      excludeTmdbIds,
    );

    const cycle = this.groupCyclesRepository.create({
      groupId,
      movieId: movie.id,
      number: (last?.number ?? 0) + 1,
      startedAt: new Date(),
      completedAt: null,
    });
    const saved = await this.groupCyclesRepository.save(cycle);
    saved.movie = movie;
    return saved;
  }

  private async maybeCompleteCycle(groupId: string, cycleId: string): Promise<void> {
    const members = await this.groupMembersRepository.find({ where: { groupId } });
    if (members.length === 0) return;
    const memberIds = members.map((m) => m.userId);

    const resolvedCount = await this.assignmentsRepository
      .createQueryBuilder('a')
      .where('a.group_cycle_id = :cycleId', { cycleId })
      .andWhere('a.user_id IN (:...memberIds)', { memberIds })
      .andWhere("a.status IN ('rated', 'skipped')")
      .getCount();

    if (resolvedCount >= memberIds.length) {
      await this.groupCyclesRepository.update(cycleId, { completedAt: new Date() });
    }
  }

  private async getUserExcludedTmdbIds(userId: string): Promise<Set<number>> {
    const rows = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.movie', 'movie')
      .where('assignment.user_id = :userId', { userId })
      .select('movie.tmdb_id', 'tmdbId')
      .getRawMany<{ tmdbId: number }>();
    return new Set(rows.map((r) => r.tmdbId));
  }

  private async getGroupExcludedTmdbIds(groupId: string): Promise<Set<number>> {
    const rows = await this.groupCyclesRepository
      .createQueryBuilder('cycle')
      .innerJoin('cycle.movie', 'movie')
      .where('cycle.group_id = :groupId', { groupId })
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

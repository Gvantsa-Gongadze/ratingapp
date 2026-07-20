import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AssignmentDto, GroupHistoryEntryDto } from '@ratingapp/shared-types';
import { In, IsNull, Not, Repository } from 'typeorm';
import { AssignmentHelpersService } from '../assignments/assignment-helpers.service';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Movie } from '../movies/entities/movie.entity';
import { MovieRandomizerService } from '../movies/movie-randomizer.service';
import type { RandomizerFilters } from '../movies/movie-randomizer.service';
import { MoviesService } from '../movies/movies.service';
import { RatingsService } from '../ratings/ratings.service';
import { Group } from './entities/group.entity';
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
    private readonly moviesService: MoviesService,
    private readonly randomizer: MovieRandomizerService,
    private readonly ratingsService: RatingsService,
    private readonly assignmentHelpers: AssignmentHelpersService,
  ) {}

  async getCurrent(userId: string, groupId: string): Promise<AssignmentDto> {
    const membership = await this.requireMembership(userId, groupId);
    const assignment = await this.getOrCreateActive(userId, groupId, membership.group);
    return this.assignmentHelpers.toDto(assignment);
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

    const next = await this.getOrCreateActive(userId, groupId, membership.group);
    return this.assignmentHelpers.toDto(next);
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

    const next = await this.getOrCreateActive(userId, groupId, membership.group);
    return this.assignmentHelpers.toDto(next);
  }

  /** A group's watch history, most recent first — shape depends on the group's mode. */
  async getHistory(userId: string, groupId: string): Promise<GroupHistoryEntryDto[]> {
    const membership = await this.requireMembership(userId, groupId);
    return membership.group.mode === 'individual'
      ? this.getIndividualHistory(groupId)
      : this.getSyncHistory(groupId);
  }

  /** Sync mode: completed cycles — movies the whole group watched together. */
  private async getSyncHistory(groupId: string): Promise<GroupHistoryEntryDto[]> {
    const cycles = await this.groupCyclesRepository.find({
      where: { groupId, completedAt: Not(IsNull()) },
      relations: ['movie'],
      order: { number: 'DESC' },
    });
    const withMovie = cycles.filter((cycle): cycle is GroupCycle & { movie: Movie } => cycle.movie !== null);
    if (withMovie.length === 0) return [];

    const cycleIds = withMovie.map((c) => c.id);
    const rows = await this.assignmentsRepository
      .createQueryBuilder('a')
      .innerJoin('ratings', 'r', 'r.assignment_id = a.id')
      .select('a.group_cycle_id', 'cycleId')
      .addSelect('AVG(r.score)', 'avgScore')
      .addSelect('COUNT(r.id)', 'count')
      .where('a.group_cycle_id IN (:...cycleIds)', { cycleIds })
      .groupBy('a.group_cycle_id')
      .getRawMany<{ cycleId: string; avgScore: string; count: string }>();
    const statsByCycleId = new Map(rows.map((r) => [r.cycleId, { avg: Number(r.avgScore), count: Number(r.count) }]));

    return withMovie.map((cycle) => {
      const stats = statsByCycleId.get(cycle.id);
      return {
        id: cycle.id,
        movie: this.moviesService.toDto(cycle.movie),
        completedAt: cycle.completedAt!.toISOString(),
        watchedBy: null,
        groupScore: { averageScore: stats ? Math.round(stats.avg * 10) / 10 : null, ratingsCount: stats?.count ?? 0 },
      };
    });
  }

  /** Individual mode: every member's own resolved movies, tagged with who watched it. */
  private async getIndividualHistory(groupId: string): Promise<GroupHistoryEntryDto[]> {
    const assignments = await this.assignmentsRepository.find({
      where: { groupId, groupCycleId: IsNull(), status: In(['rated', 'skipped']) },
      relations: ['movie', 'user'],
      order: { resolvedAt: 'DESC' },
    });
    if (assignments.length === 0) return [];

    const assignmentIds = assignments.map((a) => a.id);
    const scoreRows = await this.assignmentsRepository
      .createQueryBuilder('a')
      .innerJoin('ratings', 'r', 'r.assignment_id = a.id')
      .select('a.id', 'assignmentId')
      .addSelect('r.score', 'score')
      .where('a.id IN (:...assignmentIds)', { assignmentIds })
      .getRawMany<{ assignmentId: string; score: string }>();
    const scoreByAssignmentId = new Map(scoreRows.map((r) => [r.assignmentId, Number(r.score)]));

    return assignments.map((a) => ({
      id: a.id,
      movie: this.moviesService.toDto(a.movie),
      completedAt: (a.resolvedAt as Date).toISOString(),
      watchedBy: {
        userId: a.user.id,
        username: a.user.username,
        score: scoreByAssignmentId.get(a.id) ?? null,
      },
      groupScore: null,
    }));
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

  private getOrCreateActive(userId: string, groupId: string, group: Group): Promise<Assignment> {
    return group.mode === 'individual'
      ? this.getOrCreateIndividual(userId, groupId, group)
      : this.getOrCreateSynced(userId, groupId, group);
  }

  /** Individual mode: each member gets their own random movie, filtered by the group's shared preferences. */
  private async getOrCreateIndividual(userId: string, groupId: string, group: Group): Promise<Assignment> {
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

    const excludeTmdbIds = await this.assignmentHelpers.getExcludedTmdbIdsForUser(userId);
    const movie = await this.randomizer.pickForUser(this.toRandomizerFilters(group), excludeTmdbIds);

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
  private async getOrCreateSynced(userId: string, groupId: string, group: Group): Promise<Assignment> {
    const cycle = await this.getOrCreateActiveCycle(group);
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

  private async getOrCreateActiveCycle(group: Group): Promise<GroupCycle> {
    const groupId = group.id;
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

    const [groupExcluded, membersExcluded] = await Promise.all([
      this.getGroupExcludedTmdbIds(groupId),
      this.getGroupMembersExcludedTmdbIds(groupId),
    ]);
    // A shared cycle movie must be new to every current member, not just new
    // to this group — otherwise someone who already saw it solo (or in
    // another group) would get it again.
    const excludeTmdbIds = new Set([...groupExcluded, ...membersExcluded]);

    const movie = await this.randomizer.pickForUser(this.toRandomizerFilters(group), excludeTmdbIds);

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

  private toRandomizerFilters(group: Group): RandomizerFilters {
    return {
      minYear: group.minYear,
      maxYear: group.maxYear,
      minTmdbRating: group.minTmdbRating,
      genresInclude: group.genresInclude,
      genresExclude: group.genresExclude,
    };
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

  /** Every movie any current member has ever been assigned, anywhere (solo or any group). */
  private async getGroupMembersExcludedTmdbIds(groupId: string): Promise<Set<number>> {
    const members = await this.groupMembersRepository.find({ where: { groupId } });
    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) return new Set();

    const rows = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.movie', 'movie')
      .where('assignment.user_id IN (:...memberIds)', { memberIds })
      .select('movie.tmdb_id', 'tmdbId')
      .getRawMany<{ tmdbId: number }>();
    return new Set(rows.map((r) => r.tmdbId));
  }

}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AdminStatsDto,
  MessageResponseDto,
  PaginatedAdminReviews,
  PaginatedAdminUsers,
  UserRole,
} from '@ratingapp/shared-types';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';
import { Group } from '../groups/entities/group.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const TOP_MOVIES_LIMIT = 10;
const RECENT_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Rating)
    private readonly ratingsRepository: Repository<Rating>,
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
  ) {}

  async listUsers(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<PaginatedAdminUsers> {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));

    const [users, total] = await this.usersRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });
    const totalPages = Math.ceil(total / safePageSize);

    if (users.length === 0) {
      return { items: [], page: safePage, pageSize: safePageSize, total, totalPages };
    }

    const userIds = users.map((u) => u.id);
    const countRows = await this.ratingsRepository
      .createQueryBuilder('rating')
      .select('rating.user_id', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('rating.user_id IN (:...userIds)', { userIds })
      .groupBy('rating.user_id')
      .getRawMany<{ userId: string; count: string }>();
    const countByUserId = new Map(countRows.map((r) => [r.userId, Number(r.count)]));

    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        bannedAt: u.bannedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        ratingsCount: countByUserId.get(u.id) ?? 0,
      })),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
    };
  }

  async updateUserRole(
    requestingUserId: string,
    targetUserId: string,
    role: UserRole,
  ): Promise<MessageResponseDto> {
    if (requestingUserId === targetUserId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const user = await this.usersRepository.findOneBy({ id: targetUserId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.role = role;
    await this.usersRepository.save(user);
    return { message: `${user.username} is now ${role === 'admin' ? 'an admin' : 'a regular user'}.` };
  }

  async setUserBanned(
    requestingUserId: string,
    targetUserId: string,
    banned: boolean,
  ): Promise<MessageResponseDto> {
    if (requestingUserId === targetUserId) {
      throw new BadRequestException('You cannot ban your own account');
    }
    const user = await this.usersRepository.findOneBy({ id: targetUserId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.bannedAt = banned ? new Date() : null;
    await this.usersRepository.save(user);
    return { message: banned ? `${user.username} has been suspended.` : `${user.username} has been unbanned.` };
  }

  async listReviews(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<PaginatedAdminReviews> {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));

    const [ratings, total] = await this.ratingsRepository.findAndCount({
      where: { reviewText: Not(IsNull()) },
      relations: ['user', 'movie'],
      order: { ratedAt: 'DESC' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });
    const totalPages = Math.ceil(total / safePageSize);

    return {
      items: ratings.map((r) => ({
        ratingId: r.id,
        userId: r.userId,
        username: r.user.username,
        movieId: r.movieId,
        movieTitle: r.movie.title,
        score: r.score,
        review: r.reviewText as string,
        ratedAt: r.ratedAt.toISOString(),
      })),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
    };
  }

  async removeReview(ratingId: string): Promise<MessageResponseDto> {
    const rating = await this.ratingsRepository.findOneBy({ id: ratingId });
    if (!rating) {
      throw new NotFoundException('Review not found');
    }
    rating.reviewText = null;
    await this.ratingsRepository.save(rating);
    return { message: 'Review removed.' };
  }

  async getStats(): Promise<AdminStatsDto> {
    const recentCutoff = new Date(Date.now() - RECENT_ACTIVITY_WINDOW_MS);

    const [totalUsers, totalMovies, totalRatings, totalGroups, newUsersLast7Days, ratingsLast7Days, topMoviesRaw] =
      await Promise.all([
        this.usersRepository.count(),
        this.moviesRepository.count(),
        this.ratingsRepository.count(),
        this.groupsRepository.count(),
        this.usersRepository.count({ where: { createdAt: MoreThan(recentCutoff) } }),
        this.ratingsRepository.count({ where: { ratedAt: MoreThan(recentCutoff) } }),
        this.ratingsRepository
          .createQueryBuilder('rating')
          .innerJoin('rating.movie', 'movie')
          .select('movie.id', 'movieId')
          .addSelect('movie.title', 'title')
          .addSelect('AVG(rating.score)', 'avgScore')
          .addSelect('COUNT(*)', 'count')
          .groupBy('movie.id')
          .addGroupBy('movie.title')
          .orderBy('AVG(rating.score)', 'DESC')
          .addOrderBy('COUNT(*)', 'DESC')
          .limit(TOP_MOVIES_LIMIT)
          .getRawMany<{ movieId: string; title: string; avgScore: string; count: string }>(),
      ]);

    return {
      totalUsers,
      totalMovies,
      totalRatings,
      totalGroups,
      newUsersLast7Days,
      ratingsLast7Days,
      topMovies: topMoviesRaw.map((r) => ({
        movieId: r.movieId,
        title: r.title,
        averageScore: Math.round(Number(r.avgScore) * 10) / 10,
        ratingsCount: Number(r.count),
      })),
    };
  }
}

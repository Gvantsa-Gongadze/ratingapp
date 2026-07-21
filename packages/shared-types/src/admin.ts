import type { UserRole } from './user';

export interface AdminUserDto {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  bannedAt: string | null;
  createdAt: string;
  ratingsCount: number;
}

export interface PaginatedAdminUsers {
  items: AdminUserDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

export interface SetUserBannedRequest {
  banned: boolean;
}

export interface AdminReviewDto {
  ratingId: string;
  userId: string;
  username: string;
  movieId: string;
  movieTitle: string;
  score: number;
  review: string;
  ratedAt: string;
}

export interface PaginatedAdminReviews {
  items: AdminReviewDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminTopMovieDto {
  movieId: string;
  title: string;
  averageScore: number;
  ratingsCount: number;
}

export interface AdminStatsDto {
  totalUsers: number;
  totalMovies: number;
  totalRatings: number;
  totalGroups: number;
  newUsersLast7Days: number;
  ratingsLast7Days: number;
  topMovies: AdminTopMovieDto[];
}

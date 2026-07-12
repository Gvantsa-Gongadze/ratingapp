import type { MovieDto } from './movie';

export interface RateMovieRequest {
  /** 1-10 */
  score: number;
  review?: string;
  /** ISO 8601 timestamp of when the user actually rated it. */
  ratedAt: string;
}

export interface RatingDto {
  id: string;
  movieId: string;
  userId: string;
  score: number;
  review: string | null;
  ratedAt: string;
}

export interface MyRatingDto {
  id: string;
  movie: MovieDto;
  score: number;
  review: string | null;
  ratedAt: string;
}

export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export interface RankingEntryDto {
  rank: number;
  movieId: string;
  title: string;
  year: number;
  posterUrl: string | null;
  weightedScore: number;
  ratingsCount: number;
  reviewsCount: number;
  /** ISO 8601 timestamp of the most recent rating this movie received. */
  ratedAt: string;
}

export interface PaginatedRankings {
  items: RankingEntryDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MovieReviewDto {
  userId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  review: string;
  ratedAt: string;
}

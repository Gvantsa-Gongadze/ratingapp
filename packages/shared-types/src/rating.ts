export interface RateMovieRequest {
  /** 1-10 */
  score: number;
  review?: string;
}

export interface RatingDto {
  id: string;
  movieId: string;
  userId: string;
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
}

import type { MovieReviewDto, PaginatedRankings, RankingPeriod } from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchRankings(period: RankingPeriod, page = 1) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return apiFetch<PaginatedRankings>(
    `/rankings?period=${period}&page=${page}&tz=${encodeURIComponent(tz)}`,
  );
}

export function fetchMovieReviews(movieId: string, period: RankingPeriod) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return apiFetch<MovieReviewDto[]>(
    `/rankings/${movieId}/reviews?period=${period}&tz=${encodeURIComponent(tz)}`,
  );
}

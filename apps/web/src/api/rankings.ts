import type { RankingEntryDto, RankingPeriod } from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchRankings(period: RankingPeriod) {
  return apiFetch<RankingEntryDto[]>(`/rankings?period=${period}`);
}

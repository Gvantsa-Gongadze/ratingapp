import type { RankingPeriod } from '@ratingapp/shared-types';
import { IsIn, IsOptional } from 'class-validator';

const PERIODS: RankingPeriod[] = ['daily', 'weekly', 'monthly', 'all'];

export class RankingsQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: RankingPeriod;
}

import type { RankingPeriod } from '@ratingapp/shared-types';
import { IsIn, IsOptional, IsString } from 'class-validator';

const PERIODS: RankingPeriod[] = ['daily', 'weekly', 'monthly', 'all'];

export class MovieReviewsQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: RankingPeriod;

  /** IANA timezone name (e.g. "Asia/Tbilisi") used to compute calendar boundaries. */
  @IsOptional()
  @IsString()
  tz?: string;
}

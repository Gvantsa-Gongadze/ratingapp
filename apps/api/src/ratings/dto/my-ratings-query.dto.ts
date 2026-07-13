import type { RankingPeriod } from '@ratingapp/shared-types';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const PERIODS: RankingPeriod[] = ['daily', 'weekly', 'monthly', 'all'];

export class MyRatingsQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: RankingPeriod;

  /** IANA timezone name (e.g. "Asia/Tbilisi") used to compute calendar boundaries. */
  @IsOptional()
  @IsString()
  tz?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

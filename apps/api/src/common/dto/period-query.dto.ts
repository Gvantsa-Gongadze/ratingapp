import type { RankingPeriod } from '@ratingapp/shared-types';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const RANKING_PERIODS: RankingPeriod[] = ['daily', 'weekly', 'monthly', 'all'];

export class PeriodQueryDto {
  @IsOptional()
  @IsIn(RANKING_PERIODS)
  period?: RankingPeriod;

  /** IANA timezone name (e.g. "Asia/Tbilisi") used to compute calendar boundaries. */
  @IsOptional()
  @IsString()
  tz?: string;
}

export class PagedPeriodQueryDto extends PeriodQueryDto {
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

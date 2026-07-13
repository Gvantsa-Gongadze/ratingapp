import { Type } from 'class-transformer';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';

/** 1874: generally cited as the earliest surviving motion picture footage. */
const MIN_YEAR = 1874;
const MAX_YEAR = new Date().getFullYear() + 1;

export class UpdateYearRangeDto {
  @ValidateIf((o) => o.minYear !== null)
  @Type(() => Number)
  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  minYear: number | null;

  @ValidateIf((o) => o.maxYear !== null)
  @Type(() => Number)
  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  maxYear: number | null;
}

import { IsISO8601, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RateMovieDto {
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(10)
  score: number;

  @IsOptional()
  @IsString()
  review?: string;

  @IsISO8601()
  ratedAt: string;
}

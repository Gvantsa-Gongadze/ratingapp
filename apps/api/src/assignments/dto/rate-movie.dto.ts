import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RateMovieDto {
  @IsInt()
  @Min(1)
  @Max(10)
  score: number;

  @IsOptional()
  @IsString()
  review?: string;
}

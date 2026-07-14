import { Type } from 'class-transformer';
import { IsNumber, Max, Min, ValidateIf } from 'class-validator';

export class UpdateMinRatingDto {
  @ValidateIf((o) => o.minRating !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  minRating: number | null;
}

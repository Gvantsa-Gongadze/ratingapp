import { BadRequestException } from '@nestjs/common';

/** Shared by user and group movie-preference updates. */
export function assertNoGenreOverlap(genresInclude: string[], genresExclude: string[]): void {
  const overlap = genresInclude.filter((g) => genresExclude.includes(g));
  if (overlap.length > 0) {
    throw new BadRequestException(`A genre can't be both included and excluded: ${overlap.join(', ')}`);
  }
}

/** Shared by user and group movie-preference updates. */
export function assertValidYearRange(minYear: number | null, maxYear: number | null): void {
  if (minYear !== null && maxYear !== null && minYear > maxYear) {
    throw new BadRequestException('The starting year must be before the ending year');
  }
}

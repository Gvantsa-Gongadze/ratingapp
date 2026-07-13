import { IsArray, IsIn } from 'class-validator';
import { GENRE_NAMES } from '../../movies/tmdb/tmdb-genres';

export class UpdateGenrePreferencesDto {
  @IsArray()
  @IsIn(GENRE_NAMES, { each: true })
  genresInclude: string[];

  @IsArray()
  @IsIn(GENRE_NAMES, { each: true })
  genresExclude: string[];
}

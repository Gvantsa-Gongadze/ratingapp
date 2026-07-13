export interface UserDto {
  id: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserStatsDto {
  moviesWatched: number;
  moviesSkipped: number;
  averageScore: number | null;
  currentStreak: number;
}

export interface UserSettingsDto {
  minYear: number | null;
  maxYear: number | null;
  minRuntime: number | null;
  maxRuntime: number | null;
  minTmdbVotes: number | null;
  genresInclude: string[] | null;
  genresExclude: string[] | null;
}

export interface UserSettingsResponseDto {
  settings: UserSettingsDto;
  /** Canonical genre names the picker should offer. */
  availableGenres: string[];
}

export interface UpdateGenrePreferencesRequest {
  genresInclude: string[];
  genresExclude: string[];
}

export interface UpdateYearRangeRequest {
  minYear: number | null;
  maxYear: number | null;
}

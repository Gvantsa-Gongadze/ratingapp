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

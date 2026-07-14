import type { MovieDto } from './movie';

export type GroupMode = 'sync' | 'individual';
export type GroupRole = 'owner' | 'member';

export interface GroupDto {
  id: string;
  name: string;
  slug: string;
  mode: GroupMode;
  memberCount: number;
  role: GroupRole;
  createdAt: string;
}

export interface GroupMemberDto {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupDetailDto extends GroupDto {
  members: GroupMemberDto[];
}

export interface CreateGroupRequest {
  name: string;
  mode: GroupMode;
}

export interface JoinGroupRequest {
  code: string;
}

export interface GroupInviteDto {
  code: string;
  expiresAt: string | null;
  maxUses: number | null;
}

export interface GroupSettingsDto {
  minYear: number | null;
  maxYear: number | null;
  minTmdbRating: number | null;
  genresInclude: string[] | null;
  genresExclude: string[] | null;
}

export interface GroupSettingsResponseDto {
  settings: GroupSettingsDto;
  /** Canonical genre names the picker should offer. */
  availableGenres: string[];
}

/**
 * One completed watch in a group's history. Sync mode: the whole group
 * watched it together, so `watchedBy` is null and `groupScore` is the
 * aggregate. Individual mode: `watchedBy` identifies which member watched
 * it and `groupScore` is null.
 */
export interface GroupHistoryEntryDto {
  id: string;
  movie: MovieDto;
  completedAt: string;
  watchedBy: { userId: string; username: string; score: number | null } | null;
  groupScore: { averageScore: number | null; ratingsCount: number } | null;
}

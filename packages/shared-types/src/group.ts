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

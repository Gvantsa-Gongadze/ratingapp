export type GroupMode = 'sync' | 'individual';
export interface GroupDto {
    id: string;
    name: string;
    slug: string;
    mode: GroupMode;
    memberCount: number;
    createdAt: string;
}
export interface GroupMemberDto {
    userId: string;
    username: string;
    avatarUrl: string | null;
    role: 'owner' | 'member';
    joinedAt: string;
}

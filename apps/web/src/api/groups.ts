import type {
  CreateGroupRequest,
  GroupDetailDto,
  GroupDto,
  GroupInviteDto,
  JoinGroupRequest,
  MessageResponseDto,
} from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchMyGroups() {
  return apiFetch<GroupDto[]>('/groups');
}

export function fetchGroupDetail(groupId: string) {
  return apiFetch<GroupDetailDto>(`/groups/${groupId}`);
}

export function createGroup(data: CreateGroupRequest) {
  return apiFetch<GroupDetailDto>('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function joinGroup(data: JoinGroupRequest) {
  return apiFetch<GroupDetailDto>('/groups/join', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createInvite(groupId: string) {
  return apiFetch<GroupInviteDto>(`/groups/${groupId}/invites`, {
    method: 'POST',
  });
}

export function leaveGroup(groupId: string) {
  return apiFetch<MessageResponseDto>(`/groups/${groupId}/leave`, {
    method: 'POST',
  });
}

import type {
  AssignmentDto,
  CreateGroupRequest,
  GroupDetailDto,
  GroupDto,
  GroupHistoryEntryDto,
  GroupInviteDto,
  JoinGroupRequest,
  MessageResponseDto,
  RateMovieRequest,
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

export function fetchGroupAssignment(groupId: string) {
  return apiFetch<AssignmentDto>(`/groups/${groupId}/assignment`);
}

export function skipGroupAssignment(groupId: string, assignmentId: string) {
  return apiFetch<AssignmentDto>(`/groups/${groupId}/assignment/${assignmentId}/skip`, {
    method: 'POST',
  });
}

export function rateGroupAssignment(groupId: string, assignmentId: string, data: RateMovieRequest) {
  return apiFetch<AssignmentDto>(`/groups/${groupId}/assignment/${assignmentId}/rate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchGroupHistory(groupId: string) {
  return apiFetch<GroupHistoryEntryDto[]>(`/groups/${groupId}/history`);
}

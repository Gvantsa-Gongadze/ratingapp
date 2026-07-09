import type { MovieDto } from './movie';

export type AssignmentStatus = 'active' | 'rated' | 'skipped' | 'expired';

export interface AssignmentDto {
  id: string;
  movie: MovieDto;
  groupId: string | null;
  assignedAt: string;
  deadlineAt: string;
  status: AssignmentStatus;
}

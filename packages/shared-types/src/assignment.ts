import type { MovieDto } from './movie';

export type AssignmentStatus = 'active' | 'rated' | 'skipped' | 'expired';

export interface AssignmentDto {
  id: string;
  movie: MovieDto;
  groupId: string | null;
  assignedAt: string;
  deadlineAt: string;
  status: AssignmentStatus;
  /** Aggregate rating from everyone who has rated this movie, null if no one has yet. */
  communityRating: { averageScore: number; ratingsCount: number } | null;
}

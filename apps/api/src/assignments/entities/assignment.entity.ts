import type { AssignmentStatus } from '@ratingapp/shared-types';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GroupCycle } from '../../groups/entities/group-cycle.entity';
import { Group } from '../../groups/entities/group.entity';
import { Movie } from '../../movies/entities/movie.entity';
import { User } from '../../users/entities/user.entity';

@Entity('assignments')
@Index(['userId'], {
  unique: true,
  where: `"group_id" IS NULL AND "status" = 'active'`,
})
@Index(['groupId', 'userId', 'status'])
@Index(['groupCycleId'])
export class Assignment {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'movie_id', type: 'uuid' })
  movieId: string;

  @ManyToOne(() => Movie)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group | null;

  @Column({ name: 'group_cycle_id', type: 'uuid', nullable: true })
  groupCycleId: string | null;

  @ManyToOne(() => GroupCycle, { nullable: true })
  @JoinColumn({ name: 'group_cycle_id' })
  groupCycle: GroupCycle | null;

  @Column({ name: 'assigned_at', type: 'timestamp', default: () => 'now()' })
  assignedAt: Date;

  @Column({ name: 'deadline_at', type: 'timestamp' })
  deadlineAt: Date;

  @Column({ type: 'enum', enum: ['active', 'rated', 'skipped', 'expired'] })
  status: AssignmentStatus;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}

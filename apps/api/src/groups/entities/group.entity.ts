import type { GroupMode } from '@ratingapp/shared-types';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('groups')
export class Group {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ unique: true })
  slug: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'enum', enum: ['sync', 'individual'] })
  mode: GroupMode;

  @Column({ name: 'skip_timeout_hours' })
  skipTimeoutHours: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  settings: Record<string, unknown>;
}

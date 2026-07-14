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

  @Column({ name: 'min_year', type: 'int', nullable: true })
  minYear: number | null;

  @Column({ name: 'max_year', type: 'int', nullable: true })
  maxYear: number | null;

  @Column({ name: 'genres_include', type: 'text', array: true, nullable: true })
  genresInclude: string[] | null;

  @Column({ name: 'genres_exclude', type: 'text', array: true, nullable: true })
  genresExclude: string[] | null;

  @Column({ name: 'min_tmdb_rating', type: 'real', nullable: true })
  minTmdbRating: number | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'now()' })
  createdAt: Date;
}

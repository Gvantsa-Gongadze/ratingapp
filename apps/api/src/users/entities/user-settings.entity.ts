import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'min_year', type: 'int', nullable: true })
  minYear: number | null;

  @Column({ name: 'max_year', type: 'int', nullable: true })
  maxYear: number | null;

  @Column({ name: 'genres_include', type: 'text', array: true, nullable: true })
  genresInclude: string[] | null;

  @Column({ name: 'genres_exclude', type: 'text', array: true, nullable: true })
  genresExclude: string[] | null;

  @Column({ name: 'min_tmdb_votes', type: 'int', nullable: true })
  minTmdbVotes: number | null;

  @Column({ name: 'min_tmdb_rating', type: 'real', nullable: true })
  minTmdbRating: number | null;

  @Column({ name: 'min_runtime', type: 'int', nullable: true })
  minRuntime: number | null;

  @Column({ name: 'max_runtime', type: 'int', nullable: true })
  maxRuntime: number | null;
}

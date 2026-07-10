import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('movies')
export class Movie {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Index({ unique: true })
  @Column({ name: 'tmdb_id', unique: true })
  tmdbId: number;

  @Column({ name: 'imdb_id', type: 'text', nullable: true })
  imdbId: string | null;

  @Column()
  title: string;

  @Column({ name: 'original_title', type: 'text', nullable: true })
  originalTitle: string | null;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ name: 'poster_path', type: 'text', nullable: true })
  posterPath: string | null;

  @Column({ type: 'text', nullable: true })
  overview: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  genres: string[];

  @Column({ type: 'int', nullable: true })
  runtime: number | null;

  @Column({ name: 'tmdb_vote_avg', type: 'real', nullable: true })
  tmdbVoteAvg: number | null;

  @Column({ name: 'tmdb_vote_count', type: 'int', nullable: true })
  tmdbVoteCount: number | null;
}

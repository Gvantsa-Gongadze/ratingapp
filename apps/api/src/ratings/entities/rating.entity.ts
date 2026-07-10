import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Assignment } from '../../assignments/entities/assignment.entity';
import { Movie } from '../../movies/entities/movie.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ratings')
@Check(`"score" >= 1 AND "score" <= 10`)
@Index(['movieId', 'ratedAt'])
export class Rating {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Index({ unique: true })
  @Column({ name: 'assignment_id', type: 'uuid', unique: true })
  assignmentId: string;

  @OneToOne(() => Assignment)
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

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

  @Column({ type: 'smallint' })
  score: number;

  @Column({ name: 'review_text', type: 'text', nullable: true })
  reviewText: string | null;

  @Column({ name: 'rated_at', type: 'timestamp', default: () => 'now()' })
  ratedAt: Date;
}

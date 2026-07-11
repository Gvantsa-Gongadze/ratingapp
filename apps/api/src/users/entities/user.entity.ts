import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Index({ unique: true })
  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Index({ unique: true })
  @Column({ name: 'reset_password_token_hash', type: 'text', unique: true, nullable: true })
  resetPasswordTokenHash: string | null;

  @Column({ name: 'reset_password_expires_at', type: 'timestamp', nullable: true })
  resetPasswordExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

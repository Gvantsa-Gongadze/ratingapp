import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from './entities/user-settings.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>,
  ) {}

  findSettings(userId: string): Promise<UserSettings | null> {
    return this.userSettingsRepository.findOneBy({ userId });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ username });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async create(data: { email: string; username: string; passwordHash: string }): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  findByResetTokenHash(tokenHash: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ resetPasswordTokenHash: tokenHash });
  }

  async setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.usersRepository.update(userId, {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: expiresAt,
    });
  }

  /** Sets a new password and invalidates the reset token in one step. */
  async resetPassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(userId, {
      passwordHash,
      resetPasswordTokenHash: null,
      resetPasswordExpiresAt: null,
    });
  }
}

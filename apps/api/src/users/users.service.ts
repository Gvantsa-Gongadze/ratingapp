import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MessageResponseDto, UserSettingsDto, UserSettingsResponseDto } from '@ratingapp/shared-types';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { GENRE_NAMES } from '../movies/tmdb/tmdb-genres';
import { UserSettings } from './entities/user-settings.entity';
import { User } from './entities/user.entity';

const SALT_ROUNDS = 10;

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

  async getSettingsResponse(userId: string): Promise<UserSettingsResponseDto> {
    const settings = await this.findSettings(userId);
    return { settings: this.toSettingsDto(settings), availableGenres: GENRE_NAMES };
  }

  async updateGenrePreferences(
    userId: string,
    genresInclude: string[],
    genresExclude: string[],
  ): Promise<UserSettingsResponseDto> {
    const overlap = genresInclude.filter((g) => genresExclude.includes(g));
    if (overlap.length > 0) {
      throw new BadRequestException(`A genre can't be both included and excluded: ${overlap.join(', ')}`);
    }

    const existing = await this.userSettingsRepository.findOneBy({ userId });
    const settings = this.userSettingsRepository.create({
      ...existing,
      userId,
      genresInclude: genresInclude.length > 0 ? genresInclude : null,
      genresExclude: genresExclude.length > 0 ? genresExclude : null,
    });
    const saved = await this.userSettingsRepository.save(settings);

    return { settings: this.toSettingsDto(saved), availableGenres: GENRE_NAMES };
  }

  async updateYearRange(
    userId: string,
    minYear: number | null,
    maxYear: number | null,
  ): Promise<UserSettingsResponseDto> {
    if (minYear !== null && maxYear !== null && minYear > maxYear) {
      throw new BadRequestException('The starting year must be before the ending year');
    }

    const existing = await this.userSettingsRepository.findOneBy({ userId });
    const settings = this.userSettingsRepository.create({
      ...existing,
      userId,
      minYear,
      maxYear,
    });
    const saved = await this.userSettingsRepository.save(settings);

    return { settings: this.toSettingsDto(saved), availableGenres: GENRE_NAMES };
  }

  async updateMinRating(userId: string, minRating: number | null): Promise<UserSettingsResponseDto> {
    const existing = await this.userSettingsRepository.findOneBy({ userId });
    const settings = this.userSettingsRepository.create({
      ...existing,
      userId,
      minTmdbRating: minRating,
    });
    const saved = await this.userSettingsRepository.save(settings);

    return { settings: this.toSettingsDto(saved), availableGenres: GENRE_NAMES };
  }

  private toSettingsDto(settings: UserSettings | null): UserSettingsDto {
    return {
      minYear: settings?.minYear ?? null,
      maxYear: settings?.maxYear ?? null,
      minRuntime: settings?.minRuntime ?? null,
      maxRuntime: settings?.maxRuntime ?? null,
      minTmdbVotes: settings?.minTmdbVotes ?? null,
      minTmdbRating: settings?.minTmdbRating ?? null,
      genresInclude: settings?.genresInclude ?? null,
      genresExclude: settings?.genresExclude ?? null,
    };
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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<MessageResponseDto> {
    const user = await this.requireVerifiedUser(userId, currentPassword);
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersRepository.update(user.id, { passwordHash });
    return { message: 'Your password has been updated.' };
  }

  async changeEmail(userId: string, currentPassword: string, newEmail: string): Promise<MessageResponseDto> {
    const user = await this.requireVerifiedUser(userId, currentPassword);

    if (newEmail.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await this.findByEmail(newEmail);
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    await this.usersRepository.update(user.id, { email: newEmail });
    return { message: 'Your email has been updated.' };
  }

  private async requireVerifiedUser(userId: string, currentPassword: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    return user;
  }
}

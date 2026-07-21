import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponseDto, MeDto, UserDto } from '@ratingapp/shared-types';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload.interface';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(email: string, username: string, password: string): Promise<AuthResponseDto> {
    const [existingEmail, existingUsername] = await Promise.all([
      this.usersService.findByEmail(email),
      this.usersService.findByUsername(username),
    ]);
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.usersService.create({ email, username, passwordHash });
    return this.buildAuthResponse(user);
  }

  async login(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.bannedAt) {
      throw new UnauthorizedException('This account has been suspended');
    }
    return this.buildAuthResponse(user);
  }

  /** Stateless refresh tokens — no revocation/rotation store yet. */
  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.buildAuthResponse(user);
  }

  /**
   * Always resolves without error, even for unregistered emails — the caller
   * must not be able to tell which emails exist from the response.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.usersService.setResetToken(user.id, this.hashResetToken(rawToken), expiresAt);

    const webOrigin = this.config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
    const resetUrl = `${webOrigin}/auth/reset-password?token=${rawToken}`;
    this.logger.log(`Password reset requested for ${email}`);
    await this.emailService.sendPasswordReset(email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByResetTokenHash(this.hashResetToken(token));
    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersService.resetPassword(user.id, passwordHash);
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  toMeDto(user: User): MeDto {
    return { ...this.toUserDto(user), email: user.email, role: user.role };
  }

  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { accessToken, refreshToken, user: this.toUserDto(user) };
  }
}

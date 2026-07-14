import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateGenrePreferencesDto } from './dto/update-genre-preferences.dto';
import { UpdateMinRatingDto } from './dto/update-min-rating.dto';
import { UpdateYearRangeDto } from './dto/update-year-range.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: User) {
    return this.usersService.getSettingsResponse(user.id);
  }

  @Patch('settings/genres')
  updateGenres(@CurrentUser() user: User, @Body() dto: UpdateGenrePreferencesDto) {
    return this.usersService.updateGenrePreferences(user.id, dto.genresInclude, dto.genresExclude);
  }

  @Patch('settings/year-range')
  updateYearRange(@CurrentUser() user: User, @Body() dto: UpdateYearRangeDto) {
    return this.usersService.updateYearRange(user.id, dto.minYear, dto.maxYear);
  }

  @Patch('settings/rating')
  updateMinRating(@CurrentUser() user: User, @Body() dto: UpdateMinRatingDto) {
    return this.usersService.updateMinRating(user.id, dto.minRating);
  }

  @Patch('account/password')
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Patch('account/email')
  changeEmail(@CurrentUser() user: User, @Body() dto: ChangeEmailDto) {
    return this.usersService.changeEmail(user.id, dto.currentPassword, dto.newEmail);
  }
}

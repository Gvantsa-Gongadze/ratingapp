import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateGenrePreferencesDto } from './dto/update-genre-preferences.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users/settings')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getSettings(@CurrentUser() user: User) {
    return this.usersService.getSettingsResponse(user.id);
  }

  @Patch('genres')
  updateGenres(@CurrentUser() user: User, @Body() dto: UpdateGenrePreferencesDto) {
    return this.usersService.updateGenrePreferences(user.id, dto.genresInclude, dto.genresExclude);
  }
}

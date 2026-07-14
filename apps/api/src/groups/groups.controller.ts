import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateGenrePreferencesDto } from '../users/dto/update-genre-preferences.dto';
import { UpdateMinRatingDto } from '../users/dto/update-min-rating.dto';
import { UpdateYearRangeDto } from '../users/dto/update-year-range.dto';
import { User } from '../users/entities/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupAssignmentsService } from './group-assignments.service';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly groupAssignmentsService: GroupAssignmentsService,
  ) {}

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.groupsService.listMyGroups(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(user.id, dto.name, dto.mode);
  }

  @Post('join')
  join(@CurrentUser() user: User, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinGroup(user.id, dto.code);
  }

  @Get(':id')
  getDetail(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.getGroupDetail(user.id, id);
  }

  @Post(':id/invites')
  createInvite(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.createInvite(user.id, id);
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.leaveGroup(user.id, id);
  }

  @Get(':id/history')
  getHistory(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupAssignmentsService.getHistory(user.id, id);
  }

  @Get(':id/settings')
  getSettings(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.getSettings(user.id, id);
  }

  @Patch(':id/settings/genres')
  updateGenres(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateGenrePreferencesDto) {
    return this.groupsService.updateGenrePreferences(user.id, id, dto.genresInclude, dto.genresExclude);
  }

  @Patch(':id/settings/year-range')
  updateYearRange(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateYearRangeDto) {
    return this.groupsService.updateYearRange(user.id, id, dto.minYear, dto.maxYear);
  }

  @Patch(':id/settings/rating')
  updateMinRating(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateMinRatingDto) {
    return this.groupsService.updateMinRating(user.id, id, dto.minRating);
  }
}

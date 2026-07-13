import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RateMovieDto } from '../assignments/dto/rate-movie.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { GroupAssignmentsService } from './group-assignments.service';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/assignment')
export class GroupAssignmentsController {
  constructor(private readonly groupAssignmentsService: GroupAssignmentsService) {}

  @Get()
  getCurrent(@CurrentUser() user: User, @Param('groupId') groupId: string) {
    return this.groupAssignmentsService.getCurrent(user.id, groupId);
  }

  @Post(':id/skip')
  skip(@CurrentUser() user: User, @Param('groupId') groupId: string, @Param('id') id: string) {
    return this.groupAssignmentsService.skip(user.id, groupId, id);
  }

  @Post(':id/rate')
  rate(
    @CurrentUser() user: User,
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body() dto: RateMovieDto,
  ) {
    return this.groupAssignmentsService.rate(user.id, groupId, id, dto.score, dto.review ?? null, dto.ratedAt);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { AssignmentsService } from './assignments.service';
import { RateMovieDto } from './dto/rate-movie.dto';

@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: User) {
    return this.assignmentsService.getCurrent(user.id);
  }

  @Post(':id/skip')
  skip(@CurrentUser() user: User, @Param('id') id: string) {
    return this.assignmentsService.skip(user.id, id);
  }

  @Post(':id/rate')
  rate(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: RateMovieDto) {
    return this.assignmentsService.rate(user.id, id, dto.score, dto.review ?? null);
  }
}

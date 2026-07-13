import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { MyRatingsQueryDto } from './dto/my-ratings-query.dto';
import { RatingsService } from './ratings.service';

@UseGuards(JwtAuthGuard)
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get('mine')
  getMine(@CurrentUser() user: User, @Query() query: MyRatingsQueryDto) {
    return this.ratingsService.findByUser(user.id, query.period ?? 'all', query.tz, query.page, query.pageSize);
  }
}

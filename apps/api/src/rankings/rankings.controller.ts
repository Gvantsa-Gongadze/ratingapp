import { Controller, Get, Query } from '@nestjs/common';
import { RankingsQueryDto } from './dto/rankings-query.dto';
import { RankingsService } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  getRankings(@Query() query: RankingsQueryDto) {
    return this.rankingsService.getRankings(query.period ?? 'all', query.tz);
  }
}

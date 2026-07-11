import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { MovieReviewsQueryDto } from './dto/movie-reviews-query.dto';
import { RankingsQueryDto } from './dto/rankings-query.dto';
import { RankingsService } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  getRankings(@Query() query: RankingsQueryDto) {
    return this.rankingsService.getRankings(query.period ?? 'all', query.tz, query.page, query.pageSize);
  }

  @Get(':movieId/reviews')
  getMovieReviews(@Param('movieId', ParseUUIDPipe) movieId: string, @Query() query: MovieReviewsQueryDto) {
    return this.rankingsService.getMovieReviews(movieId, query.period ?? 'all', query.tz);
  }
}

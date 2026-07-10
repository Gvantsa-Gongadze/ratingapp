import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entities/movie.entity';
import { MovieRandomizerService } from './movie-randomizer.service';
import { MoviesService } from './movies.service';
import { TmdbService } from './tmdb/tmdb.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movie])],
  providers: [TmdbService, MoviesService, MovieRandomizerService],
  exports: [MoviesService, MovieRandomizerService],
})
export class MoviesModule {}

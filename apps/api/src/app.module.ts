import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { MoviesModule } from './movies/movies.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HealthModule,
    MoviesModule,
    // Coming next, in build order:
    // AuthModule,
    // UsersModule,
    // AssignmentsModule,
    // RatingsModule,
    // RankingsModule,
    // GroupsModule,
    // JobsModule,
  ],
})
export class AppModule {}

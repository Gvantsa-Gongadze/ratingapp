import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MoviesModule } from './movies/movies.module';
import { RankingsModule } from './rankings/rankings.module';
import { RatingsModule } from './ratings/ratings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    HealthModule,
    MoviesModule,
    UsersModule,
    AuthModule,
    RatingsModule,
    AssignmentsModule,
    RankingsModule,
    // Coming next, in build order:
    // GroupsModule,
    // JobsModule,
  ],
})
export class AppModule {}

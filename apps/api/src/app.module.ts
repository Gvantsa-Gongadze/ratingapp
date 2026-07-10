import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MoviesModule } from './movies/movies.module';
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
    // Coming next, in build order:
    // AssignmentsModule,
    // RatingsModule,
    // RankingsModule,
    // GroupsModule,
    // JobsModule,
  ],
})
export class AppModule {}

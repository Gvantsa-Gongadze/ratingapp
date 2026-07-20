import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoviesModule } from '../movies/movies.module';
import { RatingsModule } from '../ratings/ratings.module';
import { UsersModule } from '../users/users.module';
import { AssignmentHelpersService } from './assignment-helpers.service';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { Assignment } from './entities/assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment]), MoviesModule, RatingsModule, UsersModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentHelpersService],
  exports: [AssignmentHelpersService],
})
export class AssignmentsModule {}

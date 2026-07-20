import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsModule } from '../assignments/assignments.module';
import { Assignment } from '../assignments/entities/assignment.entity';
import { MoviesModule } from '../movies/movies.module';
import { RatingsModule } from '../ratings/ratings.module';
import { GroupCycle } from './entities/group-cycle.entity';
import { GroupInvite } from './entities/group-invite.entity';
import { GroupMember } from './entities/group-member.entity';
import { Group } from './entities/group.entity';
import { GroupAssignmentsController } from './group-assignments.controller';
import { GroupAssignmentsService } from './group-assignments.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, GroupInvite, GroupCycle, Assignment]),
    MoviesModule,
    RatingsModule,
    AssignmentsModule,
  ],
  controllers: [GroupsController, GroupAssignmentsController],
  providers: [GroupsService, GroupAssignmentsService],
})
export class GroupsModule {}

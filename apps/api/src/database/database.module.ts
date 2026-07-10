import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../assignments/entities/assignment.entity';
import { GroupCycle } from '../groups/entities/group-cycle.entity';
import { GroupInvite } from '../groups/entities/group-invite.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Group } from '../groups/entities/group.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { UserSettings } from '../users/entities/user-settings.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [
          User,
          UserSettings,
          Movie,
          Assignment,
          Rating,
          Group,
          GroupMember,
          GroupInvite,
          GroupCycle,
        ],
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}

import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Assignment } from '../assignments/entities/assignment.entity';
import { GroupCycle } from '../groups/entities/group-cycle.entity';
import { GroupInvite } from '../groups/entities/group-invite.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Group } from '../groups/entities/group.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { UserSettings } from '../users/entities/user-settings.entity';
import { User } from '../users/entities/user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
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
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});

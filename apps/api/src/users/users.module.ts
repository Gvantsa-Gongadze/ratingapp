import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSettings } from './entities/user-settings.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSettings])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

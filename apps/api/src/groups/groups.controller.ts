import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.groupsService.listMyGroups(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(user.id, dto.name, dto.mode);
  }

  @Post('join')
  join(@CurrentUser() user: User, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinGroup(user.id, dto.code);
  }

  @Get(':id')
  getDetail(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.getGroupDetail(user.id, id);
  }

  @Post(':id/invites')
  createInvite(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.createInvite(user.id, id);
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: User, @Param('id') id: string) {
    return this.groupsService.leaveGroup(user.id, id);
  }
}

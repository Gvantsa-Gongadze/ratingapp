import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { SetUserBannedDto } from './dto/set-user-banned.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AdminGuard } from './guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Query() query: AdminListQueryDto) {
    return this.adminService.listUsers(query.page, query.pageSize);
  }

  @Patch('users/:id/role')
  updateUserRole(
    @CurrentUser() currentUser: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(currentUser.id, id, dto.role);
  }

  @Patch('users/:id/ban')
  setUserBanned(
    @CurrentUser() currentUser: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserBannedDto,
  ) {
    return this.adminService.setUserBanned(currentUser.id, id, dto.banned);
  }

  @Get('reviews')
  listReviews(@Query() query: AdminListQueryDto) {
    return this.adminService.listReviews(query.page, query.pageSize);
  }

  @Delete('reviews/:id')
  removeReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.removeReview(id);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}

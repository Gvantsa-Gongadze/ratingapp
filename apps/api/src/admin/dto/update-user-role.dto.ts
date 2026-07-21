import type { UserRole } from '@ratingapp/shared-types';
import { IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsIn(['user', 'admin'])
  role: UserRole;
}

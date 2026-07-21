import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/** Must run after JwtAuthGuard so request.user is already populated. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}

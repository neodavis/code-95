import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { type JwtPayload } from '../strategies/jwt.strategy';

/**
 * Restricts a route to back-office staff (isStaff) or superusers.
 * Must run after JwtAuthGuard so that req.user is populated.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return req.user?.isStaff === true || req.user?.isSuperuser === true;
  }
}

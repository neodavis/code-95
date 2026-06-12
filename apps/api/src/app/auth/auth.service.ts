import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { type Request } from 'express';
import { UsersService } from '../users/users.service';
import { verifyDjangoPassword, hashDjangoPassword } from './crypto.util';
import { type JwtPayload } from './strategies/jwt.strategy';
import { type LoginDto } from './dto/login.dto';
import { type PasswordChangeDto } from './dto/password-change.dto';
import { AuditService, type AuditContext } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { LoginAttemptService } from './login-attempt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly loginAttempt: LoginAttemptService,
  ) {}

  async login(
    dto: LoginDto,
    req?: Request,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      uniqueCode: string;
      email: string;
      firstName: string;
      lastName: string;
      middleName: string;
      isStaff: boolean;
      isSuperuser: boolean;
      isActive: boolean;
      isEmployee: boolean;
    };
  }> {
    if (this.loginAttempt.isLocked(dto.uniqueCode)) {
      const remainMs = this.loginAttempt.remainingLockMs(dto.uniqueCode);
      const remainMin = Math.ceil(remainMs / 60000);
      throw new UnauthorizedException(
        `Account temporarily locked. Try again in ${remainMin} minute(s).`,
      );
    }

    const user = await this.users.findByUniqueCode(dto.uniqueCode);
    if (!user) {
      this.loginAttempt.recordFailure(dto.uniqueCode);
      await this.audit.log(
        AuditAction.LOGIN_FAILED,
        'user',
        null,
        { uniqueCode: dto.uniqueCode },
        { userId: null, req },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verifyDjangoPassword(dto.password, user.password);
    if (!valid) {
      this.loginAttempt.recordFailure(dto.uniqueCode);
      await this.audit.log(
        AuditAction.LOGIN_FAILED,
        'user',
        user.id,
        { uniqueCode: dto.uniqueCode },
        { userId: user.id, req },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.loginAttempt.recordSuccess(dto.uniqueCode);

    const isEmployee = await this.users.isEmployee(user.id);

    await this.users.updateLastLogin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      uniqueCode: user.uniqueCode,
      isStaff: user.isStaff,
      isSuperuser: user.isSuperuser,
      isEmployee,
    };

    const ctx: AuditContext = { userId: user.id, req };
    await this.audit.log(AuditAction.LOGIN, 'user', user.id, null, ctx);

    return {
      accessToken: this.signAccess(payload),
      refreshToken: this.signRefresh(payload),
      user: {
        id: user.id,
        uniqueCode: user.uniqueCode,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        isStaff: user.isStaff,
        isSuperuser: user.isSuperuser,
        isActive: user.isActive,
        isEmployee,
      },
    };
  }

  async refresh(
    payload: JwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    const isEmployee = await this.users.isEmployee(user.id);

    const newPayload: JwtPayload = {
      sub: user.id,
      uniqueCode: user.uniqueCode,
      isStaff: user.isStaff,
      isSuperuser: user.isSuperuser,
      isEmployee,
    };

    return {
      accessToken: this.signAccess(newPayload),
      refreshToken: this.signRefresh(newPayload),
    };
  }

  async changePassword(userId: string, dto: PasswordChangeDto): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await verifyDjangoPassword(
      dto.currentPassword,
      user.password,
    );
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await hashDjangoPassword(dto.newPassword);
    await this.users.updatePassword(userId, hashed);

    await this.audit.log(AuditAction.PASSWORD_CHANGE, 'user', userId, null, {
      userId,
    });
  }

  private signAccess(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  private signRefresh(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
  }
}

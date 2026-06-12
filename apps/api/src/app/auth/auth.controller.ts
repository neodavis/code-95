import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { type Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PasswordChangeDto } from './dto/password-change.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { type JwtPayload } from './strategies/jwt.strategy';

type AuthRequest = Request & { user: JwtPayload };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Log in with unique code and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns access and refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): ReturnType<AuthService['login']> {
    return this.authService.login(dto, req);
  }

  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Returns new access and refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiBearerAuth()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  refresh(@Req() req: AuthRequest): ReturnType<AuthService['refresh']> {
    return this.authService.refresh(req.user);
  }

  @ApiOperation({ summary: 'Get current authenticated user payload' })
  @ApiResponse({
    status: 200,
    description: 'Returns the JWT payload of the current user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthRequest): JwtPayload {
    return req.user;
  }

  @ApiOperation({ summary: 'Change password for the current user' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or incorrect current password',
  })
  @ApiBearerAuth()
  @Post('password-change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: AuthRequest,
    @Body() dto: PasswordChangeDto,
  ): Promise<void> {
    await this.authService.changePassword(req.user.sub, dto);
  }
}

import { type INestApplication } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { createTestApp } from '../../test-helpers/create-test-app';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let authService: jest.Mocked<Partial<AuthService>>;

  const mockJwtGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        sub: 1,
        uniqueCode: 'UC001',
        isStaff: true,
        isSuperuser: false,
        type: 'ADMIN',
        isEmployee: false,
      };
      return true;
    }),
  };

  const mockRefreshGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        sub: 1,
        uniqueCode: 'UC001',
        isStaff: true,
        isSuperuser: false,
        type: 'ADMIN',
        isEmployee: false,
      };
      return true;
    }),
  };

  beforeAll(async () => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      changePassword: jest.fn(),
    };

    app = await createTestApp({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
      guards: [
        { guard: JwtAuthGuard, useValue: mockJwtGuard },
        { guard: JwtRefreshGuard, useValue: mockRefreshGuard },
        { guard: ThrottlerGuard, useValue: { canActivate: () => true } },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 with tokens on valid login', async () => {
      const loginResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 1, uniqueCode: 'UC001' },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authService.login.mockResolvedValue(loginResult as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        .send({ uniqueCode: 'UC001', password: 'password123' })
        .expect(200);

      expect(res.body.accessToken).toBe('access-token');
      expect(res.body.user.uniqueCode).toBe('UC001');
    });

    it('returns 400 when uniqueCode is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        .send({ password: 'password123' })
        .expect(400);

      expect(res.body.message).toBe('Validation failed');
      expect(res.body.fields.uniqueCode).toBeDefined();
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        .send({ uniqueCode: 'UC001' })
        .expect(400);

      expect(res.body.fields.password).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 200 with new tokens', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(200);

      expect(res.body.accessToken).toBe('new-access');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns current user payload', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(200);

      expect(res.body.sub).toBe(1);
      expect(res.body.uniqueCode).toBe('UC001');
    });
  });

  describe('POST /api/v1/auth/password-change', () => {
    it('returns 204 on success', async () => {
      authService.changePassword.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password-change')
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        .send({ currentPassword: 'old', newPassword: 'newPass123' })
        .expect(204);

      expect(res.status).toBe(204);
    });

    it('returns 400 when newPassword is too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password-change')
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        .send({ currentPassword: 'old', newPassword: 'short' })
        .expect(400);

      expect(res.body.fields.newPassword).toBeDefined();
    });
  });
});

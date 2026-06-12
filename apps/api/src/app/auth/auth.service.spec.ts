import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { LoginAttemptService } from './login-attempt.service';
import * as crypto from './crypto.util';
import { makeUser } from '../../test-helpers/fixtures';

const ID_1 = '550e8400-e29b-41d4-a716-446655440001';
const ID_NOT_FOUND = '550e8400-e29b-41d4-a716-446655440099';

jest.mock('./crypto.util');
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    usersService = {
      findByUniqueCode: jest.fn(),
      findById: jest.fn(),
      isEmployee: jest.fn(),
      updateLastLogin: jest.fn(),
      updatePassword: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };

    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: LoginAttemptService,
          useValue: {
            isLocked: jest.fn().mockReturnValue(false),
            recordFailure: jest.fn(),
            recordSuccess: jest.fn(),
            remainingLockMs: jest.fn().mockReturnValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('login', () => {
    it('returns tokens and user on valid credentials', async () => {
      const user = makeUser();
      usersService.findByUniqueCode.mockResolvedValue(user);
      usersService.isEmployee.mockResolvedValue(false);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      mockedCrypto.verifyDjangoPassword.mockResolvedValue(true);

      const result = await service.login({
        uniqueCode: 'UC001',
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        password: 'pass',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.uniqueCode).toBe('UC001');
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(user.id);
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findByUniqueCode.mockResolvedValue(null);

      await expect(
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        service.login({ uniqueCode: 'WRONG', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      usersService.findByUniqueCode.mockResolvedValue(makeUser());
      mockedCrypto.verifyDjangoPassword.mockResolvedValue(false);

      await expect(
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        service.login({ uniqueCode: 'UC001', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('includes isEmployee flag in response', async () => {
      usersService.findByUniqueCode.mockResolvedValue(makeUser());
      usersService.isEmployee.mockResolvedValue(true);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      mockedCrypto.verifyDjangoPassword.mockResolvedValue(true);

      const result = await service.login({
        uniqueCode: 'UC001',
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        password: 'pass',
      });
      expect(result.user.isEmployee).toBe(true);
    });
  });

  describe('refresh', () => {
    it('returns new tokens for valid user', async () => {
      usersService.findById.mockResolvedValue(makeUser());
      usersService.isEmployee.mockResolvedValue(false);

      const result = await service.refresh({
        sub: ID_1,
        uniqueCode: 'UC001',
        isStaff: true,
        isSuperuser: false,
        isEmployee: false,
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.refresh({
          sub: ID_NOT_FOUND,
          uniqueCode: 'UC999',
          isStaff: false,
          isSuperuser: false,
          isEmployee: false,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('changes password when current password is correct', async () => {
      usersService.findById.mockResolvedValue(makeUser());
      usersService.updatePassword.mockResolvedValue(undefined);
      mockedCrypto.verifyDjangoPassword.mockResolvedValue(true);
      mockedCrypto.hashDjangoPassword.mockResolvedValue('new-hash');

      await service.changePassword(ID_1, {
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        currentPassword: 'old',
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        newPassword: 'newPass123',
      });

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        ID_1,
        'new-hash',
      );
    });

    it('throws BadRequestException when current password is wrong', async () => {
      usersService.findById.mockResolvedValue(makeUser());
      mockedCrypto.verifyDjangoPassword.mockResolvedValue(false);

      await expect(
        service.changePassword(ID_1, {
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords
          currentPassword: 'wrong',
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords
          newPassword: 'newPass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(ID_NOT_FOUND, {
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords
          currentPassword: 'old',
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords
          newPassword: 'newPass123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

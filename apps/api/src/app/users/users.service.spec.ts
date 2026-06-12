import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { createMockRepository } from '../../test-helpers/mock-repository';
import { makeUser } from '../../test-helpers/fixtures';
import * as crypto from '../auth/crypto.util';

const ID_1 = '550e8400-e29b-41d4-a716-446655440001';
const ID_NOT_FOUND = '550e8400-e29b-41d4-a716-446655440099';

jest.mock('../auth/crypto.util');
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof createMockRepository<User>>;

  beforeEach(async () => {
    repo = createMockRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByUniqueCode', () => {
    it('returns user when found', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      const result = await service.findByUniqueCode('UC001');
      expect(result).toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { uniqueCode: 'UC001', isActive: true },
      });
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.findByUniqueCode('NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const baseDto = {
      uniqueCode: 'UC001',
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Smith',
      phone: '+380501234567',
    };

    it('creates user when unique code does not exist', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      mockedCrypto.hashDjangoPassword.mockResolvedValue('hashed-pwd');

      const result = await service.create(baseDto);

      expect(result).toBe(user);
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when unique code already exists', async () => {
      repo.findOne.mockResolvedValue(makeUser());

      await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates user fields', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      const updated = makeUser({ firstName: 'Jane' });
      // findOne called twice: once for validation, once to return updated
      repo.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(updated);

      const result = await service.update(ID_1, { firstName: 'Jane' });
      expect(repo.update).toHaveBeenCalledWith(ID_1, { firstName: 'Jane' });
      expect(result.firstName).toBe('Jane');
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(ID_NOT_FOUND, { firstName: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('hashes password when password is provided', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);
      mockedCrypto.hashDjangoPassword.mockResolvedValue('new-hash');

      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      await service.update(ID_1, { password: 'newPass123' });
      expect(mockedCrypto.hashDjangoPassword).toHaveBeenCalledWith(
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        'newPass123',
      );
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      expect(repo.update).toHaveBeenCalledWith(ID_1, { password: 'new-hash' });
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      repo.findOne.mockResolvedValue(makeUser());

      await service.deactivate(ID_1);
      expect(repo.update).toHaveBeenCalledWith(ID_1, { isActive: false });
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.deactivate(ID_NOT_FOUND)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isEmployee', () => {
    it('returns true when employee record exists', async () => {
      repo.query.mockResolvedValue([{ id: 1 }]);
      expect(await service.isEmployee(ID_1)).toBe(true);
    });

    it('returns false when no employee record', async () => {
      repo.query.mockResolvedValue([]);
      expect(await service.isEmployee(ID_1)).toBe(false);
    });
  });
});

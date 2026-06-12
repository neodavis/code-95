import type { Request } from 'express';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog, AuditAction } from './audit-log.entity';
import { createMockRepository } from '../../test-helpers/mock-repository';

describe('AuditService', () => {
  let service: AuditService;
  let repo: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = createMockRepository<AuditLog>() as unknown as {
      create: jest.Mock;
      save: jest.Mock;
    };

    const mod = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
      ],
    }).compile();

    service = mod.get(AuditService);
  });

  it('creates and saves an audit log entry', async () => {
    const mockEntry = { id: 'uuid-1' };
    repo.create.mockReturnValue(mockEntry);
    repo.save.mockResolvedValue(mockEntry);

    await service.log(AuditAction.LOGIN, 'user', 'user-1', null, {
      userId: 'user-1',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.LOGIN,
        entity: 'user',
        entityId: 'user-1',
        changes: null,
        userId: 'user-1',
        ipAddress: null,
        userAgent: null,
      }),
    );
    expect(repo.save).toHaveBeenCalledWith(mockEntry);
  });

  it('extracts IP from x-forwarded-for header', async () => {
    repo.create.mockReturnValue({});
    repo.save.mockResolvedValue({});

    // eslint-disable-next-line sonarjs/no-hardcoded-ip
    const testIp = '1.2.3.4';
    const mockReq = {
      headers: { 'x-forwarded-for': `${testIp}, 5.6.7.8` },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    await service.log(AuditAction.SPK_CREATE, 'espk', '99', null, {
      userId: 'u1',
      req: mockReq,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: testIp }),
    );
  });

  it('falls back to socket remoteAddress when no x-forwarded-for', async () => {
    repo.create.mockReturnValue({});
    repo.save.mockResolvedValue({});

    // eslint-disable-next-line sonarjs/no-hardcoded-ip
    const testIp = '10.0.0.5';
    const mockReq = {
      headers: {},
      socket: { remoteAddress: testIp },
    } as unknown as Request;

    await service.log(AuditAction.LOGIN, 'user', 'u1', null, {
      userId: 'u1',
      req: mockReq,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: testIp }),
    );
  });

  it('stores changes as jsonb payload', async () => {
    repo.create.mockReturnValue({});
    repo.save.mockResolvedValue({});

    const changes = { from: 1, to: 3 };
    await service.log(
      AuditAction.GROUP_STATUS_CHANGE,
      'study_group',
      'grp-1',
      changes,
      { userId: 'u1' },
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ changes }),
    );
  });

  it('records userAgent from request headers', async () => {
    repo.create.mockReturnValue({});
    repo.save.mockResolvedValue({});

    const mockReq = {
      headers: { 'user-agent': 'Mozilla/5.0' },
      socket: {},
    } as Request;

    await service.log(AuditAction.PASSWORD_CHANGE, 'user', 'u1', null, {
      userId: 'u1',
      req: mockReq,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: 'Mozilla/5.0' }),
    );
  });
});

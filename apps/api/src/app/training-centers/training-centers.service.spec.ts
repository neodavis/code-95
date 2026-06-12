import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TrainingCentersService } from './training-centers.service';
import { TrainingCenter } from './entities/training-center.entity';
import { AuditService } from '../audit/audit.service';
import { createMockRepository } from '../../test-helpers/mock-repository';
import { makeTrainingCenter } from '../../test-helpers/fixtures';

const ID_1 = '550e8400-e29b-41d4-a716-446655440001';
const ID_NOT_FOUND = '550e8400-e29b-41d4-a716-446655440099';

describe('TrainingCentersService', () => {
  let service: TrainingCentersService;
  let repo: ReturnType<typeof createMockRepository<TrainingCenter>>;

  beforeEach(async () => {
    repo = createMockRepository<TrainingCenter>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingCentersService,
        { provide: getRepositoryToken(TrainingCenter), useValue: repo },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<TrainingCentersService>(TrainingCentersService);
  });

  describe('findOne', () => {
    it('returns training center when found', async () => {
      const tc = makeTrainingCenter();
      repo.findOne.mockResolvedValue(tc);

      const result = await service.findOne(ID_1);
      expect(result).toBe(tc);
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findOne(ID_NOT_FOUND)).toBeNull();
    });
  });

  describe('create', () => {
    it('creates training center with required fields', async () => {
      const tc = makeTrainingCenter();
      repo.create.mockReturnValue(tc);
      repo.save.mockResolvedValue(tc);

      const result = await service.create({
        name: 'Test TC',
        edrpou: '12345678',
      });

      expect(result).toBe(tc);
      expect(repo.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates training center fields', async () => {
      const tc = makeTrainingCenter();
      const updated = makeTrainingCenter({ city: 'Lviv' });
      repo.findOne.mockResolvedValueOnce(tc).mockResolvedValueOnce(updated);

      const result = await service.update(ID_1, { city: 'Lviv' });
      expect(repo.update).toHaveBeenCalledWith(ID_1, { city: 'Lviv' });
      expect(result.city).toBe('Lviv');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(ID_NOT_FOUND, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes existing training center', async () => {
      repo.findOne.mockResolvedValue(makeTrainingCenter());

      await service.remove(ID_1);
      expect(repo.delete).toHaveBeenCalledWith(ID_1);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(ID_NOT_FOUND)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

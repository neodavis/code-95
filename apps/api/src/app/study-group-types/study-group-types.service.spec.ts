import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StudyGroupTypesService } from './study-group-types.service';
import { StudyGroupType } from './entities/study-group-type.entity';
import { createMockRepository } from '../../test-helpers/mock-repository';
import { makeStudyGroupType } from '../../test-helpers/fixtures';

const ID_1 = '550e8400-e29b-41d4-a716-446655440001';
const ID_NOT_FOUND = '550e8400-e29b-41d4-a716-446655440099';

describe('StudyGroupTypesService', () => {
  let service: StudyGroupTypesService;
  let repo: ReturnType<typeof createMockRepository<StudyGroupType>>;

  beforeEach(async () => {
    repo = createMockRepository<StudyGroupType>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyGroupTypesService,
        { provide: getRepositoryToken(StudyGroupType), useValue: repo },
      ],
    }).compile();

    service = module.get<StudyGroupTypesService>(StudyGroupTypesService);
  });

  describe('findOne', () => {
    it('returns study group type when found', async () => {
      const sgt = makeStudyGroupType();
      repo.findOne.mockResolvedValue(sgt);

      const result = await service.findOne(ID_1);
      expect(result).toBe(sgt);
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findOne(ID_NOT_FOUND)).toBeNull();
    });
  });

  describe('create', () => {
    it('creates study group type', async () => {
      const sgt = makeStudyGroupType();
      repo.create.mockReturnValue(sgt);
      repo.save.mockResolvedValue(sgt);

      const result = await service.create({ name: 'Test Type' });
      expect(result).toBe(sgt);
      expect(repo.create).toHaveBeenCalledWith({ name: 'Test Type' });
    });
  });

  describe('update', () => {
    it('updates study group type name', async () => {
      const sgt = makeStudyGroupType();
      const updated = makeStudyGroupType({ name: 'Updated' });
      repo.findOne.mockResolvedValueOnce(sgt).mockResolvedValueOnce(updated);

      const result = await service.update(ID_1, { name: 'Updated' });
      expect(repo.update).toHaveBeenCalledWith(ID_1, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(ID_NOT_FOUND, { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes existing study group type', async () => {
      repo.findOne.mockResolvedValue(makeStudyGroupType());

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

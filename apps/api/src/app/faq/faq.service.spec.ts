import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FaqService } from './faq.service';
import { Faq } from './entities/faq.entity';
import { AuditService } from '../audit/audit.service';
import { createMockRepository } from '../../test-helpers/mock-repository';
import { makeFaq } from '../../test-helpers/fixtures';

const ID_1 = '550e8400-e29b-41d4-a716-446655440001';
const ID_NOT_FOUND = '550e8400-e29b-41d4-a716-446655440099';

describe('FaqService', () => {
  let service: FaqService;
  let repo: ReturnType<typeof createMockRepository<Faq>>;

  beforeEach(async () => {
    repo = createMockRepository<Faq>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqService,
        { provide: getRepositoryToken(Faq), useValue: repo },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<FaqService>(FaqService);
  });

  describe('findOne', () => {
    it('returns faq when found', async () => {
      const faq = makeFaq();
      repo.findOne.mockResolvedValue(faq);

      const result = await service.findOne(ID_1);
      expect(result).toBe(faq);
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findOne(ID_NOT_FOUND)).toBeNull();
    });
  });

  describe('create', () => {
    it('creates and saves faq', async () => {
      const faq = makeFaq();
      repo.create.mockReturnValue(faq);
      repo.save.mockResolvedValue(faq);

      const result = await service.create({
        question: 'Test?',
        answer: 'Answer.',
      });

      expect(result).toBe(faq);
      expect(repo.create).toHaveBeenCalledWith({
        question: 'Test?',
        answer: 'Answer.',
        isPublished: false,
      });
    });

    it('respects isPublished flag', async () => {
      const faq = makeFaq({ isPublished: true });
      repo.create.mockReturnValue(faq);
      repo.save.mockResolvedValue(faq);

      await service.create({
        question: 'Q',
        answer: 'A',
        isPublished: true,
      });

      expect(repo.create).toHaveBeenCalledWith({
        question: 'Q',
        answer: 'A',
        isPublished: true,
      });
    });
  });

  describe('update', () => {
    it('updates faq fields', async () => {
      const faq = makeFaq();
      const updated = makeFaq({ question: 'Updated?' });
      repo.findOne.mockResolvedValueOnce(faq).mockResolvedValueOnce(updated);

      const result = await service.update(ID_1, { question: 'Updated?' });
      expect(repo.update).toHaveBeenCalledWith(ID_1, { question: 'Updated?' });
      expect(result.question).toBe('Updated?');
    });

    it('throws NotFoundException when faq does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(ID_NOT_FOUND, { question: 'Updated?' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes existing faq', async () => {
      repo.findOne.mockResolvedValue(makeFaq());

      await service.remove(ID_1);
      expect(repo.delete).toHaveBeenCalledWith(ID_1);
    });

    it('throws NotFoundException when faq does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(ID_NOT_FOUND)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

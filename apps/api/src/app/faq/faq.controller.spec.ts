import { type INestApplication } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import { createTestApp } from '../../test-helpers/create-test-app';
import { makeFaq } from '../../test-helpers/fixtures';

describe('FaqController (integration)', () => {
  let app: INestApplication;
  let faqService: jest.Mocked<Partial<FaqService>>;

  beforeAll(async () => {
    faqService = {
      findAll: jest.fn(),
      findAllPublished: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    app = await createTestApp({
      controllers: [FaqController],
      providers: [{ provide: FaqService, useValue: faqService }],
      guards: [
        { guard: JwtAuthGuard, useValue: { canActivate: () => true } },
        { guard: StaffGuard, useValue: { canActivate: () => true } },
        { guard: ThrottlerGuard, useValue: { canActivate: () => true } },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/faq/public', () => {
    it('returns published FAQs (no auth)', async () => {
      faqService.findAllPublished.mockResolvedValue({
        results: [makeFaq()],
        count: 1,
        page: 1,
        totalPages: 1,
        next: null,
        previous: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/faq/public')
        .expect(200);

      expect(res.body.results).toHaveLength(1);
    });
  });

  describe('POST /api/v1/faq', () => {
    it('creates FAQ with valid data', async () => {
      faqService.create.mockResolvedValue(makeFaq());

      const res = await request(app.getHttpServer())
        .post('/api/v1/faq')
        .send({ question: 'What?', answer: 'Something.' })
        .expect(201);

      expect(res.body.question).toBe('Test question?');
    });

    it('returns 400 when question is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/faq')
        .send({ answer: 'Something.' })
        .expect(400);

      expect(res.body.fields.question).toBeDefined();
    });

    it('returns 400 when answer is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/faq')
        .send({ question: 'What?' })
        .expect(400);

      expect(res.body.fields.answer).toBeDefined();
    });
  });

  describe('DELETE /api/v1/faq/:id', () => {
    it('returns 204 on success', async () => {
      faqService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/api/v1/faq/550e8400-e29b-41d4-a716-446655440001')
        .expect(204);
    });
  });
});

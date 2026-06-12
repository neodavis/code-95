import { type INestApplication } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import { createTestApp } from '../../test-helpers/create-test-app';
import { makeArticle } from '../../test-helpers/fixtures';

describe('ArticlesController (integration)', () => {
  let app: INestApplication;
  let articlesService: jest.Mocked<Partial<ArticlesService>>;

  beforeAll(async () => {
    articlesService = {
      findAll: jest.fn(),
      findAllPublished: jest.fn(),
      findOneBySlug: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    app = await createTestApp({
      controllers: [ArticlesController],
      providers: [{ provide: ArticlesService, useValue: articlesService }],
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

  describe('GET /api/v1/articles/public', () => {
    it('returns published articles (no auth required)', async () => {
      articlesService.findAllPublished.mockResolvedValue({
        results: [makeArticle()],
        count: 1,
        page: 1,
        totalPages: 1,
        next: null,
        previous: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/articles/public')
        .expect(200);

      expect(res.body.results).toHaveLength(1);
    });

    it('passes pagination params to service', async () => {
      articlesService.findAllPublished.mockResolvedValue({
        results: [],
        count: 0,
        page: 2,
        totalPages: 1,
        next: null,
        previous: null,
      });

      await request(app.getHttpServer())
        .get('/api/v1/articles/public?page=2&pageSize=5')
        .expect(200);

      expect(articlesService.findAllPublished).toHaveBeenCalledWith(
        2,
        5,
        null,
        '',
      );
    });
  });

  describe('GET /api/v1/articles/public/:slug', () => {
    it('returns article by slug', async () => {
      const article = makeArticle({ slug: 'test-slug' });
      articlesService.findOneBySlug.mockResolvedValue(article);

      const res = await request(app.getHttpServer())
        .get('/api/v1/articles/public/test-slug')
        .expect(200);

      expect(res.body.slug).toBe('test-slug');
    });
  });

  describe('POST /api/v1/articles', () => {
    it('creates article with valid data', async () => {
      articlesService.create.mockResolvedValue(makeArticle());

      const res = await request(app.getHttpServer())
        .post('/api/v1/articles')
        .send({ title: 'Test', author: 'Author', shortly: 'Short' })
        .expect(201);

      expect(res.body.title).toBe('Test Article');
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/articles')
        .send({})
        .expect(400);

      expect(res.body.fields.title).toBeDefined();
      expect(res.body.fields.author).toBeDefined();
      expect(res.body.fields.shortly).toBeDefined();
    });
  });

  describe('DELETE /api/v1/articles/:id', () => {
    it('returns 204 on success', async () => {
      articlesService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/api/v1/articles/550e8400-e29b-41d4-a716-446655440001')
        .expect(204);
    });
  });
});

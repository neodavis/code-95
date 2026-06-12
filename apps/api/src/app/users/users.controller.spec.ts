import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import { createTestApp } from '../../test-helpers/create-test-app';
import { makeUser } from '../../test-helpers/fixtures';

describe('UsersController (integration)', () => {
  let app: INestApplication;
  let usersService: jest.Mocked<Partial<UsersService>>;

  beforeAll(async () => {
    usersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    app = await createTestApp({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
      guards: [
        { guard: JwtAuthGuard, useValue: { canActivate: () => true } },
        { guard: StaffGuard, useValue: { canActivate: () => true } },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/users', () => {
    it('returns paginated users without password', async () => {
      const user = makeUser();
      usersService.findAll.mockResolvedValue({
        results: [user],
        count: 1,
        page: 1,
        totalPages: 1,
        next: null,
        previous: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(200);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].password).toBeUndefined();
      expect(res.body.results[0].uniqueCode).toBe('UC001');
    });
  });

  describe('POST /api/v1/users', () => {
    // Minimal required fields per Django parity (firstName, lastName, middleName, phone are mandatory).
    const validCreateBody = {
      uniqueCode: 'UC001',
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Smith',
      phone: '+380501234567',
    };

    it('creates user and returns without password', async () => {
      const user = makeUser();
      usersService.create.mockResolvedValue(user);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(validCreateBody)
        .expect(201);

      expect(res.body.password).toBeUndefined();
      expect(res.body.uniqueCode).toBe('UC001');
    });

    it('returns 400 for missing uniqueCode', async () => {
      const { uniqueCode: _, ...rest } = validCreateBody;
      void _;
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(rest)
        .expect(400);

      expect(res.body.fields.uniqueCode).toBeDefined();
    });

    it('returns 400 for short password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        .send({ ...validCreateBody, password: '12345' })
        .expect(400);

      expect(res.body.fields.password).toBeDefined();
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ ...validCreateBody, email: 'not-email' })
        .expect(400);

      expect(res.body.fields.email).toBeDefined();
    });

    it('returns 400 for missing required name fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          uniqueCode: 'UC001',
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords
          password: 'password123',
        })
        .expect(400);

      expect(res.body.fields.firstName).toBeDefined();
      expect(res.body.fields.lastName).toBeDefined();
      expect(res.body.fields.middleName).toBeDefined();
      expect(res.body.fields.phone).toBeDefined();
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('updates user fields', async () => {
      const user = makeUser({ firstName: 'Jane' });
      usersService.update.mockResolvedValue(user);

      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/550e8400-e29b-41d4-a716-446655440001')
        .send({ firstName: 'Jane' })
        .expect(200);

      expect(res.body.firstName).toBe('Jane');
      expect(res.body.password).toBeUndefined();
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('returns 204 on success', async () => {
      usersService.deactivate.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/api/v1/users/550e8400-e29b-41d4-a716-446655440001')
        .expect(204);
    });
  });
});

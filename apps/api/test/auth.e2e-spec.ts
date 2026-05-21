import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth & Multi-tenancy (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
  };

  let accessToken: string;

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .then((response) => {
        expect(response.body.access_token).toBeDefined();
      });
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200)
      .then((response) => {
        accessToken = response.body.access_token;
        expect(accessToken).toBeDefined();
      });
  });

  it('/organizations (POST) - Create Tenant', () => {
    return request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'My New Tenant', slug: `tenant-${Date.now()}` })
      .expect(201)
      .then((response) => {
        expect(response.body.name).toBe('My New Tenant');
      });
  });

  it('/organizations (POST) - Unauthorized if no token', () => {
    return request(app.getHttpServer())
      .post('/organizations')
      .send({ name: 'Fail', slug: 'fail' })
      .expect(401);
  });
});

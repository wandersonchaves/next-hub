import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';

jest.setTimeout(30000);

describe('Bull-Board Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerStorage).useValue(new ThrottlerStorageService())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/admin/queues (GET) should return 401 Unauthorized without Basic Auth header', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/queues')
      .send();

    expect(response.status).toBe(401);
  });
});

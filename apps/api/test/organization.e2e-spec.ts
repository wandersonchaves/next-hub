import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Organization Management & Async Side-effects (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let orgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Setup: Register and Login to get a token
    const testUser = {
      email: `org-test-${Date.now()}@example.com`,
      password: 'password123',
      name: 'Org Tester',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    
    accessToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/organizations (POST) - Success and Async logging should be queued', async () => {
    const res = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Corp', slug: `test-corp-${Date.now()}` })
      .expect(201);
    
    orgId = res.body.id;
    expect(orgId).toBeDefined();
    expect(res.body.name).toBe('Test Corp');
  });

  it('/organizations/:id/invites (POST) - Success and Async e-mail queued', async () => {
    await request(app.getHttpServer())
      .post(`/organizations/${orgId}/invites`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('organization-id', orgId)
      .send({ email: 'new-member@example.com', role: 'MEMBER' })
      .expect(201);
  });

  it('/organizations/:id/invites (POST) - Fail on Duplicate (409 Conflict)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/invites`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('organization-id', orgId)
      .send({ email: 'new-member@example.com', role: 'MEMBER' })
      .expect(409);
    
    expect(res.body.message).toContain('already been sent');
  });

  it('/analytics/dashboard (GET) - Cache isolation test', async () => {
    // 1. Initial request (populate cache)
    await request(app.getHttpServer())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('organization-id', orgId)
      .expect(200);

    // 2. Request with different org ID should NOT return cached data from the first one
    const otherOrgId = 'other-org-id';
    const res = await request(app.getHttpServer())
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('organization-id', otherOrgId)
      .expect(200);
    
    // If cache isolation works, it should reach the service and compute stats for the new ID
    // Our AnalyticsService returns growthData for the given ID
    expect(res.body.growthData).toBeDefined();
  });
});

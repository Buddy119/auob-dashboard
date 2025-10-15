import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import multipart from '@fastify/multipart';
import { AppModule } from '../src/app.module';

function sampleCollection() {
  return {
    info: {
      name: 'Run Demo',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      { name: 'Users', item: [
        { name: 'List', request: { method: 'GET', url: 'https://example.com/users' } },
        { name: 'One',  request: { method: 'GET', url: 'https://example.com/users/1' } }
      ]},
      { name: 'Orders', item: [
        { name: 'Create', request: { method: 'POST', url: 'https://example.com/orders' } }
      ]}
    ]
  };
}

async function pollRun(app: INestApplication, runId: string, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(app.getHttpServer()).get(`/api/runs/${runId}`);
    if (res.status === 200 && ['success', 'fail', 'partial', 'timeout', 'error', 'cancelled'].includes(res.body.status)) {
      if (res.body.status === 'success') return res.body;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('run did not finish in time');
}

describe('Runs (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await app.register(multipart as any);
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a run, processes it, and exposes summary & listing', async () => {
    // 1) Upload collection (auto-indexes from Task 3)
    const colJson = Buffer.from(JSON.stringify(sampleCollection()), 'utf8');
    const up = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', colJson, { filename: 'col.json', contentType: 'application/json' })
      .expect(201);
    const collectionId = up.body.collectionId;

    // 2) Start run
    const startRun = await request(app.getHttpServer())
      .post(`/api/collections/${collectionId}/run`)
      .send({})
      .expect(201);
    const runId = startRun.body.runId;

    // 3) Poll until success
    const run = await pollRun(app, runId);

    // 4) Assertions on summary
    expect(run.id).toBe(runId);
    expect(run.collectionId).toBe(collectionId);
    expect(run.status).toBe('success');
    expect(run.totalRequests).toBe(3);
    expect(run.successRequests).toBe(3);
    expect(run.failedRequests).toBe(0);
    expect(run.health).toBe('HEALTHY');
    expect(run.p95Ms).toBeGreaterThanOrEqual(0);
    expect(run.durationMs).toBeGreaterThan(0);

    // 5) List endpoint
    const list = await request(app.getHttpServer())
      .get('/api/runs')
      .query({ collectionId, limit: 10, offset: 0 })
      .expect(200);

    expect(list.body.total).toBeGreaterThanOrEqual(1);
    expect(list.body.items.find((r: any) => r.id === runId)).toBeTruthy();

    const stepsRes = await request(app.getHttpServer())
      .get(`/api/runs/${runId}/steps`)
      .query({ limit: 10, offset: 0 })
      .expect(200);

    expect(Array.isArray(stepsRes.body.items)).toBe(true);
    expect(stepsRes.body.items.length).toBeGreaterThan(0);

    const stepId = stepsRes.body.items[0].id;
    expect(stepId).toBeTruthy();

    const stepDetail = await request(app.getHttpServer())
      .get(`/api/runs/${runId}/steps/${stepId}`)
      .expect(200);

    expect(stepDetail.body.id).toBe(stepId);
    expect(stepDetail.body.runId).toBe(runId);
    expect(stepDetail.body.response).toBeDefined();
    if (stepDetail.body.response) {
      expect(stepDetail.body.response).toHaveProperty('status');
      expect(stepDetail.body.response).toHaveProperty('headers');
      expect(stepDetail.body.response).toHaveProperty('truncated');
    }

    const fullResponse = await request(app.getHttpServer())
      .get(`/api/runs/${runId}/steps/${stepId}/response`)
      .expect(200);

    expect(fullResponse.body.id).toBe(stepId);
    expect(fullResponse.body.runId).toBe(runId);
    if (fullResponse.body.response) {
      expect(fullResponse.body.response).toHaveProperty('bodyEncoding');
    }

    await request(app.getHttpServer())
      .get(`/api/runs/${runId}/steps/does-not-exist`)
      .expect(404)
      .expect(res => {
        expect(res.body.message).toBe('Step not found in run');
      });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import multipart from '@fastify/multipart';
import { AppModule } from '../src/app.module';

function makeCollection() {
  return {
    info: {
      name: 'CancelTimeout Demo',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      {
        name: 'Slow',
        item: [
          {
            name: 'Slow A',
            request: { method: 'GET', url: '{{baseUrl}}/slow/a' },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: ["pm.test('200',()=>pm.response.to.have.status(200));"],
                },
              },
            ],
          },
          {
            name: 'Slow B',
            request: { method: 'GET', url: '{{baseUrl}}/slow/b' },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: ["pm.test('200',()=>pm.response.to.have.status(200));"],
                },
              },
            ],
          },
          {
            name: 'Slow C',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/slow/c',
              body: { mode: 'raw', raw: '{}' },
              header: [{ key: 'Content-Type', value: 'application/json' }],
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: ["pm.test('201',()=>pm.response.to.have.status(201));"],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeEnv(baseUrl: string) {
  return {
    name: 'ct-env',
    values: [{ key: 'baseUrl', value: baseUrl, type: 'text', enabled: true }],
  };
}

function startMockServer(delayMs = 300): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const respond = (code: number, body: any) => {
        setTimeout(() => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        }, delayMs);
      };
      if (req.method === 'GET' && req.url === '/slow/a') return respond(200, { a: 1 });
      if (req.method === 'GET' && req.url === '/slow/b') return respond(200, { b: 2 });
      if (req.method === 'POST' && req.url === '/slow/c') {
        let buf = '';
        req.on('data', (c) => (buf += c));
        req.on('end', () => respond(201, { ok: true }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false }));
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function pollRun(app: INestApplication, runId: string, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(app.getHttpServer()).get(`/api/runs/${runId}`).expect(200);
    if (['success', 'partial', 'fail', 'timeout', 'error', 'cancelled'].includes(res.body.status))
      return res.body;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('run did not finish in time');
}

describe('Cancel & Timeout (e2e)', () => {
  let app: NestFastifyApplication;
  let mock: { server: http.Server; baseUrl: string };

  beforeAll(async () => {
    mock = await startMockServer(200);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    // register multipart parser as in bootstrap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await app.register(multipart as any);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    mock.server.close();
  });

  it('maps RunStep.requestId to indexed CollectionRequest', async () => {
    const col = makeCollection();
    const env = makeEnv(mock.baseUrl);

    const up = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', Buffer.from(JSON.stringify(col)), {
        filename: 'col.json',
        contentType: 'application/json',
      })
      .attach('env', Buffer.from(JSON.stringify(env)), {
        filename: 'env.json',
        contentType: 'application/json',
      })
      .expect(201);
    const collectionId = up.body.collectionId;

    const start = await request(app.getHttpServer())
      .post(`/api/collections/${collectionId}/run`)
      .send({ delayRequestMs: 10, environmentId: (await request(app.getHttpServer()).get(`/api/collections/${collectionId}`)).body.envs[0].id })
      .expect(201);

    const runId = start.body.runId;
    const finished = await pollRun(app, runId);
    expect(finished.status).toBe('success');

    const steps = await request(app.getHttpServer()).get(`/api/runs/${runId}/steps`).expect(200);
    expect(steps.body.total).toBe(3);
    for (const s of steps.body.items) {
      expect(s.requestId).toBeTruthy();
      expect(s.request?.path).toMatch(/Slow (A|B|C)$/);
    }
  });

  it('cancels a running run', async () => {
    const col = makeCollection();
    const env = makeEnv(mock.baseUrl);
    const up = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', Buffer.from(JSON.stringify(col)), {
        filename: 'col.json',
        contentType: 'application/json',
      })
      .attach('env', Buffer.from(JSON.stringify(env)), {
        filename: 'env.json',
        contentType: 'application/json',
      })
      .expect(201);
    const collectionId = up.body.collectionId;
    const envId = (
      await request(app.getHttpServer()).get(`/api/collections/${collectionId}`)
    ).body.envs[0].id;

    const start = await request(app.getHttpServer())
      .post(`/api/collections/${collectionId}/run`)
      .send({ environmentId: envId, delayRequestMs: 100 })
      .expect(201);
    const runId = start.body.runId;

    await new Promise(r => setTimeout(r, 50));
    await request(app.getHttpServer()).post(`/api/runs/${runId}/cancel`).expect(201);

    const finished = await pollRun(app, runId);
    expect(finished.status).toBe('cancelled');
    await request(app.getHttpServer()).get(`/api/runs/${runId}/steps`).expect(200);
  });

  it('times out a run with maxDurationMs', async () => {
    const col = makeCollection();
    const env = makeEnv(mock.baseUrl);
    const up = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', Buffer.from(JSON.stringify(col)), {
        filename: 'col.json',
        contentType: 'application/json',
      })
      .attach('env', Buffer.from(JSON.stringify(env)), {
        filename: 'env.json',
        contentType: 'application/json',
      })
      .expect(201);
    const collectionId = up.body.collectionId;
    const envId = (
      await request(app.getHttpServer()).get(`/api/collections/${collectionId}`)
    ).body.envs[0].id;

    const start = await request(app.getHttpServer())
      .post(`/api/collections/${collectionId}/run`)
      .send({ environmentId: envId, maxDurationMs: 50, delayRequestMs: 100 })
      .expect(201);
    const runId = start.body.runId;

    const finished = await pollRun(app, runId);
    expect(finished.status).toBe('timeout');
    await request(app.getHttpServer()).get(`/api/runs/${runId}/steps`).expect(200);
  });
});


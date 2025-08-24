import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import http from 'node:http';
import multipart from '@fastify/multipart';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

function makeCollection() {
  return {
    info: {
      name: 'Newman Demo',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      { name: 'Users', item: [
        {
          name: 'List Users',
          request: { method: 'GET', url: '{{baseUrl}}/users' },
          event: [{
            listen: 'test',
            script: { type: 'text/javascript', exec: [
              "pm.test('status 200', function(){ pm.response.to.have.status(200); });",
              "pm.test('has ok true', function(){ pm.expect(pm.response.json().ok).to.eql(true); });"
            ] }
          }]
        },
        {
          name: 'Get User',
          request: { method: 'GET', url: '{{baseUrl}}/users/1' },
          event: [{
            listen: 'test',
            script: { type: 'text/javascript', exec: [
              "pm.test('status 200', function(){ pm.response.to.have.status(200); });"
            ] }
          }]
        }
      ]},
      {
        name: 'Orders',
        item: [{
          name: 'Create Order',
          request: {
            method: 'POST',
            url: '{{baseUrl}}/orders',
            body: { mode: 'raw', raw: JSON.stringify({ item: 'X' }) },
            header: [{ key: 'Content-Type', value: 'application/json' }]
          },
          event: [{
            listen: 'test',
            script: { type: 'text/javascript', exec: [
              "pm.test('status 201', function(){ pm.response.to.have.status(201); });"
            ] }
          }]
        }]
      }
    ]
  };
}

function makeEnv(baseUrl: string) {
  return {
    name: 'test-env',
    values: [{ key: 'baseUrl', value: baseUrl, type: 'text', enabled: true }]
  };
}

function startMockServer(): Promise<{ server: http.Server, baseUrl: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'GET' && req.url === '/users') {
        res.writeHead(200); res.end(JSON.stringify({ ok: true, users: [1,2,3] }));
      } else if (req.method === 'GET' && req.url === '/users/1') {
        res.writeHead(200); res.end(JSON.stringify({ ok: true, id: 1 }));
      } else if (req.method === 'POST' && req.url === '/orders') {
        let buf = ''; req.on('data', c => buf += c); req.on('end', () => {
          res.writeHead(201); res.end(JSON.stringify({ ok: true, orderId: 42 }));
        });
      } else {
        res.writeHead(404); res.end(JSON.stringify({ ok: false }));
      }
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
    if (['success','partial','fail','timeout','error','cancelled'].includes(res.body.status)) {
      if (res.body.status === 'success') return res.body;
      else throw new Error(`run ended with status ${res.body.status}`);
    }
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('run did not finish in time');
}

describe('Newman Runner (e2e)', () => {
  let app: NestFastifyApplication;
  let mock: { server: http.Server, baseUrl: string };

  beforeAll(async () => {
    mock = await startMockServer();

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().register(multipart as any);
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    mock.server.close();
  });

  it('executes collection via newman, records steps and assertions', async () => {
    // 1) upload collection+env
    const colBuf = Buffer.from(JSON.stringify(makeCollection()), 'utf8');
    const envBuf = Buffer.from(JSON.stringify(makeEnv(mock.baseUrl)), 'utf8');

    const up = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', colBuf, { filename: 'col.json', contentType: 'application/json' })
      .attach('env', envBuf, { filename: 'env.json', contentType: 'application/json' })
      .expect(201);

    const collectionId = up.body.collectionId;

    // get env id
    const col = await request(app.getHttpServer())
      .get(`/api/collections/${collectionId}`)
      .expect(200);
    const envId = col.body.envs[0].id;

    // 2) start run with small per-request delay
    const start = await request(app.getHttpServer())
      .post(`/api/collections/${collectionId}/run`)
      .send({ environmentId: envId, delayRequestMs: 15 })
      .expect(201);
    const runId = start.body.runId;

    // 3) wait for completion
    const run = await pollRun(app, runId);

    expect(run.status).toBe('success');
    expect(run.totalRequests).toBe(3);
    expect(run.successRequests).toBe(3);
    expect(run.failedRequests).toBe(0);
    expect(run.health).toBe('HEALTHY');

    // 4) fetch steps
    const steps = await request(app.getHttpServer())
      .get(`/api/runs/${runId}/steps`)
      .expect(200);
    expect(steps.body.total).toBe(3);
    steps.body.items.forEach((s: any) => {
      expect(['success'].includes(s.status)).toBe(true);
      expect([200, 201]).toContain(s.httpStatus);
    });

    // 5) fetch assertions (at least 3 total)
    const assertions = await request(app.getHttpServer())
      .get(`/api/runs/${runId}/assertions`)
      .expect(200);
    expect(assertions.body.total).toBeGreaterThanOrEqual(3);
    const names = assertions.body.items.map((a: any) => a.name);
    expect(names).toEqual(expect.arrayContaining(['status 200', 'status 201']));
  });
});

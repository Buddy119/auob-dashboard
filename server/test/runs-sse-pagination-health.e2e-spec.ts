import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { EventSource } from 'eventsource';
import multipart from '@fastify/multipart';

// ----- Helpers -----
function startMockServer(delayMs = 50): Promise<{ server: http.Server, baseUrl: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const respond = (code: number, body: any) => {
        setTimeout(() => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        }, delayMs);
      };
      if (req.method === 'GET' && req.url === '/users') return respond(200, { ok: true, users: [1,2,3] });
      if (req.method === 'GET' && req.url === '/users/1') return respond(200, { ok: true, id: 1 });
      if (req.method === 'POST' && req.url === '/orders') {
        let buf = ''; req.on('data', c => buf += c); req.on('end', () => respond(201, { ok: true, orderId: 42 }));
        return;
      }
      // endpoint to keep failing at 200 while test expects 201 (for health weighting test)
      if (req.method === 'GET' && req.url === '/bad') return respond(200, { ok: true });
      res.statusCode = 404; res.end(JSON.stringify({ ok: false }));
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function makeSSECollection() {
  return {
    info: { name: 'SSE Demo', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [
      { name: 'Users', item: [
        {
          name: 'List Users',
          request: { method: 'GET', url: '{{baseUrl}}/users' },
          event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
            "pm.test('status 200', () => pm.response.to.have.status(200));",
            "pm.test('has ok true', () => pm.expect(pm.response.json().ok).to.eql(true));",
          ]}}]
        },
        {
          name: 'Get User',
          request: { method: 'GET', url: '{{baseUrl}}/users/1' },
          event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
            "pm.test('status 200', () => pm.response.to.have.status(200));",
          ]}}]
        }
      ]},
      {
        name: 'Orders',
        item: [{
          name: 'Create Order',
          request: { method: 'POST', url: '{{baseUrl}}/orders', body: { mode: 'raw', raw: JSON.stringify({ item: 'X' }) }, header: [{key:'Content-Type', value:'application/json'}] },
          event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
            "pm.test('status 201', () => pm.response.to.have.status(201));",
          ]}}]
        }]
      }
    ]
  };
}

function makeEnv(baseUrl: string) {
  return { name: 'sse-env', values: [{ key: 'baseUrl', value: baseUrl, type: 'text', enabled: true }] };
}

function makeHealthCollection() {
  // two requests: OK (200 expect 200) and Bad (200 expect 201 => fail)
  return {
    info: { name: 'Health Demo', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [
      { name: 'Group', item: [
        {
          name: 'OK',
          request: { method: 'GET', url: '{{baseUrl}}/users' },
          event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
            "pm.test('200', () => pm.response.to.have.status(200));"
          ]}}]
        },
        {
          name: 'Bad',
          request: { method: 'GET', url: '{{baseUrl}}/bad' },
          event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
            "pm.test('201', () => pm.response.to.have.status(201));" // will fail
          ]}}]
        }
      ]}
    ]
  };
}

// ----- Tests -----
describe('SSE + Pagination + Critical Health (e2e)', () => {
  let app: NestFastifyApplication;
  let mock: { server: http.Server, baseUrl: string };
  let appUrl: string;

  beforeAll(async () => {
    mock = await startMockServer(30);

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.getHttpAdapter().getInstance().register(multipart as any);

    // Listen on ephemeral port so EventSource can connect
    await app.listen(0, '127.0.0.1');
    const addr = (app.getHttpAdapter().getInstance().server.address() as AddressInfo);
    appUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await app.close();
    mock.server.close();
  });

  it('streams rich SSE events and supports pagination', async () => {
    const col = makeSSECollection();
    const env = makeEnv(mock.baseUrl);

    // upload + env
    const up = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', Buffer.from(JSON.stringify(col)), { filename: 'col.json', contentType: 'application/json' })
      .attach('env', Buffer.from(JSON.stringify(env)), { filename: 'env.json', contentType: 'application/json' })
      .expect(201);
    const collectionId = up.body.collectionId;

    // start run with small delay to allow SSE capture
    const envId = (await request(app.getHttpServer()).get(`/api/collections/${collectionId}`)).body.envs[0].id;
    const start = await request(app.getHttpServer())
      .post(`/api/collections/${collectionId}/run`)
      .send({ environmentId: envId, delayRequestMs: 10 })
      .expect(201);
    const runId = start.body.runId;

    // SSE capture
    const es = new EventSource(`${appUrl}/api/runs/${runId}/stream`);
    const events: any = { started: false, steps: [], assertions: [], finished: null };

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('SSE timeout')), 8000);

      es.addEventListener('run_started', () => { events.started = true; });
      es.addEventListener('step_progress', (e: any) => {
        const data = JSON.parse(e.data);
        events.steps.push(data);
      });
      es.addEventListener('assertion_result', (e: any) => {
        const data = JSON.parse(e.data);
        events.assertions.push(data);
      });
      es.addEventListener('run_finished', (e: any) => {
        clearTimeout(timer);
        events.finished = JSON.parse(e.data);
        es.close();
        resolve();
      });
      es.onerror = (err: any) => { clearTimeout(timer); es.close(); reject(err); };
    });

    // Validate events
    expect(events.started).toBe(true);
    expect(events.steps.length).toBe(3);
    for (const s of events.steps) {
      expect(s.step.requestId).toBeTruthy();
      expect(typeof s.step.httpStatus).toBe('number');
      expect(typeof s.step.latencyMs === 'number' || s.step.latencyMs === null).toBe(true);
      expect(typeof s.step.requestPath).toBe('string');
    }
    expect(events.assertions.length).toBeGreaterThanOrEqual(3);
    expect(events.finished.summary.status).toBeDefined();

    // Pagination: steps
    const page1 = await request(app.getHttpServer()).get(`/api/runs/${runId}/steps`).query({ limit: 2, offset: 0 }).expect(200);
    expect(page1.body.total).toBe(3);
    expect(page1.body.items.length).toBe(2);

    const page2 = await request(app.getHttpServer()).get(`/api/runs/${runId}/steps`).query({ limit: 2, offset: 2 }).expect(200);
    expect(page2.body.items.length).toBe(1);

    // Filter by requestId
    const firstReqId = page1.body.items[0].requestId;
    const filtered = await request(app.getHttpServer()).get(`/api/runs/${runId}/steps`).query({ requestId: firstReqId }).expect(200);
    expect(filtered.body.total).toBe(1);

    // Pagination: assertions
    const assertsAll = await request(app.getHttpServer()).get(`/api/runs/${runId}/assertions`).expect(200);
    expect(assertsAll.body.total).toBeGreaterThanOrEqual(3);
    const stepId = page1.body.items[0].id;
    const assertsStep = await request(app.getHttpServer()).get(`/api/runs/${runId}/assertions`).query({ stepId }).expect(200);
    expect(assertsStep.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('applies critical-weighted health scoring', async () => {
    const col = makeHealthCollection();
    const env = makeEnv(mock.baseUrl);

    // upload + index
    const up = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', Buffer.from(JSON.stringify(col)), { filename: 'col.json', contentType: 'application/json' })
      .attach('env', Buffer.from(JSON.stringify(env)), { filename: 'env.json', contentType: 'application/json' })
      .expect(201);
    const collectionId = up.body.collectionId;
    const envId = (await request(app.getHttpServer()).get(`/api/collections/${collectionId}`)).body.envs[0].id;

    // run 1: before marking critical → should be DEGRADED (has a failure)
    const r1 = await request(app.getHttpServer()).post(`/api/collections/${collectionId}/run`).send({ environmentId: envId }).expect(201);
    const runId1 = r1.body.runId;

    const finished1 = await (async () => {
      const start = Date.now();
      while (Date.now() - start < 8000) {
        const res = await request(app.getHttpServer()).get(`/api/runs/${runId1}`).expect(200);
        if (['success','partial','fail','timeout','error','cancelled'].includes(res.body.status)) return res.body;
        await new Promise(r => setTimeout(r, 50));
      }
      throw new Error('run1 timeout');
    })();
    expect(finished1.status).toBe('partial');
    expect(finished1.health).toBe('DEGRADED');

    // mark "Bad" request as critical
    const colDetail = await request(app.getHttpServer()).get(`/api/collections/${collectionId}`).query({ withRequests: 'true' }).expect(200);
    const badReq = colDetail.body.requests.find((r: any) => r.path.endsWith('/Bad'));
    expect(badReq).toBeTruthy();

    await request(app.getHttpServer())
      .patch(`/api/collections/${collectionId}/requests/${badReq.id}`)
      .send({ isCritical: true })
      .expect(200);

    // run 2: now critical failure ⇒ UNHEALTHY
    const r2 = await request(app.getHttpServer()).post(`/api/collections/${collectionId}/run`).send({ environmentId: envId }).expect(201);
    const runId2 = r2.body.runId;

    const finished2 = await (async () => {
      const start = Date.now();
      while (Date.now() - start < 8000) {
        const res = await request(app.getHttpServer()).get(`/api/runs/${runId2}`).expect(200);
        if (['success','partial','fail','timeout','error','cancelled'].includes(res.body.status)) return res.body;
        await new Promise(r => setTimeout(r, 50));
      }
      throw new Error('run2 timeout');
    })();

    expect(finished2.status).toBe('partial');
    expect(finished2.failedRequests).toBeGreaterThanOrEqual(1);
    expect(finished2.health).toBe('UNHEALTHY');
  });
});

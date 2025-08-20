import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import multipart from '@fastify/multipart';
import { AppModule } from '../src/app.module';

function makeSampleCollection() {
  return {
    info: {
      name: 'Demo Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'Users',
        item: [
          { name: 'List Users', request: { method: 'GET', url: 'https://example.com/users' } },
          { name: 'Get User', request: { method: 'GET', url: { raw: 'https://example.com/users/1', host: ['example','com'], path: ['users','1'] } } }
        ]
      },
      {
        name: 'Orders',
        item: [
          { name: 'Create Order', request: { method: 'POST', url: 'https://example.com/orders' } }
        ]
      }
    ]
  };
}

describe('Collections indexing (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await app.register(multipart as any);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads collection and auto-indexes requests', async () => {
    const colJson = Buffer.from(JSON.stringify(makeSampleCollection()), 'utf8');

    const uploadRes = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', colJson, { filename: 'col.json', contentType: 'application/json' })
      .expect(201);

    expect(uploadRes.body.collectionId).toBeDefined();
    const id = uploadRes.body.collectionId;

    const getRes = await request(app.getHttpServer())
      .get(`/api/collections/${id}`)
      .query({ withRequests: 'true' })
      .expect(200);

    expect(getRes.body.id).toBe(id);
    expect(getRes.body._count.requests).toBe(3);
    expect(getRes.body.requests.length).toBe(3);

    const names = getRes.body.requests.map((r: any) => r.path);
    expect(names).toEqual(expect.arrayContaining([
      'Users/List Users',
      'Users/Get User',
      'Orders/Create Order'
    ]));

    const methods = getRes.body.requests.map((r: any) => r.method);
    expect(methods).toEqual(expect.arrayContaining(['GET', 'POST']));
  });

  it('reindexes without duplicating (replace=true default)', async () => {
    const colJson = Buffer.from(JSON.stringify(makeSampleCollection()), 'utf8');

    const uploadRes = await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', colJson, { filename: 'col.json', contentType: 'application/json' });

    const id = uploadRes.body.collectionId;

    const res1 = await request(app.getHttpServer())
      .get(`/api/collections/${id}`)
      .query({ withRequests: 'true' });
    expect(res1.body._count.requests).toBe(3);

    const reindexRes = await request(app.getHttpServer())
      .post(`/api/collections/${id}/reindex`)
      .expect(201);
    expect(reindexRes.body.inserted).toBe(3);

    const res2 = await request(app.getHttpServer())
      .get(`/api/collections/${id}`)
      .query({ withRequests: 'true' });
    expect(res2.body._count.requests).toBe(3);
    expect(res2.body.requests.length).toBe(3);
  });

  it('fails on invalid JSON upload', async () => {
    const bad = Buffer.from('{not json}', 'utf8');

    await request(app.getHttpServer())
      .post('/api/collections/upload')
      .attach('collection', bad, { filename: 'col.json', contentType: 'application/json' })
      .expect(400);
  });
});

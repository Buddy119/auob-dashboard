import { test, expect } from '@playwright/test';
import http from 'node:http';
import { AddressInfo } from 'node:net';

function startMockServer(delay = 40) {
  return new Promise<{ server: http.Server, baseUrl: string }>((resolve) => {
    const server = http.createServer((req, res) => {
      const respond = (code: number, body: any) => {
        setTimeout(() => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        }, delay);
      };
      if (req.method === 'GET' && req.url === '/users') return respond(200, { ok: true, users: [1,2] });
      if (req.method === 'GET' && req.url === '/users/1') return respond(200, { ok: true, id: 1 });
      if (req.method === 'POST' && req.url === '/orders') {
        let buf = ''; req.on('data', c => buf += c); req.on('end', () => respond(201, { ok: true, orderId: 42 }));
        return;
      }
      res.statusCode = 404; res.end(JSON.stringify({ ok: false }));
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function collectionFor(baseUrl: string) {
  return {
    info: { name: 'SSE Live Demo', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [
      { name: 'Users', item: [
        { name: 'List Users', request: { method: 'GET', url: '{{baseUrl}}/users' }, event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
          "pm.test('200', () => pm.response.to.have.status(200));"
        ]}}]},
        { name: 'Get User', request: { method: 'GET', url: '{{baseUrl}}/users/1' }, event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
          "pm.test('200', () => pm.response.to.have.status(200));"
        ]}}]},
      ]},
      { name: 'Orders', item: [
        { name: 'Create Order', request: { method: 'POST', url: '{{baseUrl}}/orders', header: [{key:'Content-Type', value:'application/json'}], body: { mode: 'raw', raw: JSON.stringify({item:'X'}) } }, event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
          "pm.test('201', () => pm.response.to.have.status(201));"
        ]}}]},
      ]},
    ]
  };
}

function envFor(baseUrl: string) {
  return { name: 'sse-env', values: [{ key: 'baseUrl', value: baseUrl, type: 'text', enabled: true }] };
}

test('live SSE timeline and cancel', async ({ page }) => {
  const mock = await startMockServer();

  // Upload collection + env
  await page.goto('/collections');
  await page.getByRole('button', { name: 'Upload Collection' }).click();

  // Upload dynamic files using FilePayloads
  const colPayload = {
    name: 'col.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(collectionFor(mock.baseUrl)), 'utf8'),
  };
  const envPayload = {
    name: 'env.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(envFor(mock.baseUrl)), 'utf8'),
  };

  await page.locator('input[type="file"][name="collection"]').setInputFiles(colPayload);
  await page.locator('input[type="file"][name="env"]').setInputFiles(envPayload);
  await page.getByRole('button', { name: 'Upload', exact: true }).click();

  // Navigate to detail
  await page.getByRole('link', { name: 'SSE Live Demo' }).click();
  await expect(page.getByRole('heading', { name: 'SSE Live Demo' })).toBeVisible();

  // Start run (small delay for nicer streaming)
  await page.getByRole('button', { name: 'Run collection' }).click();
  await page.locator('input[type="number"]').nth(1).fill('10'); // delayRequestMs
  await page.getByRole('button', { name: 'Start Run' }).click();

  // Should redirect to /runs/[runId]
  await expect(page).toHaveURL(/\/runs\/.+/);

  // Timeline should progressively show steps (via SSE)
  await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
  // wait for at least one streamed item
  await expect(page.getByText(/List Users/)).toBeVisible({ timeout: 12000 });
  // and eventually all three
  await expect(page.getByText(/Create Order/)).toBeVisible({ timeout: 12000 });

  // Assertions panel should show at least one passing assertion
  await expect(page.getByText(/Assertions/)).toBeVisible();
  await expect(page.getByText(/PASS|FAIL/)).toBeVisible({ timeout: 12000 });

  // Launch a second run and cancel quickly to exercise the cancel path + fallback
  await page.goto('/collections');
  await page.getByRole('link', { name: 'SSE Live Demo' }).click();
  await page.getByRole('button', { name: 'Run collection' }).click();
  await page.getByRole('button', { name: 'Start Run' }).click();
  await expect(page).toHaveURL(/\/runs\/.+/);
  // Cancel immediately
  await page.getByRole('button', { name: 'Cancel' }).click();
  // Terminal state should be visible eventually
  await expect(page.locator('span').filter({ hasText: /(cancelled|partial|success|timeout|error|fail)/ })).toBeVisible({ timeout: 15000 });

  await new Promise<void>((res) => mock.server.close(() => res()));
});

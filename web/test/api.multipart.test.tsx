import { api } from '@/lib/api';

describe('api.postMultipart', () => {
  const realFetch = global.fetch as any;

  afterEach(() => { global.fetch = realFetch; });

  it('does not set content-type and returns JSON', async () => {
    const fd = new FormData();
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ collectionId: 'col_123' }),
    });

    const resp = await api.postMultipart<{ collectionId: string }>(
      '/api/collections/upload',
      fd,
    );
    expect(resp.collectionId).toBe('col_123');

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/\/api\/collections\/upload$/);
    const init = call[1];
    expect(init.headers).toBeUndefined();
    expect(init.body).toBe(fd);
  });

  it('bubbles server errors', async () => {
    const fd = new FormData();
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () =>
        JSON.stringify({ statusCode: 400, message: 'invalid Postman collection schema' }),
    });
    await expect(api.postMultipart('/api/collections/upload', fd)).rejects.toMatchObject({
      status: 400,
    });
  });
});

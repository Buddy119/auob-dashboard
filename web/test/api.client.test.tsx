import { api } from '@/lib/api';

describe('api client', () => {
  const realFetch = global.fetch;

  afterEach(() => { global.fetch = realFetch as any; });

  it('throws typed error for non-2xx', async () => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ statusCode: 400, message: 'Invalid', path: '/x' }),
    });

    await expect(api.get('/x')).rejects.toMatchObject({ message: 'Invalid', status: 400 });
  });

  it('times out when exceeding timeout', async () => {
    // @ts-ignore
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
    await expect(api.get('/x', 5)).rejects.toMatchObject({ message: 'Request timeout', status: 408 });
  });
});

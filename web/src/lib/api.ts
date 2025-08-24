import { z } from 'zod';

const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

const errorZ = z.object({ statusCode: z.number().optional(), message: z.any(), path: z.string().optional() });

async function request<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  let id: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    id = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error('Request timeout'), { status: 408 }));
    }, timeoutMs);
  });
  const prefixed = path.startsWith('/api') || path.startsWith('/health') ? path : `/api${path}`;
  try {
    const res = (await Promise.race([
      fetch(`${base}${prefixed}`, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
        signal: controller.signal,
        cache: 'no-store',
      }),
      timeout,
    ])) as Response;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const parsed = errorZ.safeParse(data);
      const message = parsed.success ? parsed.data.message : res.statusText;
      throw Object.assign(
        new Error(typeof message === 'string' ? message : JSON.stringify(message)),
        { status: res.status, data },
      );
    }
    return data as T;
  } finally {
    clearTimeout(id!);
  }
}

export const api = {
  get: <T>(path: string, timeoutMs?: number) => request<T>(path, { method: 'GET' }, timeoutMs),
  post: <T>(path: string, body?: unknown, timeoutMs?: number) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, timeoutMs),
  patch: <T>(path: string, body?: unknown, timeoutMs?: number) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }, timeoutMs),
};

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
  TRACE: 'TRACE',
} as const;
export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod];

export type ParsedRequest = {
  name: string;
  method: HttpMethod;
  url: string;
  path: string; // folder path + request name, e.g., "Users/List Users"
};

type PostmanItem = {
  name?: string;
  item?: PostmanItem[];
  request?: {
    method?: string;
    url?: string | { raw?: string; host?: string[]; path?: (string|number)[]; query?: { key: string; value?: string }[] };
  };
};

type PostmanCollection = {
  info?: { name?: string };
  item?: PostmanItem[];
};

const METHOD_SET = new Set<string>(Object.values(HttpMethod));

function toEnumMethod(m?: string): HttpMethod | null {
  if (!m) return null;
  const up = m.toUpperCase();
  return METHOD_SET.has(up) ? (up as HttpMethod) : null;
}

function stringifyUrl(u: any): string {
  if (!u) return '';
  if (typeof u === 'string') return u;
  if (typeof u.raw === 'string' && u.raw.length) return u.raw;
  const host = Array.isArray(u.host) ? u.host.join('.') : '';
  const path = Array.isArray(u.path) ? '/' + u.path.join('/').replace(/\/+/g, '/') : '';
  const qs = Array.isArray(u.query) && u.query.length
    ? '?' + u.query.map((q: any) => `${q.key}=${q.value ?? ''}`).join('&')
    : '';
  return (host ? `https://${host}` : '') + path + qs;
}

function walk(items: PostmanItem[] | undefined, parentPath: string[], out: ParsedRequest[]) {
  if (!items) return;
  for (const it of items) {
    const currentPath = it?.name ? [...parentPath, it.name] : parentPath;
    if (it?.item && Array.isArray(it.item)) {
      walk(it.item, currentPath, out);
      continue;
    }
    if (it?.request) {
      const m = toEnumMethod(it.request.method);
      if (!m) continue; // skip unsupported methods
      const url = stringifyUrl((it.request as any).url);
      const name = it.name ?? `${m} ${url}`;
      const path = currentPath.join('/');
      out.push({ name, method: m, url, path });
    }
  }
}

export function parseCollectionRequests(json: PostmanCollection): ParsedRequest[] {
  const out: ParsedRequest[] = [];
  walk(json.item ?? [], [], out);
  // de-dup by path (keep first)
  const seen = new Set<string>();
  return out.filter(r => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });
}


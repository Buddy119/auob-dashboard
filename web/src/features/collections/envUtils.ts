'use client';

export function toAbsoluteUri(fileUri: string): string | null {
  if (!fileUri) return null;
  if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) return fileUri;
  if (fileUri.startsWith('/')) {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    return base.replace(/\/$/, '') + fileUri;
  }
  return null; // not fetchable from the browser
}

/** Minimal Postman env parser: { name, values: [{key,value,enabled}] } */
export type ParsedEnvVar = { key: string; value: string; enabled: boolean };
export function parsePostmanEnv(json: any): ParsedEnvVar[] {
  try {
    const vals = Array.isArray(json?.values) ? json.values : [];
    return vals
      .map((v: any) => ({
        key: String(v?.key ?? ''),
        value: String(v?.value ?? ''),
        enabled: !!(v?.enabled ?? true),
      }))
      .filter((x: ParsedEnvVar) => !!x.key);
  } catch {
    return [];
  }
}


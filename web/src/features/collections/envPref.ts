'use client';

const KEY = 'env-pref:';

export function getPreferredEnvId(collectionId: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const v = localStorage.getItem(KEY + collectionId);
    return v || undefined;
  } catch {
    return undefined;
  }
}

export function setPreferredEnvId(collectionId: string, envId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY + collectionId, envId);
  } catch {}
}

export function clearPreferredEnvId(collectionId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY + collectionId);
  } catch {}
}


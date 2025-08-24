export type HealthResponse = { status: string; time: string; env: string; uptimeMs: number };
export type ApiError = { status: number; message: string; path?: string };

import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  get() {
    return {
      status: 'ok',
      uptimeMs: Date.now() - this.startedAt,
      time: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'development',
    };
  }
}

// src/common/logging/logger.ts
import { LoggerService } from '@nestjs/common';
import pino from 'pino';

export function createLogger(nodeEnv: string): LoggerService {
  const isDev = nodeEnv !== 'production';
  const base = pino(
    isDev
      ? {
        transport: { target: 'pino-pretty', options: { translateTime: 'SYS:standard' } },
        level: 'debug',
      }
      : { level: 'info' },
  );

  return {
    log: base.info.bind(base),
    error: base.error.bind(base),
    warn: base.warn.bind(base),
    debug: base.debug.bind(base),
    verbose: base.trace.bind(base), // or base.debug in dev
  };
}

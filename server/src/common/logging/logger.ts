import pino from 'pino';

export function createLogger(nodeEnv: string) {
  const isDev = nodeEnv !== 'production';
  return pino(
    isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'SYS:standard' },
          },
          level: 'debug',
        }
      : { level: 'info' },
  );
}

import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  SWAGGER_TITLE: z.string().default('AUOB API'),
  SWAGGER_DESC: z.string().default('API for AUOB Health Dashboard'),
  SWAGGER_VERSION: z.string().default('0.0.1'),
});

export type Env = z.infer<typeof envSchema>;

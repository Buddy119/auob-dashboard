/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

// Minimal collection validator
export const PostmanCollectionZ = z.object({
  info: z.object({
    name: z.string(),
    schema: z.string().includes('postman.com/json/collection'),
    description: z.union([z.string(), z.object({ content: z.string() })]).optional(),
  }),
  item: z.array(z.any()).optional(), // detailed validation deferred to Task 3
});

export type PostmanCollection = z.infer<typeof PostmanCollectionZ>;

// Minimal env validator
export const PostmanEnvZ = z.object({
  name: z.string(),
  values: z.array(z.object({ key: z.string(), value: z.any() })).optional(),
});
export type PostmanEnv = z.infer<typeof PostmanEnvZ>;

export function extractCollectionMeta(pc: PostmanCollection) {
  const schema = pc.info.schema;
  const versionMatch = schema.match(/collection\/(v[\d.]+)/i);
  const version = versionMatch?.[1] ?? undefined;
  const desc =
    typeof pc.info.description === 'string'
      ? pc.info.description
      : (pc.info.description as any)?.content;
  return { name: pc.info.name, version, description: desc };
}

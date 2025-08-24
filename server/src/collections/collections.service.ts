import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE } from '../storage/storage.tokens';
import { IStorage } from '../storage/storage.interface';
import { Inject } from '@nestjs/common';
import { promises as fs } from 'fs';
import { parseCollectionRequests } from './postman-parser';
import { PostmanCollectionZ, extractCollectionMeta, PostmanEnvZ } from './postman.z';
import { randomUUID } from 'crypto';

type UploadPayload = {
  collectionBuffer: Buffer;
  collectionContentType?: string;
  envBuffer?: Buffer | null;
  envContentType?: string | null;
};

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: IStorage,
  ) {}

  /** Reads the persisted collection file and indexes its requests. */
  async indexRequests(collectionId: string, replace = false) {
    const col = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!col) throw new BadRequestException('collection not found');

    // Load JSON
    const p = this.storage.getPathFromUri(col.fileUri);
    const buf = await fs.readFile(p);
    let json: any;
    try {
      json = JSON.parse(buf.toString('utf8'));
    } catch {
      throw new BadRequestException('stored collection is not valid JSON');
    }

    // Parse requests
    const parsed = parseCollectionRequests(json);
    if (!parsed.length) {
      // allow empty collections, but still clear if replace=true
      if (replace) {
        await this.prisma.collectionRequest.deleteMany({ where: { collectionId } });
      }
      return { inserted: 0 };
    }

    // Prepare rows
    const rows = parsed.map((pr) => ({
      id: undefined as any,
      collectionId,
      name: pr.name,
      method: pr.method,
      url: pr.url,
      path: pr.path,
      isCritical: false,
    }));

    // Write in a tx
    await this.prisma.$transaction(async (tx) => {
      if (replace) {
        await tx.collectionRequest.deleteMany({ where: { collectionId } });
      }
      const chunk = 500;
      for (let i = 0; i < rows.length; i += chunk) {
        await tx.collectionRequest.createMany({
          data: rows.slice(i, i + chunk),
        });
      }
    });

    return { inserted: rows.length };
  }

  async upload({ collectionBuffer, collectionContentType, envBuffer, envContentType }: UploadPayload) {
    // Content-type & size checks
    if (!collectionBuffer?.length) throw new BadRequestException('collection file required');
    if (collectionContentType && !collectionContentType.includes('json')) {
      throw new BadRequestException('collection must be application/json');
    }
    if (envBuffer && envContentType && !envContentType.includes('json')) {
      throw new BadRequestException('env must be application/json');
    }

    // Parse & validate Postman collection
    let collectionJson: unknown;
    try {
      collectionJson = JSON.parse(collectionBuffer.toString('utf8'));
    } catch {
      throw new BadRequestException('collection is not valid JSON');
    }
    const parsed = PostmanCollectionZ.safeParse(collectionJson);
    if (!parsed.success) throw new BadRequestException('invalid Postman collection schema');

    // Extract meta
    const meta = extractCollectionMeta(parsed.data);

    // Persist files
    const colKey = `${randomUUID()}.collection.json`;
    const colUri = await this.storage.putObject({
      bucket: 'collections',
      key: colKey,
      body: collectionBuffer,
      contentType: 'application/json',
    });

    let envUri: string | undefined;
    let envName: string | undefined;

    if (envBuffer && envBuffer.length) {
      let envJson: unknown;
      try {
        envJson = JSON.parse(envBuffer.toString('utf8'));
      } catch {
        throw new BadRequestException('env is not valid JSON');
      }
      const envParsed = PostmanEnvZ.safeParse(envJson);
      if (!envParsed.success) throw new BadRequestException('invalid Postman env schema');
      envName = envParsed.data.name;
      const envKey = `${randomUUID()}.env.json`;
      envUri = await this.storage.putObject({
        bucket: 'envs',
        key: envKey,
        body: envBuffer,
        contentType: 'application/json',
      });
    }

    // Create DB rows (Collection + optional Env)
    const created = await this.prisma.collection.create({
      data: {
        name: meta.name,
        version: meta.version,
        description: meta.description,
        fileUri: colUri,
        envs: envUri
          ? {
              create: {
                name: envName ?? 'default',
                fileUri: envUri,
                isDefault: true,
              },
            }
          : undefined,
      },
      select: { id: true },
    });
    await this.indexRequests(created.id, true);
    return { collectionId: created.id };
  }

  async list(limit = 20, offset = 0, q?: string) {
    const where = q
      ? { name: { contains: q, mode: 'insensitive' as const } }
      : undefined;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.collection.count({ where }),
      this.prisma.collection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { envs: true, requests: true, runs: true } },
        },
      }),
    ]);
    return { total, items, limit, offset };
  }

  async get(id: string, withRequests = false, max = 500) {
    const col = await this.prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        version: true,
        description: true,
        fileUri: true,
        createdAt: true,
        updatedAt: true,
        envs: {
          select: {
            id: true,
            name: true,
            isDefault: true,
            fileUri: true,
            createdAt: true,
          },
        },
        _count: { select: { requests: true, runs: true } },
      },
    });
    if (!col) throw new BadRequestException('collection not found');

    if (!withRequests) return col;

    const requests = await this.prisma.collectionRequest.findMany({
      where: { collectionId: id },
      orderBy: [{ path: 'asc' }],
      take: Math.min(max, 2000),
      select: { id: true, name: true, method: true, url: true, path: true, isCritical: true },
    });

    return { ...col, requests };
  }
}

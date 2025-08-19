import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE } from '../storage/storage.tokens';
import { IStorage } from '../storage/storage.interface';
import { Inject } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PostmanCollectionZ, extractCollectionMeta, PostmanEnvZ } from './postman.z';

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
    const colKey = `${nanoid()}.collection.json`;
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
      const envKey = `${nanoid()}.env.json`;
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

  async get(id: string) {
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
    return col;
  }
}

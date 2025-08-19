import { Controller, Get, Post, Req, Query } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { FastifyRequest } from 'fastify';
import { ListCollectionsQueryDto } from './dto/list-collections.dto';
import type { Multipart } from '@fastify/multipart';

@Controller('api/collections')
export class CollectionsController {
  constructor(private readonly svc: CollectionsService) {}

  @Post('upload')
  async upload(@Req() req: FastifyRequest) {
    // Parse multipart: expecting 'collection' (required) and 'env' (optional)
    const maxMB = Number(process.env.MAX_UPLOAD_MB ?? 10);
    const maxBytes = maxMB * 1024 * 1024;

    const parts = req.parts();
    let colBuf: Buffer | undefined;
    let colType: string | undefined;
    let envBuf: Buffer | undefined;
    let envType: string | undefined;

    for await (const part of parts as AsyncIterableIterator<Multipart>) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        let total = 0;
        for await (const chunk of part.file) {
          total += (chunk as Buffer).length;
          if (total > maxBytes) throw new Error('file too large');
          chunks.push(chunk as Buffer);
        }
        const buf = Buffer.concat(chunks);
        if (part.fieldname === 'collection') {
          colBuf = buf;
          colType = part.mimetype;
        } else if (part.fieldname === 'env') {
          envBuf = buf;
          envType = part.mimetype;
        }
      }
    }

    const result = await this.svc.upload({
      collectionBuffer: colBuf!,
      collectionContentType: colType,
      envBuffer: envBuf,
      envContentType: envType,
    });

    return result; // { collectionId }
  }

  @Get()
  async list(@Query() q: ListCollectionsQueryDto) {
    return this.svc.list(q.limit, q.offset, q.q);
  }

  @Get(':id')
  async get(@Req() req: FastifyRequest) {
    const id = (req.params as { id: string }).id;
    return this.svc.get(id);
  }
}

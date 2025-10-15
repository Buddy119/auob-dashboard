import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Query,
  Param,
  Patch,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { FastifyRequest } from 'fastify';
import type { Multipart } from '@fastify/multipart';
import { UpdateRequestDto } from './dto/update-request.dto';

@Controller('collections')
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
  async list(
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Query('q') q?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    return this.svc.list(limit, offset, q);
  }

  @Get(':id')
  async get(
    @Req() req: FastifyRequest,
    @Query('withRequests', new DefaultValuePipe(false), ParseBoolPipe) withRequests: boolean,
    @Query('maxRequests') maxRequests?: string,
  ) {
    const id = (req.params as any).id;
    const max = maxRequests ? Math.max(1, Math.min(2000, parseInt(maxRequests, 10))) : 500;
    return this.svc.get(id, withRequests, max);
  }

  @Post(':id/reindex')
  async reindex(
    @Param('id') id: string,
    @Query('replace', new DefaultValuePipe(true), ParseBoolPipe) replace: boolean,
  ) {
    return this.svc.indexRequests(id, replace);
  }

  @Patch(':collectionId/requests/:requestId')
  async updateRequestCritical(
    @Param('collectionId') collectionId: string,
    @Param('requestId') requestId: string,
    @Body() body: UpdateRequestDto,
  ) {
    return this.svc.updateRequestCritical(collectionId, requestId, body.isCritical);
  }
}

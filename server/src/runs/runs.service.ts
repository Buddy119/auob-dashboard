import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRunDto } from './dto/create-run.dto';
import { RunsExecutor } from './runs.executor';
import { RunStatus } from '../prisma/enums';
import { ListRunStepsDto } from './dto/list-run-steps.dto';
import { ListAssertionsDto } from './dto/list-assertions.dto';

@Injectable()
export class RunsService {
  private static readonly RESPONSE_PREVIEW_CHAR_LIMIT = 256 * 1024; // 256KB
  private static readonly SENSITIVE_HEADER_KEYS = [
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
  ];

  constructor(private readonly prisma: PrismaService, private readonly executor: RunsExecutor) {}

  private parseHeaders(serialized?: string | null): Record<string, string> {
    if (!serialized) return {};
    try {
      const parsed = JSON.parse(serialized);
      if (parsed && typeof parsed === 'object') {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof v === 'string') {
            out[k] = v;
          } else if (v != null) {
            out[k] = String(v);
          }
        }
        return out;
      }
    } catch {
      // ignore parse failures and fall back to an empty map
    }
    return {};
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      if (
        RunsService.SENSITIVE_HEADER_KEYS.includes(lower) ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('api-key')
      ) {
        sanitized[key] = '<redacted>';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private headerValue(headers: Record<string, string>, key: string): string | undefined {
    const lower = key.toLowerCase();
    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() === lower) return value;
    }
    return undefined;
  }

  private buildStepResponse(step: any, opts: { full?: boolean } = {}) {
    const parsedHeaders = this.parseHeaders(step.responseHeaders);
    const hasStatus = step.responseStatus != null || step.httpStatus != null;
    const hasHeaders = Object.keys(parsedHeaders).length > 0;
    const bodyStr = typeof step.responseBody === 'string' ? step.responseBody : null;
    const hasBody = !!bodyStr && bodyStr.length > 0;
    if (!hasStatus && !hasHeaders && !hasBody) return null;

    const encoding = step.responseBodyEncoding === 'base64' ? 'base64' : 'utf8';
    const previewLimit = RunsService.RESPONSE_PREVIEW_CHAR_LIMIT;
    const preview = hasBody && encoding === 'utf8' ? bodyStr!.slice(0, previewLimit) : null;
    const truncated = Boolean(
      step.responseTruncated || (encoding === 'utf8' && hasBody && bodyStr!.length > previewLimit),
    );

    let computedSize: number | null = step.responseSize ?? null;
    if (computedSize == null && hasBody) {
      if (encoding === 'base64') {
        try {
          computedSize = Buffer.from(bodyStr!, 'base64').length;
        } catch {
          computedSize = null;
        }
      } else {
        computedSize = Buffer.byteLength(bodyStr!, 'utf8');
      }
    }

    const headers = this.sanitizeHeaders(parsedHeaders);
    const contentType = step.responseContentType ?? this.headerValue(parsedHeaders, 'content-type') ?? null;

    const payload: any = {
      status: step.responseStatus ?? step.httpStatus ?? null,
      statusText: step.responseStatusText ?? null,
      durationMs: step.latencyMs ?? null,
      headers,
      contentType,
      size: computedSize,
      truncated,
    };

    if (hasBody) {
      payload.bodyEncoding = encoding;
      if (encoding === 'utf8') {
        payload.bodyPreview = preview ?? '';
        if (opts.full) payload.body = bodyStr;
      } else if (opts.full) {
        payload.body = bodyStr;
      }
    }

    return payload;
  }

  async create(collectionId: string, dto: CreateRunDto) {
    const col = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!col) throw new BadRequestException('collection not found');

    const run = await this.prisma.run.create({
      data: {
        collectionId,
        environmentId: dto.environmentId ?? null,
        status: RunStatus.queued,
      },
      select: { id: true },
    });

    this.executor.enqueue(run.id, {
      timeoutRequestMs: dto.timeoutRequestMs,
      delayRequestMs: dto.delayRequestMs,
      bail: dto.bail,
      insecure: dto.insecure,
      maxDurationMs: dto.maxDurationMs,
    });
    return { runId: run.id };
  }

  async get(runId: string) {
    const run = await this.prisma.run.findUnique({ where: { id: runId } });
    if (!run) throw new BadRequestException('run not found');
    return run;
  }

  async list(args: { collectionId?: string; status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (args.collectionId) where.collectionId = args.collectionId;
    if (args.status) {
      const allowed = ['queued', 'running', 'success', 'fail', 'partial', 'timeout', 'error', 'cancelled'];
      if (!allowed.includes(args.status)) throw new BadRequestException('invalid status');
      where.status = args.status;
    }
    const limit = args.limit !== undefined ? Number(args.limit) : 20;
    const offset = args.offset !== undefined ? Number(args.offset) : 0;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.run.count({ where }),
      this.prisma.run.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);
    return { total, items, limit, offset };
  }

  async listSteps(runId: string, q: ListRunStepsDto) {
    const run = await this.prisma.run.findUnique({ where: { id: runId } });
    if (!run) throw new BadRequestException('run not found');

    const where: any = { runId };
    if (q.requestId) where.requestId = q.requestId;
    const limit = q.limit !== undefined ? Number(q.limit) : 20;
    const offset = q.offset !== undefined ? Number(q.offset) : 0;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.runStep.count({ where }),
      this.prisma.runStep.findMany({
        where,
        orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          status: true,
          httpStatus: true,
          latencyMs: true,
          responseSize: true,
          orderIndex: true,
          requestId: true,
          request: { select: { path: true } },
        },
      }),
    ]);

    return { total, items, limit, offset };
  }

  async getStep(runId: string, stepId: string) {
    const step = await this.prisma.runStep.findFirst({
      where: { id: stepId, runId },
      include: { assertions: { select: { id: true, name: true, status: true, errorMsg: true } } },
    });
    if (!step) throw new NotFoundException('Step not found in run');
    return {
      id: step.id,
      runId: step.runId,
      name: step.name,
      status: step.status,
      orderIndex: step.orderIndex,
      assertions: step.assertions.map((a) => ({
        id: a.id,
        stepId: step.id,
        name: a.name,
        status: a.status,
        errorMsg: a.errorMsg ?? null,
      })),
      response: this.buildStepResponse(step),
    };
  }

  async getStepResponse(runId: string, stepId: string) {
    const step = await this.prisma.runStep.findFirst({ where: { id: stepId, runId } });
    if (!step) throw new NotFoundException('Step not found in run');
    return {
      id: step.id,
      runId: step.runId,
      response: this.buildStepResponse(step, { full: true }),
    };
  }

  async getStepResponseBody(runId: string, stepId: string) {
    const step = await this.prisma.runStep.findFirst({
      where: { id: stepId, runId },
      select: {
        responseBody: true,
        responseBodyEncoding: true,
        responseContentType: true,
        responseTruncated: true,
      },
    });
    if (!step) throw new NotFoundException('Step not found in run');
    if (!step.responseBody) return null;
    const encoding = step.responseBodyEncoding === 'base64' ? 'base64' : 'utf8';
    const buffer = Buffer.from(step.responseBody, encoding);
    return {
      buffer,
      contentType: step.responseContentType ?? 'application/octet-stream',
      truncated: !!step.responseTruncated,
    };
  }

  async cancel(runId: string) {
    const run = await this.prisma.run.findUnique({ where: { id: runId } });
    if (!run) throw new BadRequestException('run not found');
    const res = await this.executor.cancel(runId);
    if (!res.ok) throw new BadRequestException('run not cancellable');
    return { status: 'cancel_requested', mode: res.mode };
  }

  async listAssertions(runId: string, q: ListAssertionsDto) {
    const run = await this.prisma.run.findUnique({ where: { id: runId } });
    if (!run) throw new BadRequestException('run not found');

    const where: any = q.stepId ? { runStepId: q.stepId } : { step: { runId } };
    const limit = q.limit !== undefined ? Number(q.limit) : 50;
    const offset = q.offset !== undefined ? Number(q.offset) : 0;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.runAssertion.count({ where }),
      this.prisma.runAssertion.findMany({
        where,
        orderBy: [{ id: 'asc' }],
        skip: offset,
        take: limit,
        select: { id: true, runStepId: true, name: true, status: true, errorMsg: true },
      }),
    ]);

    return { total, items, limit, offset };
  }
}

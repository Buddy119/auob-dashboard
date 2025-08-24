import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRunDto } from './dto/create-run.dto';
import { RunsExecutor } from './runs.executor';
import { RunStatus } from '../prisma/enums';
import { ListRunStepsDto } from './dto/list-run-steps.dto';
import { ListAssertionsDto } from './dto/list-assertions.dto';

@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService, private readonly executor: RunsExecutor) {}

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

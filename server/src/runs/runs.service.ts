import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRunDto } from './dto/create-run.dto';
import { RunsExecutor } from './runs.executor';

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
        status: 'queued',
      },
      select: { id: true },
    });

    this.executor.enqueue(run.id, {
      timeoutRequestMs: dto.timeoutRequestMs,
      delayRequestMs: dto.delayRequestMs,
      bail: dto.bail,
      insecure: dto.insecure,
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

  async listSteps(runId: string) {
    const run = await this.prisma.run.findUnique({ where: { id: runId } });
    if (!run) throw new BadRequestException('run not found');
    return this.prisma.runStep.findMany({
      where: { runId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, name: true, status: true, httpStatus: true, latencyMs: true, responseSize: true, orderIndex: true }
    });
  }

  async listAssertions(runId: string, stepId?: string) {
    const run = await this.prisma.run.findUnique({ where: { id: runId } });
    if (!run) throw new BadRequestException('run not found');
    return this.prisma.runAssertion.findMany({
      where: stepId ? { runStepId: stepId } : { step: { runId } },
      select: { id: true, runStepId: true, name: true, status: true, errorMsg: true }
    });
  }
}

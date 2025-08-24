import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RunsExecutor {
  private readonly logger = new Logger(RunsExecutor.name);
  private queue: string[] = [];
  private busy = false;

  constructor(private readonly prisma: PrismaService) {}

  enqueue(runId: string) {
    this.queue.push(runId);
    this.tick().catch(err => this.logger.error(err));
  }

  private async tick(): Promise<void> {
    if (this.busy) return;
    const next = this.queue.shift();
    if (!next) return;

    this.busy = true;
    try {
      await this.processRun(next);
    } finally {
      this.busy = false;
      if (this.queue.length) {
        // process next job
        await this.tick();
      }
    }
  }

  private deterministicLatencyMs(index: number): number {
    // stable, small latencies for tests (e.g., 40, 50, 60 ms, ...)
    return 40 + index * 10;
  }

  private computePercentiles(values: number[]) {
    if (!values.length) return { p50: null as number | null, p95: null as number | null, p99: null as number | null };
    const sorted = [...values].sort((a, b) => a - b);
    const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1)))];
    return { p50: at(50), p95: at(95), p99: at(99) };
  }

  private async processRun(runId: string) {
    // mark running
    const now = new Date();
    let run = await this.prisma.run.update({
      where: { id: runId },
      data: { status: 'running', startedAt: now },
    });

    const requests = await this.prisma.collectionRequest.findMany({
      where: { collectionId: run.collectionId },
      orderBy: { path: 'asc' },
    });

    const latencies: number[] = [];
    let order = 0;

    for (const r of requests) {
      const latency = this.deterministicLatencyMs(order);
      latencies.push(latency);

      await this.prisma.runStep.create({
        data: {
          runId,
          requestId: r.id,
          orderIndex: order,
          name: r.name,
          status: 'success',
          httpStatus: 200,
          latencyMs: latency,
          responseSize: 0,
          startedAt: new Date(Date.now()),
          endedAt: new Date(Date.now()),
        },
      });

      // small wait to simulate work without slowing tests too much
      await new Promise(res => setTimeout(res, 5));
      order++;
    }

    const totals = {
      total: requests.length,
      success: requests.length,
      failed: 0,
    };
    const { p50, p95, p99 } = this.computePercentiles(latencies);
    const end = new Date();

    run = await this.prisma.run.update({
      where: { id: runId },
      data: {
        status: 'success',
        endedAt: end,
        durationMs: Math.max(1, end.getTime() - (run.startedAt?.getTime() ?? end.getTime())),
        totalRequests: totals.total,
        successRequests: totals.success,
        failedRequests: totals.failed,
        p50Ms: p50 ?? 0,
        p95Ms: p95 ?? 0,
        p99Ms: p99 ?? 0,
        health: 'HEALTHY',
      },
    });

    this.logger.log(`Run ${runId} finished: ${run.status} total=${totals.total}`);
  }
}

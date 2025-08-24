import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NewmanRunner } from '../runner/newman-runner';
import { RunStatus, HealthStatus } from '../prisma/enums';

type EnqueueOpts = {
  timeoutRequestMs?: number;
  delayRequestMs?: number;
  bail?: boolean;
  insecure?: boolean;
  maxDurationMs?: number;
};

@Injectable()
export class RunsExecutor {
  private readonly logger = new Logger(RunsExecutor.name);
  private queue: { runId: string; opts: EnqueueOpts }[] = [];
  private busy = false;
  private current: { runId: string; opts: EnqueueOpts } | null = null;

  constructor(private readonly prisma: PrismaService, private readonly newman: NewmanRunner) {}

  enqueue(runId: string, opts: EnqueueOpts = {}) {
    this.queue.push({ runId, opts });
    this.tick().catch(err => this.logger.error(err));
  }

  async cancel(runId: string) {
    if (this.current?.runId === runId) {
      this.newman.cancel(runId, 'cancel');
      return { ok: true, mode: 'running' };
    }
    const idx = this.queue.findIndex(q => q.runId === runId);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      const now = new Date();
      await this.prisma.run.update({
        where: { id: runId },
        data: {
          status: RunStatus.cancelled,
          endedAt: now,
          durationMs: 0,
          totalRequests: 0,
          successRequests: 0,
          failedRequests: 0,
          health: HealthStatus.UNKNOWN,
          errorMsg: 'run cancelled (not started)',
        },
      });
      return { ok: true, mode: 'queued' };
    }
    return { ok: false };
  }

  private async tick(): Promise<void> {
    if (this.busy) return;
    const next = this.queue.shift();
    if (!next) return;
    this.busy = true;
    this.current = next;
    try {
      await this.newman.run(next.runId, next.opts);
    } finally {
      this.current = null;
      this.busy = false;
      if (this.queue.length) await this.tick();
    }
  }
}

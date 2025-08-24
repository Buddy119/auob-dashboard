import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NewmanRunner } from '../runner/newman-runner';

type EnqueueOpts = {
  timeoutRequestMs?: number;
  delayRequestMs?: number;
  bail?: boolean;
  insecure?: boolean;
};

@Injectable()
export class RunsExecutor {
  private readonly logger = new Logger(RunsExecutor.name);
  private queue: { runId: string; opts: EnqueueOpts }[] = [];
  private busy = false;

  constructor(private readonly prisma: PrismaService, private readonly newman: NewmanRunner) {}

  enqueue(runId: string, opts: EnqueueOpts = {}) {
    this.queue.push({ runId, opts });
    this.tick().catch(err => this.logger.error(err));
  }

  private async tick(): Promise<void> {
    if (this.busy) return;
    const next = this.queue.shift();
    if (!next) return;
    this.busy = true;
    try {
      await this.newman.run(next.runId, next.opts);
    } finally {
      this.busy = false;
      if (this.queue.length) await this.tick();
    }
  }
}

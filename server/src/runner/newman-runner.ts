import { Injectable, Inject } from '@nestjs/common';
import newman from 'newman';
import fs from 'fs-extra';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../realtime/events.service';
import { IStorage } from '../storage/storage.interface';
import { STORAGE } from '../storage/storage.tokens';
import { randomUUID } from 'node:crypto';

type RunnerOpts = {
  timeoutRequestMs?: number;
  delayRequestMs?: number;
  bail?: boolean;
  insecure?: boolean;
};

@Injectable()
export class NewmanRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    @Inject(STORAGE) private readonly storage: IStorage,
  ) {}

  private async loadJsonFromUri(uri?: string | null): Promise<any | null> {
    if (!uri) return null;
    const p = this.storage.getPathFromUri(uri);
    const buf = await fs.readFile(p);
    return JSON.parse(buf.toString('utf8'));
  }

  private p(vals: number[]) {
    if (!vals.length) return { p50: 0, p95: 0, p99: 0 };
    const s = [...vals].sort((a,b)=>a-b);
    const at = (p: number) => s[Math.min(s.length - 1, Math.floor((p/100) * (s.length - 1)))];
    return { p50: at(50), p95: at(95), p99: at(99) };
  }

  async run(runId: string, opts: RunnerOpts = {}) {
    // Get run + collection + (optional) env
    const runRow = await this.prisma.run.findUnique({ where: { id: runId } });
    if (!runRow) throw new Error('run not found');

    const collection = await this.prisma.collection.findUnique({ where: { id: runRow.collectionId } });
    if (!collection) throw new Error('collection not found');

    const env = runRow.environmentId
      ? await this.prisma.collectionEnv.findUnique({ where: { id: runRow.environmentId } })
      : null;

    const collectionJson = await this.loadJsonFromUri(collection.fileUri);
    const envJson = await this.loadJsonFromUri(env?.fileUri ?? null);

    // Update run: running
    const startedAt = new Date();
    await this.prisma.run.update({
      where: { id: runId },
      data: { status: 'running', startedAt },
    });
    this.events.publish({ type: 'run_started', runId });

    // Metrics
    const latencies: number[] = [];
    let total = 0, failed = 0, success = 0;

    // Keep last created stepId for assertion mapping
    let lastStepId: string | null = null;

    // Prepare a temporary report (we store summary to storage later)
    let runSummary: any = null;

    await new Promise<void>((resolve, reject) => {
      newman.run(
        {
          collection: collectionJson,
          environment: envJson ?? undefined,
          reporters: [], // we'll store our own summary
          timeoutRequest: opts.timeoutRequestMs,
          delayRequest: opts.delayRequestMs,
          bail: opts.bail ? { folder: true } : undefined,
          insecure: !!opts.insecure,
        },
        (err, summary) => {
          runSummary = summary;
          if (err) reject(err);
        }
      )
      // request completes -> create RunStep
      .on('request', async (_err: any, args: any) => {
        try {
          const code = args?.response?.code ?? 0;
          const rt = args?.response?.responseTime ?? null;
          const rsize =
            (args?.response?.stream && args.response.stream.length) ??
            args?.response?.responseSize ?? null;

          const name = args?.item?.name ?? 'unnamed';
          const stepId = randomUUID();
          lastStepId = stepId;
          // Step defaults to success; assertions may downgrade it later
          const step = await this.prisma.runStep.create({
            data: {
              id: stepId,
              runId,
              name,
              orderIndex: total,
              status: 'success',
              httpStatus: code || null,
              latencyMs: typeof rt === 'number' ? rt : null,
              responseSize: typeof rsize === 'number' ? rsize : null,
              startedAt: new Date(),
              endedAt: new Date(),
            },
            select: { id: true, name: true, httpStatus: true, latencyMs: true, status: true }
          });
          total += 1;
          if (typeof rt === 'number') latencies.push(rt);

          this.events.publish({ type: 'step_progress', runId, step });
        } catch (e) {
          // swallow to keep run going; will be reflected in final status
        }
      })
      // assertion per test
      .on('assertion', async (err: any, args: any) => {
        if (!lastStepId) return;
        try {
          await this.prisma.runAssertion.create({
            data: {
              runStepId: lastStepId,
              name: args?.assertion ?? 'assertion',
              status: err ? 'fail' : 'pass',
              errorMsg: err?.message ?? null,
            },
          });

          // If assertion failed, mark step as failed
          if (err) {
            await this.prisma.runStep.update({
              where: { id: lastStepId },
              data: { status: 'fail' },
            });
          }

          this.events.publish({
            type: 'assertion_result',
            runId,
            stepId: lastStepId,
            assertion: { name: args?.assertion, status: err ? 'fail' : 'pass' }
          });
        } catch { /* no-op */ }
      })
      .on('done', async (err: any, summary: any) => {
        try {
          // Tally success/failed from steps in DB
          const steps = await this.prisma.runStep.findMany({ where: { runId }, select: { status: true } });
          failed = steps.filter(s => s.status !== 'success').length;
          success = steps.length - failed;

          const endedAt = new Date();
          const { p50, p95, p99 } = this.p(latencies);
          const status = err
            ? 'error'
            : failed === 0
              ? 'success'
              : 'partial';

          // Save summary JSON to storage
          const reportUri = await this.storage.putObject({
            bucket: 'reports',
            key: `${runId}.summary.json`,
            body: Buffer.from(JSON.stringify(summary ?? runSummary ?? {}, null, 2), 'utf8'),
            contentType: 'application/json',
          });

          const final = await this.prisma.run.update({
            where: { id: runId },
            data: {
              status,
              endedAt,
              durationMs: Math.max(1, endedAt.getTime() - startedAt.getTime()),
              totalRequests: total,
              successRequests: success,
              failedRequests: failed,
              p50Ms: p50, p95Ms: p95, p99Ms: p99,
              health: failed === 0 ? 'HEALTHY' : 'DEGRADED',
              errorMsg: err?.message ?? null,
              reportUri,
            },
          });

          this.events.publish({ type: 'run_finished', runId, summary: final });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}

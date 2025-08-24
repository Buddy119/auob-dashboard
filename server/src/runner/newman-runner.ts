import { Injectable, Inject } from '@nestjs/common';
import newman from 'newman';
import fs from 'fs-extra';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../realtime/events.service';
import { HealthStatus, RunStatus, StepStatus } from '../prisma/enums';
import { IStorage } from '../storage/storage.interface';
import { STORAGE } from '../storage/storage.tokens';

type RunnerOpts = {
  timeoutRequestMs?: number;
  delayRequestMs?: number;
  bail?: boolean;
  insecure?: boolean;
  maxDurationMs?: number;
};

type ActiveRun = {
  emitter: any;
  reason: 'cancel' | 'timeout' | null;
  timer?: NodeJS.Timeout;
  collectionId: string;
};

@Injectable()
export class NewmanRunner {
  private active = new Map<string, ActiveRun>();

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
    const s = [...vals].sort((a, b) => a - b);
    const at = (p: number) =>
      s[Math.min(s.length - 1, Math.floor((p / 100) * (s.length - 1)))];
    return { p50: at(50), p95: at(95), p99: at(99) };
  }

  // Compute "Folder1/Folder2/Request Name" (exclude collection root)
  private computePathFromItem(item: any): string {
    const reqName = item?.name ?? 'unnamed';
    const folders: string[] = [];
    let parent = item?.parent && item.parent ? item.parent() : null;
    // stop before collection root: parent.parent() exists for folders, null/undefined for root
    while (parent && typeof parent.parent === 'function' && parent.parent()) {
      if (typeof parent.name === 'string') folders.unshift(parent.name);
      parent = parent.parent();
    }
    return [...folders, reqName].join('/');
  }

  private async mapRequestId(collectionId: string, item: any): Promise<string | null> {
    const path = this.computePathFromItem(item);
    if (path) {
      const byPath = await this.prisma.collectionRequest.findFirst({
        where: { collectionId, path },
        select: { id: true },
      });
      if (byPath?.id) return byPath.id;
    }
    const name = item?.name;
    if (name) {
      const byName = await this.prisma.collectionRequest.findFirst({
        where: { collectionId, name },
        select: { id: true },
      });
      if (byName?.id) return byName.id;
    }
    return null;
  }

  // Public cancel
  cancel(runId: string, reason: 'cancel' | 'timeout' = 'cancel') {
    const entry = this.active.get(runId);
    if (!entry) return false;
    entry.reason = reason;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = undefined;
    }
    try {
      entry.emitter?.abort?.();
    } catch {}
    return true;
  }

  async run(runId: string, opts: RunnerOpts = {}) {
    const runRow = await this.prisma.run.findUnique({ where: { id: runId } });
    if (!runRow) throw new Error('run not found');

    const collection = await this.prisma.collection.findUnique({ where: { id: runRow.collectionId } });
    if (!collection) throw new Error('collection not found');

    const env = runRow.environmentId
      ? await this.prisma.collectionEnv.findUnique({ where: { id: runRow.environmentId } })
      : null;

    const collectionJson = await this.loadJsonFromUri(collection.fileUri);
    const envJson = await this.loadJsonFromUri(env?.fileUri ?? null);

    const startedAt = new Date();
    await this.prisma.run.update({
      where: { id: runId },
      data: { status: RunStatus.running, startedAt },
    });
    this.events.publish({ type: 'run_started', runId });

    const latencies: number[] = [];
    let total = 0;
    let failed = 0;
    let lastStepId: string | null = null;
    let lastStepPromise: Promise<any> | null = null;
    const pending: Promise<any>[] = [];

    await new Promise<void>((resolve, reject) => {
      const emitter = newman.run(
        {
          collection: collectionJson,
          environment: envJson ?? undefined,
          reporters: [],
          timeoutRequest: opts.timeoutRequestMs,
          delayRequest: opts.delayRequestMs,
          bail: opts.bail ? { folder: true } : undefined,
          insecure: !!opts.insecure,
        },
        (err, summary) => {
          // let 'done' handler finalize
        },
      );

      const entry: ActiveRun = { emitter, reason: null, collectionId: runRow.collectionId };
      if (opts.maxDurationMs) {
        entry.timer = setTimeout(() => this.cancel(runId, 'timeout'), opts.maxDurationMs);
      }
      this.active.set(runId, entry);

      emitter.on('request', (_err: any, args: any) => {
        const stepId = randomUUID();
        lastStepId = stepId;
        const p = (async () => {
          try {
            const pathStr = this.computePathFromItem(args?.item);
            let requestId: string | null = null;
            if (pathStr) {
              const reqRow = await this.prisma.collectionRequest.findFirst({
                where: { collectionId: runRow.collectionId, path: pathStr },
                select: { id: true },
              });
              requestId = reqRow?.id ?? null;
            }
            if (!requestId) {
              const nameLookup = args?.item?.name;
              if (nameLookup) {
                const byName = await this.prisma.collectionRequest.findFirst({
                  where: { collectionId: runRow.collectionId, name: nameLookup },
                  select: { id: true },
                });
                requestId = byName?.id ?? null;
              }
            }
            const code = args?.response?.code ?? null;
            const rt = typeof args?.response?.responseTime === 'number' ? args.response.responseTime : null;
            const rsize =
              (args?.response?.stream && args.response.stream.length) ??
              args?.response?.responseSize ??
              null;
            const name = args?.item?.name ?? 'unnamed';

            const step = await this.prisma.runStep.create({
              data: {
                id: stepId,
                runId,
                requestId,
                name,
                orderIndex: total,
                status: StepStatus.success,
                httpStatus: code,
                latencyMs: rt,
                responseSize: typeof rsize === 'number' ? rsize : null,
                startedAt: new Date(),
                endedAt: new Date(),
              },
              select: { id: true, name: true, httpStatus: true, latencyMs: true, status: true, requestId: true },
            });

            total += 1;
            if (typeof rt === 'number') latencies.push(rt);

            // publish with rich payload (include requestPath)
            this.events.publish({
              type: 'step_progress',
              runId,
              step: { ...step, requestPath: pathStr },
            });
          } catch {
            // no-op
          }
        })();
        lastStepPromise = p;
        pending.push(p);
      });

      emitter.on('assertion', (err: any, args: any) => {
        const p = (async () => {
          if (!lastStepId) return;
          if (lastStepPromise) {
            try { await lastStepPromise; } catch {}
          }
          try {
            await this.prisma.runAssertion.create({
              data: {
                runStepId: lastStepId,
                name: args?.assertion ?? 'assertion',
                status: err ? 'fail' : 'pass',
                errorMsg: err?.message ?? null,
              },
            });
            if (err) {
              await this.prisma.runStep.update({ where: { id: lastStepId }, data: { status: StepStatus.fail } });
            }
            this.events.publish({
              type: 'assertion_result',
              runId,
              stepId: lastStepId,
              assertion: { name: args?.assertion, status: err ? 'fail' : 'pass', errorMsg: err?.message ?? null },
            });
          } catch {
            /* no-op */
          }
        })();
        pending.push(p);
      });

      emitter.on('done', async (_err: any, summary: any) => {
        try {
          await Promise.allSettled(pending);
          const active = this.active.get(runId);
          if (active?.timer) clearTimeout(active.timer);
          this.active.delete(runId);

          const steps = await this.prisma.runStep.findMany({ where: { runId }, select: { status: true, requestId: true } });
          failed = steps.filter((s) => s.status !== StepStatus.success).length;
          const success = steps.length - failed;

          const endedAt = new Date();
          const { p50, p95, p99 } = this.p(latencies);

          const failedSteps = steps.filter((s) => s.status !== StepStatus.success);
          const failedReqIds = failedSteps.map((s) => s.requestId).filter((x): x is string => !!x);
          const criticalFailedCount = failedReqIds.length
            ? await this.prisma.collectionRequest.count({
                where: { id: { in: failedReqIds }, isCritical: true },
              })
            : 0;

          const slaMs = Number(process.env.HEALTH_P95_SLA_MS ?? 0) || undefined;

          let status: RunStatus;
          let health: HealthStatus;
          let errorMsg: string | null = null;
          if (active?.reason === 'timeout') {
            status = RunStatus.timeout;
            health = HealthStatus.UNHEALTHY;
            errorMsg = 'run timed out';
          } else if (active?.reason === 'cancel') {
            status = RunStatus.cancelled;
            health = HealthStatus.UNKNOWN;
            errorMsg = 'run cancelled';
          } else {
            status = failed === 0 ? RunStatus.success : RunStatus.partial;
            if (failed > 0) {
              health = criticalFailedCount > 0 ? HealthStatus.UNHEALTHY : HealthStatus.DEGRADED;
            } else {
              health = slaMs && p95 > slaMs ? HealthStatus.DEGRADED : HealthStatus.HEALTHY;
            }
          }

          const reportUri = await this.storage.putObject({
            bucket: 'reports',
            key: `${runId}.summary.json`,
            body: Buffer.from(JSON.stringify(summary ?? {}, null, 2), 'utf8'),
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
              p50Ms: p50,
              p95Ms: p95,
              p99Ms: p99,
              health,
              errorMsg,
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


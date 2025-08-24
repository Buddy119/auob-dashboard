import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type RunEvent =
  | { type: 'run_started'; runId: string }
  | { type: 'step_progress'; runId: string; step: any }
  | { type: 'assertion_result'; runId: string; stepId: string; assertion: any }
  | { type: 'run_finished'; runId: string; summary: any };

@Injectable()
export class EventsService {
  private ee = new EventEmitter();
  publish(ev: RunEvent) { this.ee.emit('run-event', ev); }
  on(fn: (ev: RunEvent) => void) { this.ee.on('run-event', fn); return () => this.ee.off('run-event', fn); }
}

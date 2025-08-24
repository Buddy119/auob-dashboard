import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { EventsService } from './events.service';
import { FastifyRequest, FastifyReply } from 'fastify';

@Controller('api/runs')
export class RealtimeController {
  constructor(private readonly events: EventsService) {}

  @Get(':runId/stream')
  async stream(@Param('runId') runId: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.flushHeaders?.();

    const send = (type: string, data: any) => {
      reply.raw.write(`event: ${type}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const off = this.events.on((ev) => {
      if ((ev as any).runId !== runId) return;
      if (ev.type === 'run_started') send('run_started', ev);
      else if (ev.type === 'step_progress') send('step_progress', ev);
      else if (ev.type === 'assertion_result') send('assertion_result', ev);
      else if (ev.type === 'run_finished') send('run_finished', ev);
    });

    req.raw.on('close', () => { off(); reply.raw.end(); });
  }
}

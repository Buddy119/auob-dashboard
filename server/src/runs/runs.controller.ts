import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { RunsService } from './runs.service';
import { CreateRunDto } from './dto/create-run.dto';
import { ListRunsQueryDto } from './dto/list-runs.dto';
import { ListRunStepsDto } from './dto/list-run-steps.dto';
import { ListAssertionsDto } from './dto/list-assertions.dto';
import type { FastifyReply } from 'fastify';

@Controller()
export class RunsController {
  constructor(private readonly svc: RunsService) {}

  @Post('api/collections/:collectionId/run')
  async create(@Param('collectionId') collectionId: string, @Body() dto: CreateRunDto) {
    return this.svc.create(collectionId, dto);
  }

  @Get('api/runs/:runId')
  async get(@Param('runId') runId: string) {
    return this.svc.get(runId);
  }

  @Post('api/runs/:runId/cancel')
  async cancel(@Param('runId') runId: string) {
    return this.svc.cancel(runId);
  }

  @Get('api/runs/:runId/steps')
  async steps(@Param('runId') runId: string, @Query() q: ListRunStepsDto) {
    return this.svc.listSteps(runId, q);
  }

  @Get('api/runs/:runId/steps/:stepId')
  async step(@Param('runId') runId: string, @Param('stepId') stepId: string) {
    return this.svc.getStep(runId, stepId);
  }

  @Get('api/runs/:runId/steps/:stepId/response')
  async stepResponse(@Param('runId') runId: string, @Param('stepId') stepId: string) {
    return this.svc.getStepResponse(runId, stepId);
  }

  @Get('api/runs/:runId/steps/:stepId/response/body')
  async stepResponseBody(
    @Param('runId') runId: string,
    @Param('stepId') stepId: string,
    @Res() reply: FastifyReply,
  ) {
    const payload = await this.svc.getStepResponseBody(runId, stepId);
    if (!payload) {
      return reply.status(404).send({ message: 'response body not available' });
    }
    reply.header('Content-Type', payload.contentType ?? 'application/octet-stream');
    reply.header('Content-Length', payload.buffer.length);
    reply.header('Content-Disposition', `attachment; filename="${stepId}-response"`);
    if (payload.truncated) reply.header('x-body-truncated', '1');
    return reply.send(payload.buffer);
  }

  @Get('api/runs/:runId/assertions')
  async assertions(@Param('runId') runId: string, @Query() q: ListAssertionsDto) {
    return this.svc.listAssertions(runId, q);
  }

  @Get('api/runs')
  async list(@Query() q: ListRunsQueryDto) {
    return this.svc.list(q);
  }
}

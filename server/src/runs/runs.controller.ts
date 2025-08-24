import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RunsService } from './runs.service';
import { CreateRunDto } from './dto/create-run.dto';
import { ListRunsQueryDto } from './dto/list-runs.dto';

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
  async steps(@Param('runId') runId: string) {
    return this.svc.listSteps(runId);
  }

  @Get('api/runs/:runId/assertions')
  async assertions(@Param('runId') runId: string, @Query('stepId') stepId?: string) {
    return this.svc.listAssertions(runId, stepId);
  }

  @Get('api/runs')
  async list(@Query() q: ListRunsQueryDto) {
    return this.svc.list(q);
  }
}

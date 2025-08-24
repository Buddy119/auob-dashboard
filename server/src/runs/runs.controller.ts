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

  @Get('api/runs')
  async list(@Query() q: ListRunsQueryDto) {
    return this.svc.list(q);
  }
}

import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RunsExecutor } from './runs.executor';
import { PrismaModule } from '../prisma/prisma.module';
import { RunnerModule } from '../runner/runner.module';

@Module({
  imports: [PrismaModule, RunnerModule],
  controllers: [RunsController],
  providers: [RunsService, RunsExecutor],
})
export class RunsModule {}

import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RunsExecutor } from './runs.executor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RunsController],
  providers: [RunsService, RunsExecutor],
})
export class RunsModule {}

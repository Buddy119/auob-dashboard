import { Module } from '@nestjs/common';
import { NewmanRunner } from './newman-runner';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, RealtimeModule, StorageModule],
  providers: [NewmanRunner],
  exports: [NewmanRunner],
})
export class RunnerModule {}

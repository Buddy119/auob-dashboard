import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { RealtimeController } from './realtime.controller';

@Module({
  providers: [EventsService],
  controllers: [RealtimeController],
  exports: [EventsService],
})
export class RealtimeModule {}

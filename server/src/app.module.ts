import { Module, Logger } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { ConfigService } from '@nestjs/config';
import { createLogger } from './common/logging/logger';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { CollectionsModule } from './collections/collections.module';
import { RunsModule } from './runs/runs.module';

@Module({
  imports: [AppConfigModule, PrismaModule, StorageModule, HealthModule, CollectionsModule, RunsModule],
  providers: [
    {
      provide: Logger,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createLogger(config.get<string>('NODE_ENV', 'development')),
    },
  ],
})
export class AppModule {}

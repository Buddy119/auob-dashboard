import { Module, Logger } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { ConfigService } from '@nestjs/config';
import { createLogger } from './common/logging/logger';

@Module({
  imports: [AppConfigModule, HealthModule],
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

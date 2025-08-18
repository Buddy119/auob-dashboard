import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { createLogger } from './common/logging/logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const adapter = new FastifyAdapter({ logger: false });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  // Logger
  const logger = createLogger(nodeEnv);
  app.useLogger(logger);

  // CORS
  app.enableCors({ origin: true, credentials: true });

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.get<string>('SWAGGER_TITLE'))
    .setDescription(config.get<string>('SWAGGER_DESC'))
    .setVersion(config.get<string>('SWAGGER_VERSION'))
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, doc);

  await app.listen(port, '0.0.0.0');
  logger.log({ port, nodeEnv }, 'Server started');
}
bootstrap();

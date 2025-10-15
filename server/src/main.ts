import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { createLogger } from './common/logging/logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const adapter = new FastifyAdapter({ logger: false });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(multipart as any, {
    limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024 },
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

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
  SwaggerModule.setup('docs', app, doc, { useGlobalPrefix: false });

  await app.listen(port, '0.0.0.0');
  logger.log({ port, nodeEnv }, 'Server started');
}
bootstrap();

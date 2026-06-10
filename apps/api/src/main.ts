// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: require('path').join(process.cwd(), '../../.env') });
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          process.env.NODE_ENV === 'production'
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
              ),
        ),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, { 
    logger,
    rawBody: true,
  });

  // ELEVAÇÃO DE BUFFER DE MEMÓRIA: Aceitar payloads densos de webhooks
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(helmet());
  app.enableCors();
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TenantInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Next Hub Public API')
    .setDescription('The public API for integrating with the Next Hub platform')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/api', app, document);

  const port = process.env.PORT || 3001;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`API is running on: http://localhost:${port} (Binding: ${host})`);
}
bootstrap();

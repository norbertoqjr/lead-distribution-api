import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Everything lives under /api except the root welcome route, so a bare host
  // hit during development answers instead of 404ing.
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  app.use(cookieParser());

  // whitelist strips unknown keys; forbidNonWhitelisted rejects them outright,
  // so a client cannot smuggle fields past a DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    credentials: true,
  });

  // Express only honours X-Forwarded-For when it trusts the proxy. Without
  // this every lead would record the proxy's IP instead of the visitor's.
  if (config.get<string>('TRUST_PROXY') === 'true') {
    const expressInstance = app.getHttpAdapter().getInstance() as Express;
    expressInstance.set('trust proxy', true);
  }

  const port = config.get<number>('PORT') ?? 8193;
  const host = config.get<string>('HOST') ?? '127.0.0.1';

  await app.listen(port, host);
  new Logger('Bootstrap').log(`API listening on http://${host}:${port}/api`);
}

void bootstrap();

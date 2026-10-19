import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json } from 'express';
import { map } from 'rxjs';
import { AppModule } from './app.module';
import { validateEnvironment } from './config/environment';
import { ApiExceptionFilter, serialize } from './common/http';
import { csrfProtection } from './common/security';

export async function createApp() {
  const config = validateEnvironment(process.env);
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: config.NODE_ENV === 'test' ? false : ['log', 'warn', 'error'],
  });
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(json({ limit: '256kb' }));
  app.use(cookieParser());
  app.enableCors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Nexus-CSRF'],
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.use(csrfProtection);
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors({ intercept: (_context, next) => next.handle().pipe(map(serialize)) });
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Nexus CRM API')
      .setDescription(
        'Tenant-scoped CRM. Sign in to set cookies. All mutations require X-Nexus-CSRF: 1. ADMIN manages team and organization; MANAGER manages CRM; SALES_REP edits assigned CRM records and deletes own tasks. Reports require ADMIN or MANAGER.',
      )
      .setVersion('1.0')
      .addCookieAuth('nexus_access')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Nexus-CSRF' }, 'csrf')
      .addSecurityRequirements('csrf')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: false },
  });
  return app;
}

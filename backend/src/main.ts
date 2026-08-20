import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

/**
 * In the default deployment the site and the API share one origin (nginx proxies
 * /api to this process), so no cross-origin request is ever made and no CORS
 * header is needed. CORS_ORIGIN is set only when the API lives on its own
 * domain, and is then an explicit allow-list.
 */
function parseOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN?.trim();

  if (!raw) return false;

  if (raw === '*') {
    if (process.env.NODE_ENV === 'production') {
      Logger.warn(
        'CORS_ORIGIN="*" allows any website to call this API. Set it to your site URL.',
        'Bootstrap',
      );
    }
    return true;
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Number of reverse proxies in front of this process. Trusting exactly the
  // right number of hops is what lets rate limiting see the real client IP and
  // media URLs use the public scheme, without a client being able to spoof
  // X-Forwarded-For. One hop is the bundled nginx; raise it if you add another
  // proxy (Traefik, Cloudflare, ...) in front.
  const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10);
  app.set('trust proxy', Number.isNaN(trustProxyHops) ? 1 : trustProxyHops);

  app.use(
    helmet({
      // Harmless on the default single-origin setup, and required when the API
      // is deployed on its own domain: without it the browser refuses to render
      // images served from a different origin than the page.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  const corsOrigin = parseOrigins();
  if (corsOrigin === false) {
    logger.log('CORS disabled: the API is expected to be served on the site origin.');
  } else {
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('LDS CMS API')
    .setDescription('API for the Louga Développement Solidaire website and admin')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`API listening on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap();

/**
 * Boots the Nest application with the database and object storage stubbed out and
 * prints every registered route. Used to verify DI wiring and the route table
 * without needing a live PostgreSQL/MinIO.
 */
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinioService } from '../src/common/minio.service';

const noop = async () => [];

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false })
    .then((a) => a)
    .catch((e) => {
      console.error('BOOT FAILED:', e);
      process.exit(1);
    });

  app.setGlobalPrefix('api/v1');
  await app.init();

  const server = app.getHttpAdapter().getInstance();
  const stack = server._router?.stack ?? server.router?.stack ?? [];

  const routes: string[] = [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase())
        .join(',');
      routes.push(`${methods.padEnd(6)} ${layer.route.path}`);
    }
  }

  routes.sort();
  console.log(routes.join('\n'));
  console.log(`\nTOTAL ROUTES: ${routes.length}`);
  await app.close();
}

// Stub the two external systems before the module graph is built.
PrismaService.prototype.onModuleInit = noop as any;
PrismaService.prototype.onModuleDestroy = noop as any;
MinioService.prototype.onModuleInit = noop as any;

main();

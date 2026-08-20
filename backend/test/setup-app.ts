import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MinioService } from './../src/common/minio.service';
import { createFakeMinio, createFakePrisma, SEED_PASSWORD, USERS } from './fake-prisma';

export interface TestContext {
  app: INestApplication;
  http: any;
  superAdminToken: string;
  superAdminRefresh: string;
  editorToken: string;
}

/**
 * Boots the real application (guards, pipes, interceptors, routing) with
 * in-memory stand-ins for PostgreSQL and MinIO, and signs in the two roles.
 * Login is rate limited, so tokens are minted once per suite and reused.
 */
export async function bootTestApp(): Promise<TestContext> {
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.PUBLIC_API_URL = 'http://api.test';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(createFakePrisma())
    .overrideProvider(MinioService)
    .useValue(createFakeMinio())
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.setGlobalPrefix('api/v1');
  await app.init();

  const http = app.getHttpServer();

  const superLogin = await request(http)
    .post('/api/v1/auth/login')
    .send({ email: USERS[0].email, password: SEED_PASSWORD });

  const editorLogin = await request(http)
    .post('/api/v1/auth/login')
    .send({ email: USERS[1].email, password: SEED_PASSWORD });

  return {
    app,
    http,
    superAdminToken: superLogin.body.access_token,
    superAdminRefresh: superLogin.body.refresh_token,
    editorToken: editorLogin.body.access_token,
  };
}

export const MEDIA_ID = '33333333-3333-4333-8333-333333333333';
export const MISSION_ID = '44444444-4444-4444-8444-444444444444';

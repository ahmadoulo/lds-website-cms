import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MinioService } from './../src/common/minio.service';
import { createFakeMinio, createFakePrisma, SEED_PASSWORD, USERS } from './fake-prisma';

/**
 * Exercises the real HTTP stack (guards, pipes, interceptors, routing) against
 * in-memory stand-ins for PostgreSQL and MinIO.
 */
describe('LDS API (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let superAdminToken: string;
  let superAdminRefresh: string;
  let editorToken: string;

  beforeAll(async () => {
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

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
    http = app.getHttpServer();

    // Login is rate limited to 5 attempts per minute, so sessions are established
    // once here and reused by every test below.
    const superLogin = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: USERS[0].email, password: SEED_PASSWORD });
    superAdminToken = superLogin.body.access_token;
    superAdminRefresh = superLogin.body.refresh_token;

    const editorLogin = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: USERS[1].email, password: SEED_PASSWORD });
    editorToken = editorLogin.body.access_token;

    expect(superAdminToken).toBeDefined();
    expect(editorToken).toBeDefined();
  });

  afterAll(async () => {
    await app?.close();
  });

  // ------------------------------------------------------------------- health

  it('answers the liveness probe', () =>
    request(http).get('/api/v1/health').expect(200).expect(({ body }) => {
      expect(body.status).toBe('ok');
    }));

  // --------------------------------------------------------------------- auth

  describe('authentication', () => {
    it('rejects a wrong password with 401 and no detail leak', async () => {
      const res = await request(http)
        .post('/api/v1/auth/login')
        .send({ email: USERS[0].email, password: 'wrong-password' })
        .expect(401);

      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('rejects an unknown account with the same 401', () =>
      request(http)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@lds.test', password: SEED_PASSWORD })
        .expect(401));

    it('rejects a malformed email before touching the database', () =>
      request(http)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: SEED_PASSWORD })
        .expect(400));

    it('issued an access and a refresh token on successful login', () => {
      expect(superAdminToken).toEqual(expect.any(String));
      expect(superAdminRefresh).toEqual(expect.any(String));
    });

    it('never exposes the password hash on /auth/me', async () => {
      const res = await request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.email).toBe(USERS[0].email);
    });

    it('refuses /auth/me without a token', () =>
      request(http).get('/api/v1/auth/me').expect(401));

    it('refuses a forged token', () =>
      request(http).get('/api/v1/auth/me').set('Authorization', 'Bearer not.a.jwt').expect(401));

    it('refuses to use a refresh token as an access token', () =>
      request(http)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${superAdminRefresh}`)
        .expect(401));

    it('exchanges a refresh token for a fresh session', async () => {
      const res = await request(http)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: superAdminRefresh })
        .expect(200);

      expect(res.body.access_token).toEqual(expect.any(String));
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejects a refresh token signed with the wrong secret', () =>
      request(http)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: `${superAdminRefresh}tampered` })
        .expect(401));
  });
});

import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MinioService } from './../src/common/minio.service';
import { createFakeMinio } from './fake-prisma';
import { ADMIN, SEED_PASSWORD, createStatefulPrisma } from './stateful-prisma';

/**
 * The draft layer is only useful if it is airtight: a visitor who guesses the
 * query parameter must keep seeing the published site.
 */
describe('Draft and preview (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'preview-access-secret';
    process.env.JWT_REFRESH_SECRET = 'preview-refresh-secret';
    process.env.PUBLIC_API_URL = 'http://api.test';

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(createStatefulPrisma())
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

    token = (
      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: ADMIN.email, password: SEED_PASSWORD })
    ).body.access_token;
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const NEW_EMAIL = 'brouillon@lougasolidaire.org';

  describe('settings are saved as a draft', () => {
    it('does not touch the public site when saved', async () => {
      const before = await request(http).get('/api/v1/public/settings').expect(200);
      const published = before.body.global_contact.email;

      await request(http)
        .patch('/api/v1/settings/global_contact')
        .set(auth())
        .send({ value: { email: NEW_EMAIL } })
        .expect(200);

      const after = await request(http).get('/api/v1/public/settings').expect(200);
      expect(after.body.global_contact.email).toBe(published);
      expect(after.body.global_contact.email).not.toBe(NEW_EMAIL);
    });

    it('reports the section as pending', async () => {
      const res = await request(http).get('/api/v1/settings/draft/status').set(auth()).expect(200);

      expect(res.body.hasUnpublishedChanges).toBe(true);
      expect(res.body.keys).toContain('global_contact');
      expect(res.body.sections.global_contact.hasDraft).toBe(true);
    });

    it('shows the draft back to the administration', async () => {
      const res = await request(http).get('/api/v1/settings/draft').set(auth()).expect(200);
      expect(res.body.global_contact.email).toBe(NEW_EMAIL);
    });

    it('refuses the draft listing to anonymous callers', () =>
      request(http).get('/api/v1/settings/draft').expect(401));
  });

  describe('preview', () => {
    it('ignores ?preview=true from an anonymous visitor', async () => {
      const res = await request(http).get('/api/v1/public/settings?preview=true').expect(200);

      expect(res.body.global_contact.email).not.toBe(NEW_EMAIL);
    });

    it('serves the draft to a signed-in editor', async () => {
      const res = await request(http)
        .get('/api/v1/public/settings?preview=true')
        .set(auth())
        .expect(200);

      expect(res.body.global_contact.email).toBe(NEW_EMAIL);
    });

    it('still serves the published site to an editor who did not ask for a preview', async () => {
      const res = await request(http).get('/api/v1/public/settings').set(auth()).expect(200);

      expect(res.body.global_contact.email).not.toBe(NEW_EMAIL);
    });

    it('flags the homepage payload as a preview', async () => {
      const preview = await request(http)
        .get('/api/v1/public/homepage?preview=true')
        .set(auth())
        .expect(200);
      expect(preview.body.isPreview).toBe(true);

      const normal = await request(http).get('/api/v1/public/homepage').expect(200);
      expect(normal.body.isPreview).toBe(false);
    });

    it('reveals unpublished list content only in preview', async () => {
      await request(http)
        .post('/api/v1/missions')
        .set(auth())
        .send({ title: { fr: 'Mission en brouillon' }, description: { fr: 'Pas encore en ligne' } })
        .expect(201);

      const publicList = await request(http).get('/api/v1/public/missions').expect(200);
      expect(publicList.body.some((m: any) => m.title.fr === 'Mission en brouillon')).toBe(false);

      const previewList = await request(http)
        .get('/api/v1/public/missions?preview=true')
        .set(auth())
        .expect(200);
      expect(previewList.body.some((m: any) => m.title.fr === 'Mission en brouillon')).toBe(true);
    });
  });

  describe('publishing', () => {
    it('puts the draft online', async () => {
      await request(http).post('/api/v1/settings/global_contact/publish').set(auth()).expect(201);

      const res = await request(http).get('/api/v1/public/settings').expect(200);
      expect(res.body.global_contact.email).toBe(NEW_EMAIL);
    });

    it('leaves nothing pending afterwards', async () => {
      const res = await request(http).get('/api/v1/settings/draft/status').set(auth()).expect(200);
      expect(res.body.sections.global_contact.hasDraft).toBe(false);
    });

    it('refuses to publish a section with no pending change', () =>
      request(http).post('/api/v1/settings/global_contact/publish').set(auth()).expect(400));

    it('discards a draft and keeps what is online', async () => {
      await request(http)
        .patch('/api/v1/settings/global_contact')
        .set(auth())
        .send({ value: { email: 'jete@lougasolidaire.org' } })
        .expect(200);

      await request(http).delete('/api/v1/settings/global_contact/draft').set(auth()).expect(200);

      const admin = await request(http).get('/api/v1/settings/draft').set(auth()).expect(200);
      expect(admin.body.global_contact.email).toBe(NEW_EMAIL);
    });

    it('keeps publishing restricted to administrators', () =>
      request(http).post('/api/v1/settings/global_contact/publish').expect(401));
  });
});

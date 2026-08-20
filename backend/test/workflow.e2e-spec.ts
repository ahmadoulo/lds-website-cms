import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MinioService } from './../src/common/minio.service';
import { createFakeMinio } from './fake-prisma';
import { ADMIN, SEED_PASSWORD, createStatefulPrisma } from './stateful-prisma';

/**
 * Follows content through the whole system: an administrator creates it, the
 * public API only exposes it once published, editing is persisted, and deleting
 * removes it from the site. Writes are stored in memory, so this exercises the
 * real controllers, services, guards and interceptors.
 */
describe('Content workflow (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let prisma: any;
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'workflow-access-secret';
    process.env.JWT_REFRESH_SECRET = 'workflow-refresh-secret';
    process.env.PUBLIC_API_URL = 'http://api.test';

    prisma = createStatefulPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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

    const login = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN.email, password: SEED_PASSWORD })
      .expect(200);

    token = login.body.access_token;
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  describe('an article, from the admin to the public site', () => {
    let articleId: string;
    let slug: string;

    it('creates it as a draft', async () => {
      const res = await request(http)
        .post('/api/v1/news')
        .set(auth())
        .send({
          title: { fr: 'Rétrospective 2026' },
          excerpt: { fr: 'Un résumé de nos actions.' },
          content: { fr: '<p>Contenu de la rétrospective.</p><script>alert(1)</script>' },
        })
        .expect(201);

      articleId = res.body.id;
      slug = res.body.slug;

      expect(slug).toBe('retrospective-2026');
      expect(res.body.isPublished).toBe(false);
      expect(res.body.publishedAt).toBeNull();
      // The body is sanitised on the way in, not on the way out.
      expect(res.body.content.fr).toBe('<p>Contenu de la rétrospective.</p>');
      // A category is assigned even though none was supplied.
      expect(res.body.categoryId).toEqual(expect.any(String));
    });

    it('keeps the draft off the public site', async () => {
      const list = await request(http).get('/api/v1/public/news').expect(200);
      expect(list.body.data).toHaveLength(0);

      await request(http).get(`/api/v1/public/news/${slug}`).expect(404);
    });

    it('shows the draft to the signed-in administrator', async () => {
      const res = await request(http).get('/api/v1/news').set(auth()).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(articleId);
    });

    it('publishes it and stamps the publication date', async () => {
      const res = await request(http)
        .patch(`/api/v1/news/${articleId}`)
        .set(auth())
        .send({ isPublished: true })
        .expect(200);

      expect(res.body.isPublished).toBe(true);
      expect(res.body.publishedAt).not.toBeNull();
    });

    it('makes it visible to an anonymous visitor', async () => {
      const list = await request(http).get('/api/v1/public/news').expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.meta.total).toBe(1);

      const detail = await request(http).get(`/api/v1/public/news/${slug}`).expect(200);
      expect(detail.body.article.title.fr).toBe('Rétrospective 2026');
      expect(detail.body.related).toEqual([]);
    });

    it('includes it in the homepage payload', async () => {
      const res = await request(http).get('/api/v1/public/homepage').expect(200);
      expect(res.body.news).toHaveLength(1);
    });

    it('persists an edit', async () => {
      await request(http)
        .patch(`/api/v1/news/${articleId}`)
        .set(auth())
        .send({ title: { fr: 'Rétrospective 2026 — mise à jour' } })
        .expect(200);

      const detail = await request(http).get(`/api/v1/public/news/${slug}`).expect(200);
      expect(detail.body.article.title.fr).toBe('Rétrospective 2026 — mise à jour');
    });

    it('unpublishes it and clears the publication date', async () => {
      const res = await request(http)
        .patch(`/api/v1/news/${articleId}`)
        .set(auth())
        .send({ isPublished: false })
        .expect(200);

      expect(res.body.publishedAt).toBeNull();

      const list = await request(http).get('/api/v1/public/news').expect(200);
      expect(list.body.data).toHaveLength(0);
    });

    it('deletes it for good', async () => {
      await request(http).delete(`/api/v1/news/${articleId}`).set(auth()).expect(200);

      const list = await request(http).get('/api/v1/news').set(auth()).expect(200);
      expect(list.body.data).toHaveLength(0);
    });

    it('recorded every step in the audit trail', async () => {
      const res = await request(http).get('/api/v1/audit').set(auth()).expect(200);
      const actions = res.body.data.map((entry: any) => `${entry.action}:${entry.resource}`);

      expect(actions).toContain('LOGIN:User');
      expect(actions).toContain('CREATE:News');
      expect(actions).toContain('UPDATE:News');
      expect(actions).toContain('DELETE:News');
    });
  });

  describe('an image, from upload to the public page', () => {
    let mediaId: string;
    let missionId: string;

    // A 1x1 PNG: real bytes, so the image decoder in MediaService accepts it.
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    it('rejects a file that is not an image', async () => {
      await request(http)
        .post('/api/v1/media/upload')
        .set(auth())
        .attach('file', Buffer.from('%PDF-1.4 not an image'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('rejects a file whose bytes do not match its declared type', async () => {
      await request(http)
        .post('/api/v1/media/upload')
        .set(auth())
        .attach('file', Buffer.from('this is plain text'), {
          filename: 'fake.png',
          contentType: 'image/png',
        })
        .expect(400);
    });

    it('uploads an image and stores only its metadata in the database', async () => {
      const res = await request(http)
        .post('/api/v1/media/upload')
        .set(auth())
        .field('folder', 'missions')
        .attach('file', PNG, { filename: 'photo de louga.png', contentType: 'image/png' })
        .expect(201);

      mediaId = res.body.id;

      expect(res.body.storageKey).toMatch(/^missions\//);
      // The original name is never used as a key.
      expect(res.body.storageKey).not.toContain('photo de louga');
      expect(res.body.width).toBe(1);
      expect(res.body.height).toBe(1);
      expect(res.body.url).toBe(`http://api.test/api/v1/media/${mediaId}/file`);
      // No binary is kept in PostgreSQL.
      expect(res.body.data).toBeUndefined();
      expect(res.body.buffer).toBeUndefined();
    });

    it('serves the file publicly through the API', async () => {
      await request(http)
        .get(`/api/v1/media/${mediaId}/file`)
        .expect(200)
        .expect('Content-Type', 'image/png');
    });

    it('attaches the image to a published domain of action', async () => {
      const mission = await request(http)
        .post('/api/v1/missions')
        .set(auth())
        .send({
          title: { fr: 'Éducation' },
          description: { fr: 'Distribution de kits scolaires.' },
          icon: 'GraduationCap',
          imageId: mediaId,
          isPublished: true,
        })
        .expect(201);

      missionId = mission.body.id;
      expect(mission.body.image.url).toBe(`http://api.test/api/v1/media/${mediaId}/file`);
    });

    it('exposes the image URL on the public site, never the storage host', async () => {
      const res = await request(http).get('/api/v1/public/missions').expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].image.url).toBe(`http://api.test/api/v1/media/${mediaId}/file`);
      expect(JSON.stringify(res.body)).not.toContain('minio');
    });

    it('refuses to delete a file that content still points at', async () => {
      const res = await request(http).delete(`/api/v1/media/${mediaId}`).set(auth()).expect(409);
      expect(res.body.message).toMatch(/utilisé/i);
    });

    it('reports where the file is used', async () => {
      const res = await request(http).get(`/api/v1/media/${mediaId}/usage`).set(auth()).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.missions).toBe(1);
    });

    it('allows deletion once nothing references it', async () => {
      await request(http)
        .patch(`/api/v1/missions/${missionId}`)
        .set(auth())
        .send({ imageId: null })
        .expect(200);

      await request(http).delete(`/api/v1/media/${mediaId}`).set(auth()).expect(200);
      await request(http).get(`/api/v1/media/${mediaId}`).set(auth()).expect(404);
    });
  });

  describe('ways to support the association', () => {
    let waveId: string;

    it('stores a Wave method with its number and beneficiary', async () => {
      const res = await request(http)
        .post('/api/v1/donations')
        .set(auth())
        .send({
          title: { fr: 'Wave' },
          description: { fr: 'Envoyez votre don en quelques secondes.' },
          actionType: 'phone',
          actionData: '+221 77 861 32 02',
          actionLabel: { fr: 'Copier le numéro' },
          iconColor: 'blue',
          provider: 'wave',
          beneficiary: 'Louga Développement Solidaire',
        })
        .expect(201);

      waveId = res.body.id;
      expect(res.body.provider).toBe('wave');
      expect(res.body.beneficiary).toBe('Louga Développement Solidaire');
      // No link was given, so none is invented: the site shows the number.
      expect(res.body.paymentLink).toBeNull();
    });

    it('serves it to the public site', async () => {
      const res = await request(http).get('/api/v1/public/donations').expect(200);
      const wave = res.body.find((m: any) => m.id === waveId);

      expect(wave.provider).toBe('wave');
      expect(wave.actionData).toBe('+221 77 861 32 02');
    });

    it('accepts an official payment link when the association has one', async () => {
      const res = await request(http)
        .patch(`/api/v1/donations/${waveId}`)
        .set(auth())
        .send({ paymentLink: 'https://pay.wave.com/m/exemple' })
        .expect(200);

      expect(res.body.paymentLink).toBe('https://pay.wave.com/m/exemple');
    });

    it('rejects a payment link that is not a URL', () =>
      request(http)
        .patch(`/api/v1/donations/${waveId}`)
        .set(auth())
        .send({ paymentLink: 'wave.com/00221778613202' })
        .expect(400));

    it('rejects an unknown provider', () =>
      request(http)
        .patch(`/api/v1/donations/${waveId}`)
        .set(auth())
        .send({ provider: 'paypal-maybe' })
        .expect(400));

    it('clears the link back to null rather than an empty string', async () => {
      const res = await request(http)
        .patch(`/api/v1/donations/${waveId}`)
        .set(auth())
        .send({ paymentLink: '' })
        .expect(200);

      expect(res.body.paymentLink).toBeNull();
    });
  });

  describe('media library housekeeping', () => {
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    let usedId: string;
    let orphanId: string;

    it('reports where each file is used', async () => {
      const used = await request(http)
        .post('/api/v1/media/upload')
        .set(auth())
        .field('folder', 'missions')
        .attach('file', PNG, { filename: 'used.png', contentType: 'image/png' })
        .expect(201);
      usedId = used.body.id;

      await request(http)
        .post('/api/v1/missions')
        .set(auth())
        .send({
          title: { fr: 'Domaine illustré' },
          description: { fr: 'Avec une image' },
          imageId: usedId,
        })
        .expect(201);

      const library = await request(http).get('/api/v1/media').set(auth()).expect(200);
      const entry = library.body.data.find((m: any) => m.id === usedId);

      expect(entry.usedIn).toContain('Nos actions · Domaine illustré');
    });

    it('lists a never-attached file as an orphan', async () => {
      const orphan = await request(http)
        .post('/api/v1/media/upload')
        .set(auth())
        .attach('file', PNG, { filename: 'orphan.png', contentType: 'image/png' })
        .expect(201);
      orphanId = orphan.body.id;

      const orphans = await request(http).get('/api/v1/media/orphans').set(auth()).expect(200);
      const ids = orphans.body.map((m: any) => m.id);

      expect(ids).toContain(orphanId);
      // The one attached to a mission must never be offered for deletion.
      expect(ids).not.toContain(usedId);
    });

    it('purges only the orphans', async () => {
      const result = await request(http).delete('/api/v1/media/orphans').set(auth()).expect(200);
      expect(result.body.deleted).toBeGreaterThan(0);

      await request(http).get(`/api/v1/media/${orphanId}`).set(auth()).expect(404);
      // The referenced file survived the purge.
      await request(http).get(`/api/v1/media/${usedId}`).set(auth()).expect(200);
    });

    it('still refuses to delete a referenced file directly', () =>
      request(http).delete(`/api/v1/media/${usedId}`).set(auth()).expect(409));

    it('keeps the purge restricted to administrators', () =>
      request(http).delete('/api/v1/media/orphans').expect(401));
  });

  describe('site settings drive the public pages', () => {
    it('serves the defaults before anything is saved', async () => {
      const res = await request(http).get('/api/v1/public/settings').expect(200);
      expect(res.body.global_contact.email).toEqual(expect.any(String));
    });

    it('keeps a saved change off the site until it is published', async () => {
      const before = await request(http).get('/api/v1/public/settings').expect(200);

      await request(http)
        .patch('/api/v1/settings/global_contact')
        .set(auth())
        .send({ value: { email: 'nouveau@lougasolidaire.org' } })
        .expect(200);

      const during = await request(http).get('/api/v1/public/settings').expect(200);
      expect(during.body.global_contact.email).toBe(before.body.global_contact.email);
    });

    it('publishes a partial change without wiping the rest of the section', async () => {
      await request(http).post('/api/v1/settings/global_contact/publish').set(auth()).expect(201);

      const res = await request(http).get('/api/v1/public/settings').expect(200);
      expect(res.body.global_contact.email).toBe('nouveau@lougasolidaire.org');
      // The phone number was not part of the payload and must survive.
      expect(res.body.global_contact.phone).toEqual(expect.any(String));
      expect(res.body.global_contact.phone.length).toBeGreaterThan(0);
    });

    it('rejects an unknown settings key', async () => {
      await request(http)
        .patch('/api/v1/settings/anything_goes')
        .set(auth())
        .send({ value: { a: 1 } })
        .expect(400);
    });
  });

  describe('branding uploaded in the admin reaches the public site', () => {
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    let logoId: string;
    let faviconId: string;

    it('starts with no logo, so the site uses the wordmark', async () => {
      const res = await request(http).get('/api/v1/public/settings').expect(200);
      expect(res.body.branding.logo).toBeFalsy();
      expect(res.body.branding.wordmark).toEqual(expect.any(String));
    });

    it('uploads a logo and a favicon', async () => {
      const logo = await request(http)
        .post('/api/v1/media/upload')
        .set(auth())
        .field('folder', 'branding')
        .attach('file', PNG, { filename: 'logo.png', contentType: 'image/png' })
        .expect(201);

      const favicon = await request(http)
        .post('/api/v1/media/upload')
        .set(auth())
        .field('folder', 'branding')
        .attach('file', PNG, { filename: 'favicon.png', contentType: 'image/png' })
        .expect(201);

      logoId = logo.body.id;
      faviconId = favicon.body.id;
    });

    it('saves them as a draft, invisible to visitors', async () => {
      await request(http)
        .patch('/api/v1/settings/branding')
        .set(auth())
        .send({ value: { logoId, faviconId } })
        .expect(200);

      const stillPublic = await request(http).get('/api/v1/public/settings').expect(200);
      expect(stillPublic.body.branding.logo).toBeFalsy();
    });

    it('shows them once published', async () => {
      await request(http).post('/api/v1/settings/branding/publish').set(auth()).expect(201);
    });

    it('serves them resolved, with a URL the browser can fetch', async () => {
      const res = await request(http).get('/api/v1/public/settings').expect(200);

      expect(res.body.branding.logo.id).toBe(logoId);
      expect(res.body.branding.logo.url).toBe(`http://api.test/api/v1/media/${logoId}/file`);
      expect(res.body.branding.favicon.url).toBe(`http://api.test/api/v1/media/${faviconId}/file`);
      // A separate dark variant was never uploaded.
      expect(res.body.branding.logoDark).toBeNull();
    });

    it('keeps the other settings intact', async () => {
      const res = await request(http).get('/api/v1/public/settings').expect(200);
      expect(res.body.branding.wordmark).toEqual(expect.any(String));
      expect(res.body.organization.name).toContain('Louga');
    });
  });

  describe('the public contact form reaches the inbox', () => {
    it('accepts a visitor message and lists it for the administrator', async () => {
      await request(http)
        .post('/api/v1/contact')
        .send({
          name: 'Aissatou Diop',
          email: 'aissatou@example.com',
          subject: 'Bénévolat',
          message: 'Je souhaite rejoindre votre équipe de bénévoles à Louga.',
        })
        .expect(201);

      const inbox = await request(http).get('/api/v1/contact').set(auth()).expect(200);
      expect(inbox.body.data).toHaveLength(1);
      expect(inbox.body.data[0].isRead).toBe(false);

      const stats = await request(http).get('/api/v1/dashboard/stats').set(auth()).expect(200);
      expect(stats.body.messages.unread).toBe(1);
    });

    it('marks a message as read', async () => {
      const inbox = await request(http).get('/api/v1/contact').set(auth()).expect(200);
      const messageId = inbox.body.data[0].id;

      await request(http)
        .patch(`/api/v1/contact/${messageId}`)
        .set(auth())
        .send({ isRead: true })
        .expect(200);

      const stats = await request(http).get('/api/v1/dashboard/stats').set(auth()).expect(200);
      expect(stats.body.messages.unread).toBe(0);
    });
  });
});

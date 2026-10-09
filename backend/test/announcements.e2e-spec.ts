import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MinioService } from './../src/common/minio.service';
import { PageMetaService } from './../src/seo/page-meta.service';
import { PageShellService } from './../src/seo/page-shell.service';
import { SeoService } from './../src/seo/seo.service';
import { createFakeMinio } from './fake-prisma';
import { ADMIN, SEED_PASSWORD, createStatefulPrisma } from './stateful-prisma';

const DAY = 24 * 60 * 60_000;
const at = (offset: number) => new Date(Date.now() + offset).toISOString();

describe('Announcements, published once and shown in the right places (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'announcements-access-secret';
    process.env.JWT_REFRESH_SECRET = 'announcements-refresh-secret';
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
        .expect(200)
    ).body.access_token;
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const create = (title: string, extra: Record<string, unknown> = {}) =>
    request(http)
      .post('/api/v1/news')
      .set(auth())
      .send({
        title: { fr: title, ar: `${title} (ar)` },
        excerpt: { fr: `Résumé de ${title}` },
        content: { fr: '<p>Contenu</p>' },
        isPublished: true,
        ...extra,
      })
      .expect(201)
      .then((response) => response.body as { id: string; slug: string });

  const banner = async () =>
    (await request(http).get('/api/v1/public/announcements/banner').expect(200)).body as Array<{
      slug: string;
    }>;
  const upcoming = async () =>
    (await request(http).get('/api/v1/public/homepage').expect(200)).body.upcoming as Array<{
      slug: string;
    }>;
  const publicList = async () =>
    ((await request(http).get('/api/v1/public/news').expect(200)).body.data as Array<{ slug: string }>).map(
      (row) => row.slug,
    );

  let distribution: { id: string; slug: string };

  it('publishes an announcement with its practical details and puts it where it was asked', async () => {
    distribution = await create('Distribution de kits scolaires', {
      eventStartsAt: at(7 * DAY),
      location: { fr: 'École Keur Serigne, Louga' },
      practicalInfo: { fr: 'Se munir du certificat de scolarité.' },
      showInBanner: true,
      bannerText: { fr: 'Prochaine distribution de kits scolaires' },
      showInUpcoming: true,
      isFeatured: true,
      actions: [{ type: 'contact' }, { type: 'donate' }],
      contact: { name: 'Awa', phone: '+221 77 000 00 00' },
    });

    expect((await banner()).map((row) => row.slug)).toContain(distribution.slug);
    expect((await upcoming()).map((row) => row.slug)).toContain(distribution.slug);
    expect(await publicList()).toContain(distribution.slug);
  });

  it('keeps a scheduled announcement off the site until its time', async () => {
    const later = await create('Campagne médicale', {
      publishedAt: at(3 * DAY),
      showInBanner: true,
      showInUpcoming: true,
    });

    expect(await publicList()).not.toContain(later.slug);
    expect((await banner()).map((row) => row.slug)).not.toContain(later.slug);
    await request(http).get(`/api/v1/public/news/${later.slug}`).expect(404);

    // The editor sees it, as scheduled.
    const scheduled = await request(http)
      .get('/api/v1/news?status=scheduled')
      .set(auth())
      .expect(200);
    expect(scheduled.body.data.map((row: any) => row.slug)).toContain(later.slug);
  });

  it('stops pushing an announcement once its window closes, and keeps it published', async () => {
    const closed = await create('Appel aux bénévoles', {
      showInBanner: true,
      showInUpcoming: true,
      visibleUntil: at(-DAY),
    });

    expect((await banner()).map((row) => row.slug)).not.toContain(closed.slug);
    expect((await upcoming()).map((row) => row.slug)).not.toContain(closed.slug);
    expect(await publicList()).toContain(closed.slug);
  });

  it('never shows an activity that has already happened as upcoming', async () => {
    const past = await create('Distribution de janvier', {
      showInUpcoming: true,
      eventStartsAt: at(-10 * DAY),
      eventEndsAt: at(-9 * DAY),
    });
    expect((await upcoming()).map((row) => row.slug)).not.toContain(past.slug);
  });

  it('archives without breaking the address that was shared', async () => {
    const archived = await create('Bilan de la cantine');
    await request(http)
      .patch(`/api/v1/news/${archived.id}`)
      .set(auth())
      .send({ archived: true })
      .expect(200);

    expect(await publicList()).not.toContain(archived.slug);
    // A link already sent on WhatsApp still opens.
    await request(http).get(`/api/v1/public/news/${archived.slug}`).expect(200);

    const meta = await app.get(PageMetaService).resolve(`/actualites/${archived.slug}`, 'fr', 'https://ldslouga.sn');
    expect(meta.status).toBe(200);
    expect(meta.noIndex).toBe(true);

    const sitemap = await app.get(SeoService).buildSitemap('https://ldslouga.sn');
    expect(sitemap).not.toContain(archived.slug);
    expect(sitemap).toContain(distribution.slug);
  });

  it('refuses an action pointing at the back-office, and dates that run backwards', async () => {
    await request(http)
      .patch(`/api/v1/news/${distribution.id}`)
      .set(auth())
      .send({ actions: [{ type: 'page', url: '/admin/utilisateurs' }] })
      .expect(400);
    await request(http)
      .patch(`/api/v1/news/${distribution.id}`)
      .set(auth())
      .send({ eventStartsAt: at(5 * DAY), eventEndsAt: at(4 * DAY) })
      .expect(400);
  });

  it('refuses anyone not signed in', async () => {
    await request(http).post('/api/v1/news').send({}).expect(401);
    await request(http).patch(`/api/v1/news/${distribution.id}`).send({ archived: true }).expect(401);
  });

  it('writes the announcement’s own preview, its event and the banner into the initial HTML', async () => {
    const pageMeta = app.get(PageMetaService);
    const meta = await pageMeta.resolve(`/actualites/${distribution.slug}`, 'fr', 'https://ldslouga.sn');
    const shell =
      '<!doctype html><html lang="fr"><head><title>LDS</title></head><body><div id="root"></div></body></html>';
    const html = app.get(PageShellService).render(shell, meta, await pageMeta.banner('fr'));

    expect(html).toContain('Distribution de kits scolaires — ');
    expect(html).toContain(`<link rel="canonical" href="https://ldslouga.sn/actualites/${distribution.slug}"`);
    expect(html).toContain('property="og:type" content="article"');

    const documents = [...html.matchAll(/application\/ld\+json[^>]*>(.*?)<\/script>/g)].map(
      (match) => JSON.parse(match[1]) as Record<string, any>,
    );
    const event = documents.find((document) => document['@type'] === 'Event');
    expect(event?.location.name).toBe('École Keur Serigne, Louga');

    const bannerData = JSON.parse(html.match(/id="lds-banner"[^>]*>(.*?)<\/script>/)![1]);
    expect(bannerData[0]).toMatchObject({
      slug: distribution.slug,
      text: 'Prochaine distribution de kits scolaires',
    });
  });

  it('has no Event for an announcement without a place, rather than inventing one', async () => {
    const vague = await create('Rencontre des bénévoles', { eventStartsAt: at(DAY) });
    const meta = await app.get(PageMetaService).resolve(`/actualites/${vague.slug}`, 'fr', 'https://ldslouga.sn');
    expect(meta.jsonLd.some((document) => document['@type'] === 'Event')).toBe(false);
  });
});

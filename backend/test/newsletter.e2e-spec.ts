import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MinioService } from './../src/common/minio.service';
import { createFakeMinio } from './fake-prisma';
import { ADMIN, SEED_PASSWORD, createStatefulPrisma } from './stateful-prisma';
import { bootTestApp, type TestContext } from './setup-app';

describe('Newsletter — who may touch the list (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await bootTestApp();
  });
  afterAll(async () => {
    await ctx.app?.close();
  });

  const ADMIN_ENDPOINTS: Array<[string, string]> = [
    ['get', '/api/v1/newsletter/subscribers'],
    ['get', '/api/v1/newsletter/subscribers/stats'],
    ['get', '/api/v1/newsletter/subscribers/export'],
    ['post', '/api/v1/newsletter/subscribers/import'],
  ];

  it.each(ADMIN_ENDPOINTS)('refuses anonymous %s %s', (method, url) =>
    (request(ctx.http) as any)[method](url).send({}).expect(401),
  );

  it.each(ADMIN_ENDPOINTS)('refuses an EDITOR on %s %s', (method, url) =>
    (request(ctx.http) as any)
      [method](url)
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .send({})
      .expect(403),
  );
});

describe('Newsletter — from the form to the inbox and out again (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let prisma: any;
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'newsletter-access-secret';
    process.env.JWT_REFRESH_SECRET = 'newsletter-refresh-secret';
    process.env.PUBLIC_API_URL = 'http://api.test';
    process.env.EMAIL_ENCRYPTION_KEY = 'newsletter-e2e-key-long-enough-for-aes';
    delete process.env.PUBLIC_SITE_URL;

    prisma = createStatefulPrisma();
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
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
  const subscribers = () => prisma.__store.newsletterSubscriber as any[];
  const emails = (kind: string) =>
    (prisma.__store.emailMessage as any[]).filter((row) => row.kind === kind);

  const subscribe = (email: string, extra: Record<string, unknown> = {}) =>
    request(http)
      .post('/api/v1/newsletter/subscribe')
      .send({ email, consent: true, locale: 'fr', ...extra });

  it('hides the form while sending is not operational', async () => {
    const status = await request(http).get('/api/v1/newsletter/status').expect(200);
    expect(status.body.available).toBe(false);
    await subscribe('early@example.com').expect(503);
  });

  it('shows it once email is configured and switched on', async () => {
    await request(http)
      .put('/api/v1/email/settings')
      .set(auth())
      .send({
        enabled: true,
        host: 'smtp.example.com',
        port: 587,
        username: 'contact@ldslouga.sn',
        password: 'secret-e2e',
        fromEmail: 'contact@ldslouga.sn',
        siteUrl: 'https://ldslouga.sn',
      })
      .expect(200);

    const status = await request(http).get('/api/v1/newsletter/status').expect(200);
    expect(status.body.available).toBe(true);
    expect(status.body.consentText.fr).toMatch(/J'accepte/);
  });

  it('refuses a request without consent', () =>
    request(http)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'noconsent@example.com', consent: false })
      .expect(400));

  it('answers identically for a new address and a known one', async () => {
    // Anything else would tell a stranger whether someone follows LDS.
    const first = await subscribe('awa@example.com').expect(202);
    const again = await subscribe('awa@example.com').expect(202);
    expect(again.body).toEqual(first.body);
  });

  it('subscribes nobody until they confirm', () => {
    const awa = subscribers().find((row) => row.email === 'awa@example.com');
    expect(awa.status).toBe('PENDING');
    // The ten-minute rule: the second request did not send a second email.
    expect(emails('newsletter_confirm')).toHaveLength(1);
  });

  it('confirms from the link in the email, once', async () => {
    const html: string = emails('newsletter_confirm')[0].html;
    const link = new URL(html.match(/href="([^"]*confirmation[^"]*)"/)![1].replace(/&amp;/g, '&'));
    expect(link.origin).toBe('https://ldslouga.sn');

    const confirm = await request(http)
      .post('/api/v1/newsletter/confirm')
      .send({ token: link.searchParams.get('token') })
      .expect(200);
    expect(confirm.body.result).toBe('confirmed');
    expect(subscribers().find((row) => row.email === 'awa@example.com').status).toBe('ACTIVE');

    const replay = await request(http)
      .post('/api/v1/newsletter/confirm')
      .send({ token: link.searchParams.get('token') })
      .expect(200);
    expect(replay.body.result).toBe('invalid');
  });

  it('never lets a visitor’s Host header into the confirmation link', async () => {
    await subscribe('host@example.com').set('X-Forwarded-Host', 'evil.example').expect(202);
    const html: string = emails('newsletter_confirm').at(-1).html;
    expect(html).not.toContain('evil.example');
    expect(html).toContain('https://ldslouga.sn/newsletter/confirmation');
  });

  it('sends no welcome email unless the association switched it on', () => {
    expect(emails('newsletter_welcome')).toHaveLength(0);
  });

  it('lets a mail client unsubscribe in one click, with the header it was given', async () => {
    await request(http)
      .put('/api/v1/email/templates/newsletter_welcome')
      .set(auth())
      .send({ isActive: true })
      .expect(200);

    // The address subscribed in the previous test, still pending: confirming
    // it now, with the welcome email switched on, produces the headers.
    const html: string = emails('newsletter_confirm').at(-1).html;
    const link = new URL(html.match(/href="([^"]*confirmation[^"]*)"/)![1].replace(/&amp;/g, '&'));
    await request(http)
      .post('/api/v1/newsletter/confirm')
      .send({ token: link.searchParams.get('token') })
      .expect(200);

    const welcome = emails('newsletter_welcome').at(-1);
    expect(welcome.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    const oneClick = new URL(welcome.headers['List-Unsubscribe'].slice(1, -1));

    await request(http)
      .post(`${oneClick.pathname}${oneClick.search}`)
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(200);

    expect(subscribers().find((row) => row.email === 'host@example.com').status).toBe(
      'UNSUBSCRIBED',
    );
  });

  it('answers a forged one-click request the same way, and does nothing', async () => {
    const awa = subscribers().find((row) => row.email === 'awa@example.com');
    await request(http)
      .post(`/api/v1/newsletter/unsubscribe/one-click?s=${awa.id}&t=forged`)
      .expect(200);
    expect(awa.status).toBe('ACTIVE');
  });

  it('exports the confirmed list as CSV, without any token, and logs that it did', async () => {
    const response = await request(http)
      .get('/api/v1/newsletter/subscribers/export')
      .set(auth())
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.text).toContain('awa@example.com');
    expect(response.text).not.toContain('host@example.com'); // unsubscribed
    expect(response.text).not.toMatch(/confirmTokenHash|[0-9a-f]{64}/);

    const audit = (prisma.__store.auditLog as any[]).find((row) => row.action === 'EXPORT');
    expect(audit.metadata.count).toBe(1);
    expect(JSON.stringify(audit)).not.toContain('awa@example.com');
  });

  it('stops a sixth request from one address within ten minutes', async () => {
    // Five have been made above. A script working through a list of strangers'
    // addresses would need far more than that.
    await subscribe('sixth@example.com').expect(429);
    expect(subscribers().some((row) => row.email === 'sixth@example.com')).toBe(false);
  });

  it('never inscribes someone who only wrote through the contact form', async () => {
    await request(http)
      .post('/api/v1/contact')
      .send({
        name: 'Moussa',
        email: 'moussa@example.com',
        subject: 'Question',
        message: 'Une question assez longue.',
      })
      .expect(201);
    expect(subscribers().some((row) => row.email === 'moussa@example.com')).toBe(false);
  });
});

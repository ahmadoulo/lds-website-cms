import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MinioService } from './../src/common/minio.service';
import { CampaignsService } from './../src/campaigns/campaigns.service';
import { createFakeMinio } from './fake-prisma';
import { ADMIN, SEED_PASSWORD, createStatefulPrisma } from './stateful-prisma';
import { bootTestApp, type TestContext } from './setup-app';

describe('Campaigns — who may send (e2e)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await bootTestApp();
  });
  afterAll(async () => {
    await ctx.app?.close();
  });

  const ENDPOINTS: Array<[string, string]> = [
    ['get', '/api/v1/campaigns'],
    ['post', '/api/v1/campaigns'],
    ['post', '/api/v1/campaigns/audience'],
    ['post', '/api/v1/campaigns/00000000-0000-4000-8000-000000000000/schedule'],
  ];

  it.each(ENDPOINTS)('refuses anonymous %s %s', (method, url) =>
    (request(ctx.http) as any)[method](url).send({}).expect(401),
  );
  it.each(ENDPOINTS)('refuses an EDITOR on %s %s', (method, url) =>
    (request(ctx.http) as any)
      [method](url)
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .send({})
      .expect(403),
  );
});

describe('Campaigns — from draft to inboxes (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let prisma: any;
  let token: string;
  let campaigns: CampaignsService;
  let campaignId: string;

  const subscriber = (email: string, status: string, locale = 'fr') =>
    prisma.__store.newsletterSubscriber.push({
      id: `${status.toLowerCase()}-${email}`.replace(/[^a-z0-9-]/g, '-'),
      email,
      status,
      locale,
      source: 'footer',
      confirmedAt: status === 'ACTIVE' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'campaigns-access-secret';
    process.env.JWT_REFRESH_SECRET = 'campaigns-refresh-secret';
    process.env.PUBLIC_API_URL = 'http://api.test';
    process.env.EMAIL_ENCRYPTION_KEY = 'campaigns-e2e-key-long-enough-for-aes';
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
    campaigns = app.get(CampaignsService);

    token = (
      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: ADMIN.email, password: SEED_PASSWORD })
        .expect(200)
    ).body.access_token;

    await request(http)
      .put('/api/v1/email/settings')
      .set(auth())
      .send({
        enabled: true,
        host: 'smtp.example.com',
        port: 587,
        username: 'contact@ldslouga.sn',
        password: 'secret-e2e',
        fromName: 'Louga Développement Solidaire',
        fromEmail: 'contact@ldslouga.sn',
        siteUrl: 'https://ldslouga.sn',
        adminInbox: 'equipe@ldslouga.sn',
      })
      .expect(200);

    subscriber('awa@example.com', 'ACTIVE');
    subscriber('moussa@example.com', 'ACTIVE');
    subscriber('fatou@example.com', 'ACTIVE', 'ar');
    subscriber('pending@example.com', 'PENDING');
    subscriber('left@example.com', 'UNSUBSCRIBED');
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const campaignEmails = () =>
    (prisma.__store.emailMessage as any[]).filter(
      (row) => row.campaignId === campaignId && row.kind === 'campaign',
    );

  it('creates a draft from blocks', async () => {
    const created = await request(http)
      .post('/api/v1/campaigns')
      .set(auth())
      .send({
        name: 'Rentrée 2026',
        subject: 'Nos nouvelles de la rentrée',
        preheader: 'Trois écoles, une cantine',
        locale: 'fr',
        audience: { segment: 'fr' },
        blocks: [
          { type: 'heading', text: 'La rentrée à Louga' },
          { type: 'paragraph', text: 'Un **grand** merci <script>alert(1)</script>' },
          { type: 'button', label: 'Nous soutenir', url: 'https://ldslouga.sn/nous-soutenir' },
        ],
      })
      .expect(201);
    campaignId = created.body.id;
    expect(created.body.status).toBe('DRAFT');
  });

  it('refuses a block that would write markup or run script', () =>
    request(http)
      .put(`/api/v1/campaigns/${campaignId}`)
      .set(auth())
      .send({ blocks: [{ type: 'button', label: 'x', url: 'javascript:alert(1)' }] })
      .expect(400));

  it('previews with everything typed escaped', async () => {
    const preview = await request(http)
      .post(`/api/v1/campaigns/${campaignId}/preview`)
      .set(auth())
      .send({})
      .expect(200);
    expect(preview.body.html).toContain('<strong>grand</strong>');
    expect(preview.body.html).not.toContain('<script>');
    // A preview carries no working unsubscribe token for anyone.
    expect(preview.body.html).not.toMatch(/desinscription\?s=/);
  });

  it('counts only confirmed subscribers in the audience', async () => {
    const french = await request(http)
      .post('/api/v1/campaigns/audience')
      .set(auth())
      .send({ segment: 'fr' })
      .expect(200);
    // awa and moussa; not fatou (Arabic), not pending, not unsubscribed.
    expect(french.body.recipients).toBe(2);

    const all = await request(http)
      .post('/api/v1/campaigns/audience')
      .set(auth())
      .send({ segment: 'all' })
      .expect(200);
    expect(all.body.recipients).toBe(3);
  });

  it('refuses to send when the audience changed since the recap was shown', async () => {
    const response = await request(http)
      .post(`/api/v1/campaigns/${campaignId}/schedule`)
      .set(auth())
      .send({ expectedRecipients: 5 })
      .expect(409);
    expect(response.body.message).toMatch(/L'audience a changé/);
    expect(campaignEmails()).toHaveLength(0);
  });

  it('sends to exactly the confirmed audience once confirmed', async () => {
    const response = await request(http)
      .post(`/api/v1/campaigns/${campaignId}/schedule`)
      .set(auth())
      .send({ expectedRecipients: 2 })
      .expect(200);
    expect(response.body.status).toBe('SENDING');

    const emails = campaignEmails();
    expect(emails.map((row) => row.toEmail).sort()).toEqual(['awa@example.com', 'moussa@example.com']);
    expect(response.body.recipientCount).toBe(2);
  });

  it('gives each recipient their own unsubscribe link and the one-click headers', () => {
    const [first, second] = campaignEmails();
    const linkOf = (html: string) => html.match(/desinscription\?s=([^"&]+)/)![1];

    expect(linkOf(first.html)).not.toBe(linkOf(second.html));
    expect(first.html).not.toContain(second.subscriberId);
    expect(first.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('never sends a campaign twice to the same person, whatever re-runs', async () => {
    // What the scheduler does after a crash mid-enqueue.
    await campaigns.enqueue(campaignId);
    await campaigns.start(campaignId);
    expect(campaignEmails()).toHaveLength(2);
  });

  it('cancels a waiting copy the moment its recipient unsubscribes', async () => {
    const moussa = campaignEmails().find((row) => row.toEmail === 'moussa@example.com');
    const oneClick = new URL(moussa.headers['List-Unsubscribe'].slice(1, -1));
    await request(http).post(`${oneClick.pathname}${oneClick.search}`).expect(200);

    expect(moussa.status).toBe('CANCELLED');
    const stats = await request(http).get(`/api/v1/campaigns/${campaignId}/stats`).set(auth()).expect(200);
    expect(stats.body.unsubscribed).toBe(1);
  });

  it('will not edit a campaign that has been sent', () =>
    request(http)
      .put(`/api/v1/campaigns/${campaignId}`)
      .set(auth())
      .send({ subject: 'Autre objet' })
      .expect(409));

  it('finishes the campaign once nothing is waiting, and tells the team once', async () => {
    for (const row of campaignEmails()) if (row.status === 'PENDING') row.status = 'SENT';

    await campaigns.completeFinished();
    await campaigns.completeFinished();

    const campaign = prisma.__store.campaign.find((row: any) => row.id === campaignId);
    expect(campaign.status).toBe('SENT');
    const notices = (prisma.__store.emailMessage as any[]).filter(
      (row) => row.kind === 'campaign_completed' && row.campaignId === campaignId,
    );
    expect(notices).toHaveLength(1);
    expect(notices[0].toEmail).toBe('equipe@ldslouga.sn');
    expect(notices[0].html).toContain('pas qu’il est arrivé');
  });

  it('cancels what is still waiting when a campaign is cancelled', async () => {
    const draft = await request(http)
      .post('/api/v1/campaigns')
      .set(auth())
      .send({
        name: 'Arabe',
        subject: 'أخبارنا',
        locale: 'ar',
        audience: { segment: 'ar' },
        blocks: [{ type: 'paragraph', text: 'مرحبًا' }],
      })
      .expect(201);

    await request(http)
      .post(`/api/v1/campaigns/${draft.body.id}/schedule`)
      .set(auth())
      .send({ expectedRecipients: 1 })
      .expect(200);
    await request(http).post(`/api/v1/campaigns/${draft.body.id}/cancel`).set(auth()).expect(200);

    const copies = (prisma.__store.emailMessage as any[]).filter(
      (row) => row.campaignId === draft.body.id && row.kind === 'campaign',
    );
    expect(copies).toHaveLength(1);
    expect(copies[0].status).toBe('CANCELLED');
    expect(copies[0].html).toContain('dir="rtl"');
  });

  it('keeps a sent campaign: it cannot be deleted', () =>
    request(http).delete(`/api/v1/campaigns/${campaignId}`).set(auth()).expect(409));
});

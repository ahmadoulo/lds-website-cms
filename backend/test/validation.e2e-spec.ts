import request from 'supertest';
import { bootTestApp, MISSION_ID, type TestContext } from './setup-app';

describe('Routing, validation and rate limits (e2e)', () => {
  let ctx: TestContext;
  let http: any;

  beforeAll(async () => {
    ctx = await bootTestApp();
    http = ctx.http;
  });

  afterAll(async () => {
    await ctx.app?.close();
  });

  describe('route ordering', () => {
    it('routes /news/categories to the category handler, not to :idOrSlug', () =>
      request(http).get('/api/v1/news/categories').expect(200));

    it('routes /media/folders to the folder handler, not to :id', () =>
      request(http)
        .get('/api/v1/media/folders')
        .set('Authorization', `Bearer ${ctx.superAdminToken}`)
        .expect(200));

    it('routes /missions/reorder to the reorder handler, not to :id', () =>
      request(http)
        .patch('/api/v1/missions/reorder')
        .set('Authorization', `Bearer ${ctx.editorToken}`)
        .send({ ids: [MISSION_ID] })
        .expect(200));

    it('routes /public/news/categories ahead of /public/news/:slug', () =>
      request(http).get('/api/v1/public/news/categories').expect(200));
  });

  describe('input validation', () => {
    const auth = () => ({ Authorization: `Bearer ${ctx.editorToken}` });

    it('rejects a body carrying unknown fields', () =>
      request(http)
        .post('/api/v1/missions')
        .set(auth())
        .send({ title: { fr: 'x' }, description: { fr: 'y' }, isAdmin: true })
        .expect(400));

    it('rejects a localized field that is missing French', () =>
      request(http)
        .post('/api/v1/missions')
        .set(auth())
        .send({ title: { en: 'Only English' }, description: { fr: 'y' } })
        .expect(400));

    it('rejects a localized field with an unsupported locale', () =>
      request(http)
        .post('/api/v1/missions')
        .set(auth())
        .send({ title: { fr: 'ok', de: 'nein' }, description: { fr: 'y' } })
        .expect(400));

    it('rejects a localized field sent as a bare string', () =>
      request(http)
        .post('/api/v1/missions')
        .set(auth())
        .send({ title: 'Éducation', description: { fr: 'y' } })
        .expect(400));

    it('rejects an impact colour that is not a hex code', () =>
      request(http)
        .post('/api/v1/impact')
        .set('Authorization', `Bearer ${ctx.superAdminToken}`)
        .send({ label: { fr: 'Test' }, value: 10, color: 'red' })
        .expect(400));

    it('rejects a negative impact value', () =>
      request(http)
        .post('/api/v1/impact')
        .set('Authorization', `Bearer ${ctx.superAdminToken}`)
        .send({ label: { fr: 'Test' }, value: -5, color: '#87CE18' })
        .expect(400));

    it('rejects an unknown settings key', () =>
      request(http)
        .patch('/api/v1/settings/arbitrary_key')
        .set('Authorization', `Bearer ${ctx.superAdminToken}`)
        .send({ value: { a: 1 } })
        .expect(400));

    it('rejects a javascript: url on a partner link', () =>
      request(http)
        .post('/api/v1/partners')
        .set('Authorization', `Bearer ${ctx.superAdminToken}`)
        .send({ name: 'Evil', url: 'javascript:alert(1)' })
        .expect(400));
  });

  describe('public contact form', () => {
    it('accepts a well-formed message', () =>
      request(http)
        .post('/api/v1/contact')
        .send({
          name: 'Aissatou Diop',
          email: 'aissatou@example.com',
          subject: 'Bénévolat',
          message: 'Je souhaite rejoindre votre équipe de bénévoles à Louga.',
        })
        .expect(201)
        .expect(({ body }) => {
          expect(body.success).toBe(true);
        }));

    it('rejects an incomplete message', () =>
      request(http)
        .post('/api/v1/contact')
        .send({ name: 'A', email: 'bad', subject: '', message: 'court' })
        .expect(400));
  });

  describe('rate limiting', () => {
    it('throttles repeated failed logins', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 8; i++) {
        const res = await request(http)
          .post('/api/v1/auth/login')
          .send({ email: 'brute@lds.test', password: 'guessing' });
        statuses.push(res.status);
      }

      expect(statuses).toContain(429);
    });
  });
});

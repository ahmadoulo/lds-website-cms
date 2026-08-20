import request from 'supertest';
import { bootTestApp, MEDIA_ID, type TestContext } from './setup-app';

describe('Public API and media (e2e)', () => {
  let ctx: TestContext;
  let http: any;

  beforeAll(async () => {
    ctx = await bootTestApp();
    http = ctx.http;
  });

  afterAll(async () => {
    await ctx.app?.close();
  });

  const PUBLIC_ENDPOINTS = [
    '/api/v1/public/homepage',
    '/api/v1/public/settings',
    '/api/v1/public/missions',
    '/api/v1/public/news',
    '/api/v1/public/news/categories',
    '/api/v1/public/gallery',
    '/api/v1/public/gallery/images',
    '/api/v1/public/impact',
    '/api/v1/public/partners',
    '/api/v1/public/donations',
    '/api/v1/public/navigation',
  ];

  it.each(PUBLIC_ENDPOINTS)('serves %s anonymously', (url) =>
    request(http).get(url).expect(200),
  );

  it('returns every homepage section in a single payload', async () => {
    const res = await request(http).get('/api/v1/public/homepage').expect(200);

    expect(Object.keys(res.body).sort()).toEqual(
      [
        'donations',
        'gallery',
        'impact',
        'isPreview',
        'missions',
        'news',
        'partners',
        'settings',
      ].sort(),
    );
    // A plain visitor is never in preview.
    expect(res.body.isPreview).toBe(false);
  });

  it('falls back to default settings when nothing is stored yet', async () => {
    const res = await request(http).get('/api/v1/public/settings').expect(200);

    expect(res.body.organization.name).toContain('Louga');
    expect(res.body.global_contact.email).toEqual(expect.any(String));
    expect(res.body.seo.description).toEqual(expect.any(String));
  });

  it('exposes the branding section so the site can render a logo and favicon', async () => {
    const res = await request(http).get('/api/v1/public/settings').expect(200);

    expect(res.body.branding).toBeDefined();
    // Nothing uploaded yet: the site falls back to the wordmark.
    expect(res.body.branding.logoId).toBeNull();
    expect(res.body.branding.faviconId).toBeNull();
    expect(res.body.branding.wordmark).toEqual(expect.any(String));
  });

  it('hides unpublished missions from anonymous visitors', async () => {
    const res = await request(http).get('/api/v1/public/missions').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((m: any) => m.isPublished)).toBe(true);
  });

  it('shows drafts to a signed-in editor on the shared listing', async () => {
    const res = await request(http)
      .get('/api/v1/missions')
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .expect(200);

    expect(res.body.some((m: any) => !m.isPublished)).toBe(true);
  });

  it('hides drafts on that same listing when anonymous', async () => {
    const res = await request(http).get('/api/v1/missions').expect(200);
    expect(res.body.every((m: any) => m.isPublished)).toBe(true);
  });

  describe('media delivery', () => {
    it('decorates every media object with an absolute API url', async () => {
      const res = await request(http).get('/api/v1/public/missions').expect(200);
      const withImage = res.body.find((m: any) => m.image);

      expect(withImage.image.url).toBe(`http://api.test/api/v1/media/${withImage.image.id}/file`);
    });

    it('never exposes the storage host or credentials to the browser', async () => {
      const res = await request(http).get('/api/v1/public/missions').expect(200);
      const payload = JSON.stringify(res.body);

      expect(payload).not.toContain('minio');
      expect(payload).not.toContain(':9000');
      expect(payload).not.toContain('MINIO');
    });

    it('streams a file publicly without a token', () =>
      request(http)
        .get(`/api/v1/media/${MEDIA_ID}/file`)
        .expect(200)
        .expect('Content-Type', 'image/png')
        .expect('Cache-Control', /max-age=31536000/));

    it('rejects a non-uuid media id with 400 rather than 500', () =>
      request(http).get('/api/v1/media/not-a-uuid/file').expect(400));

    it('keeps the media library listing behind authentication', () =>
      request(http).get('/api/v1/media').expect(401));
  });
});

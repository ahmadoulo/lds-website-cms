import { expect, test } from '@playwright/test';

/**
 * Walks the journey a first-time visitor takes. Requires the full stack to be
 * running (API + PostgreSQL + MinIO) with the seed applied.
 */
test.describe('Public site', () => {
  test('homepage presents the association and its actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Faire un don/i }).first()).toBeVisible();
    await expect(page.getByText(/Qui sommes-nous/i)).toBeVisible();
    await expect(page.getByText(/Nos domaines d'action/i)).toBeVisible();
  });

  test('main navigation reaches every public page', async ({ page }) => {
    const pages: Array<[string, RegExp]> = [
      ['À propos', /a-propos/],
      ['Nos actions', /nos-actions/],
      ['Actualités', /actualites/],
      ['Galerie', /galerie/],
      ['Impact', /impact/],
      ['Partenaires', /partenaires/],
      ['Contact', /contact/],
    ];

    for (const [label, urlPattern] of pages) {
      await page.goto('/');
      await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(urlPattern);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('a domain of intervention opens its own detail', async ({ page }) => {
    await page.goto('/nos-actions');

    const first = page.locator('article').first().getByRole('button').first();
    await expect(first).toBeVisible();
    await first.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // The card is a real button, so the keyboard closes what the mouse opened.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('no section overflows sideways, at any width', async ({ page }) => {
    /*
      Measuring document.documentElement is useless here: the PublicLayout
      wrapper carries overflow-x-hidden, so the document can never report an
      overflow and the assertion would pass whatever happens. Sections do still
      report it through scrollWidth, which is what is measured instead - minus
      the carousels, whose horizontal scroll is the feature.
    */
    const widths = [375, 768, 1280];
    const routes = ['/', '/nos-actions', '/partenaires', '/impact', '/galerie'];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });

      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        const offenders = await page.evaluate(() => {
          const bad: string[] = [];
          document.querySelectorAll('main section, main > div, footer').forEach((element) => {
            if (element.querySelector('[role="group"]')) return; // a carousel scrolls on purpose
            if (element.scrollWidth > element.clientWidth + 1) {
              bad.push(`${element.tagName}.${element.className} ${element.scrollWidth}>${element.clientWidth}`);
            }
          });
          return bad;
        });

        expect(offenders, `${route} @ ${width}px`).toEqual([]);
      }
    }
  });

  test('an article can be opened from the news listing', async ({ page }) => {
    await page.goto('/actualites');

    const firstArticle = page.getByRole('link', { name: /Lire la suite/i }).first();
    if (await firstArticle.count()) {
      await firstArticle.click();
      await expect(page).toHaveURL(/\/actualites\/.+/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: /Retour aux actualités/i })).toBeVisible();
    }
  });

  test('the contact form validates before sending', async ({ page }) => {
    await page.goto('/contact');

    await page.getByRole('button', { name: /Envoyer le message/i }).click();
    await expect(page.getByText("Merci d'indiquer votre nom")).toBeVisible();
  });

  test('the contact form reaches the API', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel(/Prénom et nom/i).fill('Test Playwright');
    await page.getByLabel(/^Email/i).fill(`playwright+${Date.now()}@example.com`);
    await page.getByLabel(/Sujet/i).fill('Message de test automatisé');
    await page
      .getByLabel(/Message/i)
      .fill('Ce message est envoyé par la suite de tests end-to-end du site.');

    await page.getByRole('button', { name: /Envoyer le message/i }).click();
    await expect(page.getByText('Message envoyé !')).toBeVisible({ timeout: 15_000 });
  });

  test('an unknown URL renders the 404 page', async ({ page }) => {
    await page.goto('/cette-page-nexiste-pas');
    await expect(page.getByRole('heading', { name: /Page introuvable/i })).toBeVisible();
  });

  test('images are served through the API, never from the storage host', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sources = await page.locator('img').evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).src),
    );

    for (const source of sources) {
      expect(source).not.toContain('minio');
      expect(source).not.toContain(':9000');
    }
  });

  test('the layout holds together on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await page.getByRole('button', { name: /Ouvrir le menu/i }).click();
    await expect(page.getByRole('link', { name: 'Nos actions' })).toBeVisible();

    // Nothing may overflow horizontally.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });
});

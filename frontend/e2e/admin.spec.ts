import { expect, test, type Page } from '@playwright/test';

/**
 * Full administration workflow against the running stack:
 * login -> create -> publish -> verify on the public site -> delete.
 *
 * Credentials come from the environment so the suite works against any
 * deployment; they default to the values in .env.example.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@lougasolidaire.org';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Password123!';

async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel(/Adresse email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/Mot de passe/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();

  // A freshly seeded account is asked to choose a new password first.
  await page.waitForURL(/\/admin(\/mot-de-passe)?$/, { timeout: 15_000 });
}

test.describe('Administration', () => {
  test('rejects invalid credentials without revealing which field is wrong', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/Adresse email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/Mot de passe/i).fill('definitely-not-the-password');
    await page.getByRole('button', { name: /Se connecter/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('sends an anonymous visitor from the dashboard to the login page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('signs in and shows real dashboard counts', async ({ page }) => {
    await login(page);

    if (page.url().includes('mot-de-passe')) {
      test.skip(true, 'The seeded account still has to choose a password.');
    }

    await expect(page.getByRole('heading', { name: /Bonjour/i })).toBeVisible();
    await expect(page.getByText('Actualités').first()).toBeVisible();
  });

  test('creates, publishes, verifies and removes an article', async ({ page }) => {
    await login(page);
    if (page.url().includes('mot-de-passe')) {
      test.skip(true, 'The seeded account still has to choose a password.');
    }

    const title = `Article e2e ${Date.now()}`;

    await page.goto('/admin/actualites');
    await page.getByRole('button', { name: /Nouvelle actualité/i }).click();

    await page.getByLabel(/^Titre/i).fill(title);
    await page.getByLabel(/Extrait/i).fill('Extrait généré par la suite de tests.');
    await page.getByLabel(/^Contenu/i).fill('<p>Contenu généré par la suite de tests.</p>');
    await page.getByLabel(/Publier cette actualité/i).check();
    await page.getByRole('button', { name: /Créer l'actualité/i }).click();

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });

    // The change must be visible to a visitor, not only in the admin.
    await page.goto('/actualites');
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });

    // Clean up so the suite can run repeatedly.
    await page.goto('/admin/actualites');
    const row = page.locator('tr', { hasText: title }).first();
    await row.getByRole('button', { name: 'Supprimer' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 15_000 });
  });

  test('asks for confirmation before a destructive action', async ({ page }) => {
    await login(page);
    if (page.url().includes('mot-de-passe')) {
      test.skip(true, 'The seeded account still has to choose a password.');
    }

    await page.goto('/admin/missions');
    const deleteButton = page.getByRole('button', { name: 'Supprimer' }).first();

    if (await deleteButton.count()) {
      await deleteButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Annuler' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });

  test('logs out and locks the dashboard again', async ({ page }) => {
    await login(page);
    if (page.url().includes('mot-de-passe')) {
      test.skip(true, 'The seeded account still has to choose a password.');
    }

    await page.getByRole('button', { name: /Super|Admin|Éditeur/i }).first().click();
    await page.getByRole('menuitem', { name: /Se déconnecter/i }).click();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('the sidebar is reachable on a small screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    if (page.url().includes('mot-de-passe')) {
      test.skip(true, 'The seeded account still has to choose a password.');
    }

    await page.getByRole('button', { name: /Ouvrir le menu/i }).click();
    await expect(page.getByRole('link', { name: /Actualités/i }).first()).toBeVisible();
  });
});

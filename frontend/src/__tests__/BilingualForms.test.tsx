import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'SUPER_ADMIN' }, can: () => true, isAuthenticated: true }),
}));

import api from '../lib/api/axios';
import { ImpactAdmin } from '../pages/admin/ImpactAdmin';
import { renderWithProviders } from './testUtils';

const mocked = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

/** A figure the association wrote in French and has not translated yet. */
const FRENCH_ONLY = {
  id: 's1',
  label: { fr: 'Arbres plantés' },
  value: 20,
  color: '#87CE18',
  icon: 'Trees',
  order: 0,
  isPublished: true,
};

beforeEach(() => {
  mocked.get.mockReset();
  mocked.post.mockReset();
  mocked.patch.mockReset();
  mocked.get.mockResolvedValue({ data: [FRENCH_ONLY] });
  mocked.post.mockResolvedValue({ data: {} });
  mocked.patch.mockResolvedValue({ data: {} });
});

const openEditor = async () => {
  const user = userEvent.setup();
  renderWithProviders(<ImpactAdmin />, { route: '/admin/impact' });
  await screen.findAllByText('Arbres plantés');
  await user.click(screen.getAllByRole('button', { name: 'Modifier' })[0]);
  return user;
};

describe('bilingual admin forms', () => {
  it('flags a record that has no Arabic, in the list', async () => {
    renderWithProviders(<ImpactAdmin />, { route: '/admin/impact' });
    await screen.findAllByText('Arbres plantés');

    // ✓ FR, ⚠ ع — visible without opening the record.
    const french = screen.getAllByText('FR')[0].closest('span')!;
    const arabic = screen.getAllByText('ع')[0].closest('span')!;
    expect(french.className).toContain('bg-green/15');
    expect(arabic.className).toContain('bg-orange/15');
  });

  it('loads the whole record, not one language of it', async () => {
    await openEditor();

    // French is there, and the Arabic tab warns rather than showing French.
    expect(screen.getByRole('textbox')).toHaveValue('Arbres plantés');
    expect(screen.getByText('Traduction arabe manquante')).toBeInTheDocument();
  });

  it('adds Arabic without touching the French already stored', async () => {
    const user = await openEditor();

    await user.click(screen.getByRole('tab', { name: /العربية/ }));
    await user.type(screen.getByRole('textbox'), 'الأشجار المغروسة');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mocked.patch).toHaveBeenCalled());
    const [, payload] = mocked.patch.mock.calls[0];
    // Both languages in one record, and the French is byte-for-byte what it was.
    expect(payload.label).toEqual({ fr: 'Arbres plantés', ar: 'الأشجار المغروسة' });
  });

  it('keeps the Arabic when only the French is edited', async () => {
    mocked.get.mockResolvedValue({
      data: [{ ...FRENCH_ONLY, label: { fr: 'Arbres plantés', ar: 'الأشجار المغروسة' } }],
    });
    const user = await openEditor();

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Arbres et arbustes plantés');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mocked.patch).toHaveBeenCalled());
    const [, payload] = mocked.patch.mock.calls[0];
    expect(payload.label).toEqual({
      fr: 'Arbres et arbustes plantés',
      ar: 'الأشجار المغروسة',
    });
  });

  it('refuses to save without French, and says which language is missing', async () => {
    const user = await openEditor();

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Le français est obligatoire')).toBeInTheDocument();
    expect(mocked.patch).not.toHaveBeenCalled();
  });

  it('saves with French alone, because Arabic can come later', async () => {
    const user = await openEditor();

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Arbres plantés en 2026');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mocked.patch).toHaveBeenCalled());
    expect(mocked.patch.mock.calls[0][1].label).toEqual({ fr: 'Arbres plantés en 2026' });
  });

  it('writes each language in its own direction', async () => {
    const user = await openEditor();

    expect(screen.getByRole('textbox')).toHaveAttribute('dir', 'ltr');
    await user.click(screen.getByRole('tab', { name: /العربية/ }));
    expect(screen.getByRole('textbox')).toHaveAttribute('dir', 'rtl');
  });

  it('never sends an empty string for a language left untouched', async () => {
    const user = await openEditor();

    // An empty string is how the API is told to delete a translation; an
    // untouched tab must not look like a deletion.
    await user.click(screen.getByRole('tab', { name: /العربية/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mocked.patch).toHaveBeenCalled());
    expect(mocked.patch.mock.calls[0][1].label).not.toHaveProperty('ar');
  });
});

import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  LocalizedField,
  cleanLocalized,
  type LocalizedValue,
} from '../components/i18n/LocalizedField';
import { TranslationStatus } from '../components/i18n/TranslationStatus';

const Harness = ({ initial = {} as LocalizedValue }) => {
  const [value, setValue] = useState<LocalizedValue>(initial);
  return (
    <>
      <LocalizedField id="title" label="Titre" value={value} onChange={setValue} required />
      <output data-testid="state">{JSON.stringify(value)}</output>
    </>
  );
};

describe('localized field', () => {
  it('edits one record in two languages, not two records', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('textbox'), 'Éducation');
    await user.click(screen.getByRole('tab', { name: /العربية/ }));
    await user.type(screen.getByRole('textbox'), 'التعليم');

    // One value carrying both languages, which is what the API stores.
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toEqual({
      fr: 'Éducation',
      ar: 'التعليم',
    });
  });

  it('keeps each language in its own writing direction', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole('textbox')).toHaveAttribute('dir', 'ltr');
    await user.click(screen.getByRole('tab', { name: /العربية/ }));
    expect(screen.getByRole('textbox')).toHaveAttribute('dir', 'rtl');
  });

  it('says the Arabic is missing without opening its tab', () => {
    render(<Harness initial={{ fr: 'Éducation' }} />);

    expect(screen.getByText('Traduction arabe manquante')).toBeInTheDocument();
    // The warning is on the tab itself, so it is visible while editing French.
    const arabicTab = screen.getByRole('tab', { name: /العربية/ });
    expect(within(arabicTab).getByLabelText('Traduction manquante')).toBeInTheDocument();
  });

  it('stops warning once the Arabic is there', () => {
    render(<Harness initial={{ fr: 'Éducation', ar: 'التعليم' }} />);
    expect(screen.queryByText('Traduction arabe manquante')).toBeNull();
  });

  it('does not report the French tab as missing when it is filled', () => {
    render(<Harness initial={{ fr: 'Éducation' }} />);
    const frenchTab = screen.getByRole('tab', { name: /Français/ });
    expect(within(frenchTab).queryByLabelText('Traduction manquante')).toBeNull();
  });
});

describe('cleanLocalized', () => {
  it('drops a language the editor never typed into', () => {
    // An untouched tab would otherwise be sent as '', which the API reads as
    // "remove this translation" - and would delete what is already stored.
    expect(cleanLocalized({ fr: 'Éducation', ar: '' })).toEqual({ fr: 'Éducation' });
    expect(cleanLocalized({ fr: 'Éducation', ar: '   ' })).toEqual({ fr: 'Éducation' });
  });

  it('trims what it keeps', () => {
    expect(cleanLocalized({ fr: '  Éducation  ', ar: ' التعليم ' })).toEqual({
      fr: 'Éducation',
      ar: 'التعليم',
    });
  });
});

describe('translation status', () => {
  it('reports a record complete only when every field has the language', () => {
    render(
      <TranslationStatus
        fields={[{ fr: 'Titre', ar: 'العنوان' }, { fr: 'Résumé' }]}
      />,
    );

    // A title in Arabic with no summary is not a translated article.
    expect(screen.getByText('FR').closest('span')!.className).toContain('bg-green/15');
    expect(screen.getByText('ع').closest('span')!.className).toContain('bg-orange/15');
  });

  it('reports both languages complete when they are', () => {
    render(
      <TranslationStatus
        fields={[{ fr: 'Titre', ar: 'العنوان' }, { fr: 'Résumé', ar: 'الملخّص' }]}
      />,
    );
    expect(screen.getByText('ع').closest('span')!.className).toContain('bg-green/15');
  });
});

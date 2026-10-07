import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { LocaleProvider, useLocale } from '../context/LocaleContext';
import { LOCALE_STORAGE_KEY } from '../lib/i18n/locale';

const Probe = () => {
  const location = useLocation();
  const { locale, direction, setLocale } = useLocale();
  return (
    <>
      <output data-testid="url">{`${location.pathname}${location.search}`}</output>
      <output data-testid="locale">{locale}</output>
      <output data-testid="dir">{direction}</output>
      <output data-testid="html-lang">{document.documentElement.getAttribute('lang')}</output>
      <button type="button" onClick={() => setLocale('ar')}>
        passer en arabe
      </button>
      <button type="button" onClick={() => setLocale('fr')}>
        repasser en français
      </button>
      <Link to="/a-propos">À propos</Link>
    </>
  );
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LocaleProvider>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </LocaleProvider>
    </MemoryRouter>,
  );

/**
 * Pretends the visitor's device is set to a given list of languages.
 *
 * `navigator.languages` is read-only, so it has to be redefined rather than
 * assigned; the spy is undone after each test so one device setting never
 * leaks into the next case.
 */
const deviceLanguages = (languages: readonly string[]) => {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([...languages]);
};

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
});

describe('locale provider', () => {
  it('opens a shared Arabic address in Arabic', () => {
    renderAt('/a-propos?lang=ar');
    expect(screen.getByTestId('locale')).toHaveTextContent('ar');
  });

  it('opens in Arabic on a device set to Arabic, with no address and nothing stored', () => {
    // The visitor the switch exists for: arriving cold, from a shared link
    // with no parameter, on a phone whose system language is Arabic.
    deviceLanguages(['ar-MA', 'fr-FR']);
    renderAt('/');
    expect(screen.getByTestId('locale')).toHaveTextContent('ar');
    expect(screen.getByTestId('dir')).toHaveTextContent('rtl');
  });

  it('states the detected language in the address, so the page stays shareable', () => {
    deviceLanguages(['ar']);
    renderAt('/a-propos');
    expect(screen.getByTestId('url')).toHaveTextContent('/a-propos?lang=ar');
  });

  it('stays in French on any device that is not set to Arabic', () => {
    deviceLanguages(['en-US', 'en']);
    renderAt('/');
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    expect(screen.getByTestId('url').textContent).not.toContain('lang');
  });

  it('lets an Arabic-speaking visitor choose French and keeps that choice', async () => {
    // Detection is a starting point, not a verdict: it must not fight the
    // visitor who then picks the other language.
    const user = userEvent.setup();
    deviceLanguages(['ar']);
    renderAt('/');
    await user.click(screen.getByRole('button', { name: /repasser en fran/i }));
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    expect(screen.getByTestId('url').textContent).not.toContain('lang=ar');
  });

  it('tells the document what it is', () => {
    renderAt('/?lang=ar');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('leaves French addresses exactly as they were', () => {
    renderAt('/a-propos');
    // French is the default, so it travels without a parameter and every
    // existing URL keeps working untouched.
    expect(screen.getByTestId('url')).toHaveTextContent('/a-propos');
    expect(screen.getByTestId('url').textContent).not.toContain('lang');
  });

  it('keeps the language in the address across a navigation', async () => {
    const user = userEvent.setup();
    renderAt('/?lang=ar');

    await user.click(screen.getByRole('link', { name: 'À propos' }));

    // A <Link> navigates with pushState and carries no query of its own. The
    // provider puts the parameter back, otherwise an Arabic page stops being
    // shareable after one click and its canonical points at the French page.
    expect(screen.getByTestId('url')).toHaveTextContent('/a-propos?lang=ar');
    expect(screen.getByTestId('locale')).toHaveTextContent('ar');
  });

  it('goes back to French, and stays there', async () => {
    const user = userEvent.setup();
    renderAt('/?lang=ar');
    expect(screen.getByTestId('locale')).toHaveTextContent('ar');

    await user.click(screen.getByRole('button', { name: 'repasser en français' }));

    /*
      The language used to live in React state alongside the address, and the
      two committed in separate renders: going back to French produced a render
      still holding `ar` with an address that had already lost its parameter,
      and the effect put `?lang=ar` back. The switch appeared to do nothing and
      the visitor was locked in Arabic.
    */
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    expect(screen.getByTestId('url').textContent).not.toContain('lang=');
    expect(screen.getByTestId('dir')).toHaveTextContent('ltr');
  });

  it('still goes back to French after navigating in Arabic', async () => {
    const user = userEvent.setup();
    renderAt('/?lang=ar');

    await user.click(screen.getByRole('link', { name: 'À propos' }));
    expect(screen.getByTestId('url')).toHaveTextContent('/a-propos?lang=ar');

    await user.click(screen.getByRole('button', { name: 'repasser en français' }));
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    expect(screen.getByTestId('url')).toHaveTextContent('/a-propos');
    expect(screen.getByTestId('url').textContent).not.toContain('lang=');
  });

  it('remembers the choice for the next visit', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(screen.getByRole('button', { name: 'passer en arabe' }));

    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ar');
    expect(screen.getByTestId('url')).toHaveTextContent('/?lang=ar');
  });

  it('refuses a language the site is not published in', () => {
    renderAt('/?lang=en');
    // Never trusted: the value is coerced before it reaches anything.
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
  });

  it('refuses an address trying to smuggle something else in', () => {
    renderAt('/?lang=%2F%2Fevil.example');
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    expect(screen.getByTestId('dir')).toHaveTextContent('ltr');
  });
});

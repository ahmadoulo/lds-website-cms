import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { cn, FONT_SIZES, RADII, SHADOWS } from '../lib/cn';
import { Button } from '../components/ui/Button';

describe('cn — the theme tokens tailwind-merge has to be told about', () => {
  /*
    The bug these guard against was invisible in the markup. tailwind-merge
    does not recognise `text-body` as a font size, files it under text colour
    instead, and then deletes `text-white` as a duplicate - so a navy button
    rendered navy text on navy. Every sm and lg button was like that,
    including the one people log in with.
  */
  it('keeps the text colour when a font size follows it', () => {
    for (const size of FONT_SIZES) {
      expect(cn('bg-navy text-white', `text-${size}`)).toContain('text-white');
    }
  });

  it('still lets one font size override another', () => {
    expect(cn('text-body', 'text-lead')).toBe('text-lead');
    expect(cn('text-sm', 'text-caption')).toBe('text-caption');
  });

  it('still lets one text colour override another', () => {
    expect(cn('text-navy', 'text-green')).toBe('text-green');
  });

  it('resolves the custom radii and shadows as conflicts', () => {
    expect(cn('rounded-lg', 'rounded-card')).toBe('rounded-card');
    expect(cn('shadow-e1', 'shadow-e3')).toBe('shadow-e3');
    // A shadow colour must survive a shadow size, for the same reason.
    expect(cn('shadow-navy/20', 'shadow-e2')).toContain('shadow-navy/20');
  });
});

describe('design tokens stay in step with cn', () => {
  const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

  /** The token names declared in the `@theme` block, by namespace. */
  const declared = (namespace: string) =>
    [...css.matchAll(new RegExp(`^\\s*--${namespace}-([a-z0-9-]+):`, 'gm'))]
      .map((match) => match[1])
      // `--text-body--line-height` declares a property of `body`, not a token.
      .filter((name) => !name.includes('--'))
      .sort();

  /*
    A token added to the stylesheet and not to cn.ts is a class tailwind-merge
    will silently delete again. That is the failure mode worth a test: nothing
    looks wrong until something disappears on screen.
  */
  it('knows every font size in the stylesheet', () => {
    expect(declared('text')).toEqual([...FONT_SIZES].sort());
  });

  it('knows every shadow in the stylesheet', () => {
    expect(declared('shadow')).toEqual([...SHADOWS].sort());
  });

  it('knows the radii Tailwind does not already ship', () => {
    const shipped = new Set(['4xl']);
    expect(declared('radius').filter((name) => !shipped.has(name))).toEqual([...RADII].sort());
  });
});

describe('Button', () => {
  it('has a readable label at every size and variant', () => {
    const variants = ['primary', 'secondary', 'danger'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;

    for (const variant of variants) {
      for (const size of sizes) {
        const { unmount } = render(
          React.createElement(Button, { variant, size }, `${variant}-${size}`),
        );
        const button = screen.getByRole('button', { name: `${variant}-${size}` });

        // A filled button states its own text colour. Inheriting it is how the
        // navy one ended up with navy text on navy.
        expect(button.className).toContain('text-white');
        unmount();
      }
    }
  });
});

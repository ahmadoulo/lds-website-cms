import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
  tailwind-merge has to be told about the theme, or it guesses - and it guesses
  wrong in a way that deletes classes silently.

  `text-body` is a font size here. tailwind-merge ships knowing Tailwind's own
  scale (xs, sm, base, lg, 2xl...), recognises nothing called `body`, and so
  files it under text *colour* instead. `cn('bg-navy text-white', 'text-body')`
  then returned `bg-navy text-body`: the colour was dropped as a duplicate, the
  button inherited navy from its surroundings, and navy text on a navy button
  is an invisible button. Every `size="sm"` and `size="lg"` button on the site
  was in that state, the login button among them.

  Nothing in the markup looked wrong, which is why it survived review: the
  class that mattered was removed after the component had written it.

  The three lists below are the theme's own tokens, from `index.css`. A token
  added there and not here is a class that can be silently deleted again, so
  `designSystem.test.ts` reads the stylesheet and fails if the two drift apart.
*/

/** `--text-*` in the `@theme` block. */
export const FONT_SIZES = [
  'eyebrow',
  'caption',
  'body',
  'body-lg',
  'lead',
  'h3',
  'h2',
  'h2-sm',
  'h1',
  'display',
  'stat',
] as const;

/** `--radius-*`, minus the ones Tailwind already ships. */
export const RADII = ['card', 'panel'] as const;

/** `--shadow-*`. */
export const SHADOWS = [
  'e1',
  'e2',
  'e3',
  'e4',
  'soft',
  'soft-hover',
  'cta',
  'cta-hover',
  'header',
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZES] }],
      rounded: [{ rounded: [...RADII] }],
      'shadow': [{ shadow: [...SHADOWS] }],
    },
  },
});

/** Merges conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

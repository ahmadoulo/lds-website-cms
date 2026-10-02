/**
 * Unicode isolation for a value whose direction is not the paragraph's.
 *
 * A phone number, an email, a file name or a slug dropped into an Arabic
 * sentence is laid out by the bidirectional algorithm against the surrounding
 * right-to-left text: `+221 77 472 33 64` comes out with its parts in the wrong
 * order, and a leading `/` on a path jumps to the far side of the line. The
 * characters are correct in the DOM - only their visual order is wrong, which
 * is why it survives a copy-paste and is so easy to miss.
 *
 * FIRST STRONG ISOLATE opens a run whose direction is read from its own first
 * strong character, and POP DIRECTIONAL ISOLATE closes it. Inside JSX the `bdi`
 * element does the same thing and is preferable, because it needs no invisible
 * characters in the text; this is for strings built in a dictionary, where
 * there is no element to reach for.
 */
const FIRST_STRONG_ISOLATE = '\u2068';
const POP_DIRECTIONAL_ISOLATE = '\u2069';

export function isolate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return `${FIRST_STRONG_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;
}

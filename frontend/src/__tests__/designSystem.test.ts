import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * The visual drift this guards against is what made the site feel assembled
 * rather than designed: sixteen hand-written shadows, nineteen font sizes and
 * seven section paddings, none of them named. A new arbitrary value should be
 * a deliberate decision, not something that slips in unnoticed.
 */
const SRC = join(__dirname, '..');

function tsxFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) tsxFiles(full, found);
    else if (entry.endsWith('.tsx')) found.push(full);
  }
  return found;
}

const FILES = tsxFiles(SRC).map((path) => ({
  path: path.slice(SRC.length + 1).split(sep).join('/'),
  content: readFileSync(path, 'utf8'),
}));

const offenders = (pattern: RegExp) =>
  FILES.flatMap(({ path, content }) =>
    (content.match(pattern) ?? []).map((match: string) => `${path}: ${match}`),
  );

describe('design system', () => {
  it('has files to check', () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  it('declares no hand-written shadow', () => {
    expect(offenders(/shadow-\[[^\]]+\]/g)).toEqual([]);
  });

  it('declares no arbitrary font size', () => {
    expect(offenders(/text-\[(?:\d|clamp)[^\]]*\]/g)).toEqual([]);
  });

  it('declares no arbitrary padding', () => {
    // The first version only looked at `py-`, so the hero kept a pb-/pt- pair
    // and its stale markup went unnoticed through a whole review.
    expect(offenders(/p[trblxy]?-\[\d+px\]/g)).toEqual([]);
  });

  it('declares no arbitrary corner radius', () => {
    expect(offenders(/rounded-\[\d+px\]/g)).toEqual([]);
  });

  it('repeats no hard-coded page container', () => {
    // The gutter and max-width live in .container-page.
    expect(offenders(/max-w-\[1280px\]/g)).toEqual([]);
  });

  it('reserves no viewport height in the wrong unit', () => {
    // `vh` on a phone is the viewport with the browser chrome hidden, so a
    // 60vh block reserves height the visitor cannot see, and a 92vh modal puts
    // its save button under the chrome. .min-h-page and dvh are the answers.
    expect(offenders(/(?:min|max)-h-\[\d+[ls]?vh\]/g)).toEqual([]);
  });

  it('forces no element wider than a small phone', () => {
    // A bare min-width above ~320px makes the page scroll sideways.
    expect(offenders(/min-w-\[\d{3,}px\]/g)).toEqual([]);
  });
});

describe('mobile ergonomics', () => {
  const NEWLINE = String.fromCharCode(10);

  it('never lets a form control fall below 16px on a phone', () => {
    // Below 16px iOS Safari zooms the page in on focus and leaves the visitor
    // scrolled sideways. The unprefixed class is the one that matters; the
    // `sm:` pair afterwards restores the 14px desktop size.
    const field = FILES.find((f) => f.path === 'components/ui/Field.tsx')!;
    expect(field.content).toContain('px-3 py-3 text-base');
    expect(field.content).toContain('sm:py-2.5 sm:text-sm');
  });

  it('gives every interactive element a finger-sized target', () => {
    /*
      A control whose only vertical padding is p-1 or py-2 lands around 32px.
      That is what made the phone header feel imprecise. A fixed h-11/min-h-11
      is the way out, so anything relying on small padding alone is reported
      with the file and line that has to change.
    */
    const tag = /<(?:button|a|Link|NavLink)\b[^>]*/g;
    const smallPadding = /(?<![:\w-])(?:p|py)-[0-2](?:\.5)?(?![\d.])/;
    const explicitHeight = /(?<![:\w-])(?:min-)?h-1[0-9](?![\d.])/;
    const scope = /^(?:pages\/public|components\/(?:public|layout|ui|admin\/layout))\//;

    const offending = FILES.flatMap(({ path, content }) => {
      if (!scope.test(path)) return [];
      return [...content.matchAll(tag)].flatMap((match) => {
        const classes = /className=(?:"[^"]*"|\{[^}]*)/.exec(match[0])?.[0] ?? '';
        if (!smallPadding.test(classes) || explicitHeight.test(classes)) return [];
        return [`${path}:${content.slice(0, match.index).split(NEWLINE).length}`];
      });
    });

    expect(offending).toEqual([]);
  });
});

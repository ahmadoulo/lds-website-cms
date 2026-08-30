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

  it('declares no arbitrary section padding', () => {
    expect(offenders(/py-\[\d+px\]/g)).toEqual([]);
  });

  it('declares no arbitrary corner radius', () => {
    expect(offenders(/rounded-\[\d+px\]/g)).toEqual([]);
  });

  it('repeats no hard-coded page container', () => {
    // The gutter and max-width live in .container-page.
    expect(offenders(/max-w-\[1280px\]/g)).toEqual([]);
  });

  it('forces no element wider than a small phone', () => {
    // A bare min-width above ~320px makes the page scroll sideways.
    expect(offenders(/min-w-\[\d{3,}px\]/g)).toEqual([]);
  });
});

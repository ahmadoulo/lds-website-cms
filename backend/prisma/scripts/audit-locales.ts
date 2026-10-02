import { PrismaClient } from '@prisma/client';

/**
 * Reports what every localized column actually holds, per language.
 *
 * Read-only. It exists to answer one question with the real production data
 * rather than a guess: does the legacy `en` key carry anything worth keeping,
 * and how much Arabic is still missing?
 *
 *   npm run i18n:audit
 */
const prisma = new PrismaClient();

/** Every localized column, by model. Keep in step with schema.prisma. */
const FIELDS: Array<[string, string[]]> = [
  ['navigationItem', ['label']],
  ['media', ['altText']],
  ['mission', ['title', 'description', 'content']],
  ['newsCategory', ['name']],
  ['news', ['title', 'excerpt', 'content']],
  ['galleryAlbum', ['title', 'description']],
  ['galleryImage', ['caption']],
  ['impactStatistic', ['label']],
  ['donationMethod', ['title', 'description', 'actionLabel']],
];

type Tally = { rows: number; fr: number; ar: number; en: number; other: Set<string> };

function text(value: unknown, locale: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const raw = (value as Record<string, unknown>)[locale];
  return typeof raw === 'string' && raw.trim() ? raw : null;
}

async function main() {
  const missing: string[] = [];
  const legacy: string[] = [];

  for (const [model, fields] of FIELDS) {
    const rows: any[] = await (prisma as any)[model].findMany();
    if (rows.length === 0) continue;

    console.log(`\n${model}  (${rows.length} ligne${rows.length > 1 ? 's' : ''})`);

    for (const field of fields) {
      const tally: Tally = { rows: 0, fr: 0, ar: 0, en: 0, other: new Set() };

      for (const row of rows) {
        const value = row[field];
        if (value === null || value === undefined) continue;
        tally.rows += 1;
        if (text(value, 'fr')) tally.fr += 1;
        if (text(value, 'ar')) tally.ar += 1;
        if (text(value, 'en')) tally.en += 1;
        for (const key of Object.keys(value)) {
          if (!['fr', 'ar', 'en'].includes(key)) tally.other.add(key);
        }
      }

      if (tally.rows === 0) continue;

      const extra = tally.other.size ? `  autres: ${[...tally.other].join(', ')}` : '';
      console.log(
        `  ${field.padEnd(14)} renseignes:${String(tally.rows).padStart(4)}` +
          `   fr:${String(tally.fr).padStart(4)}` +
          `   ar:${String(tally.ar).padStart(4)}` +
          `   en:${String(tally.en).padStart(4)}${extra}`,
      );

      if (tally.ar < tally.fr) missing.push(`${model}.${field}: ${tally.fr - tally.ar} a traduire`);
      if (tally.en > 0) {
        legacy.push(`${model}.${field}: ${tally.en}`);
        // One sample, so a human can judge whether it is worth keeping.
        const sample = rows.map((row) => text(row[field], 'en')).find(Boolean);
        if (sample) console.log(`    exemple en : ${sample.slice(0, 90)}`);
      }
    }
  }

  console.log('\n--- A TRADUIRE EN ARABE ---');
  console.log(missing.length ? missing.map((line) => `  ${line}`).join('\n') : '  rien');

  console.log('\n--- CLE "en" HERITEE (jamais affichee) ---');
  if (!legacy.length) {
    console.log('  aucune : la cle peut etre retiree de SUPPORTED_LOCALES sans rien perdre');
  } else {
    console.log(legacy.map((line) => `  ${line}`).join('\n'));
    console.log('\n  Ces valeurs sont conservees telles quelles : une modification depuis');
    console.log("  l'administration ne les ecrase plus. Rien n'est supprime sans decision.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

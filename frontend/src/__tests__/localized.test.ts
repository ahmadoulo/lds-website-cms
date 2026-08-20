import { describe, expect, it } from 'vitest';
import { t } from '../lib/types';

describe('t (localized field reader)', () => {
  it('prefers French', () => {
    expect(t({ fr: 'Éducation', en: 'Education' })).toBe('Éducation');
  });

  it('falls back to English when French is missing', () => {
    expect(t({ en: 'Education' })).toBe('Education');
  });

  it('falls back to any available locale', () => {
    expect(t({ wo: 'Njàng' })).toBe('Njàng');
  });

  it('returns the fallback for null or undefined', () => {
    expect(t(null, 'Sans titre')).toBe('Sans titre');
    expect(t(undefined, 'Sans titre')).toBe('Sans titre');
  });

  it('returns the fallback for an empty object', () => {
    expect(t({}, 'Sans titre')).toBe('Sans titre');
  });
});

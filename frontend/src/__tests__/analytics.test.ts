import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installAnalyticsQueue, track } from '../lib/analytics';

beforeEach(() => {
  delete window.plausible;
});

afterEach(() => {
  delete window.plausible;
  vi.restoreAllMocks();
});

describe('analytics queue', () => {
  it('collects events recorded before the tracker arrives', () => {
    // The tracker is deferred, so our own code can run first.
    installAnalyticsQueue();
    track('Don', { methode: 'wave' });

    expect(window.plausible!.q).toEqual([['Don', { props: { methode: 'wave' } }]]);
  });

  it('never replaces a tracker that has already loaded', () => {
    const real = vi.fn();
    window.plausible = real;

    installAnalyticsQueue();
    track('Don');

    expect(window.plausible).toBe(real);
    expect(real).toHaveBeenCalledWith('Don', undefined);
  });

  it('does nothing when the tracker was blocked', () => {
    // An ad blocker, an offline visitor or a failed request are all ordinary,
    // and none of them is a reason for a button to stop working.
    expect(() => track('Don')).not.toThrow();
  });

  it('swallows a tracker that throws', () => {
    window.plausible = vi.fn(() => {
      throw new Error('blocked');
    });

    expect(() => track('Don')).not.toThrow();
  });
});

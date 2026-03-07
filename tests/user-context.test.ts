import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('getUserContext', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:34:56.000Z'));
    vi.stubGlobal('navigator', { language: 'fr-SG' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('captures browser language, timezone, and the current timestamp', async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { getUserContext } = await import('@/lib/user-context');

    expect(getUserContext()).toEqual({
      localTime: '2026-03-07T12:34:56.000Z',
      timezone,
      language: 'fr-SG',
    });
  });
});

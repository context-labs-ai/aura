import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('reverseGeocode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-maps-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  it('caches nearby coordinates for 60 seconds and reuses the parsed address', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            formatted_address: '1 Market St, San Francisco, CA 94105, USA',
            address_components: [
              {
                long_name: 'San Francisco',
                short_name: 'SF',
                types: ['locality', 'political'],
              },
              {
                long_name: 'United States',
                short_name: 'US',
                types: ['country', 'political'],
              },
            ],
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { reverseGeocode } = await import('@/lib/geocoding');

    const first = await reverseGeocode(37.7936, -122.3958);
    const second = await reverseGeocode(37.7937, -122.3957);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({
      formatted: '1 Market St, San Francisco, CA 94105, USA',
      city: 'San Francisco',
      country: 'United States',
    });
    expect(second).toEqual(first);
  });
});

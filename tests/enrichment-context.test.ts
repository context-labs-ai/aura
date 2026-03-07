import { beforeEach, describe, expect, it, vi } from 'vitest';

const analyzeFrameMock = vi.fn();
const enrichWithGroundingMock = vi.fn();
const getUserContextMock = vi.fn();
const reverseGeocodeMock = vi.fn();
const searchNearbyPlacesMock = vi.fn();
const getPlaceDetailsMock = vi.fn();

vi.mock('@/lib/gemini', () => ({
  analyzeFrame: analyzeFrameMock,
  enrichWithGrounding: enrichWithGroundingMock,
}));

vi.mock('@/lib/user-context', () => ({
  getUserContext: getUserContextMock,
}));

vi.mock('@/lib/geocoding', () => ({
  reverseGeocode: reverseGeocodeMock,
}));

vi.mock('@/lib/places', () => ({
  searchNearbyPlaces: searchNearbyPlacesMock,
  getPlaceDetails: getPlaceDetailsMock,
}));

describe('enrichment grounding context', () => {
  beforeEach(() => {
    vi.resetModules();
    analyzeFrameMock.mockReset();
    enrichWithGroundingMock.mockReset();
    getUserContextMock.mockReset();
    reverseGeocodeMock.mockReset();
    searchNearbyPlacesMock.mockReset();
    getPlaceDetailsMock.mockReset();

    getUserContextMock.mockReturnValue({
      localTime: '2026-03-07T23:45:00.000Z',
      timezone: 'America/Los_Angeles',
      language: 'en-US',
    });
    reverseGeocodeMock.mockResolvedValue({
      formatted: '1 Market St, San Francisco, CA 94105, USA',
      city: 'San Francisco',
      country: 'United States',
    });
    enrichWithGroundingMock.mockResolvedValue({
      text: 'Popular with commuters and tourists.',
      sources: [],
      searchQueries: [],
    });
    searchNearbyPlacesMock.mockResolvedValue([]);
    getPlaceDetailsMock.mockResolvedValue(null);
  });

  it('passes user, location, and visual context into building grounding', async () => {
    analyzeFrameMock.mockResolvedValue({
      mode: 'building',
      title: 'Starbucks Reserve',
      subtitle: 'Coffee Shop',
      panels: [],
      confidence: 0.92,
      timestamp: 111,
    });

    const { enrichBuildingData } = await import('@/modes/building/enrichment');

    await enrichBuildingData('frame-bytes', 37.7936, -122.3958);

    expect(reverseGeocodeMock).toHaveBeenCalledWith(37.7936, -122.3958);
    expect(enrichWithGroundingMock).toHaveBeenCalledWith({
      query: 'Starbucks Reserve Coffee Shop',
      mode: 'building',
      user: {
        localTime: '2026-03-07T23:45:00.000Z',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
      },
      location: {
        coordinates: { lat: 37.7936, lng: -122.3958 },
        address: {
          formatted: '1 Market St, San Francisco, CA 94105, USA',
          city: 'San Francisco',
          country: 'United States',
        },
      },
      visualContext: {
        title: 'Starbucks Reserve',
        subtitle: 'Coffee Shop',
        confidence: 0.92,
      },
    });
  });

  it('passes user context into product grounding and uses location when available', async () => {
    analyzeFrameMock.mockResolvedValue({
      mode: 'product',
      title: 'Oatly Barista',
      subtitle: 'Oat Drink',
      panels: [],
      confidence: 0.87,
      timestamp: 222,
      composition: ['Oats', 'Water'],
      sustainabilityScore: 8,
      priceEstimate: '$4.99',
    });

    const { enrichProductData } = await import('@/modes/product/enrichment');

    await enrichProductData('frame-bytes', 1.3521, 103.8198);

    expect(reverseGeocodeMock).toHaveBeenCalledWith(1.3521, 103.8198);
    expect(enrichWithGroundingMock).toHaveBeenCalledWith({
      query: 'Oatly Barista Oat Drink',
      mode: 'product',
      user: {
        localTime: '2026-03-07T23:45:00.000Z',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
      },
      location: {
        coordinates: { lat: 1.3521, lng: 103.8198 },
        address: {
          formatted: '1 Market St, San Francisco, CA 94105, USA',
          city: 'San Francisco',
          country: 'United States',
        },
      },
      visualContext: {
        title: 'Oatly Barista',
        subtitle: 'Oat Drink',
        confidence: 0.87,
      },
    });
  });
});

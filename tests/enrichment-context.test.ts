import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BuildingData } from '@/types/overlay';

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
      buildingDetails: {
        currentSummary: 'Popular with commuters and tourists.',
        isLandmark: false,
        landmarkReason: '',
        historicalSummary: '',
        futurePlansStatus: 'none_found',
        futurePlansSummary: '',
        trustLevel: 'low',
        trustReason: 'No reliable grounded output returned.',
      },
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

  it('supports trust fields on building data', () => {
    const building: BuildingData = {
      mode: 'building',
      title: 'Ferry Building',
      subtitle: 'Historic Landmark',
      panels: [],
      confidence: 0.95,
      timestamp: 333,
      isLandmark: true,
      landmarkReason: 'Recognized waterfront landmark.',
      historicalSummary: 'The site has served as a major ferry gateway since the late 1800s.',
      futurePlansStatus: 'proposed',
      futurePlansSummary: 'Public upgrades have been proposed for the waterfront facade.',
      trustLevel: 'medium',
      trustReason: 'History is well grounded, but future work is still proposal-stage.',
    };

    expect(building.trustLevel).toBe('medium');
    expect(building.trustReason).toContain('proposal-stage');
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

  it('preserves product enrichment output shape when grounding succeeds', async () => {
    analyzeFrameMock.mockResolvedValue({
      mode: 'product',
      title: 'Oatly Barista',
      subtitle: 'Oat Drink',
      panels: [{ label: 'Composition', value: 'Oats, Water', type: 'text' }],
      confidence: 0.87,
      timestamp: 222,
      composition: ['Oats', 'Water'],
      sustainabilityScore: 8,
      priceEstimate: '$4.99',
    });
    enrichWithGroundingMock.mockResolvedValue({
      text: 'Current retail price range is $4-6. Alternatives include Minor Figures and Califia Farms.',
      sources: [
        { title: 'Store pricing', url: 'https://example.com/store-pricing' },
        { title: 'Alt milk roundup', url: 'https://example.com/alt-milk' },
      ],
      searchQueries: ['Oatly Barista oat drink price'],
    });

    const { enrichProductData } = await import('@/modes/product/enrichment');

    const result = await enrichProductData('frame-bytes', 1.3521, 103.8198);

    expect(result.panels).toEqual([
      { label: 'Composition', value: 'Oats, Water', type: 'text' },
      {
        label: 'Market Intelligence',
        value: 'Current retail price range is $4-6. Alternatives include Minor Figures and Califia Farms.',
        type: 'text',
      },
      {
        label: 'Sources',
        value: 'Store pricing · Alt milk roundup',
        type: 'text',
      },
    ]);
    expect(result.subtitle).toBe(
      'Looking at Oatly Barista. Made of Oats, Water. Sustainability: 8/10. Price estimate: $4.99.'
    );
  });

  it('maps landmark history and future plans into building data', async () => {
    analyzeFrameMock.mockResolvedValue({
      mode: 'building',
      title: 'Ferry Building',
      subtitle: 'Historic Landmark',
      panels: [],
      confidence: 0.95,
      timestamp: 333,
    });
    enrichWithGroundingMock.mockResolvedValue({
      text: 'Historic waterfront landmark with heavy visitor traffic.',
      sources: [],
      searchQueries: [],
      buildingDetails: {
        currentSummary: 'Historic waterfront landmark with heavy visitor traffic.',
        isLandmark: true,
        landmarkReason: 'Recognized waterfront landmark.',
        historicalSummary: 'The site has served as a major ferry gateway since the late 1800s.',
        futurePlansStatus: 'proposed',
        futurePlansSummary: 'Public upgrades have been proposed for the waterfront facade.',
        trustLevel: 'high',
        trustReason: 'Identity is specific and backed by place-specific public sources.',
      },
    });

    const { enrichBuildingData } = await import('@/modes/building/enrichment');

    const result = await enrichBuildingData('frame-bytes', 37.7936, -122.3958);

    expect(result.data.neighborhoodSummary).toBe(
      'Historic waterfront landmark with heavy visitor traffic.'
    );
    expect(result.data.isLandmark).toBe(true);
    expect(result.data.landmarkReason).toBe('Recognized waterfront landmark.');
    expect(result.data.historicalSummary).toBe(
      'The site has served as a major ferry gateway since the late 1800s.'
    );
    expect(result.data.futurePlansStatus).toBe('proposed');
    expect(result.data.futurePlansSummary).toBe(
      'Public upgrades have been proposed for the waterfront facade.'
    );
    expect(result.data.trustLevel).toBe('high');
    expect(result.data.trustReason).toBe(
      'Identity is specific and backed by place-specific public sources.'
    );
  });
});

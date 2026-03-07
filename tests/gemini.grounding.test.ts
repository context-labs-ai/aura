import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BuildingGroundingResult } from '@/types/grounding';

const generateContentMock = vi.fn();
const GoogleGenAIMock = vi.fn(function GoogleGenAI() {
  return {
    models: {
      generateContent: generateContentMock,
    },
  };
});

const LOW_TRUST_BUILDING_FALLBACK: BuildingGroundingResult = {
  currentSummary: '',
  isLandmark: false,
  landmarkReason: '',
  historicalSummary: '',
  futurePlansStatus: 'none_found',
  futurePlansSummary: '',
  trustLevel: 'low',
  trustReason: 'No reliable grounded output returned.',
};

vi.mock('@google/genai', () => ({
  GoogleGenAI: GoogleGenAIMock,
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));

describe('enrichWithGrounding', () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
  });

  it('builds a building grounding prompt from structured context', async () => {
    generateContentMock.mockResolvedValue({
      text: 'Open daily until 9 PM.',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              {
                web: {
                  title: 'Store hours',
                  uri: 'https://example.com/hours',
                },
              },
            ],
            webSearchQueries: ['Starbucks Reserve San Francisco hours'],
          },
        },
      ],
    });

    const { enrichWithGrounding } = await import('@/lib/gemini');

    await enrichWithGrounding({
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
    } as never);

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const request = generateContentMock.mock.calls[0][0];

    expect(request.contents).toContain('Starbucks Reserve Coffee Shop');
    expect(request.contents).toContain('2026-03-07T23:45:00.000Z');
    expect(request.contents).toContain('San Francisco');
    expect(request.contents).toContain('1 Market St, San Francisco, CA 94105, USA');
    expect(request.contents).toContain('37.7936');
    expect(request.contents).toContain('-122.3958');
    expect(request.contents).toContain('America/Los_Angeles');
    expect(request.contents).toContain('en-US');
    expect(request.contents).toContain('Coffee Shop');
    expect(request.contents).toContain('confidence 0.92');
    expect(request.contents).toContain('historicalSummary');
    expect(request.contents).toContain('futurePlansStatus');
    expect(request.contents).toContain('futurePlansSummary');
    expect(request.contents).toContain('trustLevel');
    expect(request.contents).toContain('trustReason');
    expect(request.contents).toContain('Prefer site or building history over brand history');
    expect(request.contents).toContain('Prefer omission over speculation');
  });

  it('keeps product grounding behavior and metadata extraction unchanged', async () => {
    generateContentMock.mockResolvedValue({
      text: 'Current retail price range is $4-6. Alternatives include Minor Figures and Califia Farms.',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              {
                web: {
                  title: 'Oat milk pricing',
                  uri: 'https://example.com/oat-pricing',
                },
              },
              {
                web: {
                  title: 'Missing URL should be ignored',
                },
              },
            ],
            webSearchQueries: ['Oatly Barista oat drink price'],
          },
        },
      ],
    });

    const { enrichWithGrounding } = await import('@/lib/gemini');

    const result = await enrichWithGrounding({
      query: 'Oatly Barista Oat Drink',
      mode: 'product',
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
        title: 'Oatly Barista',
        subtitle: 'Oat Drink',
        confidence: 0.87,
      },
    } as never);

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const request = generateContentMock.mock.calls[0][0];

    expect(request.config.responseMimeType).toBeUndefined();
    expect(request.contents).toContain('Oatly Barista Oat Drink');
    expect(request.contents).toContain('2026-03-07T23:45:00.000Z');
    expect(request.contents).toContain('America/Los_Angeles');
    expect(request.contents).toContain('en-US');
    expect(request.contents).toContain('1 Market St, San Francisco, CA 94105, USA');
    expect(request.contents).toContain('confidence 0.87');
    expect(request.contents).toContain('Provide: current retail price range, top 2 alternatives');
    expect(result).toEqual({
      text: 'Current retail price range is $4-6. Alternatives include Minor Figures and Califia Farms.',
      sources: [{ title: 'Oat milk pricing', url: 'https://example.com/oat-pricing' }],
      searchQueries: ['Oatly Barista oat drink price'],
      buildingDetails: undefined,
    });
  });

  it('defines trust fields on the building grounding contract', () => {
    const contract: BuildingGroundingResult = {
      currentSummary: 'Historic waterfront landmark with active ferry traffic.',
      isLandmark: true,
      landmarkReason: 'Widely recognized civic landmark.',
      historicalSummary: 'The site has served as a ferry gateway since the late 19th century.',
      futurePlansStatus: 'confirmed',
      futurePlansSummary: 'Facade restoration work has been publicly announced.',
      trustLevel: 'high',
      trustReason: 'Identity is specific and backed by place-specific public sources.',
    };

    expect(contract.trustLevel).toBe('high');
    expect(contract.trustReason).toContain('public sources');
  });

  it('requests structured json for building grounding and parses it', async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        currentSummary: 'Historic waterfront landmark with heavy tourist traffic.',
        isLandmark: true,
        landmarkReason: 'Widely recognized civic landmark.',
        historicalSummary: 'The site has served as a major ferry terminal since the late 19th century.',
        futurePlansStatus: 'confirmed',
        futurePlansSummary: 'Public restoration work is planned for the west facade.',
        trustLevel: 'high',
        trustReason: 'Identity is specific and backed by place-specific public sources.',
      }),
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [],
            webSearchQueries: ['Ferry Building restoration plans'],
          },
        },
      ],
    });

    const { enrichWithGrounding } = await import('@/lib/gemini');

    const result = await enrichWithGrounding({
      query: 'San Francisco Ferry Building',
      mode: 'building',
      user: {
        localTime: '2026-03-07T23:45:00.000Z',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
      },
      visualContext: {
        title: 'Ferry Building',
        subtitle: 'Historic Waterfront Landmark',
        confidence: 0.94,
      },
    } as never);

    const request = generateContentMock.mock.calls[0][0];

    expect(request.config.responseMimeType).toBe('application/json');
    expect(result.text).toBe('Historic waterfront landmark with heavy tourist traffic.');
    expect(result.sources).toEqual([]);
    expect(result.searchQueries).toEqual(['Ferry Building restoration plans']);
    expect(result.buildingDetails).toEqual({
      currentSummary: 'Historic waterfront landmark with heavy tourist traffic.',
      isLandmark: true,
      landmarkReason: 'Widely recognized civic landmark.',
      historicalSummary: 'The site has served as a major ferry terminal since the late 19th century.',
      futurePlansStatus: 'confirmed',
      futurePlansSummary: 'Public restoration work is planned for the west facade.',
      trustLevel: 'high',
      trustReason: 'Identity is specific and backed by place-specific public sources.',
    });
  });

  it('downgrades invalid enum values to safe defaults', async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        currentSummary: 'Landmark with uncertain planning signals.',
        isLandmark: true,
        landmarkReason: 'Recognized local landmark.',
        historicalSummary: 'The site has long served as a local gathering point.',
        futurePlansStatus: 'likely',
        futurePlansSummary: 'A renovation is rumored but not clearly documented.',
        trustLevel: 'very_high',
        trustReason: 'Model emitted an invalid trust enum.',
      }),
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [],
            webSearchQueries: ['landmark renovation plans'],
          },
        },
      ],
    });

    const { enrichWithGrounding } = await import('@/lib/gemini');

    const result = await enrichWithGrounding({
      query: 'Example Landmark',
      mode: 'building',
      user: {
        localTime: '2026-03-07T23:45:00.000Z',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
      },
    } as never);

    expect(result.buildingDetails).toMatchObject({
      currentSummary: 'Landmark with uncertain planning signals.',
      futurePlansStatus: 'none_found',
      trustLevel: 'low',
      trustReason: 'Model emitted an invalid trust enum.',
    });
  });

  it('returns the full low-trust fallback when building grounding emits invalid json', async () => {
    generateContentMock.mockResolvedValue({
      text: '{"currentSummary": "Broken JSON"',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [],
            webSearchQueries: ['example landmark'],
          },
        },
      ],
    });

    const { enrichWithGrounding } = await import('@/lib/gemini');

    const result = await enrichWithGrounding({
      query: 'Example Landmark',
      mode: 'building',
      user: {
        localTime: '2026-03-07T23:45:00.000Z',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
      },
    } as never);

    expect(result.text).toBe('');
    expect(result.buildingDetails).toEqual(LOW_TRUST_BUILDING_FALLBACK);
    expect(result.searchQueries).toEqual(['example landmark']);
  });

  it('returns the full low-trust fallback when building grounding emits no text', async () => {
    generateContentMock.mockResolvedValue({
      text: '',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [],
            webSearchQueries: ['example landmark empty'],
          },
        },
      ],
    });

    const { enrichWithGrounding } = await import('@/lib/gemini');

    const result = await enrichWithGrounding({
      query: 'Example Landmark',
      mode: 'building',
      user: {
        localTime: '2026-03-07T23:45:00.000Z',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
      },
    } as never);

    expect(result.text).toBe('');
    expect(result.buildingDetails).toEqual(LOW_TRUST_BUILDING_FALLBACK);
    expect(result.searchQueries).toEqual(['example landmark empty']);
  });

  it('clears ambiguous building identity results into the low-trust fallback shape even when trust is overstated', async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        currentSummary: 'The exact building identity is unclear from the grounded evidence.',
        isLandmark: false,
        landmarkReason: '',
        historicalSummary: 'Possibly a former transit depot, but the sources do not agree.',
        futurePlansStatus: 'proposed',
        futurePlansSummary: 'Potential redevelopment has been discussed in generic local chatter.',
        trustLevel: 'medium',
        trustReason: 'Identity is unclear despite partial corroboration.',
      }),
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [],
            webSearchQueries: ['unclear landmark identity'],
          },
        },
      ],
    });

    const { enrichWithGrounding } = await import('@/lib/gemini');

    const result = await enrichWithGrounding({
      query: 'Unclear Landmark',
      mode: 'building',
      user: {
        localTime: '2026-03-07T23:45:00.000Z',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
      },
    } as never);

    expect(result.text).toBe('');
    expect(result.buildingDetails).toMatchObject({
      ...LOW_TRUST_BUILDING_FALLBACK,
      trustReason: expect.stringContaining('Identity is unclear'),
    });
    expect(result.searchQueries).toEqual(['unclear landmark identity']);
  });

  it('preserves clearly identified buildings even when future-plan evidence is weak', async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        currentSummary: 'The Ferry Annex is a clearly identified waterfront civic building with active public programming.',
        isLandmark: true,
        landmarkReason: 'Recognized local waterfront landmark.',
        historicalSummary: 'The building has served the waterfront district for decades.',
        futurePlansStatus: 'proposed',
        futurePlansSummary: 'Planning chatter is not place-specific and remains weak.',
        trustLevel: 'low',
        trustReason: 'The building identity is clear, but future-plan evidence is weak and not place-specific.',
      }),
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [],
            webSearchQueries: ['ferry annex future plans'],
          },
        },
      ],
    });

    const { enrichWithGrounding } = await import('@/lib/gemini');

    const result = await enrichWithGrounding({
      query: 'Ferry Annex',
      mode: 'building',
      user: {
        localTime: '2026-03-07T23:45:00.000Z',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
      },
    } as never);

    expect(result.text).toBe(
      'The Ferry Annex is a clearly identified waterfront civic building with active public programming.'
    );
    expect(result.buildingDetails).toMatchObject({
      currentSummary:
        'The Ferry Annex is a clearly identified waterfront civic building with active public programming.',
      isLandmark: true,
      landmarkReason: 'Recognized local waterfront landmark.',
      historicalSummary: 'The building has served the waterfront district for decades.',
      futurePlansStatus: 'proposed',
      futurePlansSummary: 'Planning chatter is not place-specific and remains weak.',
      trustLevel: 'low',
      trustReason:
        'The building identity is clear, but future-plan evidence is weak and not place-specific.',
    });
    expect(result.searchQueries).toEqual(['ferry annex future plans']);
  });
});

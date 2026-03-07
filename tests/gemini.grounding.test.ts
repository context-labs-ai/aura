import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();
const GoogleGenAIMock = vi.fn(function GoogleGenAI() {
  return {
    models: {
      generateContent: generateContentMock,
    },
  };
});

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
    expect(request.contents).toContain('San Francisco');
    expect(request.contents).toContain('America/Los_Angeles');
    expect(request.contents).toContain('en-US');
    expect(request.contents).toContain('Coffee Shop');
  });
});

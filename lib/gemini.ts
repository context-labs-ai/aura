import { GoogleGenAI } from '@google/genai';
import type { OverlayData } from '@/types/overlay';
import {
  buildingAnalysisSchema,
  productAnalysisSchema,
  sceneClassificationSchema,
} from '@/types/gemini';
import type { GroundingContext } from '@/types/grounding';
import { MODE_CONFIGS, type AnalysisMode } from '@/types/modes';

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
});

// gemini-3-flash-preview: Fast vision model for real-time analysis (~1-3s)
// gemini-3.1-pro-preview: Slow but strong — used only for grounding (not time-critical)
const VISION_MODEL = 'gemini-3-flash-preview';
const GROUNDING_MODEL = 'gemini-3.1-pro-preview';

const FALLBACK_DATA: OverlayData = {
  mode: 'unknown',
  title: 'Analysis Failed',
  subtitle: 'Could not analyze image',
  panels: [],
  confidence: 0,
  timestamp: Date.now(),
};

function getSchemaForMode(mode: AnalysisMode) {
  switch (mode) {
    case 'building':
      return buildingAnalysisSchema;
    case 'product':
      return productAnalysisSchema;
    case 'unknown':
      return sceneClassificationSchema;
  }
}

/**
 * Strip the data URI prefix from a base64-encoded image string.
 * captureFrame() returns "data:image/jpeg;base64,..." — Gemini needs raw base64.
 */
function stripBase64Prefix(base64: string): string {
  const commaIndex = base64.indexOf(',');
  return commaIndex !== -1 ? base64.slice(commaIndex + 1) : base64;
}

/**
 * Analyze a camera frame using Gemini structured output.
 * Uses Flash model for speed (~1-3s response time).
 * Returns typed OverlayData on success, fallback object on any error.
 */
export async function analyzeFrame(
  base64Image: string,
  mode: AnalysisMode
): Promise<OverlayData> {
  try {
    const rawBase64 = stripBase64Prefix(base64Image);
    const schema = getSchemaForMode(mode);
    const systemPrompt = MODE_CONFIGS[mode].systemPrompt;

    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          inlineData: { mimeType: 'image/jpeg', data: rawBase64 },
        },
        { text: systemPrompt },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) {
      return { ...FALLBACK_DATA, timestamp: Date.now() };
    }

    const parsed = JSON.parse(text);

    // For auto-detect mode, we get a scene classification — not full overlay data.
    // Convert it into an OverlayData shape.
    if (mode === 'unknown') {
      return {
        mode: parsed.mode === 'building' || parsed.mode === 'product' ? parsed.mode : 'unknown',
        title: parsed.mode === 'building' ? 'Building Detected' : parsed.mode === 'product' ? 'Product Detected' : 'Scene Detected',
        subtitle: parsed.reasoning ?? 'Auto-detected scene type',
        panels: [],
        confidence: parsed.confidence ?? 0,
        timestamp: Date.now(),
      };
    }

    // Building or product mode — spread extra fields, then override core fields
    return {
      ...parsed,
      mode,
      title: parsed.title ?? 'Unknown',
      subtitle: parsed.subtitle ?? '',
      panels: parsed.panels ?? [],
      confidence: parsed.confidence ?? 0,
      timestamp: Date.now(),
    } as OverlayData;
  } catch {
    return { ...FALLBACK_DATA, timestamp: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Search Grounding — enriches analysis with real-time web data
// NOTE: Free tier is 500 RPD. Callers should throttle to max 1 call per 15s.
// Uses Pro model (slower but higher quality) — not on the critical path.
// ---------------------------------------------------------------------------

export interface GroundingSource {
  title: string;
  url: string;
}

export interface GroundedResult {
  text: string;
  sources: GroundingSource[];
  searchQueries: string[];
}

function buildLocationPrompt(context: GroundingContext): string {
  if (!context.location) {
    return 'No user location is available, so avoid making overly specific local claims.';
  }

  const { coordinates, address } = context.location;
  if (address?.city || address?.country) {
    return `User location context: ${address.city ?? 'Unknown city'}, ${address.country ?? 'Unknown country'} (${address.formatted}). Coordinates: ${coordinates.lat}, ${coordinates.lng}.`;
  }

  return `User coordinates: ${coordinates.lat}, ${coordinates.lng}.`;
}

function buildVisualPrompt(context: GroundingContext): string {
  if (!context.visualContext) {
    return 'No visual context was provided.';
  }

  const { title, subtitle, confidence } = context.visualContext;
  return `Visual analysis suggests title "${title}", subtitle "${subtitle}", confidence ${confidence}.`;
}

const GROUNDING_PROMPTS: Record<'building' | 'product', (context: GroundingContext) => string> = {
  building: (context) =>
    [
      'You are a local business expert.',
      `Investigate the business or building "${context.query}".`,
      buildVisualPrompt(context),
      buildLocationPrompt(context),
      `User context: local time ${context.user.localTime}, timezone ${context.user.timezone}, language ${context.user.language}.`,
      'Provide: current reviews summary, opening hours, busy times, neighborhood vibe, and any recent news.',
      'Keep the answer concise, practical, and localized to the user context when the sources support it.',
    ].join(' '),
  product: (context) =>
    [
      'You are a consumer product expert.',
      `Investigate the product "${context.query}".`,
      buildVisualPrompt(context),
      buildLocationPrompt(context),
      `User context: local time ${context.user.localTime}, timezone ${context.user.timezone}, language ${context.user.language}.`,
      'Provide: current retail price range, top 2 alternatives, sustainability or eco info, and recent recalls or news.',
      'Keep the answer concise, practical, and localized to the user context when the sources support it.',
    ].join(' '),
};

/**
 * Enrich an analysis query with real-time Google Search grounding.
 * Uses Pro model for higher quality (not on the real-time critical path).
 */
export async function enrichWithGrounding(
  context: GroundingContext
): Promise<GroundedResult> {
  try {
    const prompt = GROUNDING_PROMPTS[context.mode](context);

    const response = await ai.models.generateContent({
      model: GROUNDING_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text ?? '';

    // Extract grounding metadata for source citations
    const metadata = response.candidates?.[0]?.groundingMetadata;
    const sources: GroundingSource[] =
      metadata?.groundingChunks
        ?.map((chunk) => ({
          title: chunk.web?.title ?? 'Source',
          url: chunk.web?.uri ?? '',
        }))
        .filter((s) => s.url) ?? [];

    const searchQueries = metadata?.webSearchQueries ?? [];

    return { text, sources, searchQueries };
  } catch (error) {
    console.error('[enrichWithGrounding] Error:', error);
    return { text: '', sources: [], searchQueries: [] };
  }
}

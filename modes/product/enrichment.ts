import { analyzeFrame, enrichWithGrounding } from '@/lib/gemini';
import { reverseGeocode } from '@/lib/geocoding';
import { getUserContext } from '@/lib/user-context';
import type { GroundingContext } from '@/types/grounding';
import type { ProductData } from '@/types/overlay';

/**
 * No-product fallback when Gemini can't identify a product in the frame.
 */
const NO_PRODUCT_FALLBACK: ProductData = {
  mode: 'product',
  title: 'No Product Detected',
  subtitle: 'Point the camera at a product, label, or packaging',
  panels: [],
  confidence: 0,
  timestamp: Date.now(),
};

/**
 * Product data enrichment pipeline.
 *
 * 1. analyzeFrame  → Gemini structured output (product identification + composition)
 * 2. enrichWithGrounding → Google Search grounding (price, alternatives, sustainability)
 * 3. Merge into complete ProductData
 * 4. Generate voice context summary
 */
export async function enrichProductData(
  frameBase64: string,
  lat: number | null = null,
  lng: number | null = null
): Promise<ProductData> {
  // ── Step 1: Gemini product analysis ──────────────────────────
  const raw = await analyzeFrame(frameBase64, 'product');

  // If confidence is too low or analysis failed, return helpful fallback
  if (raw.confidence < 0.3 || raw.title === 'Analysis Failed') {
    return { ...NO_PRODUCT_FALLBACK, timestamp: Date.now() };
  }

  // Cast to ProductData — analyzeFrame spreads product-specific fields
  const product = raw as ProductData;

  // ── Step 2: Search Grounding enrichment ─────────────────────
  const groundingContext: GroundingContext = {
    query: `${product.title} ${product.subtitle}`.trim(),
    mode: 'product',
    user: getUserContext(),
    visualContext: {
      title: product.title,
      subtitle: product.subtitle,
      confidence: product.confidence,
    },
  };

  if (lat !== null && lng !== null) {
    groundingContext.location = {
      coordinates: { lat, lng },
      address: (await reverseGeocode(lat, lng)) ?? undefined,
    };
  }

  const grounding = await enrichWithGrounding(groundingContext);

  // ── Step 3: Merge grounding insights into product data ──────
  const enriched: ProductData = {
    ...product,
    timestamp: Date.now(),
    // Extend panels with grounding results if we got useful text
    panels: [
      ...product.panels,
      ...(grounding.text
        ? [
            {
              label: 'Market Intelligence',
              value: grounding.text.slice(0, 500),
              type: 'text' as const,
            },
          ]
        : []),
      ...(grounding.sources.length > 0
        ? [
            {
              label: 'Sources',
              value: grounding.sources
                .slice(0, 3)
                .map((s) => s.title)
                .join(' · '),
              type: 'text' as const,
            },
          ]
        : []),
    ],
  };

  return enriched;
}

export function buildProductVoiceSummary(data: ProductData): string {
  const topMaterials = (data.composition ?? []).slice(0, 3).join(', ') || 'unknown materials';
  const sustainability = data.sustainabilityScore != null
    ? `${data.sustainabilityScore}/10`
    : 'unknown';
  const price = data.priceEstimate ?? 'unknown';

  return `Looking at ${data.title}. Made of ${topMaterials}. Sustainability: ${sustainability}. Price estimate: ${price}.`;
}

/**
 * Fast base product analysis — Gemini structured output only.
 * Returns immediately displayable ProductData without slow enrichment.
 */
export async function getBaseProductAnalysis(
  frameBase64: string,
): Promise<ProductData> {
  const raw = await analyzeFrame(frameBase64, 'product');

  if (raw.confidence < 0.3 || raw.title === 'Analysis Failed') {
    return { ...NO_PRODUCT_FALLBACK, timestamp: Date.now() };
  }

  const product = raw as ProductData;
  return {
    ...product,
    timestamp: Date.now(),
  };
}

/**
 * Slow enrichment from pre-analyzed base data — Search Grounding.
 * Run asynchronously after base result is already displayed.
 */
export async function enrichProductFromBase(
  baseData: ProductData,
): Promise<ProductData> {
  const groundingQuery = [
    baseData.title,
    'price',
    'sustainability',
    'alternatives',
  ].join(' ');

  const grounding = await enrichWithGrounding(groundingQuery, 'product');

  const enriched: ProductData = {
    ...baseData,
    timestamp: Date.now(),
    panels: [
      ...baseData.panels,
      ...(grounding.text
        ? [
            {
              label: 'Market Intelligence',
              value: grounding.text.slice(0, 500),
              type: 'text' as const,
            },
          ]
        : []),
      ...(grounding.sources.length > 0
        ? [
            {
              label: 'Sources',
              value: grounding.sources
                .slice(0, 3)
                .map((s) => s.title)
                .join(' · '),
              type: 'text' as const,
            },
          ]
        : []),
      ],
  };

  return enriched;
}

import { analyzeFrame, enrichWithGrounding } from '@/lib/gemini';
import type { GroundingSource } from '@/lib/gemini';
import { searchNearbyPlaces, getPlaceDetails } from '@/lib/places';
import type { BuildingData } from '@/types/overlay';

// ---------------------------------------------------------------------------
// Building enrichment pipeline
// camera frame → Gemini analysis → Search Grounding → Places API → BuildingData
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = 0.3;

/** Fallback when no building is detected or analysis fails entirely. */
const NO_BUILDING_FALLBACK: BuildingData = {
  mode: 'building',
  title: 'No Building Detected',
  subtitle: 'Point your camera at a building to identify it',
  panels: [],
  confidence: 0,
  timestamp: Date.now(),
};

export interface EnrichmentResult {
  data: BuildingData;
  voiceSummary: string;
  groundingSources: GroundingSource[];
}

/**
 * Full enrichment pipeline for Building X-Ray mode.
 *
 * 1. analyzeFrame        – Gemini structured output identifies the building
 * 2. enrichWithGrounding – Google Search grounding adds live web context
 * 3. searchNearbyPlaces  – Places Text Search finds the real place (GPS required)
 * 4. getPlaceDetails     – Places Details fills rating, reviews, hours
 * 5. Merge & return      – Places data overrides AI guesses
 */
export async function enrichBuildingData(
  frameBase64: string,
  lat: number | null,
  lng: number | null,
): Promise<EnrichmentResult> {
  // ── Step 1: Gemini frame analysis ──────────────────────────────────────
  const overlayData = await analyzeFrame(frameBase64, 'building');

  if (overlayData.confidence < CONFIDENCE_THRESHOLD) {
    return {
      data: { ...NO_BUILDING_FALLBACK, timestamp: Date.now() },
      voiceSummary: 'No building detected in view.',
      groundingSources: [],
    };
  }

  // Start with AI-identified data
  const buildingBase: BuildingData = {
    ...(overlayData as BuildingData),
    mode: 'building',
  };

  let groundingSources: GroundingSource[] = [];

  // ── Step 2: Search Grounding for real-time web data ────────────────────
  const groundingQuery = `${overlayData.title} ${overlayData.subtitle}`.trim();
  if (groundingQuery) {
    const grounded = await enrichWithGrounding(groundingQuery, 'building');

    if (grounded.text) {
      buildingBase.neighborhoodSummary = grounded.text;
    }
    groundingSources = grounded.sources;
  }

  // ── Step 3 & 4: Places API (requires GPS) ──────────────────────────────
  if (lat !== null && lng !== null) {
    const places = await searchNearbyPlaces(lat, lng, overlayData.title);

    if (places.length > 0) {
      const topMatch = places[0];
      const details = await getPlaceDetails(topMatch.id);

      if (details) {
        // Places API data overrides AI guesses
        buildingBase.placeId = details.id;
        if (details.rating !== undefined) buildingBase.rating = details.rating;
        if (details.openNow !== undefined) buildingBase.openNow = details.openNow;
        if (details.editorialSummary) buildingBase.reviewSummary = details.editorialSummary;
        if (details.weekdayHours.length > 0) {
          buildingBase.hours = details.weekdayHours.join(' | ');
        }

        // Use first review text as summary if no editorial summary
        if (!buildingBase.reviewSummary && details.reviews.length > 0) {
          buildingBase.reviewSummary = details.reviews[0].text.slice(0, 200);
        }
      } else if (topMatch.rating !== undefined) {
        // Fallback to search-level data if details call fails
        buildingBase.placeId = topMatch.id;
        buildingBase.rating = topMatch.rating;
        buildingBase.openNow = topMatch.openNow;
        if (topMatch.editorialSummary) {
          buildingBase.reviewSummary = topMatch.editorialSummary;
        }
      }
    }
  }

  // ── Step 5: Build voice summary ────────────────────────────────────────
  const voiceSummary = buildVoiceSummary(buildingBase);

  return {
    data: { ...buildingBase, timestamp: Date.now() },
    voiceSummary,
    groundingSources,
  };
}

/** Generate a concise text summary suitable for voice / TTS output. */
function buildVoiceSummary(data: BuildingData): string {
  const parts: string[] = [];

  parts.push(`Looking at ${data.title}.`);

  if (data.rating !== undefined) {
    parts.push(`${data.rating} stars.`);
  }

  if (data.reviewSummary) {
    // Trim to first sentence for voice brevity
    const snippet = data.reviewSummary.split('.')[0] + '.';
    parts.push(snippet);
  }

  if (data.openNow !== undefined) {
    parts.push(data.openNow ? 'Currently open.' : 'Currently closed.');
  }

  return parts.join(' ');
}

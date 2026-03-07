import type { EnrichmentResult } from './enrichment';
import { enrichBuildingData } from './enrichment';

// ---------------------------------------------------------------------------
// Building X-Ray mode configuration
// ---------------------------------------------------------------------------

export interface BuildingModeConfig {
  /** Minimum interval between analysis calls (ms). */
  analysisIntervalMs: number;
  /** Whether to use Places API for enrichment. */
  placesEnabled: boolean;
  /** Confidence threshold below which enrichment is skipped. */
  confidenceThreshold: number;
  /** Run the enrichment pipeline for a given frame + location. */
  enrich: (
    frameBase64: string,
    lat: number | null,
    lng: number | null,
  ) => Promise<EnrichmentResult>;
}

export const buildingModeConfig: BuildingModeConfig = {
  analysisIntervalMs: 15_000,
  placesEnabled: true,
  confidenceThreshold: 0.3,
  enrich: enrichBuildingData,
};

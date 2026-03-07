/**
 * Product Decompiler mode configuration.
 * Products don't need location/Places API — only Gemini + Search Grounding.
 */
export const productModeConfig = {
  /** Minimum interval between analyses in milliseconds (15s to stay within grounding limits). */
  analysisIntervalMs: 15_000,
  /** Whether to use Places API for this mode. Products don't need location data. */
  usePlacesAPI: false,
} as const;

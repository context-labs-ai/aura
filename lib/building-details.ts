import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
});

const GROUNDING_MODEL = 'gemini-2.5-flash-preview-04-17';

export interface BuildingDetails {
  yearBuilt?: string;
  architect?: string;
  height?: string;
  floors?: number;
  architecturalStyle?: string;
  historicalSignificance?: string;
  notableFacts?: string[];
}

/**
 * Fetch enhanced architectural/historical details for a building using
 * Gemini with Google Search grounding for factual accuracy.
 * Follows the enrichWithGrounding pattern from lib/gemini.ts.
 */
export async function fetchBuildingDetails(
  buildingName: string
): Promise<BuildingDetails | null> {
  try {
    const prompt = [
      `You are an architectural historian and expert.`,
      `For the building/landmark "${buildingName}", provide the following details in JSON format:`,
      `{`,
      `  "yearBuilt": "year or date range when construction was completed",`,
      `  "architect": "architect or design firm name",`,
      `  "height": "height in meters, e.g. '200m'",`,
      `  "floors": number of floors as integer,`,
      `  "architecturalStyle": "architectural style name",`,
      `  "historicalSignificance": "2-3 sentences about historical significance",`,
      `  "notableFacts": ["fact 1", "fact 2", "fact 3"]`,
      `}`,
      `Return ONLY valid JSON, no markdown formatting.`,
    ].join('\n');

    const response = await ai.models.generateContent({
      model: GROUNDING_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text ?? '';

    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[building-details] No JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as BuildingDetails;
    return parsed;
  } catch (error) {
    console.error('[building-details] Error fetching details:', error);
    return null;
  }
}

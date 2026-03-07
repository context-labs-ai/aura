import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
});

// Gemini Flash Image model — supports multimodal input (reference image) + image output
const IMAGE_MODEL = 'gemini-2.5-flash-preview-image-generation';

/**
 * Strip the data URI prefix from a base64-encoded image string.
 */
function stripBase64Prefix(base64: string): string {
  const commaIndex = base64.indexOf(',');
  return commaIndex !== -1 ? base64.slice(commaIndex + 1) : base64;
}

export interface DecompositionResult {
  /** Base64-encoded PNG image of the decomposition/exploded view */
  imageBase64: string;
  /** Text description from the model */
  description: string;
}

/**
 * Generate an exploded/decomposition structural diagram of a product.
 * Takes the actual camera capture as reference so the generated image
 * matches the real product being viewed.
 *
 * Uses Gemini Flash Image model with IMAGE response modality.
 */
export async function generateDecomposition(
  referenceImageBase64: string,
  productName: string
): Promise<DecompositionResult | null> {
  try {
    const rawBase64 = stripBase64Prefix(referenceImageBase64);

    const prompt = [
      `You are a product engineering visualization expert.`,
      `The image shows a product: "${productName}".`,
      `Generate an EXPLODED VIEW / DECOMPOSITION DIAGRAM of this exact product.`,
      `Show the product disassembled into its major components, spread apart vertically or diagonally,`,
      `with clean technical illustration style — like an engineering blueprint or teardown poster.`,
      `Use a dark background. Label each major component.`,
      `Make sure the decomposition matches the actual product shown in the reference image,`,
      `not a generic version. Include at least 5-8 distinct components/layers.`,
    ].join('\n');

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          inlineData: { mimeType: 'image/jpeg', data: rawBase64 },
        },
        { text: prompt },
      ],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    let imageBase64 = '';
    let description = '';

    // Extract image and text from response parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
        }
        if (part.text) {
          description += part.text;
        }
      }
    }

    if (!imageBase64) {
      console.warn('[image-gen] No image returned from model');
      return null;
    }

    return { imageBase64, description };
  } catch (error) {
    console.error('[image-gen] Error generating decomposition:', error);
    return null;
  }
}

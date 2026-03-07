import { fal } from '@fal-ai/client';

// Configure fal.ai with the API key
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FAL_KEY) {
  fal.config({ credentials: process.env.NEXT_PUBLIC_FAL_KEY });
}

export interface ModelResult {
  glbUrl: string;
}

/**
 * Strip the data URI prefix from a base64-encoded image string.
 */
function stripBase64Prefix(base64: string): string {
  const commaIndex = base64.indexOf(',');
  return commaIndex !== -1 ? base64.slice(commaIndex + 1) : base64;
}

/**
 * Generate a 3D model from a camera frame image using Hyper3D Rodin via fal.ai.
 * Returns the GLB model URL, or null on failure.
 * Follows the generateDecomposition pattern from lib/image-gen.ts.
 */
export async function generate3DModel(
  imageBase64: string
): Promise<string | null> {
  try {
    const rawBase64 = stripBase64Prefix(imageBase64);
    const imageDataUri = `data:image/jpeg;base64,${rawBase64}`;

    const result = await fal.subscribe('fal-ai/hyper3d/rodin/v2', {
      input: {
        images: [imageDataUri],
        geometry_file_format: 'glb',
      } as Record<string, unknown>,
      logs: false,
    } as Parameters<typeof fal.subscribe>[1]);

    // Extract GLB URL from response
    const data = result.data as Record<string, unknown>;
    const modelMesh = data?.model_mesh as Record<string, unknown> | undefined;
    const glbUrl = modelMesh?.url as string | undefined;

    if (!glbUrl) {
      console.warn('[3d-gen] No GLB URL in response:', data);
      return null;
    }

    return glbUrl;
  } catch (error) {
    console.error('[3d-gen] Error generating 3D model:', error);
    return null;
  }
}

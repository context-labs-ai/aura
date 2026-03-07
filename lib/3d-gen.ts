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
 * Upload a base64 image to fal.ai storage and return the URL.
 * fal-ai/hyper3d/rodin/v2 requires hosted URLs, not data URIs.
 */
async function uploadToFalStorage(imageBase64: string): Promise<string> {
  const rawBase64 = stripBase64Prefix(imageBase64);
  const binaryString = atob(rawBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  return fal.storage.upload(blob);
}

/**
 * Generate a 3D model from a camera frame image using Hyper3D Rodin via fal.ai.
 * Returns the GLB model URL, or null on failure.
 * Note: This takes 2-5 minutes. Use generateProceduralWireframe() for instant results.
 */
export async function generate3DModel(
  imageBase64: string
): Promise<string | null> {
  try {
    // Upload image to fal.ai storage first (API requires hosted URLs)
    const imageUrl = await uploadToFalStorage(imageBase64);

    const result = await fal.subscribe('fal-ai/hyper3d/rodin/v2', {
      input: {
        input_image_urls: [imageUrl],
        geometry_file_format: 'glb',
      } as Record<string, unknown>,
      logs: false,
      pollInterval: 3000,
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

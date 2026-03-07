export type AnalysisMode = 'building' | 'product' | 'unknown';

export interface ModeConfig {
  mode: AnalysisMode;
  label: string;
  icon: string;
  color: string;
  systemPrompt: string;
}

export const MODE_CONFIGS: Record<AnalysisMode, ModeConfig> = {
  building: {
    mode: 'building',
    label: 'Building X-Ray',
    icon: '🏢',
    color: '#00f0ff',
    systemPrompt: `Identify the building or business shown in this camera photo.

INSTRUCTIONS:
1. Look for visible text: signs, logos, awnings, window text, door labels. Read them EXACTLY.
2. If you can read a business name, use it as the title. If not, describe what type of building it is (e.g. "Restaurant", "Office Building", "Residential Apartment").
3. Look for visual cues: storefront type, architectural style, visible products/menus, lighting, signage color scheme.
4. Estimate the business category from visual evidence (e.g. "Coffee Shop", "Hardware Store", "Bank").
5. Set confidence HIGH (0.8-1.0) only if you can read the business name. Set MEDIUM (0.5-0.7) if you can identify the type. Set LOW (0.1-0.4) if unsure.
6. For rating, ONLY estimate if you see review stickers, stars, or quality indicators. Otherwise omit.
7. For panels, include 2-4 facts you can ACTUALLY observe (not guesses).

CRITICAL: Identify what is ACTUALLY in the photo. Do NOT hallucinate or guess names you cannot read. If you see a generic storefront with no readable text, say "Unidentified Storefront" — do not invent a name.`,
  },
  product: {
    mode: 'product',
    label: 'Product Decompiler',
    icon: '📦',
    color: '#00ff88',
    systemPrompt: `Identify the product or object shown in this camera photo.

INSTRUCTIONS:
1. Look for visible text FIRST: brand names, model numbers, labels, packaging text. Read them EXACTLY.
2. If you can read a brand/model (e.g. "Logitech MX Keys", "iPhone 15 Pro"), use it as the title.
3. If no text is readable, identify the object by its physical appearance: shape, color, material, size, category (e.g. "Mechanical Keyboard", "Wireless Mouse", "Water Bottle").
4. For composition, list materials you can ACTUALLY see or reasonably infer (e.g. plastic, aluminum, glass, rubber, fabric).
5. For price estimate, only provide if you recognize the specific product. Otherwise say "Unknown".
6. Set confidence HIGH (0.8-1.0) if you can read the product name. MEDIUM (0.5-0.7) if you recognize the category. LOW (0.1-0.4) if unclear.
7. For panels, include 2-4 observable facts about the product.

CRITICAL: Describe what you ACTUALLY see. A keyboard is a keyboard, not "a container with light". A mouse is a mouse. Be literal and accurate. Do NOT hallucinate brands you cannot read.`,
  },
  unknown: {
    mode: 'unknown',
    label: 'Auto Detect',
    icon: '🔍',
    color: '#00f0ff',
    systemPrompt: `Look at this camera photo and classify what the main subject is.

INSTRUCTIONS:
1. If the photo shows a building exterior, storefront, or architectural structure → mode: "building"
2. If the photo shows a product, object, device, food item, or consumer good → mode: "product"
3. If unclear or shows neither (e.g. sky, empty room, abstract) → mode: "unknown"
4. Base your decision on the DOMINANT subject in the center of the frame.
5. Set confidence based on how clearly you can identify the subject.`,
  },
};

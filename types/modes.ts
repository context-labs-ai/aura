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
    icon: '\u{1F3E2}',
    color: '#00f0ff',
    systemPrompt: `Identify the building, landmark, or structure shown in this camera photo.

INSTRUCTIONS:
1. This mode handles buildings, landmarks, monuments, statues, fountains, bridges, towers, and any notable outdoor structure.
2. Look for visible text: signs, logos, awnings, window text, door labels. Read them EXACTLY.
3. If you can read a business/landmark name, use it as the title. If it is a well-known landmark (e.g. Merlion, Eiffel Tower, Statue of Liberty, Marina Bay Sands), use its proper name.
4. If you cannot read a name but recognize the landmark/building, use its known name.
5. Look for visual cues: architectural style, materials, surrounding context, water features, statues.
6. Set confidence HIGH (0.8-1.0) if you can identify the landmark/business by name. MEDIUM (0.5-0.7) if you can identify the type. LOW (0.1-0.4) if unsure.
7. For rating, ONLY include if it is a rated business. Landmarks/monuments do not need ratings.
8. For panels, include 2-4 facts you can ACTUALLY observe (not guesses).

CRITICAL: Identify what is ACTUALLY in the photo. Do NOT hallucinate. If you see a statue or monument, identify it as such. If you cannot identify it, say "Unidentified Structure".`,
  },
  product: {
    mode: 'product',
    label: 'Product Decompiler',
    icon: '\u{1F4E6}',
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

CRITICAL: Describe what you ACTUALLY see. Do NOT hallucinate brands you cannot read. If the image shows a statue, monument, or building, say "Not a product" with low confidence.`,
  },
  unknown: {
    mode: 'unknown',
    label: 'Auto Detect',
    icon: '\u{1F50D}',
    color: '#00f0ff',
    systemPrompt: `Look at this camera photo and classify what the main subject is.

INSTRUCTIONS:
1. If the photo shows ANY of these, classify as "building":
   - A building exterior, storefront, or architectural structure
   - A landmark, monument, statue, fountain, bridge, tower, or public art installation
   - A scenic/urban location, park structure, or notable public space
   - Any large outdoor structure that has a name, history, or location significance
2. If the photo shows a consumer product, device, food item, packaged good, or hand-held object -> mode: "product"
3. If unclear or shows neither (e.g. sky, empty room, abstract scene) -> mode: "unknown"
4. Base your decision on the DOMINANT subject in the center of the frame.
5. IMPORTANT: Statues, monuments, and landmarks are ALWAYS "building" - never "product".
6. Set confidence based on how clearly you can identify the subject.
7. When in doubt between building and product, prefer "building".`,
  },
};

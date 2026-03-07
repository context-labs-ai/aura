# Landmark Time Lens And Trust Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn Aura's building mode into a time-aware, source-conscious reality lens that explains a landmark's past, present, and publicly known future while clearly signaling confidence and evidence strength.

**Architecture:** Reuse the existing building analysis pipeline: Gemini vision identifies the place, Gemini grounding enriches it with web context, and the building enrichment layer merges the result into `BuildingData`. Extend that grounding step from a generic current-summary prompt into a structured time-lens contract with explicit trust fields, while keeping `product` mode untouched and preserving the existing source extraction path.

**Tech Stack:** Next.js 14, TypeScript, Gemini via `@google/genai`, Google Search grounding, Google Maps geocoding, Vitest

---

### Task 1: Define the Time Lens result contract

**Files:**
- Modify: `types/grounding.ts`
- Modify: `types/overlay.ts`
- Test: `tests/gemini.grounding.test.ts`
- Test: `tests/enrichment-context.test.ts`

**Step 1: Write the failing test**

Add tests that define the new building grounding shape. The contract should cover:
- `currentSummary`
- `isLandmark`
- `landmarkReason`
- `historicalSummary`
- `futurePlansStatus`
- `futurePlansSummary`
- `trustLevel`
- `trustReason`

Example expectation:

```ts
expect(request.contents).toContain('trustLevel');
expect(request.contents).toContain('trustReason');
expect(request.contents).toContain('futurePlansStatus');
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- FAIL because trust fields and the full time-lens contract are not yet defined

**Step 3: Write minimal implementation**

Define the types in `types/grounding.ts`:

```ts
export type FuturePlansStatus = 'confirmed' | 'proposed' | 'rumored' | 'none_found';
export type TrustLevel = 'high' | 'medium' | 'low';

export interface BuildingGroundingResult {
  currentSummary: string;
  isLandmark: boolean;
  landmarkReason: string;
  historicalSummary: string;
  futurePlansStatus: FuturePlansStatus;
  futurePlansSummary: string;
  trustLevel: TrustLevel;
  trustReason: string;
}
```

Mirror the persisted building fields in `types/overlay.ts`:

```ts
trustLevel?: 'high' | 'medium' | 'low';
trustReason?: string;
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add types/grounding.ts types/overlay.ts tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
git commit -m "test: define landmark time lens contract"
```

### Task 2: Teach building grounding to produce Time Lens JSON

**Files:**
- Modify: `lib/gemini.ts`
- Test: `tests/gemini.grounding.test.ts`

**Step 1: Write the failing test**

Extend `tests/gemini.grounding.test.ts` so building grounding must:
- request JSON output
- include explicit rules for past, present, and future
- include explicit trust scoring instructions
- forbid brand-history substitution
- forbid speculative future claims

Example expectation:

```ts
expect(request.config.responseMimeType).toBe('application/json');
expect(request.contents).toContain('historicalSummary');
expect(request.contents).toContain('futurePlansSummary');
expect(request.contents).toContain('trustLevel');
expect(request.contents).toContain('Prefer omission over speculation');
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts
```

Expected:
- FAIL because the prompt does not yet encode the full time-lens plus trust-layer contract

**Step 3: Write minimal implementation**

Update `lib/gemini.ts` to make building grounding return structured JSON only. The building prompt should instruct the model to:
- summarize present-day reality in `currentSummary`
- only mark `isLandmark = true` when the site is publicly notable
- write building or site history, not company history
- report public future plans conservatively
- always assign `trustLevel` and `trustReason`

The trust rules should be:

```ts
// high: strong identity match + specific grounded facts + place-specific sources
// medium: mostly confident identity or partial corroboration
// low: incomplete identity, weak corroboration, or tentative planning evidence
```

Implement defensive parsing with defaults:

```ts
const fallback: BuildingGroundingResult = {
  currentSummary: '',
  isLandmark: false,
  landmarkReason: '',
  historicalSummary: '',
  futurePlansStatus: 'none_found',
  futurePlansSummary: '',
  trustLevel: 'low',
  trustReason: 'No reliable grounded output returned.',
};
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add lib/gemini.ts tests/gemini.grounding.test.ts
git commit -m "feat: add landmark time lens grounding prompt"
```

### Task 3: Merge Time Lens fields into building enrichment

**Files:**
- Modify: `modes/building/enrichment.ts`
- Modify: `modes/modes/building/enrichment.ts`
- Test: `tests/enrichment-context.test.ts`

**Step 1: Write the failing test**

Add a failing test that verifies `enrichBuildingData()` maps all time-lens and trust-layer fields into `BuildingData`.

Example:

```ts
expect(result.data.isLandmark).toBe(true);
expect(result.data.historicalSummary).toContain('ferry');
expect(result.data.futurePlansStatus).toBe('confirmed');
expect(result.data.trustLevel).toBe('high');
expect(result.data.trustReason).toContain('official');
```

Also add a non-landmark case:

```ts
expect(result.data.isLandmark).toBe(false);
expect(result.data.historicalSummary).toBe('');
expect(result.data.futurePlansStatus).toBe('none_found');
expect(result.data.trustLevel).toBe('low');
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/enrichment-context.test.ts
```

Expected:
- FAIL because trust fields are not yet mapped into the building result

**Step 3: Write minimal implementation**

Map `grounded.buildingDetails` into `BuildingData`:

```ts
buildingBase.neighborhoodSummary = grounded.buildingDetails.currentSummary;
buildingBase.isLandmark = grounded.buildingDetails.isLandmark;
buildingBase.landmarkReason = grounded.buildingDetails.landmarkReason;
buildingBase.historicalSummary = grounded.buildingDetails.historicalSummary;
buildingBase.futurePlansStatus = grounded.buildingDetails.futurePlansStatus;
buildingBase.futurePlansSummary = grounded.buildingDetails.futurePlansSummary;
buildingBase.trustLevel = grounded.buildingDetails.trustLevel;
buildingBase.trustReason = grounded.buildingDetails.trustReason;
```

Keep the mirrored file `modes/modes/building/enrichment.ts` in sync so the Next build stays green.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add modes/building/enrichment.ts modes/modes/building/enrichment.ts tests/enrichment-context.test.ts
git commit -m "feat: map time lens and trust data into buildings"
```

### Task 4: Preserve existing building context and product behavior

**Files:**
- Modify: `tests/gemini.grounding.test.ts`
- Modify: `tests/enrichment-context.test.ts`
- Modify: `lib/gemini.ts` if needed

**Step 1: Write the failing test**

Add regression assertions verifying:
- building prompts still include local time, timezone, language, visual context, and geocoded location
- product grounding still uses the current product path
- `sources` and `searchQueries` still return as before

Example:

```ts
expect(request.contents).toContain('America/Los_Angeles');
expect(request.contents).toContain('San Francisco');
expect(result.sources).toEqual([{ title: 'Source', url: 'https://...' }]);
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- FAIL if the time-lens refactor broke existing grounding context or metadata behavior

**Step 3: Write minimal implementation**

Adjust prompt generation and result shaping only as needed to preserve:
- existing context injection
- existing source extraction
- existing product behavior

Do not broaden the scope beyond regression fixes.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add lib/gemini.ts tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
git commit -m "test: protect time lens regression behavior"
```

### Task 5: Add trust-aware fallback behavior

**Files:**
- Modify: `lib/gemini.ts`
- Modify: `tests/gemini.grounding.test.ts`

**Step 1: Write the failing test**

Add a test for fallback behavior when:
- building grounding returns invalid JSON
- grounding returns no text
- identity is unclear

Expected fallback:

```ts
expect(result.buildingDetails).toEqual({
  currentSummary: '',
  isLandmark: false,
  landmarkReason: '',
  historicalSummary: '',
  futurePlansStatus: 'none_found',
  futurePlansSummary: '',
  trustLevel: 'low',
  trustReason: expect.any(String),
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts
```

Expected:
- FAIL because the fallback does not yet include the final trust-aware defaults

**Step 3: Write minimal implementation**

Update the fallback parser and error path in `lib/gemini.ts` so building grounding always returns a complete low-trust fallback object on failure.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add lib/gemini.ts tests/gemini.grounding.test.ts
git commit -m "feat: add trust-aware grounding fallback"
```

### Task 6: Final verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 2: Run full suite**

Run:

```bash
npm test
```

Expected:
- PASS

**Step 3: Run production build**

Run:

```bash
npm run build
```

Expected:
- PASS

**Step 4: Review diff**

Run:

```bash
git diff -- lib/gemini.ts modes/building/enrichment.ts modes/modes/building/enrichment.ts types/grounding.ts types/overlay.ts tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- Only time-lens and trust-layer files changed

**Step 5: Commit**

```bash
git add lib/gemini.ts modes/building/enrichment.ts modes/modes/building/enrichment.ts types/grounding.ts types/overlay.ts tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
git commit -m "feat: implement landmark time lens and trust layer"
```

# Landmark History And Future Plans Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add landmark-aware historical and future-plan fields to the `building` grounding pipeline without changing UI or `product` mode.

**Architecture:** Keep the existing single-call building grounding flow, but change the building grounding contract from free text to structured JSON. Use prompt rules and typed parsing to keep landmark history and future-plan fields conservative, then merge those fields into `BuildingData` in the building enrichment layer.

**Tech Stack:** Next.js 14, TypeScript, Gemini grounding via `@google/genai`, Vitest

---

### Task 1: Define the building grounding contract

**Files:**
- Modify: `types/overlay.ts`
- Modify: `types/grounding.ts`
- Test: `tests/gemini.grounding.test.ts`

**Step 1: Write the failing test**

Add a test in `tests/gemini.grounding.test.ts` asserting the building grounding prompt includes:
- landmark-only rules
- site/building history preference over brand history
- `futurePlansStatus` allowed values
- “prefer omission over speculation”

Example expectation shape:

```ts
expect(request.contents).toContain('historicalSummary');
expect(request.contents).toContain('futurePlansStatus');
expect(request.contents).toContain('Prefer site or building history over brand history');
expect(request.contents).toContain('Prefer omission over speculation');
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts
```

Expected:
- FAIL because the prompt does not yet mention the new structured contract and guardrails

**Step 3: Write minimal implementation**

Add the new building fields to `BuildingData` and, if useful, define a dedicated building grounding result type in `types/grounding.ts`:

```ts
export interface BuildingGroundingResult {
  currentSummary: string;
  isLandmark: boolean;
  landmarkReason: string;
  historicalSummary: string;
  futurePlansStatus: 'confirmed' | 'proposed' | 'rumored' | 'none_found';
  futurePlansSummary: string;
}
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
git add types/overlay.ts types/grounding.ts tests/gemini.grounding.test.ts
git commit -m "test: define landmark grounding output contract"
```

### Task 2: Change building grounding from free text to structured JSON

**Files:**
- Modify: `lib/gemini.ts`
- Test: `tests/gemini.grounding.test.ts`

**Step 1: Write the failing test**

Extend `tests/gemini.grounding.test.ts` to assert that:
- building mode requests structured JSON output
- product mode still uses the existing product grounding path
- a mocked structured building grounding response is parsed into a typed result

Example:

```ts
expect(request.config.responseMimeType).toBe('application/json');
expect(result.isLandmark).toBe(true);
expect(result.futurePlansStatus).toBe('confirmed');
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts
```

Expected:
- FAIL because `lib/gemini.ts` still treats building grounding as free text

**Step 3: Write minimal implementation**

Update `lib/gemini.ts` so that:
- `building` grounding prompt asks for JSON matching the new contract
- the request uses JSON response mode for building grounding
- building responses are parsed into the new structure
- grounding sources and search queries are still returned
- `product` mode remains on its current behavior unless explicitly needed for shared typing

Keep the parsing defensive:

```ts
if (!text) {
  return fallbackStructuredBuildingResult;
}
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
git commit -m "feat: add structured landmark grounding for buildings"
```

### Task 3: Merge structured landmark fields into building enrichment

**Files:**
- Modify: `modes/building/enrichment.ts`
- Test: `tests/enrichment-context.test.ts`

**Step 1: Write the failing test**

Add or extend a test in `tests/enrichment-context.test.ts` asserting that when the mocked building grounding response contains landmark fields, the returned `BuildingData` contains:
- `isLandmark`
- `landmarkReason`
- `historicalSummary`
- `futurePlansStatus`
- `futurePlansSummary`

Example:

```ts
expect(result.data.isLandmark).toBe(true);
expect(result.data.historicalSummary).toContain('opened');
expect(result.data.futurePlansStatus).toBe('proposed');
```

Also add a non-landmark case:

```ts
expect(result.data.isLandmark).toBe(false);
expect(result.data.historicalSummary).toBe('');
expect(result.data.futurePlansStatus).toBe('none_found');
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/enrichment-context.test.ts
```

Expected:
- FAIL because the enrichment layer does not yet map the new building grounding fields

**Step 3: Write minimal implementation**

Update `modes/building/enrichment.ts` to map the structured building grounding result into the building model:

```ts
buildingBase.neighborhoodSummary = grounded.currentSummary;
buildingBase.isLandmark = grounded.isLandmark;
buildingBase.landmarkReason = grounded.landmarkReason;
buildingBase.historicalSummary = grounded.historicalSummary;
buildingBase.futurePlansStatus = grounded.futurePlansStatus;
buildingBase.futurePlansSummary = grounded.futurePlansSummary;
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add modes/building/enrichment.ts tests/enrichment-context.test.ts
git commit -m "feat: map landmark history and future plans into building data"
```

### Task 4: Verify no regression in the existing prompt context behavior

**Files:**
- Modify: `tests/gemini.grounding.test.ts`
- Modify: `tests/enrichment-context.test.ts`

**Step 1: Write the failing test**

Add a regression test verifying the building grounding prompt still includes:
- user local time
- timezone
- language
- reverse-geocoded location
- visual context

Also verify the current-summary field still flows into the building enrichment result.

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- FAIL if prompt or mapping drifted while adding the landmark fields

**Step 3: Write minimal implementation**

Adjust prompt text or mapping only as needed to satisfy the regression test while keeping the new design intact.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add tests/gemini.grounding.test.ts tests/enrichment-context.test.ts lib/gemini.ts modes/building/enrichment.ts
git commit -m "test: protect landmark grounding prompt regressions"
```

### Task 5: Final verification

**Files:**
- Verify only

**Step 1: Run the focused tests**

Run:

```bash
npm test -- tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 2: Run the full current test suite**

Run:

```bash
npm test
```

Expected:
- PASS

**Step 3: Run production verification**

Run:

```bash
npm run build
```

Expected:
- PASS

**Step 4: Review diff**

Run:

```bash
git diff -- lib/gemini.ts modes/building/enrichment.ts types/overlay.ts types/grounding.ts tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
```

Expected:
- Only building-grounding contract and its tests changed

**Step 5: Commit**

```bash
git add lib/gemini.ts modes/building/enrichment.ts types/overlay.ts types/grounding.ts tests/gemini.grounding.test.ts tests/enrichment-context.test.ts
git commit -m "feat: add landmark history and future plan grounding"
```

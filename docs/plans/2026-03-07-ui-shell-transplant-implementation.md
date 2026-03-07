# UI Shell Transplant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current `master` presentation layer with the mobile-first shell from `origin/codex/setup-20260307` while preserving the live `building` and `product` analysis pipeline, Time Lens, Trust Layer, voice, 3D building scan, and product decomposition.

**Architecture:** Keep the existing `app/page.tsx` analysis orchestration and enrichment pipeline as the source of truth, but move result presentation into a new landing/scan/details shell. Add a thin adapter layer that converts `OverlayData`, `BuildingData`, and `ProductData` into sheet-friendly sections so the transplanted UI can stay decoupled from Gemini/Places internals. Preserve mirrored app entrypoints (`app/page.tsx` and `app/app/page.tsx`) so Next build output stays consistent.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Vitest, existing Gemini/Places/Live API integrations, CSS in `styles/hud.css`

---

### Task 1: Define the shell adapter contract

**Files:**
- Create: `lib/ui-shell.ts`
- Test: `tests/ui-shell.test.ts`
- Reference: `types/overlay.ts`

**Step 1: Write the failing test**

Define the view-model contract for the new shell in `tests/ui-shell.test.ts`. Cover:
- `buildBuildingShellModel()` returning hero text, trust block, time-lens sections, persona tabs, and action availability
- `buildProductShellModel()` returning hero text, composition/market sections, source summary, and action availability
- `getShellViewState()` returning `landing`, `scan`, or `details`

Example test shape:

```ts
import { describe, expect, it } from 'vitest';
import { buildBuildingShellModel, buildProductShellModel, getShellViewState } from '@/lib/ui-shell';

it('maps building time lens data into shell sections', () => {
  const model = buildBuildingShellModel({
    mode: 'building',
    title: 'Ferry Building',
    subtitle: 'Historic Landmark',
    panels: [],
    confidence: 0.95,
    timestamp: 1,
    historicalSummary: 'Served the waterfront since the late 1800s.',
    futurePlansStatus: 'proposed',
    futurePlansSummary: 'Facade work is publicly proposed.',
    trustLevel: 'high',
    trustReason: 'Specific place match with grounded sources.',
    neighborhoodSummary: 'Busy waterfront destination.',
  });

  expect(model.heroTitle).toBe('Ferry Building');
  expect(model.trust.badge).toBe('high');
  expect(model.sections.map((section) => section.id)).toContain('time-lens');
});

it('returns details state when analyzed data is present', () => {
  expect(getShellViewState({ hasData: true, isAnalyzing: false, hasCapturedFrame: true })).toBe('details');
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/ui-shell.test.ts
```

Expected:
- FAIL because `lib/ui-shell.ts` does not exist yet

**Step 3: Write minimal implementation**

Create `lib/ui-shell.ts` with pure helpers and small serializable return shapes:

```ts
export type ShellViewState = 'landing' | 'scan' | 'details';

export function getShellViewState(input: {
  hasData: boolean;
  isAnalyzing: boolean;
  hasCapturedFrame: boolean;
}): ShellViewState {
  if (input.hasData) return 'details';
  if (input.hasCapturedFrame || input.isAnalyzing) return 'scan';
  return 'landing';
}
```

Also implement:
- `buildBuildingShellModel(data: BuildingData)`
- `buildProductShellModel(data: ProductData)`
- persona helpers that only regroup existing live fields; no static setup-branch data imports

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/ui-shell.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add lib/ui-shell.ts tests/ui-shell.test.ts
git commit -m "test: define ui shell adapter contract"
```

### Task 2: Port the mobile shell primitives and visual assets

**Files:**
- Create: `components/ActionBar.tsx`
- Create: `components/InsightBottomSheet.tsx`
- Create: `components/PersonaTabs.tsx`
- Create: `components/ScanReticle.tsx`
- Create: `components/ModeSwitcher.tsx`
- Modify: `styles/hud.css`
- Modify: `public/manifest.json`
- Create: `public/graphics/singapore-skyline.svg`
- Create: `public/icons/icon-192.svg`
- Create: `public/icons/icon-512.svg`
- Create: `public/favicon.ico`
- Test: `tests/ui-shell.test.ts`

**Step 1: Write the failing test**

Extend `tests/ui-shell.test.ts` with lightweight component rendering tests using `react-dom/server`:
- `ActionBar` renders primary scan button and action buttons
- `PersonaTabs` renders the four building lenses
- `InsightBottomSheet` renders hero title and section labels from a shell model
- `ModeSwitcher` exposes `auto`, `building`, `product`

Example:

```ts
import { renderToStaticMarkup } from 'react-dom/server';
import ActionBar from '@/components/ActionBar';

it('renders scan and insight actions', () => {
  const html = renderToStaticMarkup(
    <ActionBar
      onScan={() => {}}
      onAskAI={() => {}}
      onToggleSave={() => {}}
      onCompare={() => {}}
      canAskAI
      canCompare={false}
      isSaved={false}
      isScanning={false}
    />
  );

  expect(html).toContain('Scan');
  expect(html).toContain('Insights');
  expect(html).toContain('Compare');
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/ui-shell.test.ts
```

Expected:
- FAIL because the new shell components and assets are not present yet

**Step 3: Write minimal implementation**

Create the shell components by adapting the setup branch UI structure, but wire them to generic props instead of static records.

Requirements:
- no imports from setup-branch-only data files
- CSS class names live in `styles/hud.css`
- styles should establish the new mobile-first shell:
  - landing atmosphere
  - scan frame
  - action bar
  - bottom sheet
  - persona chips

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/ui-shell.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add components/ActionBar.tsx components/InsightBottomSheet.tsx components/PersonaTabs.tsx components/ScanReticle.tsx components/ModeSwitcher.tsx styles/hud.css public/manifest.json public/graphics/singapore-skyline.svg public/icons/icon-192.svg public/icons/icon-512.svg public/favicon.ico tests/ui-shell.test.ts
git commit -m "feat: port mobile shell ui primitives"
```

### Task 3: Recompose the top-level page around the new shell

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/app/page.tsx`
- Modify: `components/CameraFeed.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/app/layout.tsx`
- Modify: `lib/ui-shell.ts`
- Test: `tests/ui-shell.test.ts`

**Step 1: Write the failing test**

Add adapter/state tests that lock the page-state rules needed for the new shell:
- landing when there is no captured frame and no analysis result
- scan when a frame exists or analysis is in flight
- details when analyzed data exists
- mode-switch labels stay `auto`, `building`, `product`

Example:

```ts
it('stays in scan state while analyzing without result data', () => {
  expect(
    getShellViewState({
      hasData: false,
      isAnalyzing: true,
      hasCapturedFrame: true,
    })
  ).toBe('scan');
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/ui-shell.test.ts
```

Expected:
- FAIL because the helper contract and page orchestration are not aligned yet

**Step 3: Write minimal implementation**

Update `app/page.tsx` and `app/app/page.tsx` so they:
- keep the current analysis loop, caching, auto-detect, voice updates, 3D scan, and decomposition logic
- switch visible UI between:
  - landing
  - scan shell
  - details sheet
- use the new shell components instead of `HUDOverlay` as the primary presentation layer

Update `components/CameraFeed.tsx` only as needed for shell-friendly layout hooks or className support. Keep camera capture behavior unchanged.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/ui-shell.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add app/page.tsx app/app/page.tsx components/CameraFeed.tsx app/layout.tsx app/app/layout.tsx lib/ui-shell.ts tests/ui-shell.test.ts
git commit -m "feat: recompose app shell around mobile scanner ui"
```

### Task 4: Adapt live building results into the details sheet

**Files:**
- Modify: `lib/ui-shell.ts`
- Modify: `components/InsightBottomSheet.tsx`
- Modify: `app/page.tsx`
- Modify: `app/app/page.tsx`
- Test: `tests/ui-shell.test.ts`
- Regression: `tests/enrichment-context.test.ts`

**Step 1: Write the failing test**

Add tests for building-specific shell mapping:
- trust block shows `high|medium|low`
- time lens sections include past/present/future
- persona tabs regroup real live fields instead of static seed data
- 3D action only appears when the page supplies a building action handler

Example:

```ts
it('builds building sheet sections from live grounded fields', () => {
  const model = buildBuildingShellModel({
    mode: 'building',
    title: 'Ferry Building',
    subtitle: 'Historic Landmark',
    panels: [],
    confidence: 0.95,
    timestamp: 1,
    historicalSummary: 'Served the waterfront since the late 1800s.',
    neighborhoodSummary: 'Busy waterfront destination.',
    futurePlansStatus: 'proposed',
    futurePlansSummary: 'Facade work is publicly proposed.',
    trustLevel: 'high',
    trustReason: 'Specific place match with grounded sources.',
  });

  expect(model.sections.map((section) => section.id)).toEqual(
    expect.arrayContaining(['current-summary', 'time-lens', 'trust'])
  );
  expect(model.personas).toHaveLength(4);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/ui-shell.test.ts tests/enrichment-context.test.ts
```

Expected:
- FAIL because the new sheet has not consumed the live building fields yet

**Step 3: Write minimal implementation**

Update the building branch of the shell so it:
- surfaces `historicalSummary`, `futurePlansStatus`, `futurePlansSummary`
- preserves `trustLevel` and `trustReason`
- keeps Places-derived data visible when present
- exposes 3D scan as a building-only action in the new action bar or sheet

Do not remove the underlying building enrichment pipeline.

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/ui-shell.test.ts tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add lib/ui-shell.ts components/InsightBottomSheet.tsx app/page.tsx app/app/page.tsx tests/ui-shell.test.ts tests/enrichment-context.test.ts
git commit -m "feat: map live building analysis into mobile detail sheet"
```

### Task 5: Adapt live product results and action wiring into the shell

**Files:**
- Modify: `lib/ui-shell.ts`
- Modify: `components/InsightBottomSheet.tsx`
- Modify: `components/ActionBar.tsx`
- Modify: `components/ModeSwitcher.tsx`
- Modify: `app/page.tsx`
- Modify: `app/app/page.tsx`
- Test: `tests/ui-shell.test.ts`
- Regression: `tests/enrichment-context.test.ts`

**Step 1: Write the failing test**

Add tests for product-specific shell mapping:
- composition, sustainability, price, alternatives, and source summary render into product sections
- decomposition action appears only for products
- product mode still exists in the mode switcher
- voice action remains available when a live result exists

Example:

```ts
it('builds product sections from live product data', () => {
  const model = buildProductShellModel({
    mode: 'product',
    title: 'Oatly Barista',
    subtitle: 'Oat Drink',
    panels: [],
    confidence: 0.9,
    timestamp: 1,
    composition: ['Oats', 'Water'],
    sustainabilityScore: 8,
    priceEstimate: '$4.99',
    alternatives: [{ name: 'Minor Figures', reason: 'Similar foaming profile' }],
  });

  expect(model.sections.map((section) => section.id)).toEqual(
    expect.arrayContaining(['composition', 'market', 'alternatives'])
  );
  expect(model.actions.canDecompose).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/ui-shell.test.ts tests/enrichment-context.test.ts
```

Expected:
- FAIL because the product sheet and action wiring are not fully migrated yet

**Step 3: Write minimal implementation**

Update the product branch of the shell so it:
- presents `ProductData` in the new bottom-sheet format
- preserves current decomposition flow
- keeps the mode switch available for `auto`, `building`, and `product`
- avoids any building-only assumptions in shared shell components

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/ui-shell.test.ts tests/enrichment-context.test.ts
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add lib/ui-shell.ts components/InsightBottomSheet.tsx components/ActionBar.tsx components/ModeSwitcher.tsx app/page.tsx app/app/page.tsx tests/ui-shell.test.ts tests/enrichment-context.test.ts
git commit -m "feat: map live product analysis into mobile shell"
```

### Task 6: Final verification and cleanup

**Files:**
- Verify: `app/page.tsx`
- Verify: `app/app/page.tsx`
- Verify: `components/ActionBar.tsx`
- Verify: `components/InsightBottomSheet.tsx`
- Verify: `components/PersonaTabs.tsx`
- Verify: `components/ScanReticle.tsx`
- Verify: `components/ModeSwitcher.tsx`
- Verify: `components/CameraFeed.tsx`
- Verify: `lib/ui-shell.ts`
- Verify: `styles/hud.css`
- Verify: `tests/ui-shell.test.ts`

**Step 1: Run focused tests**

Run:

```bash
npm test -- tests/ui-shell.test.ts tests/enrichment-context.test.ts
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
git diff -- app/page.tsx app/app/page.tsx components/ActionBar.tsx components/InsightBottomSheet.tsx components/PersonaTabs.tsx components/ScanReticle.tsx components/ModeSwitcher.tsx components/CameraFeed.tsx lib/ui-shell.ts styles/hud.css tests/ui-shell.test.ts
```

Expected:
- UI-shell-only changes, with current analysis capabilities preserved

**Step 5: Commit**

```bash
git add app/page.tsx app/app/page.tsx components/ActionBar.tsx components/InsightBottomSheet.tsx components/PersonaTabs.tsx components/ScanReticle.tsx components/ModeSwitcher.tsx components/CameraFeed.tsx lib/ui-shell.ts styles/hud.css tests/ui-shell.test.ts
git commit -m "feat: transplant mobile ui shell onto live analysis app"
```

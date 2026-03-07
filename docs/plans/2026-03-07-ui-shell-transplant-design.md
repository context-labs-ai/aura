# UI Shell Transplant Design

**Date:** 2026-03-07

## Goal

Replace the current `master` branch presentation layer with the mobile-first visual shell from `origin/codex/setup-20260307` while preserving the existing live analysis, grounding, voice, building 3D scan, and product decomposition behavior.

## Product Intent

The target experience is a more opinionated mobile scanner:

- stronger landing and scan-state presentation
- action-first controls near the thumb zone
- bottom-sheet detail reading instead of dense floating HUD cards
- persona-driven reading modes for building results

This should feel like the `codex/setup-20260307` branch visually and structurally, but it must still run on the real `master` analysis pipeline rather than static building data.

## Chosen Approach

We will use a **shell transplant** approach.

- Keep the current `master` data and capability layer.
- Transplant the mobile UI shell patterns from `origin/codex/setup-20260307`.
- Adapt the new UI to consume existing `OverlayData`, `BuildingData`, and `ProductData`.
- Avoid bringing over the branch's static building records as the main source of truth.

## Scope

### In Scope

- Rework the top-level page flow to follow the mobile scanner shell from `codex/setup-20260307`
- Reuse or recreate the following UI concepts in `master`:
  - landing screen
  - scan view
  - scan reticle
  - bottom action bar
  - bottom sheet detail presentation
  - persona tabs for building interpretation
  - refreshed mobile visual styling in `styles/hud.css`
- Preserve full `building` and `product` support
- Map current grounded building/product data into the new sheet-based UI
- Keep voice, 3D scan, and product decomposition available in the new shell

### Out of Scope

- Replacing live Gemini/Places/grounding logic with static datasets
- Removing current enrichment features to simplify UI work
- Rewriting the backend/data model for the setup branch's architecture
- Shipping a building-only rewrite that hides product mode

## Architecture

### Keep

- `app/page.tsx` analysis orchestration as the core source of truth
- current camera lifecycle
- current mode switching and auto-detect logic
- current building/product enrichment pipelines
- current `OverlayData` / `BuildingData` / `ProductData` types
- current building 3D generation flow
- current product decomposition flow
- current voice context updates

### Replace or Rework

- the top-level screen composition in `app/page.tsx`
- the dominant presentation pattern from floating HUD to mobile shell + sheet
- the visual language in `styles/hud.css`
- how building and product insights are grouped and revealed

### New Mapping Layer

The new UI should interpret the existing live data instead of changing the data model:

- `BuildingData` becomes the source for hero readouts, persona tabs, trust, history, future plans, review context, and action affordances
- `ProductData` becomes the source for hero readouts, composition, sustainability, pricing, alternatives, decomposition, and source-backed insights

Persona tabs should be treated as **reading lenses**, not separate data sources.

## UI Structure

### 1. Landing

Borrow the stronger mobile-first introduction from the setup branch:

- headline
- short explanation
- primary CTA into scan mode
- visual atmosphere / skyline / branded shell

### 2. Scan View

This becomes the main runtime shell:

- full-screen camera
- scan reticle
- top status / mode / confidence indicators
- bottom action bar
- lightweight live status while analysis runs

### 3. Details Sheet

The sheet becomes the primary insight surface.

For `building`:

- hero block
- current summary
- trust layer
- time lens sections:
  - past
  - present
  - future
- places / hours / review context
- persona tabs that regroup the same grounded data into:
  - Explore
  - Live
  - Invest
  - Build
- action affordances for voice and 3D scan

For `product`:

- hero block
- current summary / market intelligence
- composition
- sustainability
- price / alternatives
- sources
- action affordances for decomposition and voice

## Data Strategy

Do not import the setup branch's building record model into the main runtime path.

Instead:

- use the setup branch's component structure and styling patterns
- derive display sections from existing live analysis data
- add small UI-only adapter helpers where needed

If a section has no reliable live data, the UI should omit or soften it instead of inventing static content.

## Risk Controls

### Main Risks

- Accidentally deleting or bypassing current `master` capabilities while transplanting the shell
- Over-fitting the new UI to building mode and weakening product mode
- Pulling in the setup branch's static data architecture and creating conflicting models
- Breaking mobile camera usability with heavier layout or overlays
- Losing access to 3D scan, voice, or decomposition actions in the new shell

### Mitigations

- Keep the current analysis and enrichment logic intact
- Treat UI changes as a presentation refactor, not a pipeline rewrite
- Move feature actions one by one into the new shell
- Verify building and product parity separately
- Keep old HUD components available until the new shell is stable

## Testing Strategy

- Add or update tests around page-level rendering and data mapping where practical
- Preserve existing grounding and enrichment tests
- Run:
  - `npm test`
  - `npm run build`
- Manually verify:
  - landing -> scan flow
  - building mode render
  - product mode render
  - action bar behavior
  - bottom sheet behavior
  - voice action availability
  - building 3D scan trigger
  - product decomposition trigger
  - mobile viewport layout

## Success Criteria

- The app visually reads like the setup branch's mobile scanner shell
- The `master` branch still supports full building and product analysis
- Time Lens and Trust Layer continue to surface in building mode
- Existing advanced features remain accessible
- Tests and build remain green

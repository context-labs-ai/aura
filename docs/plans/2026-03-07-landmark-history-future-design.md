# Landmark History And Future Plans Design

**Date:** 2026-03-07

## Goal

Extend `building` grounding so the model can return landmark-aware historical context and future-plan context for a location, while staying conservative and avoiding speculative output.

## Why

The current building grounding prompt focuses on current business context:
- reviews
- opening hours
- busy times
- neighborhood vibe
- recent news

That is useful for ordinary businesses, but it misses an important use case for iconic buildings and well-known sites: the user may want to know what stood here before, why the place matters historically, and whether any public future redevelopment or renovation is planned.

## Scope

In scope:
- `building` grounding only
- model output contract only
- landmark detection as part of the same grounding call
- structured output for historical and future-plan fields
- conservative prompt rules to reduce hallucination

Out of scope:
- UI changes
- `product` grounding changes
- dual-stage landmark detection
- per-source field attribution for each summary field

## Current State

Today the building grounding flow in [lib/gemini.ts](/Volumes/MainSSD/HomeData/zengy/workspace/aura/lib/gemini.ts) sends a free-form prompt and receives free-form text plus grounding metadata. That text is then merged into `neighborhoodSummary` inside [modes/building/enrichment.ts](/Volumes/MainSSD/HomeData/zengy/workspace/aura/modes/building/enrichment.ts).

This makes it hard to:
- distinguish landmark buildings from ordinary storefronts
- separate current context from historical context
- separate reliable future plans from speculation
- test the output contract precisely

## Proposed Design

### 1. Building grounding becomes structured

Replace the current building grounding free-text contract with a structured object. The shape should be:

```ts
{
  currentSummary: string
  isLandmark: boolean
  landmarkReason: string
  historicalSummary: string
  futurePlansStatus: 'confirmed' | 'proposed' | 'rumored' | 'none_found'
  futurePlansSummary: string
}
```

This structure keeps the existing current-summary behavior while adding explicit landmark, history, and future-planning fields.

### 2. Landmark-only enrichment

Historical and future-plan fields should only be populated when the model has enough confidence that the identified site is a real landmark, iconic building, historic building, or otherwise publicly notable place.

For ordinary businesses and generic storefronts:
- `isLandmark = false`
- `landmarkReason = ""`
- `historicalSummary = ""`
- `futurePlansStatus = "none_found"`
- `futurePlansSummary = ""`

### 3. Site-level historical interpretation

The prompt must strongly prefer site/building history over brand history.

Acceptable:
- construction history of the building
- prior uses of the site
- preservation status
- notable events tied to the physical location
- public redevelopment history of the location

Not acceptable:
- general company history
- unrelated neighborhood history
- facts about similarly named buildings elsewhere

### 4. Conservative future-plan interpretation

Future plans must only include public, place-specific planning information.

Status meanings:
- `confirmed`: official announcements, approved plans, government records, or clearly public project details
- `proposed`: credible reporting or active proposals tied to the site, but not yet finalized
- `rumored`: weak but still place-specific reporting
- `none_found`: no reliable place-specific future plan found

The prompt should explicitly instruct the model to omit rather than speculate.

## Prompt Rules

The updated building grounding prompt should enforce the following:

1. If the building identity is unclear, do not invent history or future plans.
2. Only populate landmark fields when the place is recognizably notable.
3. Prefer site/building history over tenant or brand history.
4. Do not treat brand expansion or business growth as site-level future planning.
5. Do not convert broad city development trends into claims about this specific building.
6. Prefer omission over speculation.

## Data Model Changes

The building-side result model should gain:
- `isLandmark?: boolean`
- `landmarkReason?: string`
- `historicalSummary?: string`
- `futurePlansStatus?: 'confirmed' | 'proposed' | 'rumored' | 'none_found'`
- `futurePlansSummary?: string`

These fields should live on the building data model so later UI work can display them without revisiting the grounding contract.

## Recommended Implementation Shape

### Files likely involved

- [lib/gemini.ts](/Volumes/MainSSD/HomeData/zengy/workspace/aura/lib/gemini.ts)
- [types/overlay.ts](/Volumes/MainSSD/HomeData/zengy/workspace/aura/types/overlay.ts)
- [types/grounding.ts](/Volumes/MainSSD/HomeData/zengy/workspace/aura/types/grounding.ts)
- [modes/building/enrichment.ts](/Volumes/MainSSD/HomeData/zengy/workspace/aura/modes/building/enrichment.ts)
- [tests/gemini.grounding.test.ts](/Volumes/MainSSD/HomeData/zengy/workspace/aura/tests/gemini.grounding.test.ts)
- [tests/enrichment-context.test.ts](/Volumes/MainSSD/HomeData/zengy/workspace/aura/tests/enrichment-context.test.ts)

### Behavioral direction

- Keep `product` grounding on its current path.
- Make `building` grounding parse or request structured JSON.
- Merge `currentSummary` into the existing current building summary field.
- Preserve grounding metadata source extraction.

## Risks

### 1. False positives on landmark detection

Mitigation:
- conservative prompt language
- explicit empty-field behavior for non-landmarks
- tests that verify prompt instructions

### 2. Brand history leaking into site history

Mitigation:
- prompt rule explicitly forbidding company-history substitution
- tests that verify the prompt includes this distinction

### 3. Overstated future plans

Mitigation:
- forced status field
- explicit `none_found` fallback
- “prefer omission over speculation” language

## Testing Strategy

Required tests:
- building grounding prompt includes landmark/history/future-plan instructions
- non-landmark path keeps future/history fields empty
- building enrichment merges new structured fields into building data
- product grounding path remains unchanged

## Success Criteria

This design is successful when:
- landmark buildings can return current summary, historical summary, and future-plan summary separately
- ordinary buildings do not get fabricated historical or future-plan text
- future plans are labeled with conservative status
- the behavior is testable through deterministic unit tests on prompt construction and enrichment mapping

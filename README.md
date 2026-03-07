# Reality Browser

**A camera-first PWA that overlays contextual AI intelligence on a live camera feed with a sci-fi HUD aesthetic. Point your phone at any building or product and get instant, grounded insights — enriched with real-time web data, Places API details, 3D model generation, and voice conversation.**

Built for the **Google Gemini API Developer Competition 2026**.

---

## What It Does

Reality Browser turns your phone camera into an AI-powered lens. It identifies what you're looking at, enriches it with real-time data from multiple Google APIs, and presents everything in a futuristic heads-up display — all running client-side with zero backend.

### Building X-Ray Mode

Point at any building or storefront:

- **Visual identification** — Gemini reads signs, logos, and architectural cues to identify the building
- **Real-time enrichment** — Google Search Grounding fetches live reviews, news, and neighborhood context
- **Places API data** — Rating, opening hours, reviews, and editorial summaries from Google Places (New)
- **Landmark detection** — Recognizes iconic buildings with historical summaries and future development plans
- **Trust layer** — Every grounded claim gets a confidence rating (high/medium/low) with reasoning
- **3D scan** — Generates a 3D model of the building via Hyper3D Rodin, displayed with Three.js
- **Architectural details** — Year built, architect, height, floors, style, and notable facts

### Product Decompiler Mode

Point at any product:

- **Product identification** — Reads brand names, model numbers, and labels from the image
- **Material composition** — Lists visible/inferred materials (plastic, aluminum, glass, etc.)
- **Sustainability score** — 1-10 environmental rating
- **Price estimate & margin guess** — Current retail pricing via Search Grounding
- **Alternative suggestions** — Comparable products with reasoning
- **Supply chain origin** — Manufacturing origin when identifiable
- **Exploded view** — AI-generated decomposition diagram using Gemini image generation

### Voice Conversation (Gemini Live API)

- Tap the mic to start a real-time audio session with Gemini
- The AI has full context from the visual analysis — ask follow-up questions about what you see
- Google Search enabled in voice mode for real-time price lookups, comparisons, and facts
- AudioWorklet-based mic capture with ScriptProcessorNode fallback for Safari/iOS

### Auto-Detect

- Automatically classifies scenes as building or product using Gemini
- Manual override available via the mode switcher
- Confidence-based switching prevents mode flapping

---

## Google APIs & AI Models Used

| API / Model | Purpose |
|---|---|
| **Gemini 3 Flash** | Real-time vision analysis — scene classification, building/product identification (~1-3s) |
| **Gemini 3.1 Pro** | Search Grounding enrichment — live web data, reviews, news, trust scoring |
| **Gemini 2.5 Flash (Native Audio)** | Live API voice conversation — real-time audio Q&A with search tools |
| **Gemini 2.5 Flash (Image Gen)** | Product decomposition — generates exploded-view engineering diagrams |
| **Google Search Grounding** | Real-time web enrichment for both building and product modes |
| **Google Places API (New)** | Text Search + Place Details — ratings, hours, reviews, editorial summaries |
| **Google Geocoding API** | Reverse geocoding for location-aware grounding prompts |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up API keys
cp .env.local.example .env.local
# Edit .env.local and add your keys:
#   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
#   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
#   NEXT_PUBLIC_FAL_KEY=your_fal_ai_key (optional, for 3D generation)

# 3. Run dev server
npm run dev
# Open https://localhost:3000 on your phone (needs HTTPS for camera)

# 4. Deploy to Firebase
npm run deploy
```

## API Keys Required

1. **Gemini API Key** — [ai.google.dev](https://ai.google.dev)
   - Powers: Vision analysis, Search Grounding, Live API voice, image generation
2. **Google Maps API Key** — [Google Cloud Console](https://console.cloud.google.com)
   - Enable: Places API (New), Geocoding API
3. **fal.ai API Key** *(optional)* — [fal.ai](https://fal.ai)
   - Powers: 3D model generation via Hyper3D Rodin

---

## Architecture

```
Camera Feed (getUserMedia)
    |
    v
Gemini 3 Flash — scene classification (auto-detect mode)
    |
    +---> Building Mode                    Product Mode
    |         |                                |
    |    Gemini 3 Flash                   Gemini 3 Flash
    |    (structured output)              (structured output)
    |         |                                |
    |    [display base result]            [display base result]
    |         |                                |
    |    +----+----+                      Gemini 3.1 Pro
    |    |         |                      + Search Grounding
    |    v         v                           |
    | Gemini    Places API               [enriched product data]
    | 3.1 Pro   (Text Search                   |
    | + Search   + Details)              Gemini Flash Image
    | Grounding       |                  (exploded view gen)
    |    |            v
    |    +---> merged BuildingData
    |    |
    |    +---> Hyper3D Rodin (3D model)
    |    +---> Building Details (grounded)
    |
    v
HUD Overlay (CSS animations, frosted glass panels)
    |
    +---> Voice Bridge --> Gemini Live API (native audio, bidirectional)
```

### Two-Phase Analysis Pipeline

1. **Fast base analysis** (~1-3s) — Gemini Flash identifies the subject and displays results immediately
2. **Async enrichment** (background) — Search Grounding + Places API enrich the data without blocking the UI

Results are cached with a smart key (title + location for buildings, title + composition for products) to avoid redundant API calls.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, static export) |
| AI Vision | Gemini 3 Flash (structured JSON output) |
| AI Grounding | Gemini 3.1 Pro + Google Search |
| AI Voice | Gemini 2.5 Flash Native Audio (Live API, bidirectional) |
| AI Image | Gemini 2.5 Flash Image Generation |
| 3D Generation | Hyper3D Rodin v2 via fal.ai |
| 3D Rendering | Three.js (GLB viewer, orbit controls) |
| Location | Google Places API (New), Geocoding API, Geolocation API |
| Styling | CSS-only HUD (no WebGL for UI), Share Tech Mono font |
| Audio | AudioWorklet + ScriptProcessorNode fallback |
| Hosting | Firebase Hosting |
| PWA | Web App Manifest, standalone mode |
| Testing | Vitest |

---

## Project Structure

```
app/
  layout.tsx              — Root layout, dark theme, font import
  page.tsx                — Main page: analysis pipeline, all hooks wired

components/
  CameraFeed.tsx          — Fullscreen camera video with frame capture
  ModeSwitch.tsx          — Auto/Building/Product pill selector
  VoiceButton.tsx         — Floating mic button with state indicator
  HUD/
    HUDOverlay.tsx        — Main overlay container
    BuildingOverlay.tsx   — Building data panels + landmark badge
    ProductOverlay.tsx    — Product data panels + sustainability
    Building3DOverlay.tsx — Full-screen 3D model viewer
    Building3DViewer.tsx  — Three.js GLB renderer (dynamic import)
    DecompositionImage.tsx— AI-generated exploded view overlay
    DecompositionLayer.tsx— CSS composition layer animations
    CornerBrackets.tsx    — Targeting reticle corners
    ScanLine.tsx          — Cyan sweep scan animation
    DataPanel.tsx         — Frosted glass info card
    TypewriterText.tsx    — Character-by-character text reveal
    PulseIndicator.tsx    — Status dot (analyzing/ready)
    ModeIndicator.tsx     — Current mode badge
    AnalysisStatus.tsx    — Analysis state display

hooks/
  useCamera.ts            — Camera lifecycle + permissions
  useAnalysis.ts          — Analysis loop with throttling
  useMode.ts              — Auto-detect + manual override logic
  useLiveVoice.ts         — Live API session + mic capture
  useLocation.ts          — GPS with 60s cache
  useDemoMode.ts          — Offline demo fallback

lib/
  gemini.ts               — analyzeFrame() + enrichWithGrounding() + trust layer
  live-api.ts             — LiveAPIClient, AudioPlayer, mic capture (Worklet + fallback)
  places.ts               — Places Text Search + Place Details (New API)
  geocoding.ts            — Reverse geocoding with haversine cache
  user-context.ts         — Local time, timezone, language for grounding
  image-gen.ts            — Gemini image generation (product decomposition)
  3d-gen.ts               — Hyper3D Rodin 3D model generation via fal.ai
  building-details.ts     — Architectural/historical details via grounded search
  demo-data.ts            — Hardcoded demo data for offline mode

modes/
  building/
    config.ts             — Building mode system prompt + thresholds
    enrichment.ts         — Full enrichment pipeline (Grounding → Places → merge)
  product/
    config.ts             — Product mode system prompt + thresholds
    enrichment.ts         — Product enrichment pipeline (Grounding → merge)

types/
  overlay.ts              — OverlayData, BuildingData, ProductData interfaces
  gemini.ts               — Gemini response schemas (structured output)
  grounding.ts            — GroundingContext, BuildingGroundingResult, TrustLevel
  modes.ts                — AnalysisMode, ModeConfig, system prompts
```

---

## Demo Mode

Tap **DEMO** in the bottom-left corner for an offline demo with hardcoded data and Web Speech API narration. No API keys required.

---

## Key Design Decisions

- **All client-side** — No backend server. API keys are in `.env.local`, all calls go direct from the browser.
- **Two-phase rendering** — Base analysis displays instantly; enrichment loads in the background without jank.
- **Enrichment caching** — Smart cache keying prevents redundant API calls when looking at the same subject.
- **Stale-result protection** — Each analysis request gets a unique ID; late-arriving results are discarded if a newer request has completed.
- **Trust layer** — Every Search Grounding result includes a trust level (high/medium/low) with reasoning, preventing hallucinated claims from surfacing.
- **CSS-only HUD** — All UI animations use CSS transforms and opacity for 60fps performance. No WebGL for the overlay.
- **Safari compatibility** — AudioWorklet with ScriptProcessorNode fallback, AudioContext sampleRate negotiation.

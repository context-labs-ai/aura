# Reality Browser

**A camera-first PWA that uses Gemini AI to overlay contextual intelligence on a live camera feed with a sci-fi HUD aesthetic.**

Built for the Google Hackathon 2026.

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

# 3. Run dev server
npm run dev
# Open https://localhost:3000 on your phone (needs HTTPS for camera)

# 4. Deploy to Firebase
npm install -g firebase-tools
firebase login
npm run deploy
```

## Features

### Two Analysis Modes

- **Building X-Ray** -- Point at any building/storefront to see:
  - Business name, type, rating
  - Opening hours, review summary
  - Neighborhood context via Google Search Grounding
  - Real Places API data (rating, reviews, hours)

- **Product Decompiler** -- Point at any product to see:
  - Material composition breakdown
  - Sustainability score (1-10)
  - Price estimate
  - Alternative suggestions
  - Supply chain origin

### Voice Conversation (Gemini Live API)
- Tap the mic button to start a voice session
- Ask questions about what the camera sees
- AI has full context from the visual analysis
- Audio-only for 15-minute sessions

### Demo Mode
- Tap "DEMO" button for offline demo with hardcoded data
- Uses Web Speech API for voice narration
- Perfect for presentations without API keys

### Auto-Detect
- Automatically switches between Building and Product modes
- Uses Gemini scene classification
- Manual override available via mode switcher

## Architecture

```
Camera Feed (getUserMedia)
    |
    v
Gemini 2.5 Flash (generateContent + structured output)
    |
    +---> Building Mode: Places API + Search Grounding
    +---> Product Mode: Search Grounding only
    |
    v
HUD Overlay (CSS animations, frosted glass panels)
    |
    +---> Voice Bridge --> Gemini Live API (audio-only)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, static export) |
| AI | Gemini 2.5 Flash, Gemini Live API |
| Location | Google Places API (New), Geolocation API |
| Grounding | Google Search Grounding, Maps Grounding |
| Styling | CSS-only HUD (no WebGL), Share Tech Mono font |
| Voice | Gemini Live API (audio-only), AudioWorklet |
| Hosting | Firebase Hosting |
| PWA | Web App Manifest, standalone mode |

## API Keys Required

1. **Gemini API Key** -- [Get one at ai.google.dev](https://ai.google.dev)
   - Enables: generateContent, Live API, Search Grounding
2. **Google Maps API Key** -- [Google Cloud Console](https://console.cloud.google.com)
   - Enable: Places API (New)

## Project Structure

```
app/
  layout.tsx          -- Root layout, dark theme, font import
  page.tsx            -- Main page: all hooks wired together

components/
  CameraFeed.tsx      -- Fullscreen camera video
  ModeSwitch.tsx      -- Auto/Building/Product pill buttons
  VoiceButton.tsx     -- Floating mic button
  HUD/
    HUDOverlay.tsx    -- Main overlay container
    BuildingOverlay.tsx  -- Building data panels
    ProductOverlay.tsx   -- Product data panels
    DecompositionLayer.tsx -- CSS composition layers
    CornerBrackets.tsx    -- Targeting reticle
    ScanLine.tsx          -- Scan animation
    DataPanel.tsx         -- Frosted glass card
    TypewriterText.tsx    -- Text reveal effect
    PulseIndicator.tsx    -- Status dot
    ModeIndicator.tsx     -- Mode badge

hooks/
  useCamera.ts        -- Camera lifecycle
  useAnalysis.ts      -- 15s analysis loop
  useMode.ts          -- Auto-detect + manual override
  useLiveVoice.ts     -- Live API voice session
  useLocation.ts      -- GPS with 60s cache
  useDemoMode.ts      -- Demo mode fallback

lib/
  gemini.ts           -- analyzeFrame() + enrichWithGrounding()
  live-api.ts         -- LiveAPIClient, AudioPlayer, mic capture
  places.ts           -- Places API integration
  demo-data.ts        -- Hardcoded demo data

modes/
  building/           -- Building X-Ray enrichment pipeline
  product/            -- Product Decompiler enrichment pipeline

types/
  overlay.ts          -- OverlayData, BuildingData, ProductData
  gemini.ts           -- Gemini response schemas
  modes.ts            -- Mode configs
```

## Demo Script

### 1. Opening (30s)
> "This is Reality Browser -- an AI layer over reality. Point your phone at the world, and it reveals what's hidden."

### 2. Building X-Ray Demo (90s)
1. Point at a coffee shop / restaurant
2. Wait for scan animation (cyan sweep)
3. Show data panels appearing: name, rating, hours, reviews
4. "It's using Gemini 2.5 Flash for visual recognition, Google Places for real data, and Search Grounding for live context."
5. Tap mic button -- ask "Is this place any good?"
6. AI responds with voice using analysis context

### 3. Product Decompiler Demo (90s)
1. Switch to Product mode (or let auto-detect trigger)
2. Point at a water bottle / phone / packaged food
3. Show decomposition layers appearing
4. "It breaks down the product -- materials, sustainability score, price estimate, alternatives."
5. Ask via voice: "What's the environmental impact?"

### 4. Closing (30s)
> "All running client-side, no backend. Gemini for intelligence, Places API for ground truth, Live API for voice. The camera becomes a portal into hidden data."

### Emergency: Demo Mode
If APIs fail, tap "DEMO" in bottom-left for hardcoded Starbucks Reserve / iPhone 15 Pro data with speech synthesis.

## For Teammates

### Adding a new analysis mode:
1. Add type to `types/modes.ts` (`AnalysisMode` union)
2. Create `modes/yourmode/enrichment.ts` with enrichment pipeline
3. Create `modes/yourmode/config.ts`
4. Add overlay component in `components/HUD/YourModeOverlay.tsx`
5. Add to `HUDOverlay.tsx` rendering logic
6. Wire into `page.tsx` analysis pipeline

### Key patterns:
- All API calls are client-side (keys in `.env.local`)
- Analysis throttled to 1 call per 15 seconds
- Voice context bridging: analysis text -> `updateContext()` -> Live API
- HUD animations: CSS-only, transform/opacity for 60fps
- `pointer-events: none` on overlays, `auto` on interactive elements

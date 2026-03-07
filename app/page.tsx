"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import CameraFeed, { CameraFeedHandle } from "@/components/CameraFeed";
import HUDOverlay from "@/components/HUD/HUDOverlay";
import ModeSwitch from "@/components/ModeSwitch";
import VoiceButton from "@/components/VoiceButton";
import { useMode } from "@/hooks/useMode";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { useLocation } from "@/hooks/useLocation";
import { useDemoMode } from "@/hooks/useDemoMode";
import { analyzeFrame } from "@/lib/gemini";
import { buildBuildingVoiceSummary, getBaseBuildingAnalysis, enrichBuildingFromBase } from "@/modes/building/enrichment";
import { buildProductVoiceSummary, getBaseProductAnalysis, enrichProductFromBase } from "@/modes/product/enrichment";
import type { OverlayData, BuildingData, ProductData } from "@/types/overlay";
import { generateDecomposition, type DecompositionResult } from "@/lib/image-gen";
import DecompositionImage from "@/components/HUD/DecompositionImage";
import { generate3DModel } from '@/lib/3d-gen';
import { fetchBuildingDetails, type BuildingDetails } from '@/lib/building-details';
import Building3DOverlay from '@/components/HUD/Building3DOverlay';

const ANALYSIS_COOLDOWN_MS = 2_000;
const ENRICHMENT_CACHE_MAX = 20;
const ENRICHMENT_CACHE_MIN_CONFIDENCE = 0.55;
const AUTO_MODE_CONFIDENCE_THRESHOLD = 0.6;

function normalizeCachePart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getEnrichmentCacheKey(
  mode: "building" | "product",
  result: OverlayData,
  lat: number | null,
  lng: number | null,
): string | null {
  if (result.confidence < ENRICHMENT_CACHE_MIN_CONFIDENCE) return null;

  const title = normalizeCachePart(result.title);
  if (!title || title.startsWith("no ") || title === "analysis failed") {
    return null;
  }

  if (mode === "building") {
    const locationKey = lat !== null && lng !== null
      ? `${lat.toFixed(3)}:${lng.toFixed(3)}`
      : "no-location";
    return `${mode}:${title}:${locationKey}`;
  }

  const product = result as ProductData;
  const compositionKey = normalizeCachePart((product.composition ?? []).slice(0, 3).join("|"));
  return `${mode}:${title}:${compositionKey}`;
}

export default function Home() {
  const cameraRef = useRef<CameraFeedHandle>(null!);

  // ── Hooks ────────────────────────────────────────────────────
  const { activeMode, selection, isAutoDetect, setSelection, updateFromAnalysis } = useMode();
  const { connectionState, connect, disconnect, updateContext, onAnalysisRequested } = useLiveVoice();
  const { lat, lng } = useLocation();
  const { isDemoMode, toggleDemoMode, demoData, isDemoAnalyzing, simulateAnalysis, speakDemoScript } = useDemoMode();

  // ── Analysis state ───────────────────────────────────────────
  const [data, setData] = useState<OverlayData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzingRef = useRef(false);
  const lastCallRef = useRef(0);
  const requestIdRef = useRef(0);
  const enrichmentCacheRef = useRef<Map<string, OverlayData>>(new Map());
  const pendingEnrichmentRef = useRef<Map<string, Promise<OverlayData>>>(new Map());

  // ── Decomposition state ─────────────────────────────────────────────
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null);

  // ── 3D scan state ─────────────────────────────────────────────────
  const [isScanning3D, setIsScanning3D] = useState(false);
  const [model3DUrl, setModel3DUrl] = useState<string | null>(null);
  const [buildingDetails, setBuildingDetails] = useState<BuildingDetails | null>(null);

  // ── Core analysis pipeline ───────────────────────────────────
  const runAnalysis = useCallback(async () => {
    // Cooldown guard — prevent rapid re-triggers
    const now = Date.now();
    if (now - lastCallRef.current < ANALYSIS_COOLDOWN_MS) return;
    if (analyzingRef.current) return;

    const frame = cameraRef.current?.captureFrame();
    if (!frame) return;

    analyzingRef.current = true;
    lastCallRef.current = now;
    setIsAnalyzing(true);

    // Stale-result protection: each request gets a unique ID
    const thisRequestId = ++requestIdRef.current;

    try {
      // ── Step 1: Scene classification in auto mode ─────────────
      let effectiveMode: "building" | "product" = activeMode === "product" ? "product" : "building";
      if (isAutoDetect) {
        const classification = await analyzeFrame(frame, 'unknown');
        if (requestIdRef.current !== thisRequestId) return;
        if (
          classification.confidence >= AUTO_MODE_CONFIDENCE_THRESHOLD &&
          classification.mode === 'building'
        ) {
          effectiveMode = 'building';
        } else if (
          classification.confidence >= 0.7 &&
          classification.mode === 'product'
        ) {
          // Product mode requires HIGHER confidence to avoid misclassifying landmarks
          effectiveMode = 'product';
        }
        // Default stays 'building' — safer for landmarks, monuments, statues
        updateFromAnalysis(classification);
      }

      // ── Step 2: Fast base analysis (display immediately) ──────
      let baseResult: OverlayData;
      let voiceSummary: string | undefined;

      if (effectiveMode === 'building') {
        const base = await getBaseBuildingAnalysis(frame);
        baseResult = base.data;
        voiceSummary = base.voiceSummary;
      } else {
        baseResult = await getBaseProductAnalysis(frame);
        voiceSummary = buildProductVoiceSummary(baseResult as ProductData);
      }

      if (requestIdRef.current !== thisRequestId) return;
      setData(baseResult);
      if (voiceSummary) updateContext(voiceSummary);

      // ── Step 3: Check enrichment cache ────────────────────────
      const cacheKey = getEnrichmentCacheKey(effectiveMode, baseResult, lat, lng);
      const cached = cacheKey ? enrichmentCacheRef.current.get(cacheKey) : undefined;
      if (cached) {
        setData(cached);
        return;
      }

      // ── Step 4: Async enrichment (non-blocking) ───────────────
      const enrichMode = effectiveMode;
      const enrichBase = baseResult;
      void (async () => {
        try {
          let enrichmentPromise = cacheKey
            ? pendingEnrichmentRef.current.get(cacheKey)
            : undefined;

          if (!enrichmentPromise) {
            enrichmentPromise = (async () => {
              if (enrichMode === 'building') {
                const enriched = await enrichBuildingFromBase(
                  enrichBase as BuildingData, lat, lng,
                );
                return enriched.data;
              }

              return enrichProductFromBase(enrichBase as ProductData);
            })();

            if (cacheKey) {
              pendingEnrichmentRef.current.set(cacheKey, enrichmentPromise);
            }

            enrichmentPromise.finally(() => {
              if (cacheKey) {
                pendingEnrichmentRef.current.delete(cacheKey);
              }
            });
          }

          const enrichedResult = await enrichmentPromise;

          if (requestIdRef.current === thisRequestId) {
            if (enrichMode === 'building') {
              updateContext(buildBuildingVoiceSummary(enrichedResult as BuildingData));
            } else {
              updateContext(buildProductVoiceSummary(enrichedResult as ProductData));
            }
          }

          // Stale guard: only apply if this is still the latest request
          if (requestIdRef.current !== thisRequestId) return;
          setData(enrichedResult);

          // Cache enriched result (evict oldest if full)
          if (cacheKey) {
            if (enrichmentCacheRef.current.size >= ENRICHMENT_CACHE_MAX) {
              const firstKey = enrichmentCacheRef.current.keys().next().value;
              if (firstKey !== undefined) enrichmentCacheRef.current.delete(firstKey);
            }
            enrichmentCacheRef.current.set(cacheKey, enrichedResult);
          }

          // ── Step 5: Fetch building details (year, architect, height, etc.) ──
          if (enrichMode === 'building' && enrichedResult.title) {
            fetchBuildingDetails(enrichedResult.title).then((details) => {
              if (details && requestIdRef.current === thisRequestId) {
                setData((prev) => {
                  if (!prev || prev.mode !== 'building') return prev;
                  return { ...prev, buildingDetails: details } as BuildingData;
                });
              }
            }).catch(() => { /* non-critical */ });
          }
        } catch (err) {
          console.error('[enrichment]', err);
        }
      })();
    } catch (err) {
      console.error("[analysis]", err);
    } finally {
      setIsAnalyzing(false);
      analyzingRef.current = false;
    }
  }, [activeMode, isAutoDetect, lat, lng, updateContext, updateFromAnalysis]);

  // ── Voice-triggered analysis ──────────────────────────────────
  useEffect(() => {
    onAnalysisRequested.current = () => {
      lastCallRef.current = 0;
      runAnalysis();
    };
    return () => { onAnalysisRequested.current = null; };
  }, [runAnalysis, onAnalysisRequested]);

  // ── Clear data when mode changes ────────────────────────────
  useEffect(() => {
    setData(null);
    lastCallRef.current = 0;
    enrichmentCacheRef.current.clear();
    pendingEnrichmentRef.current.clear();
  }, [activeMode]);

  // ── Demo mode: override data with demo data ─────────────────
  useEffect(() => {
    if (isDemoMode && !demoData && !isDemoAnalyzing) {
      simulateAnalysis(activeMode);
    }
  }, [isDemoMode, activeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayData = isDemoMode ? demoData : data;
  const displayAnalyzing = isDemoMode ? isDemoAnalyzing : isAnalyzing;

  // ── Manual trigger (tap the HUD crosshair area) ─────────────
  const handleManualScan = useCallback(() => {
    if (isDemoMode) {
      simulateAnalysis(activeMode);
      speakDemoScript(activeMode as 'building' | 'product');
      return;
    }
    lastCallRef.current = 0;
    runAnalysis();
  }, [isDemoMode, activeMode, simulateAnalysis, speakDemoScript, runAnalysis]);

  // ── Decomposition handler ────────────────────────────────────────────
  const handleDecompose = useCallback(async () => {
    const frame = cameraRef.current?.captureFrame();
    const productTitle = displayData?.title;
    if (!frame || !productTitle) return;

    setIsDecomposing(true);
    try {
      const result = await generateDecomposition(frame, productTitle);
      if (result) {
        setDecomposition(result);
      }
    } catch (err) {
      console.error('[decomposition]', err);
    } finally {
      setIsDecomposing(false);
    }
  }, [displayData?.title]);

  // ── 3D Scan handler ───────────────────────────────────────────────
  const handleScan3D = useCallback(async () => {
    const frame = cameraRef.current?.captureFrame();
    const buildingName = displayData?.title;
    if (!frame || !buildingName) return;

    // 1. Immediately show procedural wireframe (instant Iron Man scan)
    setModel3DUrl('procedural');
    setBuildingDetails(null);
    setIsScanning3D(false);

    // 2. Fetch building details in background (fast, ~2s)
    fetchBuildingDetails(buildingName)
      .then((details) => { if (details) setBuildingDetails(details); })
      .catch(() => { /* non-critical */ });

    // 3. Start 3D model generation in background (slow, 3-5min)
    const isMBS = buildingName.toLowerCase().includes('marina bay sands');
    if (isMBS) {
      setModel3DUrl('/models/mbs.glb');
    } else {
      generate3DModel(frame)
        .then((url) => { if (url) setModel3DUrl(url); })
        .catch(() => { /* keep procedural wireframe as fallback */ });
    }
  }, [displayData?.title]);

  return (
    <>
      <CameraFeed ref={cameraRef} />
      <HUDOverlay
        data={displayData}
        isAnalyzing={displayAnalyzing}
        mode={activeMode}
        onDecompose={displayData?.mode === 'product' ? handleDecompose : undefined}
        isDecomposing={isDecomposing}
        onScan3D={displayData?.mode === 'building' ? handleScan3D : undefined}
        isScanning3D={isScanning3D}
        onAnalyze={handleManualScan}
        lat={lat}
        lng={lng}
      />

      {/* ANALYZE button — centered bottom */}
      <button
        onClick={handleManualScan}
        disabled={isAnalyzing}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 16px) + 60px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          padding: '12px 32px',
          border: `1px solid ${isAnalyzing ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.5)'}`,
          borderRadius: 28,
          background: isAnalyzing ? 'rgba(0,240,255,0.05)' : 'rgba(0,240,255,0.12)',
          color: isAnalyzing ? 'rgba(255,255,255,0.4)' : 'var(--hud-cyan, #00f0ff)',
          fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: isAnalyzing ? 'none' : '0 0 20px rgba(0,240,255,0.15)',
          transition: 'all 0.2s ease',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {isAnalyzing ? (
          <>
            <span className="hud-spin" style={{ display: 'inline-block', width: 14, height: 14 }}>◐</span>
            ANALYZING...
          </>
        ) : (
          <>
            ◉ ANALYZE
          </>
        )}
      </button>

      {/* Mode switcher */}
      <ModeSwitch selection={selection} onSelect={setSelection} />

      {/* Voice button */}
      <VoiceButton
        connectionState={connectionState}
        onConnect={async () => {
          await connect();
        }}
        onDisconnect={disconnect}
      />
      {/* Demo mode toggle — bottom-left */}
      <button
        onClick={toggleDemoMode}
        style={{
          position: 'fixed',
          bottom: 'env(safe-area-inset-bottom, 16px)',
          left: 16,
          zIndex: 30,
          padding: '6px 10px',
          border: `1px solid ${isDemoMode ? '#ff334444' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 16,
          background: isDemoMode ? 'rgba(255,51,68,0.15)' : 'rgba(0,0,0,0.4)',
          color: isDemoMode ? '#ff3344' : 'rgba(255,255,255,0.4)',
          fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
          fontSize: '0.55rem',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        {isDemoMode ? '● DEMO' : 'DEMO'}
      </button>

      {/* Decomposition image overlay */}
      {decomposition && (
        <DecompositionImage
          imageBase64={decomposition.imageBase64}
          description={decomposition.description}
          onClose={() => setDecomposition(null)}
        />
      )}

      {/* 3D building scan overlay */}
      {model3DUrl && (
        <Building3DOverlay
          glbUrl={model3DUrl}
          buildingDetails={buildingDetails}
          buildingName={displayData?.title ?? 'Building'}
          floors={buildingDetails?.floors}
          onClose={() => {
            setModel3DUrl(null);
            setBuildingDetails(null);
          }}
        />
      )}

    </>
  );
}

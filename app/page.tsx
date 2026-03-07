"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import "@/styles/hud.css";
import CameraFeed, { CameraFeedHandle } from "@/components/CameraFeed";
import ActionBar from "@/components/ActionBar";
import InsightBottomSheet from "@/components/InsightBottomSheet";
import LandingHero from "@/components/LandingHero";
import ModeSwitcher from "@/components/ModeSwitcher";
import ScanReticle from "@/components/ScanReticle";
import VoiceButton from "@/components/VoiceButton";
import { useMode } from "@/hooks/useMode";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { useLocation } from "@/hooks/useLocation";
import { useDemoMode } from "@/hooks/useDemoMode";
import { analyzeFrame } from "@/lib/gemini";
import {
  buildBuildingVoiceSummary,
  getBaseBuildingAnalysis,
  enrichBuildingFromBase,
} from "@/modes/building/enrichment";
import {
  buildProductVoiceSummary,
  getBaseProductAnalysis,
  enrichProductFromBase,
} from "@/modes/product/enrichment";
import type { OverlayData, BuildingData, ProductData } from "@/types/overlay";
import { generateDecomposition, type DecompositionResult } from "@/lib/image-gen";
import DecompositionImage from "@/components/HUD/DecompositionImage";
import { generate3DModel } from "@/lib/3d-gen";
import { fetchBuildingDetails, type BuildingDetails } from "@/lib/building-details";
import Building3DOverlay from "@/components/HUD/Building3DOverlay";
import {
  buildBuildingShellModel,
  buildProductShellModel,
  getShellViewState,
  type ShellPersona,
} from "@/lib/ui-shell";

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
    const locationKey =
      lat !== null && lng !== null ? `${lat.toFixed(3)}:${lng.toFixed(3)}` : "no-location";
    return `${mode}:${title}:${locationKey}`;
  }

  const product = result as ProductData;
  const compositionKey = normalizeCachePart((product.composition ?? []).slice(0, 3).join("|"));
  return `${mode}:${title}:${compositionKey}`;
}

export default function Home() {
  const cameraRef = useRef<CameraFeedHandle>(null!);

  const { activeMode, selection, isAutoDetect, setSelection, updateFromAnalysis } = useMode();
  const { connectionState, isConnected, connect, disconnect, updateContext, onAnalysisRequested } =
    useLiveVoice();
  const { lat, lng } = useLocation();
  const {
    isDemoMode,
    toggleDemoMode,
    demoData,
    isDemoAnalyzing,
    simulateAnalysis,
    speakDemoScript,
  } = useDemoMode();

  const [data, setData] = useState<OverlayData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzingRef = useRef(false);
  const lastCallRef = useRef(0);
  const requestIdRef = useRef(0);
  const enrichmentCacheRef = useRef<Map<string, OverlayData>>(new Map());
  const pendingEnrichmentRef = useRef<Map<string, Promise<OverlayData>>>(new Map());

  const [isDecomposing, setIsDecomposing] = useState(false);
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null);

  const [isScanning3D, setIsScanning3D] = useState(false);
  const [model3DUrl, setModel3DUrl] = useState<string | null>(null);
  const [buildingDetails, setBuildingDetails] = useState<BuildingDetails | null>(null);
  const [shellStarted, setShellStarted] = useState(false);
  const [activePersona, setActivePersona] = useState<ShellPersona["id"]>("explore");

  const runAnalysis = useCallback(async () => {
    const now = Date.now();
    if (now - lastCallRef.current < ANALYSIS_COOLDOWN_MS) return;
    if (analyzingRef.current) return;

    const frame = cameraRef.current?.captureFrame();
    if (!frame) return;

    analyzingRef.current = true;
    lastCallRef.current = now;
    setIsAnalyzing(true);

    const thisRequestId = ++requestIdRef.current;

    try {
      let effectiveMode: "building" | "product" = activeMode === "product" ? "product" : "building";
      if (isAutoDetect) {
        const classification = await analyzeFrame(frame, "unknown");
        if (requestIdRef.current !== thisRequestId) return;

        if (
          classification.confidence >= AUTO_MODE_CONFIDENCE_THRESHOLD &&
          classification.mode === "building"
        ) {
          effectiveMode = "building";
        } else if (classification.confidence >= 0.7 && classification.mode === "product") {
          // Product mode requires a higher threshold to avoid landmark misclassification.
          effectiveMode = "product";
        }

        updateFromAnalysis(classification);
      }

      let baseResult: OverlayData;
      let voiceSummary: string | undefined;

      if (effectiveMode === "building") {
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

      const cacheKey = getEnrichmentCacheKey(effectiveMode, baseResult, lat, lng);
      const cached = cacheKey ? enrichmentCacheRef.current.get(cacheKey) : undefined;
      if (cached) {
        setData(cached);
        return;
      }

      const enrichMode = effectiveMode;
      const enrichBase = baseResult;
      void (async () => {
        try {
          let enrichmentPromise = cacheKey ? pendingEnrichmentRef.current.get(cacheKey) : undefined;

          if (!enrichmentPromise) {
            enrichmentPromise = (async () => {
              if (enrichMode === "building") {
                const enriched = await enrichBuildingFromBase(
                  enrichBase as BuildingData,
                  lat,
                  lng,
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
            if (enrichMode === "building") {
              updateContext(buildBuildingVoiceSummary(enrichedResult as BuildingData));
            } else {
              updateContext(buildProductVoiceSummary(enrichedResult as ProductData));
            }
          }

          if (requestIdRef.current !== thisRequestId) return;
          setData(enrichedResult);

          if (cacheKey) {
            if (enrichmentCacheRef.current.size >= ENRICHMENT_CACHE_MAX) {
              const firstKey = enrichmentCacheRef.current.keys().next().value;
              if (firstKey !== undefined) enrichmentCacheRef.current.delete(firstKey);
            }
            enrichmentCacheRef.current.set(cacheKey, enrichedResult);
          }

          if (enrichMode === "building" && enrichedResult.title) {
            fetchBuildingDetails(enrichedResult.title)
              .then((details) => {
                if (!details || requestIdRef.current !== thisRequestId) return;

                setData((prev) => {
                  if (!prev || prev.mode !== "building") return prev;
                  return {
                    ...prev,
                    buildingDetails: details,
                  } as BuildingData;
                });
              })
              .catch(() => {
                // Non-critical enrichment; ignore fetch failure.
              });
          }
        } catch (err) {
          console.error("[enrichment]", err);
        }
      })();
    } catch (err) {
      console.error("[analysis]", err);
    } finally {
      setIsAnalyzing(false);
      analyzingRef.current = false;
    }
  }, [activeMode, isAutoDetect, lat, lng, updateContext, updateFromAnalysis]);

  useEffect(() => {
    onAnalysisRequested.current = () => {
      lastCallRef.current = 0;
      runAnalysis();
    };

    return () => {
      onAnalysisRequested.current = null;
    };
  }, [runAnalysis, onAnalysisRequested]);

  useEffect(() => {
    setData(null);
    lastCallRef.current = 0;
    enrichmentCacheRef.current.clear();
    pendingEnrichmentRef.current.clear();
    setActivePersona("explore");
  }, [activeMode]);

  useEffect(() => {
    if (isDemoMode && !demoData && !isDemoAnalyzing) {
      simulateAnalysis(activeMode);
    }
  }, [isDemoMode, activeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayData = isDemoMode ? demoData : data;
  const displayAnalyzing = isDemoMode ? isDemoAnalyzing : isAnalyzing;

  const handleManualScan = useCallback(() => {
    if (!shellStarted) {
      setShellStarted(true);
    }

    if (isDemoMode) {
      simulateAnalysis(activeMode);
      speakDemoScript(activeMode as "building" | "product");
      return;
    }

    lastCallRef.current = 0;
    runAnalysis();
  }, [shellStarted, isDemoMode, activeMode, simulateAnalysis, speakDemoScript, runAnalysis]);

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
      console.error("[decomposition]", err);
    } finally {
      setIsDecomposing(false);
    }
  }, [displayData?.title]);

  const handleScan3D = useCallback(async () => {
    const frame = cameraRef.current?.captureFrame();
    const buildingName = displayData?.title;
    if (!frame || !buildingName) return;

    // 1. Immediately show overlay with loading/scanning animation
    setModel3DUrl('loading');
    setBuildingDetails(null);
    setIsScanning3D(true);

    fetchBuildingDetails(buildingName)
      .then((details) => {
        if (details) {
          setBuildingDetails(details);
        }
      })
      .catch(() => {
        // Non-critical background detail fetch.
      });

    // 3. Check for pre-baked models, otherwise generate via fal.ai
    const nameLower = buildingName.toLowerCase();
    const isMBS = nameLower.includes('marina bay sands');
    const isMerlion = nameLower.includes('merlion') || nameLower.includes('mer lion');

    // Pre-baked models load instantly; everything else goes to fal.ai (~2 min)
    if (isMBS || isMerlion) {
      setModel3DUrl(isMBS ? '/models/mbs.glb' : '/models/merlion.glb');
      console.log('[3d-scan] Using pre-baked model for:', buildingName);
      setIsScanning3D(false);
    } else {
      console.log('[3d-scan] No pre-baked model for:', buildingName, '- generating via fal.ai');
      generate3DModel(frame)
        .then((url) => {
          setModel3DUrl(url || null);
        })
        .catch(() => {
          setModel3DUrl(null);
        })
        .finally(() => { setIsScanning3D(false); });
    }
  }, [displayData?.title]);

  const shellViewState =
    shellStarted || isDemoMode
      ? getShellViewState({
          hasData: Boolean(displayData),
          isAnalyzing: displayAnalyzing,
          hasCapturedFrame: shellStarted || isDemoMode,
        })
      : "landing";

  const detailModel =
    displayData?.mode === "building"
      ? buildBuildingShellModel(displayData as BuildingData, { canScan3D: true, canAskAI: true })
      : displayData?.mode === "product"
        ? buildProductShellModel(displayData as ProductData, { canDecompose: true, canAskAI: true })
        : null;

  return (
    <>
      <CameraFeed ref={cameraRef} />

      <div
        className={`rb-app-shell rb-app-shell--${shellViewState}`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "20px 16px max(16px, env(safe-area-inset-bottom, 16px))",
          color: "#fff3ed",
          background:
            shellViewState === "landing"
              ? "linear-gradient(180deg, rgba(5, 2, 2, 0.46), rgba(5, 2, 2, 0.8))"
              : "linear-gradient(180deg, rgba(5, 2, 2, 0.12), rgba(5, 2, 2, 0.32))",
          pointerEvents: "none",
        }}
      >
        <div
          className="rb-static-bg"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            pointerEvents: "auto",
            display: "grid",
            gap: 12,
          }}
        >
          <ModeSwitcher active={selection} onChange={setSelection} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <p className="rb-sheet-kicker" style={{ marginBottom: 4 }}>
                Reality Browser
              </p>
              <strong style={{ fontSize: "1rem" }}>
                {shellViewState === "landing"
                  ? "Mobile scanner shell"
                  : displayAnalyzing
                    ? "Analyzing live scene"
                    : detailModel?.heroTitle ?? "Ready to scan"}
              </strong>
            </div>
            <div className="rb-mode-badge">
              {selection === "auto" ? "AUTO" : selection.toUpperCase()}
            </div>
          </div>
        </div>

        {shellViewState === "landing" ? (
          <LandingHero
            onStart={() => {
              setShellStarted(true);
            }}
          />
        ) : (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ScanReticle active={displayAnalyzing} />
            </div>

            <div style={{ display: "grid", gap: 12, pointerEvents: "auto" }}>
              <ActionBar
                onScan={handleManualScan}
                onAskAI={async () => {
                  if (isConnected) {
                    disconnect();
                    return;
                  }

                  await connect();
                  lastCallRef.current = 0;
                  runAnalysis();
                }}
                onToggleSave={() => {}}
                onCompare={() => {}}
                canAskAI={Boolean(displayData)}
                canCompare={false}
                isSaved={false}
                isScanning={displayAnalyzing}
              />

              {detailModel ? (
                <InsightBottomSheet
                  model={detailModel}
                  activePersona={activePersona}
                  onPersonaChange={setActivePersona}
                />
              ) : (
                <div className="rb-insight-sheet" style={{ pointerEvents: "none" }}>
                  <p className="rb-sheet-kicker">Scan state</p>
                  <strong>
                    {displayAnalyzing ? "Reading the scene..." : "Point the camera and tap scan."}
                  </strong>
                  <p style={{ margin: 0, color: "rgba(255,243,237,0.72)" }}>
                    Building and product details will appear here once the live analysis completes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <VoiceButton
        connectionState={connectionState}
        onConnect={async () => {
          await connect();
          lastCallRef.current = 0;
          runAnalysis();
        }}
        onDisconnect={disconnect}
      />

      <button
        onClick={toggleDemoMode}
        style={{
          position: "fixed",
          bottom: "env(safe-area-inset-bottom, 16px)",
          left: 16,
          zIndex: 30,
          padding: "6px 10px",
          border: `1px solid ${isDemoMode ? "#ff334444" : "rgba(255,255,255,0.15)"}`,
          borderRadius: 16,
          background: isDemoMode ? "rgba(255,51,68,0.15)" : "rgba(0,0,0,0.4)",
          color: isDemoMode ? "#ff3344" : "rgba(255,255,255,0.4)",
          fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
          fontSize: "0.55rem",
          letterSpacing: "0.08em",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          pointerEvents: "auto",
        }}
      >
        {isDemoMode ? "● DEMO" : "DEMO"}
      </button>

      {decomposition && (
        <DecompositionImage
          imageBase64={decomposition.imageBase64}
          description={decomposition.description}
          onClose={() => setDecomposition(null)}
        />
      )}

      {model3DUrl && (
        <Building3DOverlay
          glbUrl={model3DUrl}
          buildingDetails={buildingDetails}
          buildingName={displayData?.title ?? "Building"}
          floors={buildingDetails?.floors}
          onClose={() => {
            setModel3DUrl(null);
            setBuildingDetails(null);
          }}
        />
      )}

      {detailModel?.mode === "product" && detailModel.actions.canDecompose ? (
        <button
          onClick={handleDecompose}
          style={{
            position: "fixed",
            right: 16,
            bottom: 88,
            zIndex: 30,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(107,214,255,0.24)",
            background: "rgba(10, 18, 24, 0.72)",
            color: "#dff8ff",
            fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
            fontSize: "0.65rem",
            pointerEvents: "auto",
          }}
          disabled={isDecomposing}
        >
          {isDecomposing ? "Decomposing..." : "Decompose"}
        </button>
      ) : null}

      {detailModel?.mode === "building" && detailModel.actions.canScan3D ? (
        <button
          onClick={handleScan3D}
          style={{
            position: "fixed",
            right: 16,
            bottom: 88,
            zIndex: 30,
            padding: "12px 20px",
            borderRadius: 999,
            border: "1px solid rgba(246,83,20,0.5)",
            background: "linear-gradient(135deg, rgba(246,83,20,0.3), rgba(24,10,10,0.85))",
            color: "#fff3ed",
            fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            pointerEvents: "auto",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 2px 16px rgba(246,83,20,0.25)",
          }}
          disabled={isScanning3D}
        >
          {isScanning3D ? "Generating 3D..." : "\uD83C\uDFDB\uFE0F 3D View"}
        </button>
      ) : null}
    </>
  );
}

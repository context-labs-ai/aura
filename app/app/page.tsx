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
import { enrichBuildingData } from "@/modes/building/enrichment";
import { enrichProductData } from "@/modes/product/enrichment";
import type { OverlayData } from "@/types/overlay";
import { generateDecomposition, type DecompositionResult } from "@/lib/image-gen";
import DecompositionImage from "@/components/HUD/DecompositionImage";

const ANALYSIS_INTERVAL_MS = 15_000;

export default function Home() {
  const cameraRef = useRef<CameraFeedHandle>(null!);

  // ── Hooks ────────────────────────────────────────────────────
  const { activeMode, selection, setSelection, updateFromAnalysis } = useMode();
  const { connectionState, connect, disconnect, updateContext } = useLiveVoice();
  const { lat, lng } = useLocation();
  const { isDemoMode, toggleDemoMode, demoData, isDemoAnalyzing, simulateAnalysis, speakDemoScript } = useDemoMode();

  // ── Analysis state ───────────────────────────────────────────
  const [data, setData] = useState<OverlayData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzingRef = useRef(false);
  const lastCallRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Decomposition state ─────────────────────────────────────────────
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null);

  // ── Core analysis pipeline ───────────────────────────────────
  const runAnalysis = useCallback(async () => {
    // Throttle guard
    const now = Date.now();
    if (now - lastCallRef.current < ANALYSIS_INTERVAL_MS) return;
    if (analyzingRef.current) return;

    const frame = cameraRef.current?.captureFrame();
    if (!frame) return;

    analyzingRef.current = true;
    lastCallRef.current = now;
    setIsAnalyzing(true);

    try {
      let result: OverlayData;

      if (activeMode === 'building') {
        const enriched = await enrichBuildingData(frame, lat, lng);
        result = enriched.data;
        // Bridge voice context — send analysis summary to Live API
        if (enriched.voiceSummary) {
          updateContext(enriched.voiceSummary);
        }
      } else {
        result = await enrichProductData(frame);
        // Bridge voice context for product mode
        if (result.subtitle) {
          updateContext(result.subtitle);
        }
      }

      setData(result);
      // Feed to auto-detect
      updateFromAnalysis(result);
    } catch (err) {
      console.error("[analysis]", err);
    } finally {
      setIsAnalyzing(false);
      analyzingRef.current = false;
    }
  }, [activeMode, lat, lng, updateContext, updateFromAnalysis]);

  // ── Auto-analysis interval ──────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return; // demo mode handles its own timing

    // Initial analysis after camera warms up
    const initialTimeout = setTimeout(() => {
      runAnalysis();
    }, 2500);

    intervalRef.current = setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [runAnalysis, isDemoMode]);

  // ── Clear data when mode changes ────────────────────────────
  useEffect(() => {
    setData(null);
    lastCallRef.current = 0; // allow immediate re-analysis
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

  return (
    <>
      <CameraFeed ref={cameraRef} />
      <HUDOverlay
        data={displayData}
        isAnalyzing={displayAnalyzing}
        mode={activeMode}
        onDecompose={displayData?.mode === 'product' ? handleDecompose : undefined}
        isDecomposing={isDecomposing}
      />

      {/* Tap-to-scan overlay — center of screen */}
      <div
        onClick={handleManualScan}
        style={{
          position: 'fixed',
          top: '35%',
          left: '30%',
          width: '40%',
          height: '30%',
          zIndex: 20,
          cursor: 'pointer',
        }}
      />

      {/* Mode switcher */}
      <ModeSwitch selection={selection} onSelect={setSelection} />

      {/* Voice button */}
      <VoiceButton
        connectionState={connectionState}
        onConnect={async () => {
          await connect();
          // Trigger immediate analysis so voice has context ASAP
          lastCallRef.current = 0;
          runAnalysis();
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

    </>
  );
}

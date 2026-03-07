"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import type { OverlayData } from '@/types/overlay';
import type { AnalysisMode } from '@/types/modes';
import type { CameraFeedHandle } from '@/components/CameraFeed';
import { analyzeFrame } from '@/lib/gemini';

const ANALYSIS_INTERVAL_MS = 15_000; // 15 seconds

export interface UseAnalysisResult {
  data: OverlayData | null;
  isAnalyzing: boolean;
  error: string | null;
  triggerAnalysis: () => void;
}

export function useAnalysis(
  cameraRef: React.RefObject<CameraFeedHandle | null>,
  mode: AnalysisMode
): UseAnalysisResult {
  const [data, setData] = useState<OverlayData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCallRef = useRef<number>(0);
  const analyzingRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    // Throttle guard: no more than 1 call per 15 seconds
    const now = Date.now();
    if (now - lastCallRef.current < ANALYSIS_INTERVAL_MS) return;
    if (analyzingRef.current) return;

    const frame = cameraRef.current?.captureFrame();
    if (!frame) return;

    analyzingRef.current = true;
    lastCallRef.current = now;
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeFrame(frame, mode);
      setData(result);
    } catch {
      setError('Analysis failed');
    } finally {
      setIsAnalyzing(false);
      analyzingRef.current = false;
    }
  }, [cameraRef, mode]);

  // Auto-analysis on interval
  useEffect(() => {
    // Run initial analysis after a short delay to let camera warm up
    const initialTimeout = setTimeout(() => {
      runAnalysis();
    }, 2000);

    intervalRef.current = setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [runAnalysis]);

  // Manual trigger (respects throttle)
  const triggerAnalysis = useCallback(() => {
    // Reset throttle on manual trigger so it fires immediately
    lastCallRef.current = 0;
    runAnalysis();
  }, [runAnalysis]);

  return { data, isAnalyzing, error, triggerAnalysis };
}

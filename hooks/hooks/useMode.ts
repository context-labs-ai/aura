'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AnalysisMode } from '@/types/modes';
import type { OverlayData } from '@/types/overlay';

export type ModeSelection = 'auto' | 'building' | 'product';

export interface UseModeResult {
  /** The effective analysis mode — resolved from auto-detect or manual override */
  activeMode: AnalysisMode;
  /** The user's selection (includes 'auto' option) */
  selection: ModeSelection;
  /** Whether auto-detect is active */
  isAutoDetect: boolean;
  /** Set the mode selection */
  setSelection: (mode: ModeSelection) => void;
  /** Feed analysis results to refine auto-detect */
  updateFromAnalysis: (data: OverlayData) => void;
}

/**
 * Mode management hook.
 * - Manual override: user picks 'building' or 'product'
 * - Auto-detect: uses `mode` field from Gemini analysis result to switch
 */
export function useMode(): UseModeResult {
  const [selection, setSelection] = useState<ModeSelection>('auto');
  const [detectedMode, setDetectedMode] = useState<AnalysisMode>('building');
  const consecutiveRef = useRef<{ mode: AnalysisMode; count: number }>({
    mode: 'building',
    count: 0,
  });

  const activeMode: AnalysisMode =
    selection === 'auto' ? detectedMode : selection;

  const isAutoDetect = selection === 'auto';

  /**
   * Feed analysis data to auto-detect.
   * Requires 2 consecutive same-mode detections to switch,
   * preventing flicker from single-frame misclassifications.
   */
  const updateFromAnalysis = useCallback(
    (data: OverlayData) => {
      if (!isAutoDetect) return;
      if (data.mode === 'unknown' || data.confidence < 0.4) return;

      const detected = data.mode as AnalysisMode;
      if (detected === consecutiveRef.current.mode) {
        consecutiveRef.current.count += 1;
      } else {
        consecutiveRef.current = { mode: detected, count: 1 };
      }

      // Switch after 2 consecutive detections of the same mode
      if (consecutiveRef.current.count >= 2) {
        setDetectedMode(detected);
      }
    },
    [isAutoDetect],
  );

  // Reset consecutive counter when switching to/from auto
  useEffect(() => {
    consecutiveRef.current = { mode: detectedMode, count: 0 };
  }, [selection]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    activeMode,
    selection,
    isAutoDetect,
    setSelection,
    updateFromAnalysis,
  };
}

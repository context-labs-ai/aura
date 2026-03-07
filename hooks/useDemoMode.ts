'use client';

import { useState, useCallback, useRef } from 'react';
import type { OverlayData } from '@/types/overlay';
import type { AnalysisMode } from '@/types/modes';
import {
  demoBuildingData,
  demoProductData,
  demoVoiceScripts,
} from '@/lib/demo-data';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoData, setDemoData] = useState<OverlayData | null>(null);
  const [isDemoAnalyzing, setIsDemoAnalyzing] = useState(false);
  const abortRef = useRef(false);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev;
      if (!next) {
        // Turning off demo mode — clear state
        setDemoData(null);
        setIsDemoAnalyzing(false);
        abortRef.current = true;
      }
      return next;
    });
  }, []);

  /**
   * Simulate an analysis cycle with realistic delays.
   * 1.5s "analysis" phase → 0.5s "grounding" phase → return data.
   */
  const simulateAnalysis = useCallback(
    async (mode: AnalysisMode = 'building') => {
      abortRef.current = false;
      setIsDemoAnalyzing(true);
      setDemoData(null);

      // Phase 1: Simulated analysis delay (1.5s)
      await delay(1500);
      if (abortRef.current) return;

      // Phase 2: Simulated grounding delay (0.5s)
      await delay(500);
      if (abortRef.current) return;

      const data =
        mode === 'product'
          ? { ...demoProductData, timestamp: Date.now() }
          : { ...demoBuildingData, timestamp: Date.now() };

      setDemoData(data);
      setIsDemoAnalyzing(false);
    },
    [],
  );

  /**
   * Use Web Speech API to read the demo voice script aloud.
   * Falls back silently if speechSynthesis is unavailable.
   */
  const speakDemoScript = useCallback(
    (mode: 'building' | 'product' = 'building') => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const script = demoVoiceScripts[mode];
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  return {
    isDemoMode,
    toggleDemoMode,
    demoData,
    isDemoAnalyzing,
    simulateAnalysis,
    speakDemoScript,
  };
}

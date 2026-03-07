'use client';

import { useEffect, useState } from 'react';

interface AnalysisStatusProps {
  isAnalyzing: boolean;
  hasData: boolean;
}

const TIPS = [
  'HOLD STEADY — ANALYZING',
  'SCANNING — DON\'T MOVE',
  'PROCESSING — KEEP STILL',
];

/**
 * Center-screen analysis status banner.
 * Shows a prominent glowing indicator when AI is actively analyzing.
 * Warns user to hold still. Fades out when analysis completes.
 */
export default function AnalysisStatus({ isAnalyzing, hasData }: AnalysisStatusProps) {
  const [visible, setVisible] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (isAnalyzing) {
      setVisible(true);
      setTipIndex(Math.floor(Math.random() * TIPS.length));
    } else if (visible) {
      // Keep visible briefly after analysis completes to show "DONE"
      const timer = setTimeout(() => setVisible(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const isDone = !isAnalyzing;

  return (
    <div
      className={isDone ? 'analysis-status analysis-status--done' : 'analysis-status'}
      style={{
        position: 'absolute',
        top: '42%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
        animation: isDone ? 'fadeOut 0.8s ease-out 0.4s forwards' : 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Spinning ring */}
      {!isDone && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(0,240,255,0.15)',
            borderTopColor: '#00f0ff',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}

      {/* Checkmark when done */}
      {isDone && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid #00ff88',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            color: '#00ff88',
            animation: 'scaleIn 0.3s ease-out',
          }}
        >
          ✓
        </div>
      )}

      {/* Status text */}
      <div
        style={{
          fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
          fontSize: '0.7rem',
          letterSpacing: '0.15em',
          color: isDone ? '#00ff88' : '#00f0ff',
          textShadow: isDone
            ? '0 0 10px rgba(0,255,136,0.5)'
            : '0 0 10px rgba(0,240,255,0.5)',
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        {isDone ? (hasData ? 'ANALYSIS COMPLETE' : 'NO MATCH FOUND') : TIPS[tipIndex]}
      </div>

      {/* Progress bar */}
      {!isDone && (
        <div
          style={{
            width: 120,
            height: 2,
            background: 'rgba(0,240,255,0.15)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#00f0ff',
              animation: 'progressSlide 2s ease-in-out infinite',
              transformOrigin: 'left',
            }}
          />
        </div>
      )}
    </div>
  );
}

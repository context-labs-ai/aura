'use client';

import { useMemo } from 'react';

const PALETTE = [
  '#00f0ff', // cyan
  '#00ff88', // green
  '#ffaa00', // amber
  '#ff3344', // red
  '#a855f7', // purple
  '#38bdf8', // sky
];

interface DecompositionLayerProps {
  composition: string[];
}

/**
 * CSS-based decomposition effect.
 * Renders stacked semi-transparent layers that animate apart on mount,
 * each representing a material / ingredient in the product composition.
 */
export default function DecompositionLayer({ composition }: DecompositionLayerProps) {
  const layers = useMemo(() => {
    if (!composition || composition.length === 0) return [];
    return composition.slice(0, 6); // Cap at 6 layers for readability
  }, [composition]);

  if (layers.length === 0) return null;

  const layerHeight = 100 / layers.length;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      {layers.map((material, i) => {
        const color = PALETTE[i % PALETTE.length];
        // Each layer slides to its final vertical position from the center
        const targetY = i * layerHeight;
        return (
          <div
            key={`${material}-${i}`}
            className="decompose-layer"
            style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              height: `${layerHeight}%`,
              top: `${targetY}%`,
              background: `${color}1A`, // hex alpha ~0.1 opacity
              borderTop: i > 0 ? `1px solid ${color}44` : 'none',
              animationDelay: `${i * 0.12}s`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
                fontSize: '0.65rem',
                color: color,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                opacity: 0.9,
                textShadow: `0 0 6px ${color}66`,
              }}
            >
              ▸ {material}
            </span>
          </div>
        );
      })}
    </div>
  );
}

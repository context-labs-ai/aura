'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { BuildingDetails } from '@/lib/building-details';

// Dynamically import the Three.js viewer — MUST be ssr: false
const Building3DViewer = dynamic(() => import('./Building3DViewer'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--hud-cyan, #00f0ff)',
        fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
        fontSize: '0.65rem',
        letterSpacing: '0.1em',
      }}
    >
      <span className="hud-spin" style={{ display: 'inline-block', marginRight: 8 }}>◐</span>
      INITIALIZING 3D ENGINE...
    </div>
  ),
});

interface Building3DOverlayProps {
  glbUrl: string;
  buildingDetails: BuildingDetails | null;
  buildingName: string;
  onClose: () => void;
}

/**
 * Full-screen overlay showing a wireframe 3D model (top) + building info (bottom).
 * Follows the DecompositionImage.tsx pattern: z-index 100, fixed positioning,
 * backdrop blur, close button, header bar.
 */
export default function Building3DOverlay({
  glbUrl,
  buildingDetails,
  buildingName,
  onClose,
}: Building3DOverlayProps) {
  const [viewerSize, setViewerSize] = useState({ width: 350, height: 280 });

  // Calculate viewer size based on viewport
  useEffect(() => {
    function updateSize() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewerSize({
        width: Math.min(vw - 32, 500),
        height: Math.floor(vh * 0.45),
      });
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div
      className="decomp-image-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scaleIn 0.3s ease-out',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          zIndex: 2,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          style={{
            fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            color: 'var(--hud-cyan, #00f0ff)',
            textTransform: 'uppercase',
          }}
        >
          ◇ 3D STRUCTURAL ANALYSIS
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* 3D Viewer section — top 55% */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 16px 16px',
          flexShrink: 0,
        }}
      >
        <Building3DViewer
          glbUrl={glbUrl}
          width={viewerSize.width}
          height={viewerSize.height}
        />
      </div>

      {/* Building name label */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          textAlign: 'center',
          padding: '0 20px 12px',
        }}
      >
        <span
          style={{
            fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--hud-cyan, #00f0ff)',
            letterSpacing: '0.05em',
          }}
        >
          {buildingName}
        </span>
      </div>

      {/* Building Details section — bottom 45%, scrollable */}
      {buildingDetails && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            padding: '0 16px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Info cards */}
          {buildingDetails.yearBuilt && (
            <InfoCard label="YEAR BUILT" value={buildingDetails.yearBuilt} />
          )}
          {buildingDetails.architect && (
            <InfoCard label="ARCHITECT" value={buildingDetails.architect} />
          )}
          {buildingDetails.height && (
            <InfoCard
              label="HEIGHT"
              value={`${buildingDetails.height}${buildingDetails.floors ? ` · ${buildingDetails.floors} floors` : ''}`}
            />
          )}
          {buildingDetails.architecturalStyle && (
            <InfoCard label="STYLE" value={buildingDetails.architecturalStyle} />
          )}
          {buildingDetails.historicalSignificance && (
            <InfoCard label="SIGNIFICANCE" value={buildingDetails.historicalSignificance} />
          )}
          {buildingDetails.notableFacts && buildingDetails.notableFacts.length > 0 && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(0,240,255,0.05)',
                border: '1px solid rgba(0,240,255,0.15)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
                  fontSize: '0.55rem',
                  letterSpacing: '0.1em',
                  color: 'var(--hud-cyan, #00f0ff)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                NOTABLE FACTS
              </div>
              {buildingDetails.notableFacts.map((fact, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.5,
                    marginBottom: 4,
                  }}
                >
                  ▸ {fact}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading state for details */}
      {!buildingDetails && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <span
            style={{
              fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.1em',
            }}
          >
            <span className="hud-spin" style={{ display: 'inline-block', marginRight: 8 }}>◐</span>
            FETCHING BUILDING DATA...
          </span>
        </div>
      )}
    </div>
  );
}

/** Frosted glass info card */
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'rgba(0,240,255,0.05)',
        border: '1px solid rgba(0,240,255,0.15)',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
          fontSize: '0.55rem',
          letterSpacing: '0.1em',
          color: 'var(--hud-cyan, #00f0ff)',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

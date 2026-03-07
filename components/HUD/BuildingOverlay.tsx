"use client";

import type { BuildingData } from "@/types/overlay";
import DataPanel from "./DataPanel";
import TypewriterText from "./TypewriterText";
import PulseIndicator from "./PulseIndicator";

interface BuildingOverlayProps {
  data: BuildingData;
  onScan3D?: () => void;
  isScanning3D?: boolean;
}

export default function BuildingOverlay({ data, onScan3D, isScanning3D }: BuildingOverlayProps) {
  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
      <span>
        {"★".repeat(full)}
        {half ? "½" : ""}
        {"☆".repeat(5 - full - (half ? 1 : 0))}
        &nbsp;
        <span style={{ color: "var(--hud-cyan)" }}>{rating.toFixed(1)}</span>
      </span>
    );
  };

  return (
    <div className="hud-data-stack">
      {/* 1 — Title panel */}
      <DataPanel title="Identified" delay={0.15}>
        <strong style={{ color: "var(--hud-cyan)", fontSize: "1rem" }}>
          {data.title}
        </strong>
        {data.subtitle && (
          <>
            <br />
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.7rem" }}>
              {data.subtitle}
            </span>
          </>
        )}
      </DataPanel>

      {/* 2 — Rating panel */}
      {data.rating !== undefined && (
        <DataPanel title="Rating" delay={0.3}>
          <span style={{ fontSize: "0.85rem", letterSpacing: "0.05em" }}>
            {renderStars(data.rating)}
          </span>
        </DataPanel>
      )}

      {/* 3 — Review summary (typewriter) */}
      {data.reviewSummary && (
        <DataPanel title="Review Summary" delay={0.45}>
          <TypewriterText text={data.reviewSummary} speed={25} />
        </DataPanel>
      )}

      {/* 4 — Hours / open-closed badge */}
      {(data.openNow !== undefined || data.hours) && (
        <DataPanel title="Hours" delay={0.6}>
          {data.openNow !== undefined && (
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "3px",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginRight: "8px",
                background: data.openNow
                  ? "rgba(0,255,136,0.15)"
                  : "rgba(255,51,68,0.15)",
                color: data.openNow ? "var(--hud-green)" : "var(--hud-red)",
                border: `1px solid ${data.openNow ? "var(--hud-green)" : "var(--hud-red)"}`,
              }}
            >
              {data.openNow ? "OPEN" : "CLOSED"}
            </span>
          )}
          {data.hours && (
            <span style={{ fontSize: "0.75rem" }}>{data.hours}</span>
          )}
        </DataPanel>
      )}

      {/* 5 — Foot traffic hypothesis */}
      {data.footTrafficHypothesis && (
        <DataPanel title="Foot Traffic" delay={0.75}>
          <PulseIndicator label="HYPOTHESIS" color="var(--hud-amber)" />
          <div style={{ marginTop: "4px", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
            {data.footTrafficHypothesis}
          </div>
        </DataPanel>
      )}

      {/* 6 — Neighborhood summary */}
      {data.neighborhoodSummary && (
        <DataPanel title="Neighborhood" delay={0.9}>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
            {data.neighborhoodSummary}
          </span>
        </DataPanel>
      )}

      {/* 7 — 3D Scan button */}
      {onScan3D && (
        <DataPanel title="3D Analysis" delay={1.05}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onScan3D();
            }}
            disabled={isScanning3D}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: isScanning3D
                ? 'rgba(0,240,255,0.05)'
                : 'rgba(0,240,255,0.1)',
              border: `1px solid ${isScanning3D ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.4)'}`,
              borderRadius: 6,
              color: isScanning3D ? 'rgba(255,255,255,0.4)' : 'var(--hud-cyan)',
              fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              cursor: isScanning3D ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            {isScanning3D ? (
              <>
                <span className="hud-spin" style={{ display: 'inline-block', width: 14, height: 14 }}>◐</span>
                GENERATING 3D SCAN...
              </>
            ) : (
              <>
                ◈ 3D SCAN
              </>
            )}
          </button>
        </DataPanel>
      )}
    </div>
  );
}

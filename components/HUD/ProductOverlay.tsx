"use client";

import type { ProductData } from "@/types/overlay";
import DataPanel from "./DataPanel";
import TypewriterText from "./TypewriterText";

interface ProductOverlayProps {
  data: ProductData;
  onDecompose?: () => void;
  isDecomposing?: boolean;
}

function getSustainabilityColor(score: number): string {
  if (score >= 7) return "var(--hud-green)";
  if (score >= 4) return "var(--hud-amber)";
  return "var(--hud-red)";
}

function getSustainabilityLabel(score: number): string {
  if (score >= 7) return "SUSTAINABLE";
  if (score >= 4) return "MODERATE";
  return "CONCERNING";
}

export default function ProductOverlay({ data, onDecompose, isDecomposing }: ProductOverlayProps) {
  return (
    <div className="hud-data-stack">
      {/* 1 — Title panel */}
      <DataPanel title="Product Identified" delay={0.15}>
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

      {/* 2 — Composition panel */}
      {data.composition && data.composition.length > 0 && (
        <DataPanel title="Composition" delay={0.3}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {data.composition.map((item, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "3px",
                  fontSize: "0.65rem",
                  background: "rgba(0,240,255,0.08)",
                  border: "1px solid rgba(0,240,255,0.2)",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </DataPanel>
      )}

      {/* 3 — Sustainability badge */}
      {data.sustainabilityScore !== undefined && (
        <DataPanel title="Sustainability" delay={0.45}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                fontSize: "0.9rem",
                fontWeight: 700,
                background: `${getSustainabilityColor(data.sustainabilityScore)}18`,
                border: `2px solid ${getSustainabilityColor(data.sustainabilityScore)}`,
                color: getSustainabilityColor(data.sustainabilityScore),
                boxShadow: `0 0 8px ${getSustainabilityColor(data.sustainabilityScore)}40`,
              }}
            >
              {data.sustainabilityScore}
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                fontWeight: 700,
                color: getSustainabilityColor(data.sustainabilityScore),
              }}
            >
              {getSustainabilityLabel(data.sustainabilityScore)}
            </span>
          </div>
        </DataPanel>
      )}

      {/* 4 — Price estimate */}
      {data.priceEstimate && (
        <DataPanel title="Price Estimate" delay={0.6}>
          <TypewriterText text={data.priceEstimate} speed={20} />
        </DataPanel>
      )}

      {/* 5 — Alternatives */}
      {data.alternatives && data.alternatives.length > 0 && (
        <DataPanel title="Alternatives" delay={0.75}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {data.alternatives.map((alt, i) => (
              <div key={i} style={{ fontSize: "0.75rem" }}>
                <span style={{ color: "var(--hud-cyan)", fontWeight: 700 }}>
                  ▸ {alt.name}
                </span>
                <br />
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.65rem" }}>
                  {alt.reason}
                </span>
              </div>
            ))}
          </div>
        </DataPanel>
      )}

      {/* 6 — Supply chain origin */}
      {data.supplyChainOrigin && (
        <DataPanel title="Supply Chain" delay={0.9}>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
            {data.supplyChainOrigin}
          </span>
        </DataPanel>
      )}

      {/* 7 — Decompose button */}
      {onDecompose && (
        <DataPanel title="Structural Analysis" delay={1.05}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDecompose();
            }}
            disabled={isDecomposing}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: isDecomposing
                ? 'rgba(0,240,255,0.05)'
                : 'rgba(0,240,255,0.1)',
              border: `1px solid ${isDecomposing ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.4)'}`,
              borderRadius: 6,
              color: isDecomposing ? 'rgba(255,255,255,0.4)' : 'var(--hud-cyan)',
              fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              cursor: isDecomposing ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            {isDecomposing ? (
              <>
                <span className="hud-spin" style={{ display: 'inline-block', width: 14, height: 14 }}>◐</span>
                GENERATING DECOMPOSITION...
              </>
            ) : (
              <>
                ◈ GENERATE EXPLODED VIEW
              </>
            )}
          </button>
        </DataPanel>
      )}
    </div>
  );
}

"use client";

import type { BuildingData } from "@/types/overlay";
import DataPanel from "./DataPanel";
import TypewriterText from "./TypewriterText";
import PulseIndicator from "./PulseIndicator";

interface BuildingOverlayProps {
  data: BuildingData;
  onScan3D?: () => void;
  isScanning3D?: boolean;
  lat?: number | null;
  lng?: number | null;
}

export default function BuildingOverlay({ data, onScan3D, isScanning3D, lat, lng }: BuildingOverlayProps) {
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
        {data.isLandmark && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 3,
                fontSize: '0.55rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                background: 'rgba(255,200,0,0.15)',
                color: 'var(--hud-amber, #ffaa00)',
                border: '1px solid var(--hud-amber, #ffaa00)',
              }}
            >
              ★ LANDMARK
            </span>
            {data.landmarkReason && (
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>
                {data.landmarkReason}
              </span>
            )}
          </div>
        )}
      </DataPanel>

      {/* 2 — Location & Coordinates */}
      {(lat != null && lng != null) && (
        <DataPanel title="Location" delay={0.25}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: '0.7rem', fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)" }}>
              <span style={{ color: 'var(--hud-cyan)', marginRight: 8 }}>LAT</span>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>{lat.toFixed(6)}</span>
              <span style={{ color: 'var(--hud-cyan)', marginLeft: 16, marginRight: 8 }}>LNG</span>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>{lng.toFixed(6)}</span>
            </div>
          </div>
        </DataPanel>
      )}

      {/* 3 — Rating panel */}
      {data.rating !== undefined && (
        <DataPanel title="Rating" delay={0.35}>
          <span style={{ fontSize: "0.85rem", letterSpacing: "0.05em" }}>
            {renderStars(data.rating)}
          </span>
        </DataPanel>
      )}

      {/* 4 — Review summary (typewriter) */}
      {data.reviewSummary && (
        <DataPanel title="Review Summary" delay={0.45}>
          <TypewriterText text={data.reviewSummary} speed={25} />
        </DataPanel>
      )}

      {/* 5 — Hours / open-closed badge */}
      {(data.openNow !== undefined || data.hours) && (
        <DataPanel title="Hours" delay={0.55}>
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

      {/* 6 — Building specs: year, architect, height, style */}
      {data.buildingDetails && (
        <DataPanel title="Building Specs" delay={0.65}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.7rem' }}>
            {data.buildingDetails.yearBuilt && (
              <div>
                <span style={{ color: 'var(--hud-cyan)', marginRight: 8 }}>BUILT</span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{data.buildingDetails.yearBuilt}</span>
              </div>
            )}
            {data.buildingDetails.architect && (
              <div>
                <span style={{ color: 'var(--hud-cyan)', marginRight: 8 }}>ARCHITECT</span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{data.buildingDetails.architect}</span>
              </div>
            )}
            {data.buildingDetails.height && (
              <div>
                <span style={{ color: 'var(--hud-cyan)', marginRight: 8 }}>HEIGHT</span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {data.buildingDetails.height}
                  {data.buildingDetails.floors ? ` · ${data.buildingDetails.floors} floors` : ''}
                </span>
              </div>
            )}
            {data.buildingDetails.architecturalStyle && (
              <div>
                <span style={{ color: 'var(--hud-cyan)', marginRight: 8 }}>STYLE</span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{data.buildingDetails.architecturalStyle}</span>
              </div>
            )}
          </div>
        </DataPanel>
      )}

      {/* 7 — Historical summary */}
      {(data.historicalSummary || data.buildingDetails?.historicalSignificance) && (
        <DataPanel title="History" delay={0.75}>
          <TypewriterText
            text={data.buildingDetails?.historicalSignificance || data.historicalSummary || ''}
            speed={20}
          />
        </DataPanel>
      )}

      {/* 8 — Notable facts */}
      {data.buildingDetails?.notableFacts && data.buildingDetails.notableFacts.length > 0 && (
        <DataPanel title="Notable Facts" delay={0.85}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.buildingDetails.notableFacts.map((fact, i) => (
              <div key={i} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                ▸ {fact}
              </div>
            ))}
          </div>
        </DataPanel>
      )}

      {/* 9 — Future plans */}
      {data.futurePlansSummary && data.futurePlansStatus !== 'none_found' && (
        <DataPanel title="Future Plans" delay={0.9}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: '0.55rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background:
                  data.futurePlansStatus === 'confirmed' ? 'rgba(0,255,136,0.15)'
                  : data.futurePlansStatus === 'proposed' ? 'rgba(0,180,255,0.15)'
                  : 'rgba(255,200,0,0.15)',
                color:
                  data.futurePlansStatus === 'confirmed' ? 'var(--hud-green)'
                  : data.futurePlansStatus === 'proposed' ? 'var(--hud-cyan)'
                  : 'var(--hud-amber, #ffaa00)',
                border: '1px solid currentColor',
              }}
            >
              {data.futurePlansStatus}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            {data.futurePlansSummary}
          </span>
        </DataPanel>
      )}

      {/* 10 — Foot traffic hypothesis */}
      {data.footTrafficHypothesis && (
        <DataPanel title="Foot Traffic" delay={0.95}>
          <PulseIndicator label="HYPOTHESIS" color="var(--hud-amber)" />
          <div style={{ marginTop: "4px", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
            {data.footTrafficHypothesis}
          </div>
        </DataPanel>
      )}

      {/* 11 — Neighborhood summary */}
      {data.neighborhoodSummary && (
        <DataPanel title="Neighborhood" delay={1.0}>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
            {data.neighborhoodSummary}
          </span>
        </DataPanel>
      )}

      {/* 12 — 3D Scan button */}
      {onScan3D && (
        <DataPanel title="3D Analysis" delay={1.1}>
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

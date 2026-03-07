"use client";

import "@/styles/hud.css";
import type { OverlayData, BuildingData, ProductData } from "@/types/overlay";
import CornerBrackets from "./CornerBrackets";
import ScanLine from "./ScanLine";
import DataPanel from "./DataPanel";
import TypewriterText from "./TypewriterText";
import PulseIndicator from "./PulseIndicator";
import ModeIndicator from "./ModeIndicator";
import BuildingOverlay from "./BuildingOverlay";
import ProductOverlay from "./ProductOverlay";
import AnalysisStatus from "./AnalysisStatus";

function isBuildingData(data: OverlayData): data is BuildingData {
  return data.mode === "building";
}

function isProductData(data: OverlayData): data is ProductData {
  return data.mode === "product";
}

interface HUDOverlayProps {
  data?: OverlayData | null;
  isAnalyzing?: boolean;
  mode?: string;
  onDecompose?: () => void;
  isDecomposing?: boolean;
  onScan3D?: () => void;
  isScanning3D?: boolean;
  onAnalyze?: () => void;
  lat?: number | null;
  lng?: number | null;
}

export default function HUDOverlay({ data, isAnalyzing, mode, onDecompose, isDecomposing, onScan3D, isScanning3D, onAnalyze, lat, lng }: HUDOverlayProps) {
  const hasData = data !== undefined;
  const modeIcon = data?.mode === "product" ? "📦" : "🏢";
  const modeLabel = data?.mode === "product" ? "PRODUCT X-RAY" : "BUILDING X-RAY";

  return (
    <div className="hud-overlay">
      {/* Atmosphere layers */}
      <div className="hud-noise" />
      <div className="hud-vignette" />

      {/* Scanning animation — only during analysis */}
      {isAnalyzing && <ScanLine />}

      {/* Center targeting reticle */}
      <CornerBrackets />

      {/* Center analysis status — prominent banner */}
      <AnalysisStatus isAnalyzing={!!isAnalyzing} hasData={!!data} />

      {/* Top bar: mode + status */}
      <div className="hud-top-bar">
        {hasData && data ? (
          <ModeIndicator icon={modeIcon} label={modeLabel} />
        ) : (
          <ModeIndicator />
        )}
        <PulseIndicator
          label={isAnalyzing ? "SCANNING" : "LIVE"}
          color={isAnalyzing ? "var(--hud-amber)" : undefined}
        />
      </div>

      {/* Bottom data area */}
      <div className="hud-bottom-area">
        {/* Case 1: No data prop passed — backward compatible placeholder */}
        {!hasData && (
          <div className="hud-data-stack">
            <DataPanel title="Identified" delay={0.2}>
              <strong style={{ color: "var(--hud-cyan)" }}>Starbucks Reserve</strong>
              <br />
              4.6 ★ &nbsp;·&nbsp; Coffee &amp; Espresso
            </DataPanel>

            <DataPanel title="Status" delay={0.5}>
              Open until 9 PM &nbsp;·&nbsp; Moderate traffic
            </DataPanel>

            <DataPanel title="Analysis" delay={0.8}>
              <TypewriterText text="Analyzing structure... Commercial building detected." />
            </DataPanel>
          </div>
        )}

        {/* Case 2: Data is null — empty state with ANALYZE prompt */}
        {hasData && data === null && !isAnalyzing && (
          <div className="hud-empty-state">
            <span className="hud-empty-state__icon">◎</span>
            <span className="hud-empty-state__text">
              Point your camera at a building or product
            </span>
          </div>
        )}

        {/* Case 3: Building data */}
        {hasData && data && isBuildingData(data) && (
          <BuildingOverlay
            key={data.timestamp}
            data={data}
            onScan3D={onScan3D}
            isScanning3D={isScanning3D}
            lat={lat}
            lng={lng}
          />
        )}
        {/* Case 4: Product data */}
        {hasData && data && isProductData(data) && (
          <ProductOverlay
            key={data.timestamp}
            data={data}
            onDecompose={onDecompose}
            isDecomposing={isDecomposing}
          />
        )}

        <div className="hud-bottom-status">
          <PulseIndicator
            label={isAnalyzing ? "SCANNING" : "READY"}
            color={isAnalyzing ? "var(--hud-amber)" : undefined}
          />
          <span
            style={{
              fontFamily: "var(--hud-font)",
              fontSize: "0.6rem",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.1em",
            }}
          >
            REALITY BROWSER v0.1
          </span>
        </div>
      </div>
    </div>
  );
}

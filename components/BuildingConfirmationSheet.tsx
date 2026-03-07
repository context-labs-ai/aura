"use client";

import type { BuildingRecord, Confidence, ScanState } from "@/types/reality";

interface BuildingConfirmationSheetProps {
  detected?: BuildingRecord;
  candidates: BuildingRecord[];
  confidence?: Confidence;
  onSelect: (buildingId: string) => void;
  scanState: ScanState;
  showManualNotice?: boolean;
}

function getStatusText(scanState: ScanState): string {
  if (scanState === "scanning") return "Freezing current frame";
  if (scanState === "analyzing") return "Scoring nearby buildings";
  if (scanState === "detected") return "Top candidate ready";
  return "Ready for manual confirmation";
}

export default function BuildingConfirmationSheet({
  detected,
  candidates,
  confidence = "low",
  onSelect,
  scanState,
  showManualNotice = false,
}: BuildingConfirmationSheetProps) {
  return (
    <section className="rb-confirm-sheet">
      <div className="rb-sheet-header">
        <div>
          <p className="rb-sheet-kicker">Building detection</p>
          <h3>{getStatusText(scanState)}</h3>
        </div>
        {detected && <span className={`rb-confidence rb-confidence--${confidence}`}>{confidence}</span>}
      </div>

      {detected && (
        <div className="rb-detected-block rb-detected-block--hero">
          <div>
            <strong>{detected.building.name}</strong>
            <p>{detected.building.type} | {detected.building.address}</p>
          </div>
          <button className="rb-inline-action" onClick={() => onSelect(detected.building.id)}>
            Confirm
          </button>
        </div>
      )}

      {showManualNotice && (
        <div className="rb-inline-warning">
          <strong>Manual mode is active.</strong>
          <p>GPS is unavailable, so the shortlist remains visible for quick fallback during demos.</p>
        </div>
      )}

      <p className="rb-sheet-sub">Nearby options stay visible so the user can correct the match immediately.</p>
      <div className="rb-candidate-list">
        {candidates.map((candidate, index) => (
          <button key={candidate.building.id} onClick={() => onSelect(candidate.building.id)}>
            <span>{index === 0 ? "Primary" : `Alt ${index}`}</span>
            <strong>{candidate.building.name}</strong>
            <small>{candidate.building.address}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

"use client";

import type { VisionMode } from "@/types/reality";

interface ModeSwitcherProps {
  active: VisionMode;
  onChange: (next: VisionMode) => void;
}

const MODES: { id: VisionMode; label: string; short: string }[] = [
  { id: "xray", label: "X-Ray", short: "XR" },
  { id: "time", label: "Time", short: "TM" },
  { id: "social", label: "Social", short: "SC" },
  { id: "price", label: "Price", short: "PV" },
  { id: "energy", label: "Energy", short: "EN" },
  { id: "portal", label: "Portal", short: "PT" },
];

export default function ModeSwitcher({ active, onChange }: ModeSwitcherProps) {
  return (
    <div className="rb-mode-switcher">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          className={`rb-mode-chip ${mode.id === active ? "rb-mode-chip--active" : ""}`}
          onClick={() => onChange(mode.id)}
        >
          <span className="rb-mode-chip__short">{mode.short}</span>
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}

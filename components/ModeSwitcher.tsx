"use client";

import React from "react";

interface ModeSwitcherProps {
  active: "auto" | "building" | "product";
  onChange: (next: "auto" | "building" | "product") => void;
}

const MODES = [
  { id: "auto", label: "Auto", short: "AU" },
  { id: "building", label: "Building", short: "BD" },
  { id: "product", label: "Product", short: "PD" },
] as const;

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

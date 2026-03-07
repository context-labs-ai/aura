"use client";

import React from "react";

interface ScanReticleProps {
  active: boolean;
}

export default function ScanReticle({ active }: ScanReticleProps) {
  return (
    <div className={`rb-reticle ${active ? "rb-reticle--active" : ""}`}>
      <div className="rb-reticle__inner" />
    </div>
  );
}

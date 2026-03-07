"use client";

import type { Confidence } from "@/types/reality";

interface ARLabelOverlayProps {
  name: string;
  confidence: Confidence;
}

export default function ARLabelOverlay({ name, confidence }: ARLabelOverlayProps) {
  return (
    <div className="rb-ar-label">
      <span className={`rb-confidence rb-confidence--${confidence}`}>{confidence}</span>
      <strong>{name}</strong>
    </div>
  );
}

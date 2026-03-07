"use client";

import React from "react";

interface ActionBarProps {
  onScan: () => void;
  isScanning: boolean;
  hidden?: boolean;
}

export default function ActionBar({
  onScan,
  isScanning,
  hidden = false,
}: ActionBarProps) {
  return (
    <div className={`rb-action-bar ${hidden ? "rb-ui-hidden" : ""}`} style={{ gridTemplateColumns: "1fr" }}>
      <button className="rb-action-bar__primary" onClick={onScan} disabled={isScanning}>
        {isScanning ? "Scanning..." : "Scan"}
      </button>
    </div>
  );
}

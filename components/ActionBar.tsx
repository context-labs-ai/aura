"use client";

import React from "react";

interface ActionBarProps {
  onScan: () => void;
  onAskAI: () => void;
  onToggleSave: () => void;
  onCompare: () => void;
  canAskAI: boolean;
  canCompare: boolean;
  isSaved: boolean;
  isScanning: boolean;
  hidden?: boolean;
}

export default function ActionBar({
  onScan,
  onAskAI,
  onToggleSave,
  onCompare,
  canAskAI,
  canCompare,
  isSaved,
  isScanning,
  hidden = false,
}: ActionBarProps) {
  return (
    <div className={`rb-action-bar ${hidden ? "rb-ui-hidden" : ""}`}>
      <button className="rb-action-bar__primary" onClick={onScan} disabled={isScanning}>
        {isScanning ? "Scanning" : "Scan"}
      </button>
      <button onClick={onAskAI} disabled={!canAskAI}>Insights</button>
      <button onClick={onToggleSave} disabled={!canAskAI}>{isSaved ? "Saved" : "Save"}</button>
      <button onClick={onCompare} disabled={!canCompare}>Compare</button>
    </div>
  );
}

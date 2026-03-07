"use client";

interface ModeIndicatorProps {
  icon?: string;
  label?: string;
}

export default function ModeIndicator({
  icon = "🏢",
  label = "BUILDING X-RAY",
}: ModeIndicatorProps) {
  return (
    <div className="hud-mode">
      <span className="hud-mode__icon">{icon}</span>
      <span className="hud-mode__label">{label}</span>
    </div>
  );
}

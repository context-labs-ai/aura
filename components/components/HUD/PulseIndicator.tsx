"use client";

interface PulseIndicatorProps {
  label?: string;
  color?: string;
}

export default function PulseIndicator({
  label = "LIVE",
  color,
}: PulseIndicatorProps) {
  const dotStyle = color
    ? { background: color, boxShadow: `0 0 6px ${color}, 0 0 12px ${color}40` }
    : undefined;

  return (
    <span className="hud-pulse">
      <span className="hud-pulse__dot" style={dotStyle} />
      <span className="hud-pulse__label" style={color ? { color } : undefined}>
        {label}
      </span>
    </span>
  );
}

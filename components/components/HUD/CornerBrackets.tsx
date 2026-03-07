"use client";

export default function CornerBrackets() {
  return (
    <div className="hud-corner-brackets">
      <div className="hud-corner hud-corner--tl" />
      <div className="hud-corner hud-corner--tr" />
      <div className="hud-corner hud-corner--bl" />
      <div className="hud-corner hud-corner--br" />
      <div className="hud-crosshair" />
      <div className="hud-crosshair-line hud-crosshair-line--h" />
      <div className="hud-crosshair-line hud-crosshair-line--v" />
    </div>
  );
}

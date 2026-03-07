"use client";

import type { DataPanelContent } from "@/types/overlay";

interface DataPanelProps {
  title: string;
  children?: React.ReactNode;
  items?: DataPanelContent[];
  delay?: number;
}

function renderItem(item: DataPanelContent, index: number) {
  switch (item.type) {
    case "rating":
      return (
        <div key={index} style={{ fontSize: "0.85rem" }}>
          {item.icon && <span style={{ marginRight: "4px" }}>{item.icon}</span>}
          <span style={{ color: "var(--hud-cyan)" }}>{item.value}</span>
        </div>
      );
    case "badge":
      return (
        <span
          key={index}
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: "3px",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            background: "rgba(0,240,255,0.1)",
            border: "1px solid rgba(0,240,255,0.3)",
            color: "var(--hud-cyan)",
            marginRight: "6px",
          }}
        >
          {item.icon && <span style={{ marginRight: "4px" }}>{item.icon}</span>}
          {item.value}
        </span>
      );
    case "list":
      return (
        <div key={index} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
          <span style={{ color: "var(--hud-cyan)", marginRight: "4px" }}>▸</span>
          {item.icon && <span style={{ marginRight: "4px" }}>{item.icon}</span>}
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{item.label}:</span>{" "}
          {item.value}
        </div>
      );
    case "text":
    default:
      return (
        <div key={index} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
          {item.icon && <span style={{ marginRight: "4px" }}>{item.icon}</span>}
          {item.label && (
            <span style={{ color: "rgba(255,255,255,0.5)", marginRight: "4px" }}>
              {item.label}:
            </span>
          )}
          {item.value}
        </div>
      );
  }
}

export default function DataPanel({ title, children, items, delay = 0 }: DataPanelProps) {
  return (
    <div
      className="hud-data-panel"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="hud-data-panel__title">{title}</div>
      <div className="hud-data-panel__content">
        {children}
        {items && items.map((item, i) => renderItem(item, i))}
      </div>
    </div>
  );
}

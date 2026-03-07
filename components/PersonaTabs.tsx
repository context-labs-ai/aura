"use client";

import type { Persona } from "@/types/reality";

interface PersonaTabsProps {
  active: Persona;
  onChange: (next: Persona) => void;
}

const PERSONAS: { id: Persona; label: string; helper: string }[] = [
  { id: "explore", label: "Explore", helper: "visit" },
  { id: "live", label: "Live", helper: "dwell" },
  { id: "invest", label: "Invest", helper: "yield" },
  { id: "build", label: "Build", helper: "deploy" },
];

export default function PersonaTabs({ active, onChange }: PersonaTabsProps) {
  return (
    <div className="rb-persona-tabs">
      {PERSONAS.map((persona) => (
        <button
          key={persona.id}
          className={`rb-persona-tab ${active === persona.id ? "rb-persona-tab--active" : ""}`}
          onClick={() => onChange(persona.id)}
        >
          <span>{persona.label}</span>
          <small>{persona.helper}</small>
        </button>
      ))}
    </div>
  );
}

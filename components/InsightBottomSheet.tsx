"use client";

import React from "react";
import type { BuildingShellModel, ProductShellModel, ShellPersona } from "@/lib/ui-shell";
import PersonaTabs from "@/components/PersonaTabs";

interface InsightBottomSheetProps {
  model: BuildingShellModel | ProductShellModel;
  activePersona?: ShellPersona["id"];
  onPersonaChange?: (next: ShellPersona["id"]) => void;
}

export default function InsightBottomSheet({
  model,
  activePersona = "explore",
  onPersonaChange,
}: InsightBottomSheetProps) {
  const isBuilding = model.mode === "building";
  const activeSummary = isBuilding
    ? model.personas.find((persona) => persona.id === activePersona)?.summary
    : undefined;

  return (
    <section className="rb-insight-sheet">
      <header className="rb-insight-header">
        <div>
          <p className="rb-sheet-kicker">{model.mode} mode</p>
          <h3>{model.heroTitle}</h3>
          {model.heroSubtitle ? <p>{model.heroSubtitle}</p> : null}
        </div>
        <div className="rb-insight-header__meta">
          <span className="rb-mode-badge">{model.heroConfidence}</span>
          {isBuilding ? <span className="rb-save-pill">{model.trust.badge}</span> : null}
        </div>
      </header>

      {isBuilding ? (
        <>
          <section className="rb-hero-metric">
            <div>
              <p className="rb-sheet-kicker">Trust layer</p>
              <strong>{model.trust.badge}</strong>
              <p>{model.trust.reason}</p>
            </div>
          </section>
          <PersonaTabs active={activePersona} onChange={onPersonaChange ?? (() => {})} />
          {activeSummary ? (
            <section className="rb-compare-panel">
              <p className="rb-sheet-kicker">Active lens</p>
              <div className="rb-compare-panel__grid">
                <div>
                  <span>{activePersona}</span>
                  <strong>{activeSummary}</strong>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <div className="rb-card-grid">
        {model.sections.map((section) => (
          <article key={section.id} className="rb-card">
            <h4>{section.title}</h4>
            {section.body ? <p>{section.body}</p> : null}
            {section.items?.length ? (
              <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
            {section.blocks?.length ? (
              <div className="rb-section-blocks">
                {section.blocks.map((block) => (
                  <div key={block.id} className="rb-section-block">
                    <span>{block.label}</span>
                    <strong>{block.body}</strong>
                    {block.status ? <small>{block.status}</small> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

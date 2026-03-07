"use client";

import type { BuildingRecord, Persona, VisionMode } from "@/types/reality";

interface InsightBottomSheetProps {
  record: BuildingRecord;
  persona: Persona;
  mode: VisionMode;
  aiSummary: string;
  onAskAI: () => void;
  compareRecord: BuildingRecord | null;
  isSaved: boolean;
}

function renderExplore(record: BuildingRecord): React.ReactNode {
  return (
    <>
      <article className="rb-card">
        <h4>History timeline</h4>
        <ul>{record.explorer.history.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>
      <article className="rb-card rb-card--metric">
        <h4>Crowd + rating</h4>
        <p className="rb-card__hero">{record.explorer.rating.toFixed(1)}</p>
        <p>Crowd level {record.explorer.crowdLevel}/100</p>
      </article>
      <article className="rb-card">
        <h4>Hidden discoveries</h4>
        <ul>{record.explorer.hiddenSpots.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>
      <article className="rb-card">
        <h4>Nearby attractions</h4>
        <ul>{record.explorer.nearbyAttractions.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>
    </>
  );
}

function renderLive(record: BuildingRecord): React.ReactNode {
  return (
    <>
      <article className="rb-card rb-card--metric">
        <h4>Estimated rent</h4>
        <p className="rb-card__hero">{record.home.estimatedRent}</p>
        <p>{record.home.estimatedValue}</p>
      </article>
      <article className="rb-card">
        <h4>Structural + transit</h4>
        <p>Structural score: {record.home.structuralScore}/10</p>
        <p>Transit score: {record.home.transitScore}/100</p>
      </article>
      <article className="rb-card">
        <h4>Living signals</h4>
        <p>Noise: {record.home.noiseLevel}</p>
        <p>Occupancy: {record.home.occupancy}%</p>
        <p>{record.home.connectivity}</p>
      </article>
      <article className="rb-card">
        <h4>Amenities</h4>
        <ul>{record.home.amenities.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>
    </>
  );
}

function renderInvest(record: BuildingRecord): React.ReactNode {
  return (
    <>
      <article className="rb-card rb-card--metric">
        <h4>Investment score</h4>
        <p className="rb-card__hero">{record.investor.investmentScore}</p>
        <p>{record.investor.forecast}</p>
      </article>
      <article className="rb-card">
        <h4>Valuation metrics</h4>
        <p>{record.investor.valuation}</p>
        <p>Cap rate: {record.investor.capRate}</p>
        <p>Yield: {record.investor.rentalYield}</p>
      </article>
      <article className="rb-card">
        <h4>5-year trend</h4>
        <p>{record.investor.appreciation5Y}</p>
        <ul>{record.investor.futureDevelopments.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>
      <article className="rb-card">
        <h4>Risk notes</h4>
        <ul>{record.investor.riskNotes.map((note) => <li key={note}>{note}</li>)}</ul>
      </article>
    </>
  );
}

function renderBuild(record: BuildingRecord): React.ReactNode {
  return (
    <>
      <article className="rb-card rb-card--metric">
        <h4>Foot traffic</h4>
        <p className="rb-card__hero">{record.business.footTrafficDaily.toLocaleString()}</p>
        <p>Peak: {record.business.peakHours.join(", ")}</p>
      </article>
      <article className="rb-card">
        <h4>Competitor density</h4>
        <ul>
          {Object.entries(record.business.competitorCounts).map(([key, value]) => (
            <li key={key}>
              {key.replace("_", " ")}: {value}
            </li>
          ))}
        </ul>
      </article>
      <article className="rb-card">
        <h4>Infrastructure + energy</h4>
        <p>Infrastructure score: {record.business.infrastructureScore}/100</p>
        <p>Energy score: {record.business.energyScore}</p>
      </article>
      <article className="rb-card">
        <h4>Accessibility notes</h4>
        <ul>{record.business.accessibilityNotes.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>
    </>
  );
}

function renderPersonaCards(persona: Persona, record: BuildingRecord): React.ReactNode {
  if (persona === "explore") return renderExplore(record);
  if (persona === "live") return renderLive(record);
  if (persona === "invest") return renderInvest(record);
  return renderBuild(record);
}

function getHeroMetric(persona: Persona, record: BuildingRecord): string {
  if (persona === "explore") return `${record.explorer.rating.toFixed(1)} / 5`;
  if (persona === "live") return record.home.estimatedRent;
  if (persona === "invest") return `${record.investor.investmentScore}/100`;
  return `${record.business.footTrafficDaily.toLocaleString()}/day`;
}

export default function InsightBottomSheet({
  record,
  persona,
  mode,
  aiSummary,
  onAskAI,
  compareRecord,
  isSaved,
}: InsightBottomSheetProps) {
  return (
    <section className="rb-insight-sheet">
      <header className="rb-insight-header">
        <div>
          <p className="rb-sheet-kicker">{persona} persona</p>
          <h3>{record.building.name}</h3>
          <p>{record.building.type} | Built {record.building.yearBuilt}</p>
        </div>
        <div className="rb-insight-header__meta">
          <span className="rb-mode-badge">{mode}</span>
          <span className={`rb-save-pill ${isSaved ? "rb-save-pill--active" : ""}`}>{isSaved ? "saved" : "live"}</span>
        </div>
      </header>

      <section className="rb-hero-metric">
        <div>
          <p className="rb-sheet-kicker">Primary readout</p>
          <strong>{getHeroMetric(persona, record)}</strong>
          <p>{aiSummary}</p>
        </div>
        <button className="rb-inline-action" onClick={onAskAI}>Refresh AI</button>
      </section>

      {compareRecord && (
        <section className="rb-compare-panel">
          <p className="rb-sheet-kicker">Compare candidate</p>
          <div className="rb-compare-panel__grid">
            <div>
              <span>Selected</span>
              <strong>{record.building.name}</strong>
            </div>
            <div>
              <span>Alternate</span>
              <strong>{compareRecord.building.name}</strong>
            </div>
          </div>
        </section>
      )}

      <div className="rb-card-grid">{renderPersonaCards(persona, record)}</div>
    </section>
  );
}

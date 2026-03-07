"use client";

import React from "react";

interface LandingHeroProps {
  onStart: () => void;
}

export default function LandingHero({ onStart }: LandingHeroProps) {
  return (
    <section className="rb-landing-shell">
      <div className="rb-landing-skyline" aria-hidden="true" />
      <div className="rb-landing__content">
        <p className="rb-sheet-kicker">AURA</p>
        <h1>Augmented Universal Recognition Assistant</h1>
        <p>
          Point your camera at any building or product. AURA uses Gemini AI and Google Places
          to reveal hidden details — history, ratings, 3D models, and real-time intelligence.
        </p>
        <button className="rb-action-bar__primary rb-landing__cta" onClick={onStart}>
          Start Scan
        </button>
      </div>
    </section>
  );
}

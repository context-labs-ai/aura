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
        <p className="rb-sheet-kicker">Reality Browser</p>
        <h1>Swap the old HUD for a mobile-first scanner.</h1>
        <p>
          The live Gemini and Places pipeline stays intact. This landing hero borrows the setup
          branch atmosphere without dragging its static building flow into the app shell.
        </p>
        <button className="rb-action-bar__primary rb-landing__cta" onClick={onStart}>
          Start Scan
        </button>
      </div>
    </section>
  );
}

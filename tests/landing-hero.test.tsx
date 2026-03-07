import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LandingHero from '@/components/LandingHero';

describe('landing hero', () => {
  it('renders the transplanted landing atmosphere with skyline hook and scan CTA', () => {
    const html = renderToStaticMarkup(
      createElement(LandingHero, {
        onStart: () => {},
      })
    );

    expect(html).toContain('rb-landing-shell');
    expect(html).toContain('rb-landing-skyline');
    expect(html).toContain('Reality Browser');
    expect(html).toContain('Swap the old HUD for a mobile-first scanner.');
    expect(html).toContain('Start Scan');
  });
});

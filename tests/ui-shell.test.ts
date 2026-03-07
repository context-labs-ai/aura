import { describe, expect, it } from 'vitest';
import type { BuildingData, ProductData } from '@/types/overlay';
import {
  buildBuildingShellModel,
  buildProductShellModel,
  getShellViewState,
} from '@/lib/ui-shell';

describe('ui shell adapters', () => {
  it('maps building data into a time-lens shell model with trust and personas', () => {
    const building: BuildingData = {
      mode: 'building',
      title: 'Ferry Building',
      subtitle: 'Historic Landmark',
      panels: [],
      confidence: 0.95,
      timestamp: 1,
      neighborhoodSummary: 'Busy waterfront destination.',
      historicalSummary: 'Served the waterfront since the late 1800s.',
      futurePlansStatus: 'proposed',
      futurePlansSummary: 'Facade work is publicly proposed.',
      trustLevel: 'high',
      trustReason: 'Specific place match with grounded sources.',
    };

    const model = buildBuildingShellModel(building);

    expect(model.heroTitle).toBe('Ferry Building');
    expect(model.heroSubtitle).toBe('Historic Landmark');
    expect(model.heroConfidence).toBe('95% confidence');
    expect(model.trust).toEqual({
      badge: 'high',
      reason: 'Specific place match with grounded sources.',
    });
    expect(model.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'current-summary', title: 'Current Summary' }),
        expect.objectContaining({ id: 'time-lens', title: 'Time Lens' }),
      ])
    );
    expect(model.sections.find((section) => section.id === 'time-lens')).toEqual(
      expect.objectContaining({
        blocks: [
          { id: 'past', label: 'Past', body: 'Served the waterfront since the late 1800s.' },
          { id: 'present', label: 'Present', body: 'Busy waterfront destination.' },
          {
            id: 'future',
            label: 'Future',
            body: 'Facade work is publicly proposed.',
            status: 'proposed',
          },
        ],
      })
    );
    expect(model.personas.map((persona) => persona.id)).toEqual([
      'explore',
      'live',
      'invest',
      'build',
    ]);
    expect(model.actions).toEqual({
      canAskAI: true,
      canCompare: true,
      canScan3D: true,
      canDecompose: false,
    });
  });

  it('maps product data into a shell model with composition, market, alternatives, and actions', () => {
    const product: ProductData = {
      mode: 'product',
      title: 'Oatly Barista',
      subtitle: 'Oat Drink',
      panels: [],
      confidence: 0.87,
      timestamp: 2,
      composition: ['Oats', 'Water'],
      sustainabilityScore: 8,
      priceEstimate: '$4.99',
      alternatives: [
        { name: 'Minor Figures', reason: 'Similar foaming profile' },
        { name: 'Califia Farms', reason: 'Comparable barista blend' },
      ],
    };

    const model = buildProductShellModel(product);

    expect(model.heroTitle).toBe('Oatly Barista');
    expect(model.heroSubtitle).toBe('Oat Drink');
    expect(model.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'composition',
          items: ['Oats', 'Water'],
        }),
        expect.objectContaining({
          id: 'market',
          items: ['Price estimate: $4.99', 'Sustainability score: 8/10'],
        }),
        expect.objectContaining({
          id: 'alternatives',
          items: [
            'Minor Figures — Similar foaming profile',
            'Califia Farms — Comparable barista blend',
          ],
        }),
      ])
    );
    expect(model.actions).toEqual({
      canAskAI: true,
      canCompare: true,
      canScan3D: false,
      canDecompose: true,
    });
  });

  it('returns landing when there is no captured frame or result data', () => {
    expect(
      getShellViewState({
        hasData: false,
        isAnalyzing: false,
        hasCapturedFrame: false,
      })
    ).toBe('landing');
  });

  it('returns scan while analysis is in progress and details once data exists', () => {
    expect(
      getShellViewState({
        hasData: false,
        isAnalyzing: true,
        hasCapturedFrame: true,
      })
    ).toBe('scan');
    expect(
      getShellViewState({
        hasData: true,
        isAnalyzing: false,
        hasCapturedFrame: true,
      })
    ).toBe('details');
  });
});

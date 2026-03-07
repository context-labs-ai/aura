import type { BuildingData, ProductData } from '@/types/overlay';

export type ShellViewState = 'landing' | 'scan' | 'details';

export interface ShellActionState {
  canAskAI: boolean;
  canCompare: boolean;
  canScan3D: boolean;
  canDecompose: boolean;
}

export interface ShellSection {
  id: string;
  title: string;
  body?: string;
  items?: string[];
  blocks?: Array<{
    id: string;
    label: string;
    body: string;
    status?: string;
  }>;
}

export interface ShellPersona {
  id: 'explore' | 'live' | 'invest' | 'build';
  label: string;
  summary: string;
}

export interface BuildingShellModel {
  mode: 'building';
  heroTitle: string;
  heroSubtitle: string;
  heroConfidence: string;
  trust: {
    badge: 'high' | 'medium' | 'low' | 'unknown';
    reason: string;
  };
  sections: ShellSection[];
  personas: ShellPersona[];
  actions: ShellActionState;
}

export interface ProductShellModel {
  mode: 'product';
  heroTitle: string;
  heroSubtitle: string;
  heroConfidence: string;
  sections: ShellSection[];
  actions: ShellActionState;
}

function toConfidenceLabel(confidence: number): string {
  return `${Math.round(confidence * 100)}% confidence`;
}

function getPersonaSummary(data: BuildingData, persona: ShellPersona['id']): string {
  const current = data.neighborhoodSummary || data.reviewSummary || data.subtitle || data.title;
  const history = data.historicalSummary || 'No historical context yet.';
  const future = data.futurePlansSummary || 'No future plans found.';

  switch (persona) {
    case 'explore':
      return history;
    case 'live':
      return current;
    case 'invest':
      return future;
    case 'build':
      return data.landmarkReason || current;
  }
}

export function getShellViewState(input: {
  hasData: boolean;
  isAnalyzing: boolean;
  hasCapturedFrame: boolean;
}): ShellViewState {
  if (input.hasData) {
    return 'details';
  }

  if (input.hasCapturedFrame || input.isAnalyzing) {
    return 'scan';
  }

  return 'landing';
}

export function buildBuildingShellModel(data: BuildingData): BuildingShellModel {
  const currentSummary = data.neighborhoodSummary || data.reviewSummary || data.subtitle || data.title;
  const futureSummary = data.futurePlansSummary || 'No future plans found.';
  const futureStatus = data.futurePlansStatus || 'none_found';

  return {
    mode: 'building',
    heroTitle: data.title,
    heroSubtitle: data.subtitle,
    heroConfidence: toConfidenceLabel(data.confidence),
    trust: {
      badge: data.trustLevel || 'unknown',
      reason: data.trustReason || 'No trust reason available.',
    },
    sections: [
      {
        id: 'current-summary',
        title: 'Current Summary',
        body: currentSummary,
      },
      {
        id: 'time-lens',
        title: 'Time Lens',
        blocks: [
          {
            id: 'past',
            label: 'Past',
            body: data.historicalSummary || 'No historical context yet.',
          },
          {
            id: 'present',
            label: 'Present',
            body: currentSummary,
          },
          {
            id: 'future',
            label: 'Future',
            body: futureSummary,
            status: futureStatus,
          },
        ],
      },
    ],
    personas: [
      { id: 'explore', label: 'Explore', summary: getPersonaSummary(data, 'explore') },
      { id: 'live', label: 'Live', summary: getPersonaSummary(data, 'live') },
      { id: 'invest', label: 'Invest', summary: getPersonaSummary(data, 'invest') },
      { id: 'build', label: 'Build', summary: getPersonaSummary(data, 'build') },
    ],
    actions: {
      canAskAI: true,
      canCompare: true,
      canScan3D: true,
      canDecompose: false,
    },
  };
}

export function buildProductShellModel(data: ProductData): ProductShellModel {
  return {
    mode: 'product',
    heroTitle: data.title,
    heroSubtitle: data.subtitle,
    heroConfidence: toConfidenceLabel(data.confidence),
    sections: [
      {
        id: 'composition',
        title: 'Composition',
        items: data.composition ?? [],
      },
      {
        id: 'market',
        title: 'Market',
        items: [
          `Price estimate: ${data.priceEstimate || 'Unknown'}`,
          `Sustainability score: ${
            data.sustainabilityScore !== undefined ? `${data.sustainabilityScore}/10` : 'Unknown'
          }`,
        ],
      },
      {
        id: 'alternatives',
        title: 'Alternatives',
        items: (data.alternatives ?? []).map(
          (alternative) => `${alternative.name} — ${alternative.reason}`
        ),
      },
    ],
    actions: {
      canAskAI: true,
      canCompare: true,
      canScan3D: false,
      canDecompose: true,
    },
  };
}

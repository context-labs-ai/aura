export interface DataPanelContent {
  label: string;
  value: string;
  icon?: string;
  type: 'text' | 'rating' | 'list' | 'badge';
}

export interface OverlayData {
  mode: 'building' | 'product' | 'unknown';
  confidence: number;
  title: string;
  subtitle: string;
  panels: DataPanelContent[];
  timestamp: number;
}

export interface BuildingData extends OverlayData {
  mode: 'building';
  placeId?: string;
  isLandmark?: boolean;
  landmarkReason?: string;
  rating?: number;
  reviewSummary?: string;
  openNow?: boolean;
  hours?: string;
  footTrafficHypothesis?: string;
  historicalSummary?: string;
  futurePlansStatus?: 'confirmed' | 'proposed' | 'rumored' | 'none_found';
  futurePlansSummary?: string;
  trustLevel?: 'high' | 'medium' | 'low';
  trustReason?: string;
  neighborhoodSummary?: string;
  buildingDetails?: {
    yearBuilt?: string;
    architect?: string;
    height?: string;
    floors?: number;
    architecturalStyle?: string;
    historicalSignificance?: string;
    notableFacts?: string[];
  };
}

export interface ProductData extends OverlayData {
  mode: 'product';
  composition?: string[];
  sustainabilityScore?: number;
  priceEstimate?: string;
  alternatives?: { name: string; reason: string }[];
  supplyChainOrigin?: string;
  marginGuess?: string;
}

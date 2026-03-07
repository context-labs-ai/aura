export type Persona = "explore" | "live" | "invest" | "build";

export type VisionMode = "xray" | "time" | "social" | "price" | "energy" | "portal";

export type ScanState = "idle" | "scanning" | "analyzing" | "detected" | "error";

export type Confidence = "high" | "medium" | "low";

export type Building = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  heading?: number;
  type: string;
  yearBuilt: number;
  city: string;
};

export type ExplorerData = {
  history: string[];
  famousVisitors?: string[];
  crowdLevel: number;
  rating: number;
  hiddenSpots: string[];
  nearbyAttractions: string[];
};

export type HomeData = {
  estimatedValue: string;
  estimatedRent: string;
  structuralScore: number;
  transitScore: number;
  noiseLevel: "Low" | "Medium" | "High";
  occupancy: number;
  connectivity: string;
  amenities: string[];
};

export type InvestorData = {
  valuation: string;
  capRate: string;
  rentalYield: string;
  appreciation5Y: string;
  forecast: string;
  investmentScore: number;
  futureDevelopments: string[];
  riskNotes: string[];
};

export type BusinessData = {
  footTrafficDaily: number;
  peakHours: string[];
  competitorCounts: Record<string, number>;
  infrastructureScore: number;
  energyScore: string;
  businessMix: string[];
  accessibilityNotes: string[];
};

export type BuildingRecord = {
  building: Building;
  explorer: ExplorerData;
  home: HomeData;
  investor: InvestorData;
  business: BusinessData;
};

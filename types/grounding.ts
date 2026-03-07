export interface UserContext {
  localTime: string;
  timezone: string;
  language: string;
}

export interface GroundingAddress {
  formatted: string;
  city?: string;
  country?: string;
}

export interface LocationContext {
  coordinates: {
    lat: number;
    lng: number;
  };
  address?: GroundingAddress;
}

export interface GroundingContext {
  query: string;
  mode: 'building' | 'product';
  user: UserContext;
  location?: LocationContext;
  visualContext?: {
    title: string;
    subtitle: string;
    confidence: number;
  };
}

export type FuturePlansStatus = 'confirmed' | 'proposed' | 'rumored' | 'none_found';

export interface BuildingGroundingResult {
  currentSummary: string;
  isLandmark: boolean;
  landmarkReason: string;
  historicalSummary: string;
  futurePlansStatus: FuturePlansStatus;
  futurePlansSummary: string;
}

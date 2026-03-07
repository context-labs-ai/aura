import type { GroundingAddress } from '@/types/grounding';

const GEOCODING_API_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const CACHE_DURATION_MS = 60_000;
const CACHE_DISTANCE_THRESHOLD_M = 100;

interface CacheEntry {
  coordinates: { lat: number; lng: number };
  result: GroundingAddress | null;
  timestamp: number;
}

let cachedGeocode: CacheEntry | null = null;

function getApiKey(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusM = 6_371_000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getAddressComponent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: any[],
  type: string
): string | undefined {
  return components.find((component) => component.types?.includes(type))?.long_name;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GroundingAddress | null> {
  if (cachedGeocode) {
    const isFresh = Date.now() - cachedGeocode.timestamp < CACHE_DURATION_MS;
    const isNearby =
      haversineDistance(
        lat,
        lng,
        cachedGeocode.coordinates.lat,
        cachedGeocode.coordinates.lng
      ) < CACHE_DISTANCE_THRESHOLD_M;

    if (isFresh && isNearby) {
      return cachedGeocode.result;
    }
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const url = new URL(GEOCODING_API_BASE);
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const firstResult = data.results?.[0];
    const parsedResult: GroundingAddress | null = firstResult
      ? {
          formatted: firstResult.formatted_address ?? '',
          city: getAddressComponent(firstResult.address_components ?? [], 'locality'),
          country: getAddressComponent(firstResult.address_components ?? [], 'country'),
        }
      : null;

    cachedGeocode = {
      coordinates: { lat, lng },
      result: parsedResult,
      timestamp: Date.now(),
    };

    return parsedResult;
  } catch {
    return null;
  }
}

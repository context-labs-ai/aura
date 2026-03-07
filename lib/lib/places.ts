// ---------------------------------------------------------------------------
// Google Places API (New) — REST integration for nearby place search & details
// Uses field masks to minimize cost. Max 5 fields per request.
// NOTE: Callers should throttle to max 1 call per 30 seconds.
// ---------------------------------------------------------------------------

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set');
  return key;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaceResult {
  id: string;
  name: string;
  rating?: number;
  openNow?: boolean;
  editorialSummary?: string;
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativePublishTime: string;
}

export interface PlaceDetails {
  id: string;
  name: string;
  rating?: number;
  reviews: PlaceReview[];
  openNow?: boolean;
  weekdayHours: string[];
  editorialSummary?: string;
}

// ---------------------------------------------------------------------------
// Text Search — find nearby places matching a query
// ---------------------------------------------------------------------------

const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.rating',
  'places.currentOpeningHours',
  'places.editorialSummary',
].join(',');

export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  query: string
): Promise<PlaceResult[]> {
  try {
    const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': getApiKey(),
        'X-Goog-FieldMask': SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 3,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 500.0,
          },
        },
      }),
    });

    if (!res.ok) {
      console.error('[searchNearbyPlaces] API error:', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.places ?? []).map((p: any) => ({
      id: p.id ?? '',
      name: p.displayName?.text ?? 'Unknown',
      rating: p.rating,
      openNow: p.currentOpeningHours?.openNow,
      editorialSummary: p.editorialSummary?.text,
    }));
  } catch (error) {
    console.error('[searchNearbyPlaces] Error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Place Details — fetch full info for a single place
// ---------------------------------------------------------------------------

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'rating',
  'reviews',
  'currentOpeningHours',
  'editorialSummary',
].join(',');

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  try {
    const res = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': getApiKey(),
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
    });

    if (!res.ok) {
      console.error('[getPlaceDetails] API error:', res.status, await res.text());
      return null;
    }

    const p = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviews: PlaceReview[] = (p.reviews ?? []).slice(0, 3).map((r: any) => ({
      authorName: r.authorAttribution?.displayName ?? 'Anonymous',
      rating: r.rating ?? 0,
      text: r.text?.text ?? '',
      relativePublishTime: r.relativePublishTimeDescription ?? '',
    }));

    return {
      id: p.id ?? placeId,
      name: p.displayName?.text ?? 'Unknown',
      rating: p.rating,
      reviews,
      openNow: p.currentOpeningHours?.openNow,
      weekdayHours: p.currentOpeningHours?.weekdayDescriptions ?? [],
      editorialSummary: p.editorialSummary?.text,
    };
  } catch (error) {
    console.error('[getPlaceDetails] Error:', error);
    return null;
  }
}

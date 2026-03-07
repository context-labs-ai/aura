import type { BuildingRecord, Confidence } from "@/types/reality";

export type RankedCandidate = {
  id: string;
  distanceMeters: number;
  headingDiff: number;
  score: number;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const p1 = toRadians(lat1);
  const p2 = toRadians(lat2);
  const dLng = toRadians(lng2 - lng1);

  const y = Math.sin(dLng) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
}

function angleDifference(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

function distanceScore(distanceMeters: number): number {
  if (distanceMeters <= 80) return 100;
  if (distanceMeters >= 1000) return 0;
  return Math.max(0, Math.round(100 - ((distanceMeters - 80) / 920) * 100));
}

function headingScore(headingDiff: number): number {
  return Math.max(0, Math.round(100 - (headingDiff / 180) * 100));
}

export function rankBuildings(
  buildings: BuildingRecord[],
  lat: number,
  lng: number,
  heading?: number,
): RankedCandidate[] {
  const withinRadius = buildings
    .map((record) => {
      const distanceMeters = haversineDistanceMeters(lat, lng, record.building.lat, record.building.lng);
      const bearing = bearingBetween(lat, lng, record.building.lat, record.building.lng);
      const headingDiff = heading === undefined ? 90 : angleDifference(heading, bearing);

      const proximity = distanceScore(distanceMeters);
      const directional = heading === undefined ? 50 : headingScore(headingDiff);
      const score = Math.round(proximity * 0.68 + directional * 0.32);

      return {
        id: record.building.id,
        distanceMeters,
        headingDiff,
        score,
      };
    })
    .filter((candidate) => candidate.distanceMeters <= 1200)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (withinRadius.length > 0) {
    return withinRadius;
  }

  return buildings
    .map((record) => {
      const distanceMeters = haversineDistanceMeters(lat, lng, record.building.lat, record.building.lng);
      const bearing = bearingBetween(lat, lng, record.building.lat, record.building.lng);
      const headingDiff = heading === undefined ? 90 : angleDifference(heading, bearing);
      const proximity = distanceScore(distanceMeters);
      const directional = heading === undefined ? 50 : headingScore(headingDiff);
      const score = Math.round(proximity * 0.68 + directional * 0.32);

      return {
        id: record.building.id,
        distanceMeters,
        headingDiff,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function scoreToConfidence(score: number): Confidence {
  if (score >= 76) return "high";
  if (score >= 48) return "medium";
  return "low";
}

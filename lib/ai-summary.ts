import type { BuildingRecord, Persona } from "@/types/reality";

export function generatePersonaSummary(record: BuildingRecord, persona: Persona): string {
  if (persona === "explore") {
    return `${record.building.name} is a strong visit candidate with a ${record.explorer.rating.toFixed(1)} rating and active crowd profile. Highlights include ${record.explorer.hiddenSpots[0].toLowerCase()} and quick access to ${record.explorer.nearbyAttractions[0]}. Risk: higher crowd density during ${record.business.peakHours[1]}.`;
  }

  if (persona === "live") {
    return `${record.building.name} offers ${record.home.estimatedRent} with transit score ${record.home.transitScore}/100 and structural score ${record.home.structuralScore}/10. Connectivity is ${record.home.connectivity.toLowerCase()}. Risk: noise is currently ${record.home.noiseLevel.toLowerCase()} with occupancy at ${record.home.occupancy}%.`;
  }

  if (persona === "invest") {
    return `${record.building.name} shows ${record.investor.capRate} cap rate and ${record.investor.appreciation5Y} five-year appreciation. Forecast indicates ${record.investor.forecast.toLowerCase()}. Risk: ${record.investor.riskNotes[0].toLowerCase()}.`;
  }

  return `${record.building.name} posts ${record.business.footTrafficDaily.toLocaleString()} daily foot traffic and infrastructure score ${record.business.infrastructureScore}/100. Business mix supports ${record.business.businessMix[0].toLowerCase()} demand. Risk: monitor competition in ${Object.keys(record.business.competitorCounts)[0].replace("_", " ")}.`;
}

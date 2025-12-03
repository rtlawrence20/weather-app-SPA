/**
 * Simple derived road condition categories.
 * @typedef {"dry" | "wet" | "snow_ice_risk" | "unknown"} RoadConditionCategory
 */

/**
 * Derive a rough road condition category from weather data.
 *
 * @param {number|null} temperatureC
 * @param {number|null} precipitationMm
 * @param {number|null} weatherCode
 * @returns {RoadConditionCategory}
 */
export function classifyRoadCondition(temperatureC, precipitationMm, weatherCode) {
  if (temperatureC == null) return "unknown";

  const precip = precipitationMm ?? 0;

  // Very light precip, warm → probably dry
  if (precip < 0.1) return "dry";

  // Below freezing with any meaningful precip → snow/ice risk
  if (temperatureC <= 0) {
    return "snow_ice_risk";
  }

  // If weather code suggests snow/freezing precip → snow/ice risk
  if (
    weatherCode != null &&
    [
      56, 57, // freezing drizzle
      66, 67, // freezing rain
      71, 73, 75, 77, // snow / grains
      85, 86, // snow showers
      96, 99, // thunderstorms with hail
    ].includes(weatherCode)
  ) {
    return "snow_ice_risk";
  }

  // Otherwise if there is some precip and temps above freezing → wet
  if (precip >= 0.1) {
    return "wet";
  }

  return "dry";
}

/**
 * Create a human-friendly label and explanation for a road condition category.
 * @param {RoadConditionCategory} category
 * @returns {{label: string, detail: string}}
 */
export function roadConditionInfo(category) {
  switch (category) {
    case "dry":
      return {
        label: "Likely dry pavement",
        detail:
          "Precipitation appears minimal and temperatures are above freezing, so roads are likely dry or just slightly damp.",
      };
    case "wet":
      return {
        label: "Wet roads",
        detail:
          "There is measurable precipitation and temperatures are above freezing, so roads are likely wet but not icy.",
      };
    case "snow_ice_risk":
      return {
        label: "Snow / ice risk",
        detail:
          "Below-freezing temperatures or wintry precipitation increase the risk of snow and ice on road surfaces.",
      };
    default:
      return {
        label: "Conditions unknown",
        detail:
          "Insufficient data to classify road surface conditions. Check local advisories for more detail.",
      };
  }
}

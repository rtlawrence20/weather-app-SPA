import { fetchJson } from "./http.js";

const GEO_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

/** 5-digit US ZIP code. */
const ZIP_REGEX = /^\d{5}$/;

/** "City, ST" where ST is a 2-letter US state code. */
const CITY_STATE_REGEX = /^([^,]+),\s*([A-Za-z]{2})$/;

const US_STATE_NAMES = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
};

/**
 * Parsed form of a free-form location query.
 *
 * kind:
 * - "zip":     5-digit US ZIP ("80202")
 * - "city_state": "City, ST" ("Denver, CO")
 * - "generic": everything else
 *
 * @typedef {(
 *   { kind: "zip", zip: string } |
 *   { kind: "city_state", city: string, stateCode: string } |
 *   { kind: "generic", raw: string }
 * )} ParsedLocationQuery
 */

/**
 * Result of a successful geocode lookup.
 *
 * lat/lon use decimal degrees.
 * label is a user-facing string, e.g. "Denver, Colorado, US".
 *
 * @typedef {Object} GeocodedLocation
 * @property {number} lat
 * @property {number} lon
 * @property {string} label
 */

/**
 * Classify a free-form query string into ZIP, "City, ST", or generic.
 *
 * Example inputs:
 * - "80202"      -> { kind: "zip", zip: "80202" }
 * - "Denver, CO" -> { kind: "city_state", city: "Denver", stateCode: "CO" }
 * - "Berlin"     -> { kind: "generic", raw: "Berlin" }
 *
 * @param {string} query
 * @returns {ParsedLocationQuery}
 */
function parseLocationQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) return { kind: "generic", raw: "" };

    if (ZIP_REGEX.test(trimmed)) {
        return { kind: "zip", zip: trimmed };
    }

    const match = trimmed.match(CITY_STATE_REGEX);
    if (match) {
        const city = match[1].trim();
        const stateCode = match[2].toUpperCase();
        return { kind: "city_state", city, stateCode };
    }

    return { kind: "generic", raw: trimmed };
}

/**
 * Geocode a location query string to latitude/longitude and a display label.
 *
 * Uses the Open-Meteo Geocoding API and applies some US-specific behavior:
 * - ZIP queries are constrained to US and limited to 1 result.
 * - "City, ST" queries prefer matching the expected state name when possible.
 *
 * Throws if no results are found.
 *
 * @param {string} query Free-form user input (ZIP, "City, ST", or other).
 * @returns {Promise<GeocodedLocation>}
 */
export async function geocodeLocation(query) {
    const parsed = parseLocationQuery(query);

    const url = new URL(GEO_BASE_URL);
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    /** @type {string | null} */
    let desiredStateName = null;

    if (parsed.kind === "zip") {
        url.searchParams.set("name", parsed.zip);
        url.searchParams.set("count", "1");
        url.searchParams.set("countryCode", "US");
    } else if (parsed.kind === "city_state") {
        url.searchParams.set("name", parsed.city);
        url.searchParams.set("count", "10");
        url.searchParams.set("countryCode", "US");

        desiredStateName = US_STATE_NAMES[parsed.stateCode] || null;
    } else {
        url.searchParams.set("name", parsed.raw);
        url.searchParams.set("count", "1");
    }

    const data = await fetchJson(url.toString());

    if (!data.results || data.results.length === 0) {
        throw new Error(`No results found for "${query}".`);
    }

    /** @type {any} */
    let result = data.results[0];

    // For "City, ST" queries, try to pick a result whose admin1 matches the
    // expected full state name (e.g. "Colorado").
    if (desiredStateName) {
        const desiredLower = desiredStateName.toLowerCase();
        const match = data.results.find(
            (r) =>
                typeof r.admin1 === "string" &&
                r.admin1.toLowerCase() === desiredLower
        );
        if (match) result = match;
    }

    const labelParts = [
        result.name,
        result.admin1,
        result.country_code,
    ].filter(Boolean);

    return /** @type {GeocodedLocation} */ ({
        lat: result.latitude,
        lon: result.longitude,
        label: labelParts.join(", "),
    });
}

/**
 * Reverse-geocode coordinates into a human-readable label using Nominatim.
 *
 * This is optional for geolocation:
 * failure is logged and returns null rather than throwing.
 *
 * Example output: "Denver, Colorado, US".
 *
 * @param {number} lat Latitude in decimal degrees.
 * @param {number} lon Longitude in decimal degrees.
 * @returns {Promise<string|null>}
 */
export async function reverseGeocodeCoords(lat, lon) {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "10");

    try {
        const data = await fetchJson(url.toString());
        const address = data?.address || {};

        const parts = [
            address.city ||
            address.town ||
            address.village ||
            address.hamlet ||
            address.suburb,
            address.state,
            address.country_code?.toUpperCase(),
        ].filter(Boolean);

        if (!parts.length) return null;

        return parts.join(", ");
    } catch (err) {
        console.warn("reverseGeocodeCoords failed", err);
        return null;
    }
}

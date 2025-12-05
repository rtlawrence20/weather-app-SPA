import { fetchJson } from "./http.js";

const GEO_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

const ZIP_REGEX = /^\d{5}$/;
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
 * Classify a free-form query into zip / city,state / generic.
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
 * Geocode a location query string to lat/lon + label.
 */
export async function geocodeLocation(query) {
    const parsed = parseLocationQuery(query);

    const url = new URL(GEO_BASE_URL);
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

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

    let result = data.results[0];

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

    return {
        lat: result.latitude,
        lon: result.longitude,
        label: labelParts.join(", "),
    };
}

/**
 * Reverse-geocode coordinates using Nominatim (optional UI sugar).
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

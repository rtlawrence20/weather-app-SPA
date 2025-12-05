import { fetchJson } from "./http.js";

const AIR_QUALITY_BASE_URL =
    "https://air-quality-api.open-meteo.com/v1/air-quality";

/**
 * @typedef {Object} HourlyAirQuality
 * @property {number|null} pm10
 * @property {number|null} pm2_5
 * @property {number|null} dust
 * @property {number|null} uvIndex
 * @property {number|null} usAqi
 * @property {"good"|"moderate"|"unhealthy"|"very_unhealthy"|"hazardous"|"unknown"} category
 * @property {string} summary
 */

function safeArrVal(arr, i) {
    return Array.isArray(arr) ? arr[i] ?? null : null;
}

export function classifyUsAqi(usAqi) {
    if (usAqi == null || Number.isNaN(usAqi)) {
        return { category: "unknown", summary: "Air quality unknown" };
    }

    const aqi = Math.round(usAqi);

    if (aqi <= 50) return { category: "good", summary: `Good (US AQI ${aqi})` };
    if (aqi <= 100)
        return { category: "moderate", summary: `Moderate (US AQI ${aqi})` };
    if (aqi <= 150)
        return {
            category: "unhealthy",
            summary: `Unhealthy for sensitive groups (US AQI ${aqi})`,
        };
    if (aqi <= 200)
        return { category: "unhealthy", summary: `Unhealthy (US AQI ${aqi})` };
    if (aqi <= 300)
        return {
            category: "very_unhealthy",
            summary: `Very unhealthy (US AQI ${aqi})`,
        };

    return {
        category: "hazardous",
        summary: `Hazardous (US AQI ${aqi})`,
    };
}

/**
 * Fetch air-quality hourly map.
 */
export async function fetchAirQuality(lat, lon, timezone) {
    const url = new URL(AIR_QUALITY_BASE_URL);

    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set(
        "hourly",
        "pm10,pm2_5,dust,uv_index,us_aqi"
    );
    url.searchParams.set("timezone", timezone || "auto");

    const data = await fetchJson(url.toString());
    const hourly = data?.hourly || {};
    const times = Array.isArray(hourly.time) ? hourly.time : [];

    const byTime = {};

    for (let i = 0; i < times.length; i++) {
        const time = times[i];

        const pm10 = safeArrVal(hourly.pm10, i);
        const pm2_5 = safeArrVal(hourly.pm2_5, i);
        const dust = safeArrVal(hourly.dust, i);
        const uvIndex = safeArrVal(hourly.uv_index, i);
        const usAqi = safeArrVal(hourly.us_aqi, i);

        const { category, summary } = classifyUsAqi(usAqi);

        byTime[time] = {
            pm10,
            pm2_5,
            dust,
            uvIndex,
            usAqi,
            category,
            summary,
        };
    }

    return byTime;
}

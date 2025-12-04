/**
 * @typedef {Object} HourlyAirQuality
 * @property {number|null} pm10
 * @property {number|null} pm2_5
 * @property {number|null} dust
 * @property {number|null} uvIndex
 * @property {number|null} usAqi
 * @property {"good"|"moderate"|"unhealthy"|"very_unhealthy"|"hazardous"|"unknown"} category
 */

/**
 * @typedef {Object} HourlyPoint
 * @property {string} time
 * @property {number|null} temperature
 * @property {number|null} apparentTemperature
 * @property {number|null} precipitation
 * @property {number|null} weatherCode
 * @property {number|null} humidity
 * @property {number|null} windSpeed
 * @property {number|null} windDirection
 * @property {number|null} windGusts
 * @property {number|null} cloudCover
 * @property {number|null} visibility
 * @property {number|null} uvIndex
 * @property {HourlyAirQuality|undefined} airQuality
 * @property {string|undefined} airQualitySummary
 */

/**
 * @typedef {Object} DailyPoint
 * @property {string} date
 * @property {number|null} tempMax
 * @property {number|null} tempMin
 * @property {number|null} weatherCode
 * @property {string|null} sunrise
 * @property {string|null} sunset
 * @property {number|null} uvIndexMax
 */

/**
 * @typedef {Object} WeatherState
 * @property {{lat:number, lon:number}} coords
 * @property {string} locationLabel
 * @property {string} timezone
 * @property {string} fetchedAt
 * @property {{time:string, temperature:number, weatherCode:number}|null} current
 * @property {Array<HourlyPoint>} hourly
 * @property {Array<DailyPoint>} daily
 */


const GEO_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const AIR_QUALITY_BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

/**
 * Fetch JSON data from a URL.
 * @param {string} url 
 * @returns {Promise<any>}
 */
async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
    }
    return res.json();
}

/**
 * Classify US AQI value into a simple category string.
 * @param {number|null} aqi
 * @returns {"good"|"moderate"|"unhealthy"|"very_unhealthy"|"hazardous"|"unknown"}
 */
function classifyUsAqi(aqi) {
    if (aqi == null || Number.isNaN(aqi)) return "unknown";
    if (aqi <= 50) return "good";
    if (aqi <= 100) return "moderate";
    if (aqi <= 150) return "unhealthy";
    if (aqi <= 200) return "very_unhealthy";
    return "hazardous";
}

/**
 * Fetch hourly air quality data (pm10, pm2_5, dust, uv_index, us_aqi)
 * and return a Map keyed by ISO timestamp.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} timezone
 * @returns {Promise<Map<string, {pm10:number|null, pm2_5:number|null, dust:number|null, uvIndex:number|null, usAqi:number|null}>>}
 */
async function fetchAirQuality(lat, lon, timezone) {
    const url = new URL(AIR_QUALITY_BASE_URL);
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);
    url.searchParams.set("timezone", timezone || "auto");
    url.searchParams.set(
        "hourly",
        "pm10,pm2_5,dust,uv_index,us_aqi"
    );

    const data = await fetchJson(url.toString());

    if (!data.hourly || !Array.isArray(data.hourly.time)) {
        return new Map();
    }

    const { time, pm10, pm2_5, dust, uv_index, us_aqi } = data.hourly;
    const byTime = new Map();

    time.forEach((t, i) => {
        byTime.set(t, {
            pm10: pm10?.[i] ?? null,
            pm2_5: pm2_5?.[i] ?? null,
            dust: dust?.[i] ?? null,
            uvIndex: uv_index?.[i] ?? null,
            usAqi: us_aqi?.[i] ?? null,
        });
    });

    return byTime;
}


// Geocode a city or zip to lat/lon + label

/**
 * Geocode a location query string to latitude, longitude, and a label.
 * @param {string} query
 * @returns {Promise<{lat:number, lon:number, label:string}>}
 */
export async function geocodeLocation(query) {
    const url = new URL(GEO_BASE_URL);
    url.searchParams.set("name", query);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const data = await fetchJson(url.toString());

    if (!data.results || data.results.length === 0) {
        throw new Error(`No results found for "${query}".`);
    }

    const result = data.results[0];

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

// Turn geocoding + forecast into WeatherState shape
/**
 * Fetch weather forecast for given coordinates.
 * @param {number} lat
 * @param {number} lon
 * @param {string} [labelOverride]
 * @returns {Promise<WeatherState>}
 */
export async function fetchWeatherForCoords(lat, lon, labelOverride) {
    const url = new URL(FORECAST_BASE_URL);
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);

    // hourly variables
    url.searchParams.set(
        "hourly",
        [
            "temperature_2m",
            "apparent_temperature",
            "precipitation",
            "weathercode",
            "relative_humidity_2m",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "cloudcover",
            "visibility",
            "uv_index",
        ].join(",")
    );

    // daily with sunrise/sunset/UV
    url.searchParams.set(
        "daily",
        [
            "temperature_2m_max",
            "temperature_2m_min",
            "weathercode",
            "sunrise",
            "sunset",
            "uv_index_max",
        ].join(",")
    );

    url.searchParams.set("current_weather", "true");
    url.searchParams.set("timezone", "auto");

    const data = await fetchJson(url.toString());

    const weather = {
        coords: { lat, lon },
        locationLabel: labelOverride ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        timezone: data.timezone,
        fetchedAt: new Date().toISOString(),
        current: data.current_weather
            ? {
                time: data.current_weather.time,
                temperature: data.current_weather.temperature,
                weatherCode: data.current_weather.weathercode,
            }
            : null,
        hourly: [],
        daily: [],
    };

    // Hourly arrays -> array of HourlyPoint objects
    if (data.hourly && Array.isArray(data.hourly.time)) {
        const {
            time,
            temperature_2m,
            apparent_temperature,
            precipitation,
            weathercode,
            relative_humidity_2m,
            wind_speed_10m,
            wind_direction_10m,
            wind_gusts_10m,
            cloudcover,
            visibility,
            uv_index,
        } = data.hourly;

        weather.hourly = time.map((t, i) => ({
            time: t,
            temperature: temperature_2m?.[i] ?? null,
            apparentTemperature: apparent_temperature?.[i] ?? null,
            precipitation: precipitation?.[i] ?? null,
            weatherCode: weathercode?.[i] ?? null,

            humidity: relative_humidity_2m?.[i] ?? null,
            windSpeed: wind_speed_10m?.[i] ?? null,
            windDirection: wind_direction_10m?.[i] ?? null,
            windGusts: wind_gusts_10m?.[i] ?? null,
            cloudCover: cloudcover?.[i] ?? null,
            visibility: visibility?.[i] ?? null,
            uvIndex: uv_index?.[i] ?? null,

            airQuality: undefined,
            airQualitySummary: undefined,
        }));
    }

    // Daily arrays -> array of DailyPoint objects
    if (data.daily && Array.isArray(data.daily.time)) {
        const {
            time: dailyTime,
            temperature_2m_max,
            temperature_2m_min,
            weathercode,
            sunrise,
            sunset,
            uv_index_max,
        } = data.daily;

        weather.daily = dailyTime.map((d, i) => ({
            date: d,
            tempMax: temperature_2m_max?.[i] ?? null,
            tempMin: temperature_2m_min?.[i] ?? null,
            weatherCode: weathercode?.[i] ?? null,
            sunrise: sunrise?.[i] ?? null,
            sunset: sunset?.[i] ?? null,
            uvIndexMax: uv_index_max?.[i] ?? null,
        }));
    }
    
    // Air Quality (pm10, pm2_5, dust, uv_index, us_aqi)
    try {
        const aqByTime = await fetchAirQuality(lat, lon, weather.timezone);

        if (aqByTime && aqByTime.size > 0 && Array.isArray(weather.hourly)) {
            weather.hourly = weather.hourly.map((h) => {
                const aq = aqByTime.get(h.time);
                if (!aq) return h;

                const category = classifyUsAqi(aq.usAqi);

                return {
                    ...h,
                    airQuality: {
                        pm10: aq.pm10,
                        pm2_5: aq.pm2_5,
                        dust: aq.dust,
                        uvIndex: aq.uvIndex,
                        usAqi: aq.usAqi,
                        category,
                    },
                    airQualitySummary:
                        aq.usAqi != null
                            ? `${category.replace("_", " ")} (US AQI ${Math.round(aq.usAqi)})`
                            : "Air quality: unknown",
                };
            });
        }
    } catch (err) {
        console.error("Air quality fetch failed:", err);
        // Fail silently on AQ; core forecast should still work.
    }

    return weather;
}

// Convenience: given query string, geocode + fetch forecast

/**
 * Reverse geocode lat/lon to a human-friendly location label.
 * Uses the public Nominatim (OpenStreetMap) API.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string|null>}
 */
export async function reverseGeocodeCoords(lat, lon) {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("lat", lat.toString());
    url.searchParams.set("lon", lon.toString());
    url.searchParams.set("format", "json");
    // zoom ~10 focuses on city/town-level labels
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    try {
        const data = await fetchJson(url.toString());

        const addr = data.address;
        if (!addr) return null;

        // Prefer a city-like label first
        const cityLike =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.hamlet ||
            addr.suburb;

        const region = addr.state || addr.region;
        const countryCode = addr.country_code
            ? addr.country_code.toUpperCase()
            : null;
        const postcode = addr.postcode;

        const parts = [];

        if (cityLike) {
            parts.push(cityLike);
        }

        // For US locations, "City, State" reads nicely; elsewhere fall back to
        // region or country code.
        if (region && countryCode === "US") {
            parts.push(region);
        } else if (region) {
            parts.push(region);
        } else if (countryCode) {
            parts.push(countryCode);
        }

        if (!parts.length && postcode) {
            // Last-resort fallback: show a postal code hint
            return `Near ${postcode}`;
        }

        return parts.length ? parts.join(", ") : null;
    } catch (err) {
        console.error("Reverse geocoding failed:", err);
        return null;
    }
}


/**
 * Fetch weather forecast for a location query string.
 * @param {string} query
 * @returns {Promise<WeatherState>}
 */
export async function fetchWeatherForQuery(query) {
    const { lat, lon, label } = await geocodeLocation(query);
    const weather = await fetchWeatherForCoords(lat, lon, label);
    return weather;
}

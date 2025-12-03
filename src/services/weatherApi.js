/**
 * @typedef {Object} WeatherState
 * @property {{lat:number, lon:number}} coords
 * @property {string} locationLabel
 * @property {string} timezone
 * @property {string} fetchedAt
 * @property {{time:string, temperature:number, weatherCode:number}|null} current
 * @property {Array<{time:string, temperature:number, precipitation:number, weatherCode:number}>} hourly
 * @property {Array<{date:string, tempMax:number, tempMin:number, weatherCode:number}>} daily
 */

const GEO_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";

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

// 1) Geocode a city or zip to lat/lon + label

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

// 2) Turn geocoding + forecast into your WeatherState shape
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
    url.searchParams.set("hourly", "temperature_2m,precipitation,weathercode");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weathercode");
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

    // Hourly arrays -> array of objects
    if (data.hourly && Array.isArray(data.hourly.time)) {
        const { time, temperature_2m, precipitation, weathercode } = data.hourly;
        weather.hourly = time.map((t, i) => ({
            time: t,
            temperature: temperature_2m?.[i] ?? null,
            precipitation: precipitation?.[i] ?? null,
            weatherCode: weathercode?.[i] ?? null,
        }));
    }

    // Daily arrays -> array of objects
    if (data.daily && Array.isArray(data.daily.time)) {
        const { time, temperature_2m_max, temperature_2m_min, weathercode } = data.daily;
        weather.daily = time.map((d, i) => ({
            date: d,
            tempMax: temperature_2m_max?.[i] ?? null,
            tempMin: temperature_2m_min?.[i] ?? null,
            weatherCode: weathercode?.[i] ?? null,
        }));
    }

    return weather;
}

// 3) Convenience: given query string, geocode + fetch forecast

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

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

import { fetchJson } from "./http.js";
import { geocodeLocation, reverseGeocodeCoords } from "./locationApi.js";
import { fetchAirQuality } from "./airQualityApi.js";

const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_CACHE_STORAGE_KEY = "weather_cache_v1";
const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const WEATHER_CACHE_MAX_ENTRIES = 5;

function loadWeatherCache() {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
        const raw = window.localStorage.getItem(WEATHER_CACHE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const now = Date.now();
        return parsed.filter((e) => e && e.expiresAt > now);
    } catch {
        return [];
    }
}

function saveWeatherCache(entries) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        window.localStorage.setItem(
            WEATHER_CACHE_STORAGE_KEY,
            JSON.stringify(entries)
        );
    } catch { }
}

function makeCoordsCacheKey(lat, lon) {
    const latStr = Number(lat).toFixed(4);
    const lonStr = Number(lon).toFixed(4);
    return `coords:${latStr},${lonStr}`;
}

function makeQueryCacheKey(query) {
    return `query:${query.trim().toLowerCase()}`;
}

function getCachedWeather(key) {
    const entries = loadWeatherCache();
    const entry = entries.find((e) => e.key === key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        saveWeatherCache(entries.filter((e) => e.key !== key));
        return null;
    }
    return entry.weather;
}

function setCachedWeather(key, weather) {
    const now = Date.now();
    const expiresAt = now + WEATHER_CACHE_TTL_MS;

    let entries = loadWeatherCache().filter((e) => e.key !== key);

    entries.push({
        key,
        fetchedAt: weather.fetchedAt || new Date().toISOString(),
        expiresAt,
        weather,
    });

    // trim to max
    if (entries.length > WEATHER_CACHE_MAX_ENTRIES) {
        entries.sort((a, b) => (a.fetchedAt < b.fetchedAt ? -1 : 1));
        entries = entries.slice(entries.length - WEATHER_CACHE_MAX_ENTRIES);
    }

    saveWeatherCache(entries);
}

function safeArrVal(arr, i) {
    return Array.isArray(arr) ? arr[i] ?? null : null;
}

export async function fetchWeatherForCoords(lat, lon, labelOverride) {
    const cacheKey = makeCoordsCacheKey(lat, lon);
    const cached = getCachedWeather(cacheKey);
    if (cached) {
        return {
            ...cached,
            locationLabel: labelOverride ?? cached.locationLabel,
        };
    }

    const url = new URL(FORECAST_BASE_URL);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set(
        "hourly",
        [
            "temperature_2m",
            "apparent_temperature",
            "precipitation",
            "relative_humidity_2m",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "cloudcover",
            "visibility",
            "uv_index",
            "weathercode",
        ].join(",")
    );
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

    const timezone = data.timezone;

    // Build hourly
    const hourlyData = data.hourly || {};
    const hourlyTimes = Array.isArray(hourlyData.time) ? hourlyData.time : [];

    const hourly = hourlyTimes.map((time, i) => ({
        time,
        temperature: safeArrVal(hourlyData.temperature_2m, i),
        apparentTemperature: safeArrVal(hourlyData.apparent_temperature, i),
        precipitation: safeArrVal(hourlyData.precipitation, i),
        humidity: safeArrVal(hourlyData.relative_humidity_2m, i),
        windSpeed: safeArrVal(hourlyData.wind_speed_10m, i),
        windDirection: safeArrVal(hourlyData.wind_direction_10m, i),
        windGusts: safeArrVal(hourlyData.wind_gusts_10m, i),
        cloudCover: safeArrVal(hourlyData.cloudcover, i),
        visibility: safeArrVal(hourlyData.visibility, i),
        uvIndex: safeArrVal(hourlyData.uv_index, i),
        weatherCode: safeArrVal(hourlyData.weathercode, i),
        airQuality: null,
        airQualitySummary: null,
    }));

    // Build daily
    const dailyData = data.daily || {};
    const dailyTimes = Array.isArray(dailyData.time) ? dailyData.time : [];

    const daily = dailyTimes.map((d, i) => ({
        date: d,
        tempMax: safeArrVal(dailyData.temperature_2m_max, i),
        tempMin: safeArrVal(dailyData.temperature_2m_min, i),
        weatherCode: safeArrVal(dailyData.weathercode, i),
        sunrise: safeArrVal(dailyData.sunrise, i),
        sunset: safeArrVal(dailyData.sunset, i),
        uvIndexMax: safeArrVal(dailyData.uv_index_max, i),
    }));

    const weather = {
        coords: { lat, lon },
        locationLabel:
            labelOverride ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        timezone,
        fetchedAt: new Date().toISOString(),
        current: data.current_weather
            ? {
                time: data.current_weather.time,
                temperature: data.current_weather.temperature,
                weatherCode: data.current_weather.weathercode,
            }
            : null,
        hourly,
        daily,
    };

    // Merge AQ (best effort)
    try {
        const aqByTime = await fetchAirQuality(lat, lon, timezone);
        if (aqByTime && typeof aqByTime === "object") {
            for (const point of weather.hourly) {
                const aq = aqByTime[point.time];
                if (!aq) continue;

                point.airQuality = {
                    pm10: aq.pm10,
                    pm2_5: aq.pm2_5,
                    dust: aq.dust,
                    uvIndex: aq.uvIndex,
                    usAqi: aq.usAqi,
                    category: aq.category,
                };
                point.airQualitySummary = aq.summary;
            }
        }
    } catch (err) {
        console.warn("Failed to merge air quality", err);
    }

    setCachedWeather(cacheKey, weather);
    return weather;
}

export async function fetchWeatherForQuery(query) {
    const normalized = query.trim();
    const cacheKey = makeQueryCacheKey(normalized);

    const cached = getCachedWeather(cacheKey);
    if (cached) return cached;

    const { lat, lon, label } = await geocodeLocation(normalized);
    const weather = await fetchWeatherForCoords(lat, lon, label);

    setCachedWeather(cacheKey, weather);
    return weather;
}

// Optional re-export for convenience
export { reverseGeocodeCoords };

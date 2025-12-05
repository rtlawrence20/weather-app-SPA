/**
 * @typedef {import("../services/weatherApi").WeatherState} WeatherState
 * @typedef {import("../services/units").UnitSystem} UnitSystem
 */

import { formatTemperature, formatPrecipitation } from "../services/units";
import { useMemo, useState, useEffect } from "react";
import {
    WiDaySunny,
    WiNightClear,
    WiCloud,
    WiCloudy,
    WiRain,
    WiShowers,
    WiSnow,
    WiSleet,
    WiFog,
    WiThunderstorm,
} from "react-icons/wi";
import { formatHourLabel, getTimeOfDayFromString } from "../services/time";


/**
 * Groups of weather codes mapped to icons.
 * day/night can be different; all = same icon for both.
 */
const WEATHER_ICON_ROUTES = [
    // Clear / mostly clear
    { codes: [0, 1], day: WiDaySunny, night: WiNightClear },

    // Clouds
    { codes: [2], all: WiCloud },
    { codes: [3], all: WiCloudy },

    // Fog
    { codes: [45, 48], all: WiFog },

    // Drizzle / light rain
    { codes: [51, 53, 55], all: WiShowers },

    // Rain / showers
    { codes: [61, 63, 65, 80, 81, 82], all: WiRain },

    // Freezing drizzle / rain / sleet-ish
    { codes: [56, 57, 66, 67, 77], all: WiSleet },

    // Snow
    { codes: [71, 73, 75, 85, 86], all: WiSnow },

    // Thunderstorms
    { codes: [95, 96, 99], all: WiThunderstorm },
];

const DEFAULT_DAY_ICON = WiDaySunny;
const DEFAULT_NIGHT_ICON = WiNightClear;
const VISIBLE_COUNT = 3; // show 3 hours at a time
const GROUP_STEP = 3; // step size for carousel + timeline

function windDirectionToCompass(deg) {
    if (deg == null || Number.isNaN(deg)) return null;
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round((deg % 360) / 45) % 8;
    return dirs[index];
}


/**
 * Get a description string for a WMO weather code.
 *
 * @param {number|null} code
 * @returns {string}
 */
function describeWeatherCodeInline(code) {
    if (code == null) return "Unknown conditions";

    const map = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snowfall",
        73: "Moderate snowfall",
        75: "Heavy snowfall",
        77: "Snow grains",
        80: "Slight rain shower",
        81: "Moderate rain shower",
        82: "Violent rain shower",
        85: "Slight snow shower",
        86: "Heavy snow shower",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    };

    return map[code] ?? `Unknown code ${code}`;
}

/**
 * Choose an icon component based on weather code + time of day,
 * using a small routing table instead of if/else chains.
 * @param {number|null} code
 * @param {"day" | "night"} timeOfDay
 * @returns {React.ComponentType}
 */
function getWeatherIconComponent(code, timeOfDay) {
    if (code == null) {
        return timeOfDay === "day" ? DEFAULT_DAY_ICON : DEFAULT_NIGHT_ICON;
    }

    const route = WEATHER_ICON_ROUTES.find((r) => r.codes.includes(code));

    if (!route) {
        return timeOfDay === "day" ? DEFAULT_DAY_ICON : DEFAULT_NIGHT_ICON;
    }

    if (route.all) return route.all;
    if (timeOfDay === "day" && route.day) return route.day;
    if (timeOfDay === "night" && route.night) return route.night;

    // Fallback if a route is misconfigured
    return timeOfDay === "day" ? DEFAULT_DAY_ICON : DEFAULT_NIGHT_ICON;
}

/**
 * Given the WeatherState, find the index in hourly that matches "now".
 * Tries:
 *  1) match weather.current.time by hour prefix
 *  2) find first hour >= "now" in the forecast's timezone
 *  3) fallback to 0
 * @param {WeatherState|null} weather
 * @returns {number}
 */
function getStartIndex(weather) {
    if (!weather || !Array.isArray(weather.hourly) || weather.hourly.length === 0) {
        return 0;
    }

    const hours = weather.hourly;

    // 1) Try to match the API's current_weather time exactly
    if (weather.current?.time) {
        const currentHourPrefix = weather.current.time.slice(0, 13); // "YYYY-MM-DDTHH"
        const idxByCurrent = hours.findIndex(
            (h) => (h.time || "").slice(0, 13) === currentHourPrefix
        );
        if (idxByCurrent !== -1) return idxByCurrent;
    }

    // 2) Fallback: find first hour in the future relative to "now"
    try {
        if (weather.timezone) {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat("en-CA", {
                timeZone: weather.timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                hour12: false,
            });

            const parts = formatter.formatToParts(now);
            const get = (type) => parts.find((p) => p.type === type)?.value;

            const year = get("year");
            const month = get("month");
            const day = get("day");
            const hour = get("hour");

            if (year && month && day && hour) {
                const nowLocalHour = `${year}-${month}-${day}T${hour}`; // "YYYY-MM-DDTHH"
                const idxFuture = hours.findIndex(
                    (h) => (h.time || "").slice(0, 13) >= nowLocalHour
                );
                if (idxFuture !== -1) return idxFuture;
            }
        }
    } catch (e) {
        console.error("getStartIndex timezone fallback failed", e);
    }

    // 3) Last resort: start at 0
    return 0;
}

function HourCard({
    hour,
    unitSystem,
    timezone,
    formatTemperature,
    formatPrecipitation,
    Icon,
    description,
}) {
    const timeLabel = formatHourLabel(hour.time, timezone);
    const tempLabel = formatTemperature(hour.temperature, unitSystem);
    const feelsLabel =
        hour.apparentTemperature != null
            ? formatTemperature(hour.apparentTemperature, unitSystem)
            : null;

    const precipLabel =
        hour.precipitation != null
            ? formatPrecipitation(hour.precipitation, unitSystem)
            : null;

    const aqSummary = hour.airQualitySummary;

    return (
        <div className="flex-shrink-0 w-52 rounded-xl bg-slate-800/70 p-4 flex flex-col gap-2">
            {/* Top row: time + icon */}
            <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-200">{timeLabel}</div>
                {Icon && <Icon className="text-3xl text-sky-300" />}
            </div>

            {description && (
                <div className="text-sm text-slate-300">{description}</div>
            )}

            {/* Temperature & feels-like */}
            <div className="flex items-baseline gap-2">
                <div className="text-xl font-semibold text-slate-50">{tempLabel}</div>
                {feelsLabel && (
                    <div className="text-sm text-slate-300">
                        feels like{" "}
                        <span className="font-medium text-slate-100">{feelsLabel}</span>
                    </div>
                )}
            </div>

            {/* Precip + AQ summary */}
            <div className="text-sm text-slate-300 space-y-1">
                {precipLabel && (
                    <div>
                        Precip: <span className="font-medium">{precipLabel}</span>
                    </div>
                )}
                {aqSummary && (
                    <div>
                        Air: <span className="font-medium">{aqSummary}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * HourlyForecast component – shows an animated card group that rotates through
 * the next 12 hours of data, 3 at a time, with an optional details panel.
 * @param {{ weather: WeatherState|null, unitSystem: UnitSystem }} props
 * @returns {JSX.Element}
 */
export default function HourlyForecast({ weather, unitSystem }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showDetails, setShowDetails] = useState(false);

    const hours = useMemo(() => {
        if (!weather || !weather.hourly?.length) return [];
        const allHours = weather.hourly;
        const startIndex = getStartIndex(weather);
        return allHours.slice(startIndex, startIndex + 12);
    }, [weather]);

    // Auto-advance every 6 seconds by GROUP_STEP hours; pause when details are open
    useEffect(() => {
        if (!hours.length || showDetails) return;
        const id = setInterval(() => {
            setCurrentIndex((prev) => (prev + GROUP_STEP) % hours.length);
        }, 6000);
        return () => clearInterval(id);
    }, [hours.length, showDetails]);

    if (!hours.length) {
        return (
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">Hourly Forecast</h3>
                <p className="text-sm text-slate-300">
                    Hourly forecast data is not available yet. Try searching for a location.
                </p>
            </div>
        );
    }

    const visibleCount = Math.min(VISIBLE_COUNT, hours.length);
    const visibleHours = Array.from(
        { length: visibleCount },
        (_, i) => hours[(currentIndex + i) % hours.length]
    );

    const handlePrev = () => {
        setCurrentIndex((prev) => {
            const next = (prev - GROUP_STEP) % hours.length;
            return next < 0 ? next + hours.length : next;
        });
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + GROUP_STEP) % hours.length);
    };

    const clampedIndex =
        hours.length > 0
            ? ((currentIndex % hours.length) + hours.length) % hours.length
            : 0;

    const groupIndex = Math.floor(clampedIndex / GROUP_STEP) * GROUP_STEP;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-lg font-semibold">Next 12 Hours</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <button
                        type="button"
                        onClick={() => setShowDetails((prev) => !prev)}
                        className="rounded-full border border-sky-500 px-3 py-1 text-sky-300 hover:bg-sky-500/10"
                    >
                        {showDetails ? "Hide details" : "More details"}
                    </button>
                    <span className="hidden sm:inline">
                        Auto-rotating forecast
                        {showDetails
                            ? " (paused for details)"
                            : " — use arrows to navigate."}
                    </span>
                    <span className="sm:hidden">
                        {showDetails ? "Details view (paused)" : "Carousel auto-rotates."}
                    </span>
                </div>
            </div>

            {/* 3-card group */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-sky-500/20 via-slate-900 to-slate-900 shadow-lg">
                <div className="flex justify-center gap-3 px-4 py-4 sm:px-6 sm:py-6">
                    {visibleHours.map((hour, index) => {
                        const td = getTimeOfDayFromString(hour.time);
                        const CardIcon = getWeatherIconComponent(hour.weatherCode, td);
                        const desc = describeWeatherCodeInline(hour.weatherCode);

                        return (
                            <HourCard
                                key={hour.time || index}
                                hour={hour}
                                unitSystem={unitSystem}
                                timezone={weather.timezone}
                                formatTemperature={formatTemperature}
                                formatPrecipitation={formatPrecipitation}
                                Icon={CardIcon}
                                description={desc}
                            />
                        );
                    })}
                </div>

                {/* Navigation buttons */}
                <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 border border-slate-700 p-1 text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Previous hours"
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 border border-slate-700 p-1 text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Next hours"
                >
                    ›
                </button>
            </div>

            {/* Shared details panel for visible hours */}
            {showDetails && (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-4 sm:px-6 sm:py-5 space-y-3">
                    {visibleHours.map((hour, index) => {
                        const timeLabel = formatHourLabel(hour.time, weather.timezone);
                        const windCompass = windDirectionToCompass(hour.windDirection);

                        return (
                            <div
                                key={hour.time || index}
                                className="border-b border-slate-700/60 pb-3 last:border-b-0 last:pb-0"
                            >
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className="text-sm font-medium text-slate-100">
                                        {timeLabel}
                                    </p>
                                    {hour.airQualitySummary && (
                                        <p className="text-xs text-slate-300">
                                            {hour.airQualitySummary}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-200">
                                    {hour.humidity != null && (
                                        <div>Humidity: {Math.round(hour.humidity)}%</div>
                                    )}
                                    {hour.windSpeed != null && (
                                        <div>
                                            Wind: {Math.round(hour.windSpeed)} km/h{" "}
                                            {windCompass && (
                                                <span className="text-slate-400">
                                                    ({windCompass})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {hour.windGusts != null && (
                                        <div>Gusts: {Math.round(hour.windGusts)} km/h</div>
                                    )}
                                    {hour.cloudCover != null && (
                                        <div>
                                            Cloud cover: {Math.round(hour.cloudCover)}%
                                        </div>
                                    )}
                                    {hour.visibility != null && (
                                        <div>
                                            Visibility: {(hour.visibility / 1000).toFixed(1)} km
                                        </div>
                                    )}
                                    {hour.uvIndex != null && (
                                        <div>UV index: {hour.uvIndex.toFixed(1)}</div>
                                    )}
                                    {hour.airQuality && (
                                        <>
                                            {hour.airQuality.pm2_5 != null && (
                                                <div>
                                                    PM2.5: {hour.airQuality.pm2_5.toFixed(1)} µg/m³
                                                </div>
                                            )}
                                            {hour.airQuality.pm10 != null && (
                                                <div>
                                                    PM10: {hour.airQuality.pm10.toFixed(1)} µg/m³
                                                </div>
                                            )}
                                            {hour.airQuality.dust != null && (
                                                <div>
                                                    Dust index: {hour.airQuality.dust.toFixed(1)}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Timeline of hours, stepped every 3 hours */}
            <div className="flex flex-wrap gap-1.5 text-xs">
                {hours
                    .map((hour, index) => ({ hour, index }))
                    .filter(({ index }) => index % GROUP_STEP === 0)
                    .map(({ hour, index }) => {
                        const label = formatHourLabel(hour.time, weather.timezone);
                        const isActive = index === groupIndex;

                        return (
                            <button
                                key={hour.time || index}
                                type="button"
                                onClick={() => setCurrentIndex(index)}
                                className={[
                                    "px-2 py-1 rounded-full border transition-colors",
                                    isActive
                                        ? "bg-sky-500 text-slate-900 border-sky-500"
                                        : "bg-slate-900/60 text-slate-200 border-slate-700 hover:bg-slate-800",
                                ].join(" ")}
                            >
                                {label}
                            </button>
                        );
                    })}
            </div>
        </div>
    );
}

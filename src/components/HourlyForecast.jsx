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

/**
 * Format an hour string for display.
 * @param {string} timeStr
 * @returns {string}
 */
function formatHour(timeStr) {
    const date = new Date(timeStr);
    return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
}

/**
 * Return whether the given time is day or night.
 * Very simple approximation: 6:00–18:00 local = day.
 * @param {string} timeStr
 * @returns {"day" | "night"}
 */
function getTimeOfDay(timeStr) {
    const hours = new Date(timeStr).getHours();
    return hours >= 6 && hours < 18 ? "day" : "night";
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
 * HourlyForecast component – shows an animated card that rotates through
 * the next 12 hours of data, with weather icons and time-of-day styling.
 * @param {{ weather: WeatherState|null, unitSystem: UnitSystem }} props
 * @returns {JSX.Element}
 */
export default function HourlyForecast({ weather, unitSystem }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const hours = useMemo(() => {
        if (!weather || !weather.hourly?.length) return [];
        return weather.hourly.slice(0, 12);
    }, [weather]);

    // Auto-advance every 6 seconds
    useEffect(() => {
        if (!hours.length) return;
        const id = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % hours.length);
        }, 6000);
        return () => clearInterval(id);
    }, [hours.length]);

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

    const clampedIndex = Math.min(Math.max(currentIndex, 0), hours.length - 1);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? hours.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === hours.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Next 12 Hours</h3>
                <p className="text-xs text-slate-400">
                    Auto-rotating forecast &mdash; use arrows to navigate.
                </p>
            </div>

            {/* Animated card carousel */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-sky-500/20 via-slate-900 to-slate-900 shadow-lg">
                {/* Inner track that slides left/right */}
                <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${clampedIndex * 100}%)` }}
                >
                    {hours.map((hour, index) => {
                        const td = getTimeOfDay(hour.time);
                        const CardIcon = getWeatherIconComponent(hour.weatherCode, td);
                        const label = formatHour(hour.time);
                        const desc = describeWeatherCodeInline(hour.weatherCode);

                        return (
                            <div
                                key={hour.time || index}
                                className="min-w-full px-4 py-4 sm:px-6 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-slate-900/40 border border-slate-700/80">
                                        <CardIcon className="text-4xl sm:text-5xl text-sky-200" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">Around {label}</p>
                                        <p className="text-base sm:text-lg font-semibold text-slate-50">
                                            {desc}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-300">
                                            {hour.temperature != null
                                                ? formatTemperature(hour.temperature, unitSystem)
                                                : "Temp unknown"}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm text-slate-300">
                                    <p className="mt-1 text-slate-400 text-sm sm:text-xs">
                                        Precipitation: {formatPrecipitation(hour.precipitation, unitSystem)}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Local time &amp; conditions based on forecast data.
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Navigation buttons */}
                <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 border border-slate-700 p-1 text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Previous hour"
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 border border-slate-700 p-1 text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Next hour"
                >
                    ›
                </button>
            </div>

            {/* Timeline of hours with active one highlighted */}
            <div className="flex flex-wrap gap-1.5 text-xs">
                {hours.map((hour, index) => {
                    const label = formatHour(hour.time);
                    const isActive = index === clampedIndex;

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

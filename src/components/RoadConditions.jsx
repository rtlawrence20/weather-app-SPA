/**
 * @typedef {import("../services/weatherApi").WeatherState} WeatherState
 * @typedef {import("../services/units").UnitSystem} UnitSystem
 */

import { roadConditionInfo, classifyRoadCondition } from "../services/roadConditions";
import { formatTemperature, formatPrecipitation } from "../services/units";
import { formatHourLabel } from "../services/time";

/**
 * Given the WeatherState, find the index in hourly that matches "now".
 * First try weather.current.time; if that fails, fall back to the first
 * hour >= current browser time; if that also fails, use 0.
 * @param {WeatherState|null} weather
 * @returns {number}
 */
function getStartIndex(weather) {
    if (!weather || !Array.isArray(weather.hourly) || weather.hourly.length === 0) {
        return 0;
    }

    const hours = weather.hourly;

    // 1) Try to match current_weather time exactly
    if (weather.current?.time) {
        const idx = hours.findIndex((h) => h.time === weather.current.time);
        if (idx !== -1) return idx;
    }

    // 2) Fallback: first hour >= "now" (rough matching)
    const now = new Date();
    const nowIsoHour = now.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

    const idxFuture = hours.findIndex((h) => h.time.slice(0, 13) >= nowIsoHour);
    if (idxFuture !== -1) return idxFuture;

    // 3) Last resort: 0
    return 0;
}

/**
 * RoadConditions component
 * @param {{ weather: WeatherState|null, unitSystem: UnitSystem }} props
 * @returns {JSX.Element}
 */
export default function RoadConditions({ weather, unitSystem }) {
    const startIndex = getStartIndex(weather);
    const allHours = weather?.hourly ?? [];
    const upcoming = allHours.slice(startIndex, startIndex + 6);

    // Use current_weather if available, otherwise fall back to first upcoming hour
    const currentSource =
        weather?.current && weather.current.time
            ? upcoming.find((h) => h.time === weather.current.time) ?? upcoming[0]
            : upcoming[0];

    const currentTemp =
        weather?.current?.temperature ?? currentSource?.temperature ?? null;
    const currentCode =
        weather?.current?.weatherCode ?? currentSource?.weatherCode ?? null;
    const currentPrecip = currentSource?.precipitation ?? null;

    const currentCategory = classifyRoadCondition(
        currentTemp,
        currentPrecip,
        currentCode
    );
    const currentInfo = roadConditionInfo(currentCategory);

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-3 sm:px-4 sm:py-4">
                <h3 className="text-lg font-semibold">Road Conditions Overview</h3>
                <p className="mt-1 text-sm text-slate-300">{currentInfo.label}</p>
                <p className="mt-1 text-xs text-slate-400">{currentInfo.detail}</p>

                {currentTemp != null && (
                    <p className="mt-2 text-xs text-slate-400">
                        Based on current temperature ({formatTemperature(currentTemp, unitSystem)}) and
                        immediate precipitation forecasts ({formatPrecipitation(currentPrecip, unitSystem)}).
                    </p>
                )}
            </section>

            <section className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-100">
                    Next few hours
                </h4>
                {!upcoming.length && (
                    <p className="text-sm text-slate-300">
                        Not enough hourly data available to project road conditions.
                    </p>
                )}

                {upcoming.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {upcoming.map((hour, idx) => {
                            const cat = classifyRoadCondition(
                                hour.temperature,
                                hour.precipitation,
                                hour.weatherCode
                            );
                            const info = roadConditionInfo(cat);

                            const label = formatHourLabel(hour.time, weather.timezone);

                            return (
                                <div
                                    key={hour.time || idx}
                                    className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
                                >
                                    <p className="font-semibold">{label}</p>
                                    <p className="mt-1 text-slate-300">{info.label}</p>
                                    <p className="mt-1 text-slate-400">
                                        Temp: {formatTemperature(hour.temperature, unitSystem)} ·
                                        Precip: {formatPrecipitation(hour.precipitation, unitSystem)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}


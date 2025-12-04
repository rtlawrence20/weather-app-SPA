/** 
 *  @typedef {import("../services/weatherApi").WeatherState} WeatherState 
 *  @typedef {import("../services/units").UnitSystem} UnitSystem
 */

import { roadConditionInfo, classifyRoadCondition } from "../services/roadConditions";
import { formatTemperature, formatPrecipitation } from "../services/units";

/**
 * Get the next N hourly entries from a WeatherState.
 * @param {WeatherState|null} weather
 * @param {number} count
 */
function getNextHours(weather, count) {
    if (!weather || !Array.isArray(weather.hourly)) return [];
    return weather.hourly.slice(0, count);
}

/**
 * RoadConditions component
 * @param {{ weather: WeatherState|null, unitSystem: UnitSystem }} props
 * @returns {JSX.Element}
 */
export default function RoadConditions({ weather, unitSystem }) {
    const currentTemp = weather?.current?.temperature ?? null;
    const currentCode = weather?.current?.weatherCode ?? null;
    const currentPrecip = weather?.hourly?.[0]?.precipitation ?? null;

    const currentCategory = classifyRoadCondition(
        currentTemp,
        currentPrecip,
        currentCode
    );
    const currentInfo = roadConditionInfo(currentCategory);

    const upcoming = getNextHours(weather, 6);

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

                            const t = new Date(hour.time);
                            const label = t.toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                            });

                            return (
                                <div
                                    key={hour.time || idx}
                                    className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
                                >
                                    <p className="font-semibold">{label}</p>
                                    <p className="mt-1 text-slate-300">{info.label}</p>
                                    <p className="mt-1 text-slate-400">
                                        Temp: {formatTemperature(hour.temperature, unitSystem)} · Precip:{" "}
                                        {formatPrecipitation(hour.precipitation, unitSystem)}
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


/**
 *  @typedef {import("../services/weatherApi").WeatherState} WeatherState 
 *  @typedef {import("../services/units").UnitSystem} UnitSystem
*/
import { formatTemperature } from "../services/units";

/**
 * Format a date string into a more readable format
 * @param {string} dateStr 
 * @returns {string} -- Formatted date string
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

/**
 * DailyForecast component
 * @param {{ weather: WeatherState|null, unitSystem: UnitSystem }} props
 * @returns {JSX.Element} Daily forecast component
 */
export default function DailyForecast({ weather, unitSystem }) {
    if (!weather || !weather.daily?.length) {
        return (
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">7-Day Forecast</h3>
                <p className="text-sm text-slate-300">
                    Daily forecast data is not available yet. Try searching for a location.
                </p>
            </div>
        );
    }

    const days = weather.daily.slice(0, 7);

    return (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">7-Day Forecast</h3>
            <p className="text-xs text-slate-400">
                Highs and lows for the next week.
            </p>

            <div className="mt-3 grid gap-2 sm:gap-3">
                {days.map((day, idx) => (
                    <div
                        key={day.date || idx}
                        className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm"
                    >
                        <span className="text-slate-100">{formatDate(day.date)}</span>
                        <span className="text-slate-300 text-xs">
                            {day.tempMax != null ? formatTemperature(day.tempMax, unitSystem) : "–"}{" "}
                            /{" "}
                            {day.tempMin != null ? formatTemperature(day.tempMin, unitSystem) : "–"}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

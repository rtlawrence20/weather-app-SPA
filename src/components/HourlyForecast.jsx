/** @typedef {import("../services/weatherApi").WeatherState} WeatherState */

/**
 * Format an hour string into a more readable format
 * @param {string} timeStr 
 * @param {string} [timezoneLabel]
 * @returns {string} -- Formatted hour string
 */
function formatHour(timeStr, timezoneLabel = "local") {
    const date = new Date(timeStr);
    // Just show local time for now
    return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
}

/**
 * HourlyForecast component
 * @param {{ weather: WeatherState|null }} weather
 * @returns {JSX.Element} Hourly forecast component
 */
export default function HourlyForecast({ weather }) {
    if (!weather || !weather.hourly?.length) {
        return (
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">Hourly Forecast</h3>
                <p className="text-sm text-slate-300">
                    Hourly forecast data is not available yet. Try searching for a location.
                </p>
            </div>
        );
    }

    // Show next 12 hours
    const nextHours = weather.hourly.slice(0, 12);

    return (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Next 12 Hours</h3>
            <p className="text-xs text-slate-400">
                Times shown in your local timezone.
            </p>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {nextHours.map((hour, idx) => (
                    <div
                        key={hour.time || idx}
                        className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-200"
                    >
                        <p className="font-semibold">{formatHour(hour.time)}</p>
                        <p className="mt-1">
                            <span className="font-medium">{Math.round(hour.temperature)}°</span>
                        </p>
                        <p className="mt-1 text-slate-400">
                            Precip: {hour.precipitation != null ? `${hour.precipitation} mm` : "–"}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}


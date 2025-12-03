/**
 * @typedef {import("../services/weatherApi").WeatherState} WeatherState
 */

import { useParams, Navigate, Link } from "react-router-dom";
import ForecastTabs from "../components/ForecastTabs";

const VALID_TYPES = ["hourly", "roads", "daily"];

/**
 * Forecast page component
 * @param {{
 *   loading: boolean,
 *   error: string|null,
 *   weather: WeatherState|null,
 *   locationLabel: string|null
 * }} props
 * @returns {JSX.Element} Forecast page component
 */
export default function Forecast({ loading, error, weather, locationLabel }) {
    const { type } = useParams();

    if (!VALID_TYPES.includes(type)) {
        // Redirect unknown tab types to hourly
        return <Navigate to="/forecast/hourly" replace />;
    }

    let viewLabel = "Road conditions";
    if (type === "hourly") viewLabel = "Hourly forecast";
    else if (type === "daily") viewLabel = "7-day outlook";

    return (
        <main className="space-y-6 sm:space-y-8">
            <section className="bg-slate-800/70 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-6">
                {loading && (
                    <p className="text-sm text-slate-300">
                        Fetching forecast<span className="animate-pulse">…</span>
                    </p>
                )}

                {!loading && error && (
                    <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                        {error}
                    </div>
                )}

                {!loading && !error && !weather && (
                    <div className="space-y-2">
                        <p className="text-sm text-slate-300">
                            No forecast loaded yet. Start from the{" "}
                            <Link to="/" className="text-sky-400 hover:text-sky-300 underline">
                                landing page
                            </Link>{" "}
                            and enter a city, ZIP, or use your location.
                        </p>
                    </div>
                )}

                {!loading && !error && weather && (
                    <>
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-semibold">
                                    {locationLabel ?? "Forecast"}
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Viewing: {viewLabel}
                                </p>
                            </div>
                        </div>

                        <ForecastTabs weather={weather} />
                    </>
                )}
            </section>
        </main>
    );
}

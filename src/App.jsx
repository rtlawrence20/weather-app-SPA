import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import Forecast from "./pages/Forecast";
import { fetchWeatherForQuery, fetchWeatherForCoords, reverseGeocodeCoords } from "./services/weatherApi";

/**
 * Main application component
 * @returns {JSX.Element} App component
 */
export default function App() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [weather, setWeather] = useState(null);
    const [unitSystem, setUnitSystem] = useState("metric"); // "metric" | "imperial"

    // derive label from weather now; no separate state needed
    const locationLabel = weather?.locationLabel ?? null;

    /**
    * Handle submission of a location query to fetch weather data.
    * @param {string} value - The location query (city name, ZIP code, etc.)
    */
    const handleSubmitLocation = async (value) => {
        setQuery(value);
        setError(null);
        setLoading(true);

        try {
            const result = await fetchWeatherForQuery(value);
            setWeather(result);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to fetch weather data.");
            setWeather(null);
        } finally {
            setLoading(false);
        }
    };

    /**
    * Handle using the user's current location to fetch weather data.
    */
    const handleUseMyLocation = () => {
        setError(null);

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }

        setLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Try to turn the raw coords into a nearby city/town label
                    const reverseLabel = await reverseGeocodeCoords(latitude, longitude);

                    const result = await fetchWeatherForCoords(
                        latitude,
                        longitude,
                        // Prefer human-friendly label; fall back to coords if reverse fails
                        reverseLabel ?? `Your location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`
                    );

                    setWeather(result);
                } catch (err) {
                    console.error(err);
                    setError(err.message || "Failed to fetch weather data.");
                    setWeather(null);
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                console.error(err);
                setLoading(false);
                setError(`Unable to get your location (${err.message}).`);
            }
        );
    };

    return (
        <div className="min-h-screen">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
                <header className="mb-6 sm:mb-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                            Weather &amp; Road Conditions
                        </h1>
                        <p className="mt-2 text-sm sm:text-base text-slate-300">
                            Client-side weather dashboard with geolocation and multi-view forecasts.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <nav className="flex gap-3 text-sm justify-center">
                            <Link
                                to="/"
                                className="text-slate-300 hover:text-sky-400 underline-offset-4 hover:underline"
                            >
                                Home
                            </Link>
                            <Link
                                to="/forecast/hourly"
                                className="text-slate-300 hover:text-sky-400 underline-offset-4 hover:underline"
                            >
                                Forecast
                            </Link>
                        </nav>

                        {/* Unit toggle */}
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center rounded-full bg-slate-800/70 px-1 py-1 border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setUnitSystem("metric")}
                                    className={[
                                        "px-3 py-1 text-xs rounded-full transition-colors",
                                        unitSystem === "metric"
                                            ? "bg-sky-500 text-slate-900"
                                            : "text-slate-300 hover:bg-slate-800",
                                    ].join(" ")}
                                >
                                    °C
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUnitSystem("imperial")}
                                    className={[
                                        "px-3 py-1 text-xs rounded-full transition-colors",
                                        unitSystem === "imperial"
                                            ? "bg-sky-500 text-slate-900"
                                            : "text-slate-300 hover:bg-slate-800",
                                    ].join(" ")}
                                >
                                    °F
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <Routes>
                    <Route
                        path="/"
                        element={
                            <Landing
                                query={query}
                                loading={loading}
                                error={error}
                                onSubmitLocation={handleSubmitLocation}
                                onUseMyLocation={handleUseMyLocation}
                            />
                        }
                    />
                    <Route
                        path="/forecast/:type"
                        element={
                            <Forecast
                                loading={loading}
                                error={error}
                                weather={weather}
                                locationLabel={locationLabel}
                                unitSystem={unitSystem}
                            />
                        }
                    />
                </Routes>
            </div>
        </div>
    );
}

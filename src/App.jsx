// src/App.jsx
import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import Forecast from "./pages/Forecast";
import { fetchWeatherForQuery, fetchWeatherForCoords } from "./services/weatherApi";

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weather, setWeather] = useState(null);

  // derive label from weather now; no separate state needed
  const locationLabel = weather?.locationLabel ?? null;

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
          const result = await fetchWeatherForCoords(
            latitude,
            longitude,
            `Your location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`
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
        <header className="mb-6 sm:mb-8 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Weather &amp; Road Conditions
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300">
              Client-side weather dashboard with geolocation and multi-view forecasts.
            </p>
          </div>

          <nav className="mt-2 sm:mt-0 flex gap-3 text-sm">
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
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

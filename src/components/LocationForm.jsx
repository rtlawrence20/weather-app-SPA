import { useState } from "react";

/**
 * LocationForm component
 * @param {{
 *   defaultValue?: string,
 *   onSubmitLocation: (value: string) => void,
 *   onUseMyLocation: () => void,
 *   loading: boolean
 * }} props
 * @returns {JSX.Element} Location form component
 */
export default function LocationForm({
    defaultValue = "",
    onSubmitLocation,
    onUseMyLocation,
    loading,
}) {
    const [value, setValue] = useState(defaultValue);
    const [error, setError] = useState("");

    const ZIP_REGEX = /^\d{5}$/;
    const CITY_STATE_REGEX = /^([^,]+),\s*([A-Za-z]{2})$/;

    /**
     * Validate the raw input and return a normalized query string
     * or null if invalid.
     *
     * Accepted formats:
     *   - "80202"
     *   - "Denver, CO"
     *
     * Normalized output:
     *   - "80202"
     *   - "Denver, CO"
     */
    const normalizeLocationInput = (raw) => {
        const trimmed = raw.trim();

        if (!trimmed) return null;

        // 5-digit US ZIP
        if (ZIP_REGEX.test(trimmed)) {
            // just the ZIP — this worked before with Open-Meteo
            return trimmed;
        }

        // "City, ST" pattern
        const match = trimmed.match(CITY_STATE_REGEX);
        if (match) {
            const city = match[1].trim();
            const state = match[2].toUpperCase();
            if (!city) return null;
            // keep it simple for Open-Meteo: "City, ST"
            return `${city}, ${state}`;
        }

        return null;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        const raw = value.trim();
        if (!raw) {
            setError("Please enter a ZIP code or a city, state.");
            return;
        }

        const normalized = normalizeLocationInput(raw);

        if (!normalized) {
            setError(
                "Use a 5-digit ZIP (e.g. 80202) or a city, state (e.g. Denver, CO)."
            );
            return;
        }

        onSubmitLocation(normalized);
    };

    const handleChange = (e) => {
        setValue(e.target.value);
        if (error) setError("");
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4"
        >
            {/* Label + input */}
            <label className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    ZIP or City, State
                </span>
                <input
                    type="text"
                    placeholder="e.g. 80202 or Denver, CO"
                    value={value}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm placeholder:text-slate-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
                />
                {error && (
                    <span className="mt-1 text-xs text-red-400">
                        {error}
                    </span>
                )}
            </label>

            {/* Buttons */}
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={loading || !value.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-900 shadow hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 transition-colors"
                >
                    {loading ? "Fetching…" : "Get Forecast"}
                </button>

                <button
                    type="button"
                    onClick={onUseMyLocation}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-500 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                    Use My Location
                </button>
            </div>
        </form>
    );
}

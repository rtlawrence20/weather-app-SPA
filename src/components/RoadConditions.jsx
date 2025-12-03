/** @typedef {import("../services/weatherApi").WeatherState} WeatherState */

/**
 * RoadConditions component
 * @param {{ weather: WeatherState|null }} weather
 * @returns {JSX.Element} Road conditions component
 */
export default function RoadConditions({ weather }) {
    return (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Road Conditions (placeholder)</h3>
            <p className="text-sm text-slate-300">
                This tab will use weather data to infer likely road surface conditions, and
                optionally integrate a dedicated road-conditions API where available.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-3 text-sm text-slate-200">
                    <p className="font-medium">Example:</p>
                    <p className="mt-1 text-slate-300">
                        Light snow + sub-freezing temps → elevated ice risk.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-3 text-sm text-slate-200">
                    <p className="font-medium">Example:</p>
                    <p className="mt-1 text-slate-300">
                        Moderate rain + temps above 40°F → wet pavement, no ice risk.
                    </p>
                </div>
            </div>
        </div>
    );
}


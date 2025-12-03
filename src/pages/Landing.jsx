import { useNavigate } from "react-router-dom";
import LocationForm from "../components/LocationForm";

/**
 * Landing page component
 * @param {{
 *   query: string,
 *   loading: boolean,
 *   error: string|null,
 *   onSubmitLocation: (value: string) => void,
 *   onUseMyLocation: () => void
 * }} props
 * @returns {JSX.Element} Landing page component
 */
export default function Landing({
    query,
    loading,
    error,
    onSubmitLocation,
    onUseMyLocation,
}) {
    const navigate = useNavigate();

    const handleSubmitLocation = (value) => {
        onSubmitLocation(value);
        navigate("/forecast/hourly");
    };

    const handleUseMyLocation = () => {
        onUseMyLocation();
        navigate("/forecast/hourly");
    };

    return (
        <main className="space-y-6 sm:space-y-8">
            <section className="bg-slate-800/70 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-6">
                <LocationForm
                    defaultValue={query}
                    onSubmitLocation={handleSubmitLocation}
                    onUseMyLocation={handleUseMyLocation}
                    loading={loading}
                />

                {error && (
                    <div className="mt-4 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                        {error}
                    </div>
                )}
            </section>

            <section className="bg-slate-800/70 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-6">
                <p className="text-sm text-slate-300">
                    Enter a city or ZIP code, or use your location to see an hourly
                    forecast, 7-day outlook, and road conditions. Results will appear on
                    the forecast page.
                </p>
            </section>
        </main>
    );
}

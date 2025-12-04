/**
 * RadarMap
 * Shows an embedded Windy.com radar map centered on the given coordinates.
 *
 * @param {{ coords: { lat: number, lon: number } | null, locationLabel?: string }} props
 */
export default function RadarMap({ coords, locationLabel }) {
    if (!coords || typeof coords.lat !== "number" || typeof coords.lon !== "number") {
        return null;
    }

    const { lat, lon } = coords;

    // Windy embed URL
    // Docs / examples use embed2.html with lat, lon, overlay=radar, etc.
    const windySrc = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&zoom=7&level=surface&overlay=radar&product=radar&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;

    const label = locationLabel || "this area";

    return (
        <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
                Radar near {label}
            </h2>

            <div className="relative w-full h-80 rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                <iframe
                    title={`Weather radar near ${label}`}
                    src={windySrc}
                    className="w-full h-full"
                    frameBorder="0"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            </div>

            <p className="mt-2 text-xs text-slate-400">
                Radar imagery © Windy.com
            </p>
        </section>
    );
}

/**
 * @typedef {"metric" | "imperial"} UnitSystem
 */

/**
 * Format a temperature in °C into a string in the given unit system.
 * @param {number|null|undefined} tempC
 * @param {UnitSystem} unitSystem
 * @returns {string}
 */
export function formatTemperature(tempC, unitSystem) {
    if (tempC == null) return "–";

    if (unitSystem === "metric") {
        return `${Math.round(tempC)}°C`;
    }

    const tempF = tempC * 9 / 5 + 32;
    return `${Math.round(tempF)}°F`;
}

/**
 * Format precipitation in millimeters into a string in the given unit system.
 * @param {number|null|undefined} precipMm
 * @param {UnitSystem} unitSystem
 * @returns {string}
 */
export function formatPrecipitation(precipMm, unitSystem) {
    if (precipMm == null) return "–";

    if (unitSystem === "metric") {
        return `${precipMm.toFixed(1)} mm`;
    }

    const inches = precipMm / 25.4;
    return `${inches.toFixed(2)} in`;
}


/**
 * Convert a wind speed in km/h to a display string.
 *
 * @param {number|null|undefined} speedKmh
 * @param {UnitSystem} unitSystem
 * @returns {string}
 */
export function formatWindSpeed(speedKmh, unitSystem) {
    if (speedKmh == null || Number.isNaN(speedKmh)) return "—";

    if (unitSystem === "metric") {
        return `${Math.round(speedKmh)} km/h`;
    }

    const mph = speedKmh / 1.609344;
    return `${Math.round(mph)} mph`;
}

/**
 * Convert visibility in meters to a display string.
 *
 * @param {number|null|undefined} meters
 * @param {UnitSystem} unitSystem
 * @returns {string}
 */
export function formatVisibility(meters, unitSystem) {
    if (meters == null || Number.isNaN(meters)) return "—";

    if (unitSystem === "metric") {
        const km = meters / 1000;
        return `${km.toFixed(1)} km`;
    }

    const miles = meters * (6.27137 * 10 ** -4);
    return `${miles.toFixed(1)} mi`;

}
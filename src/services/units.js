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

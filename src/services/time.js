/**
 * Format an ISO-like time string "YYYY-MM-DDTHH:MM" into a
 * human-readable local hour label, based purely on the clock time
 * encoded in the string. Open-Meteo already returns local timestamps
 * for the forecast timezone.
 *
 * Example: "2025-12-05T16:00" -> "4:00 PM"
 *
 * @param {string} timeStr
 * @returns {string}
 */
export function formatHourLabel(timeStr) {
    try {
        const [, timePart] = timeStr.split("T");
        if (!timePart) throw new Error("No time part");

        const [hourStr, minuteStr = "00"] = timePart.split(":");
        let hour = Number(hourStr);
        const minute = Number(minuteStr);

        if (Number.isNaN(hour) || Number.isNaN(minute)) {
            throw new Error("Invalid hour/minute");
        }

        const suffix = hour >= 12 ? "PM" : "AM";
        let displayHour = hour % 12;
        if (displayHour === 0) displayHour = 12;

        const displayMinute = minute.toString().padStart(2, "0");

        return `${displayHour}:${displayMinute} ${suffix}`;
    } catch {
        // Fallback: let the browser try something reasonable
        const date = new Date(timeStr);
        return date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
        });
    }
}

/**
 * Decide "day" or "night" based on the hour encoded in the time string.
 * Very simple approximation: 06:00–17:59 = "day", else "night".
 *
 * @param {string} timeStr
 * @returns {"day" | "night"}
 */
export function getTimeOfDayFromString(timeStr) {
    try {
        const [, timePart] = timeStr.split("T");
        if (!timePart) throw new Error("No time part");
        const [hourStr] = timePart.split(":");
        const hour = Number(hourStr);
        if (Number.isNaN(hour)) throw new Error("Invalid hour");
        return hour >= 6 && hour < 18 ? "day" : "night";
    } catch {
        const hours = new Date(timeStr).getHours();
        return hours >= 6 && hours < 18 ? "day" : "night";
    }
}

/**
 * Format a daily date string "YYYY-MM-DD" into a short, human-readable
 * label like "Fri, Dec 5".
 *
 * Parse as a plain calendar date (not letting timezone arithmetic
 * shift it across days), then format with the user's locale.
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateLabel(dateStr) {
    try {
        const [yearStr, monthStr, dayStr] = dateStr.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        const day = Number(dayStr);

        if (
            Number.isNaN(year) ||
            Number.isNaN(month) ||
            Number.isNaN(day)
        ) {
            throw new Error("Invalid date parts");
        }

        // Construct a Date in local time with the given Y/M/D
        const date = new Date(year, month - 1, day);

        return date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    } catch {
        // Fallback to browser parsing if something weird comes in
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    }
}
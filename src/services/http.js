/**
 * Fetch JSON data from a URL.
 * @param {string} url
 * @returns {Promise<any>}
 */
export async function fetchJson(url) {
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
    }

    return res.json();
}

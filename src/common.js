/**
 * Shared utilities for Puplets site
 */

/**
 * Timeout duration for JSON fetch requests in milliseconds
 * @type {number}
 */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Validate that a value is a valid price
 * @param {*} value - The value to validate
 * @returns {boolean} True if value is a valid positive number
 */
function isValidPrice(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Check if the current user is authenticated in the CMS
 * @returns {boolean} True if user has an active CMS session
 */
function isAuthenticated() {
    return document.cookie.includes('netlify-cms-user=');
}

/**
 * Fetch and parse JSON from a URL with timeout and error handling
 *
 * This utility handles all JSON fetch operations with consistent timeout
 * and error handling behavior. On any error (timeout, network, HTTP error,
 * JSON parse failure), it returns the fallback value and logs a warning
 * if the user is authenticated (for debugging).
 *
 * NOTE: Existing loadInventory() functions in individual pages can be
 * refactored to use this utility in a future iteration. This is out of
 * scope for the current changes.
 *
 * @param {string} url - The URL to fetch JSON from
 * @param {*} fallback - The value to return on any error
 * @returns {Promise<*>} Parsed JSON on success, fallback on error
 */
async function fetchJSON(url, fallback) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (isAuthenticated()) {
                console.warn(`[fetchJSON] HTTP error ${response.status} for ${url}`);
            }
            return fallback;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        if (isAuthenticated()) {
            let errorType;
            if (error.name === 'AbortError') {
                errorType = 'timeout';
            } else if (error instanceof SyntaxError) {
                errorType = 'JSON parse failure';
            } else {
                errorType = 'network error';
            }
            console.warn(`[fetchJSON] ${errorType} for ${url}`);
        }

        return fallback;
    }
}

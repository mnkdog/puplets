// Common utilities shared across Puplets pages

/**
 * Timeout duration for JSON fetch requests in milliseconds
 * @type {number}
 */
const FETCH_TIMEOUT_MS = 5000;

// Update cart count badge in navigation
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const countElement = document.querySelector('.cart-count');
    if (cart.length > 0) {
        countElement.textContent = cart.length;
        countElement.style.display = 'flex';
    } else {
        countElement.style.display = 'none';
    }
}

// Check if About page is published and hide nav links if not
async function checkAboutPageVisibility() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch('/content/about.md', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
            const content = await response.text();
            // Extract frontmatter
            const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
            if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1];
                // Check if published is false
                const publishedMatch = frontmatter.match(/published:\s*(true|false)/);
                if (publishedMatch && publishedMatch[1] === 'false') {
                    // Hide About links
                    const desktopLink = document.getElementById('aboutLinkDesktop');
                    const mobileLink = document.getElementById('aboutLinkMobile');
                    if (desktopLink) desktopLink.style.display = 'none';
                    if (mobileLink) mobileLink.style.display = 'none';
                }
            }
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error('About page status load timeout:', error);
        } else {
            console.error('Failed to load about page status:', error);
        }
    }
}

// Toggle mobile menu visibility
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Close mobile menu
function closeMobileMenu(event) {
    const menu = document.getElementById('mobileMenu');
    if (!menu) return;

    // If called from overlay click, only close if clicking the overlay itself
    if (!event || event.target === event.currentTarget) {
        menu.classList.remove('active');
    }
}

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

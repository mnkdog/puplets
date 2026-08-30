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

/**
 * Current cart schema version
 * Increment when cart structure changes to trigger migration
 */
const CART_SCHEMA_VERSION = 1;

/**
 * Migrate legacy cart items to current schema
 *
 * Performs one-shot migration of cart items that lack required fields.
 * Uses structural analysis (not display text) to infer item type:
 * - Items with size/color/extraCharms → collar
 * - Items with charm slug + quantity (no size) → charm
 * - Unclassifiable items → dropped (logged as warning)
 *
 * Also ensures all items have identity (id field) and normalizes
 * price to Money value object {amount, currency}.
 *
 * Migration runs once per schema version and is idempotent.
 */
function migrateCart() {
    const LOCK_KEY = 'cartMigrationLock';
    const LOCK_TIMEOUT_MS = 5000;

    try {
        // Check version BEFORE attempting lock for performance
        const currentVersion = parseInt(localStorage.getItem('cartSchemaVersion') || '0');
        if (currentVersion >= CART_SCHEMA_VERSION) return;

        // Acquire lock to prevent concurrent migration attempts
        const now = Date.now();
        const lockTimestamp = localStorage.getItem(LOCK_KEY);

        if (lockTimestamp) {
            const lockAge = now - parseInt(lockTimestamp);
            if (lockAge < LOCK_TIMEOUT_MS) {
                // Another migration is in progress, skip this attempt
                return;
            }
            // Stale lock (timeout exceeded), proceed to acquire
        }

        // Set lock with current timestamp
        localStorage.setItem(LOCK_KEY, String(now));

        // Double-check version after acquiring lock (another thread might have finished)
        const versionAfterLock = parseInt(localStorage.getItem('cartSchemaVersion') || '0');
        if (versionAfterLock >= CART_SCHEMA_VERSION) {
            localStorage.removeItem(LOCK_KEY);
            return;
        }

        const raw = localStorage.getItem('cart');
        if (!raw) {
            // Stamp version even for empty cart
            localStorage.setItem('cartSchemaVersion', String(CART_SCHEMA_VERSION));
            localStorage.removeItem(LOCK_KEY);
            return;
        }

        const cart = JSON.parse(raw);

        // Guard against non-array cart data
        if (!Array.isArray(cart)) {
            console.warn('Cart migration: unexpected cart shape, skipping');
            localStorage.removeItem(LOCK_KEY);
            return;
        }

        let migrated = false;
        const migratedCart = [];

        for (const item of cart) {
            // Skip items that already have required fields
            if (item.type && item.id != null) {
                migratedCart.push(item);
                continue;
            }

            migrated = true;

            // Trust existing type first, then infer from structure
            let type = (item.type === 'collar' || item.type === 'charm') ? item.type : null;

            if (!type) {
                // Infer type from structural domain fields, not display text
                if ((item.size != null || item.color != null || item.extraCharms != null)) {
                    type = 'collar';
                } else if ((item.charm != null || item.charmName != null) && item.size == null) {
                    type = 'charm';
                }
            }

            // Drop unclassifiable items rather than guessing
            if (!type) {
                console.warn('Cart migration: dropping unclassifiable item', item);
                continue;
            }

            // Ensure item has identity (with crypto fallback guard)
            const id = item.id ?? item.timestamp ?? (crypto?.randomUUID ? crypto.randomUUID() : `mig-${Date.now()}-${migratedCart.length}`);

            // Normalize price to Money value object
            let price = item.price;
            if (typeof price === 'number') {
                price = { amount: price, currency: 'GBP' };
            } else if (!price || typeof price !== 'object') {
                console.warn('Cart migration: invalid price for item, defaulting to £0', item);
                price = { amount: 0, currency: 'GBP' };
            }

            migratedCart.push({
                ...item,
                type,
                id,
                price
            });
        }

        if (migrated) {
            localStorage.setItem('cart', JSON.stringify(migratedCart));
            console.log(`Cart migrated to schema v${CART_SCHEMA_VERSION}: ${cart.length - migratedCart.length} items dropped, ${migratedCart.length} migrated`);
        }

        // Always stamp version after successful migration pass
        localStorage.setItem('cartSchemaVersion', String(CART_SCHEMA_VERSION));

        // Release lock
        localStorage.removeItem(LOCK_KEY);
    } catch (error) {
        console.error('Cart migration failed:', error);
        // Clean up lock on error to prevent deadlock
        try {
            localStorage.removeItem(LOCK_KEY);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

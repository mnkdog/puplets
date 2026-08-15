// Common utilities shared across Puplets pages

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

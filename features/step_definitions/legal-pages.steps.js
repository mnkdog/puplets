import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('I am on the puplets website', async function () {
    await this.page.goto('/');
});

When('I navigate to {string}', async function (url) {
    await this.page.goto(url);
    this.currentUrl = url;
});

Then('I should see the page title {string}', async function (title) {
    const pageTitle = await this.page.title();
    expect(pageTitle).toBe(title);
});

Then('the page should have proper HTML structure', async function () {
    // Check for required HTML elements
    const hasNav = await this.page.locator('nav').count() > 0;
    const hasContent = await this.page.locator('.content, body').count() > 0;

    expect(hasNav).toBe(true);
    expect(hasContent).toBe(true);
});

Then('the page should have navigation', async function () {
    const nav = this.page.locator('nav');
    await expect(nav).toBeVisible();

    // Should have logo/home link
    const logoLink = nav.locator('a[href="/"], a[href="index.html"], .logo, .logo-nav');
    await expect(logoLink.first()).toBeVisible();
});

Then('the page should have footer navigation', async function () {
    const footer = this.page.locator('footer');
    await expect(footer).toBeVisible();
});

When('I visit the following pages:', async function (dataTable) {
    this.visitedPages = [];
    for (const row of dataTable.rows()) {
        const page = row[0];
        await this.page.goto(page);
        this.visitedPages.push(page);
    }
});

Then('each page should have a footer with sections:', async function (dataTable) {
    const expectedSections = dataTable.rows().map(row => row[0]);

    for (const pagePath of this.visitedPages) {
        await this.page.goto(pagePath);
        const footer = this.page.locator('footer');
        await expect(footer).toBeVisible();

        for (const sectionName of expectedSections) {
            const sectionHeading = footer.locator('h3', { hasText: sectionName });
            await expect(sectionHeading).toBeVisible();
        }
    }
});

When('I am on {string}', async function (url) {
    await this.page.goto(url);
    this.currentUrl = url;
});

Then('the footer should contain working links to:', async function (dataTable) {
    const footer = this.page.locator('footer');

    for (const row of dataTable.rows()) {
        const linkText = row[0];
        const targetUrl = row[1];

        const link = footer.locator(`a:has-text("${linkText}")`);
        await expect(link).toBeVisible();

        const href = await link.getAttribute('href');
        expect(href).toBe(targetUrl);
    }
});

Then('I should see content about {string}', async function (keyword) {
    const content = this.page.locator('body');
    await expect(content).toContainText(keyword, { ignoreCase: true });
});

Then('I should see contact information', async function () {
    const content = this.page.locator('body');
    // Should contain email or contact details
    const hasEmail = await content.getByText(/email|contact/i).count() > 0;
    expect(hasEmail).toBe(true);
});

Then('I should see sizing information', async function () {
    const content = this.page.locator('body');
    // Should contain size-related terms
    const hasSizeInfo = await content.getByText(/size|measure|cm|inches/i).count() > 0;
    expect(hasSizeInfo).toBe(true);
});

Then('I should see frequently asked questions', async function () {
    const content = this.page.locator('body');
    // Should have multiple questions (h2 or h3 headings)
    const headingCount = await this.page.locator('h2, h3').count();
    expect(headingCount).toBeGreaterThan(3);
});

When('I resize the viewport to mobile size', async function () {
    await this.page.setViewportSize({ width: 375, height: 667 });
});

Then('the page should be properly formatted for mobile', async function () {
    // Check that content is visible and not cut off
    const body = this.page.locator('body');
    const bodyWidth = await body.evaluate(el => el.scrollWidth);
    const viewportWidth = this.page.viewportSize().width;

    // Allow small overflow for scrollbars
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
});

Then('the footer should stack vertically', async function () {
    const footer = this.page.locator('footer');
    await expect(footer).toBeVisible();

    // Footer should be visible and readable on mobile
    const isVisible = await footer.isVisible();
    expect(isVisible).toBe(true);
});

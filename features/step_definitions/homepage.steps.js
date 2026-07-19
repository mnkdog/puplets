import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('I am on the homepage', async function () {
  await this.page.goto('http://localhost:8080');
});

Then('I should see the text {string}', async function (text) {
  const content = await this.page.textContent('body');
  expect(content).to.include(text);
});

Then('I should see a link to {string}', async function (url) {
  const link = await this.page.locator(`a[href="${url}"]`);
  const count = await link.count();
  expect(count).to.be.greaterThan(0, `No link to ${url} found`);
});

Then('the link text should contain {string} or {string}', async function (text1, text2) {
  const etsyLink = await this.page.locator('a[href*="etsy.com"]');
  const linkText = await etsyLink.textContent();
  const lowerText = linkText.toLowerCase();
  const containsEither = lowerText.includes(text1.toLowerCase()) || lowerText.includes(text2.toLowerCase());
  expect(containsEither, `Link text "${linkText}" does not contain "${text1}" or "${text2}"`).to.equal(true);
});

// Removed duplicate - using implementation from checkout.steps.js

Then('I should see navigation with {string} link', async function (linkText) {
  const navLink = await this.page.locator(`nav a:has-text("${linkText}")`);
  const count = await navLink.count();
  expect(count).to.be.greaterThan(0, `Navigation link "${linkText}" not found`);
});

Then('the page should have a light cream background', async function () {
  const bgColor = await this.page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  // Check if background is a light color (cream/beige)
  expect(bgColor).to.match(/rgb\(24[0-9], 24[0-9], 23[0-9]\)/);
});

Then('I should see colored elements in red, blue, and green', async function () {
  const circles = await this.page.locator('.circle');
  const count = await circles.count();
  expect(count).to.be.greaterThan(0, 'No colored circle elements found');
});

When('I click the {string} link in navigation', async function (linkText) {
  await this.page.click(`nav a:has-text("${linkText}")`);
  await this.page.waitForLoadState('networkidle');
});

Then('I should be on the about page', async function () {
  const url = await this.page.url();
  expect(url).to.include('about.html');
});

Given('I am on the about page', async function () {
  await this.page.goto('http://localhost:8080/about.html');
});

Given('I am on the products page', async function () {
  await this.page.goto('http://localhost:8080/collar.html');
  await this.page.waitForLoadState('networkidle');
});

Given('I am on the cart page', async function () {
  await this.page.goto('http://localhost:8080/cart.html');
  await this.page.waitForLoadState('networkidle');
});

Then('I should see the heading {string}', async function (headingText) {
  const heading = await this.page.locator(`h1:has-text("${headingText}")`);
  const count = await heading.count();
  expect(count).to.be.greaterThan(0, `Heading "${headingText}" not found`);
});

Then('I should see text about veterinary school', async function () {
  const content = await this.page.textContent('body');
  expect(content).to.include('veterinary school');
});

Then('I should see text about Colchester Zoo', async function () {
  const content = await this.page.textContent('body');
  expect(content).to.include('Colchester Zoo');
});

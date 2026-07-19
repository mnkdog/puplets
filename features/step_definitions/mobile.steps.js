import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('I am on a mobile device', async function () {
  await this.page.setViewportSize({ width: 375, height: 667 });
});

Then('I should see a hamburger menu icon', async function () {
  const hamburger = await this.page.locator('.hamburger');
  const isVisible = await hamburger.isVisible();
  expect(isVisible).to.equal(true);
});

Then('I should see the cart button', async function () {
  const cartButton = await this.page.locator('.cart-button');
  const isVisible = await cartButton.isVisible();
  expect(isVisible).to.equal(true);
});

Then('I should not see the Products link', async function () {
  const productsLink = await this.page.locator('.nav-links a:has-text("Products")');
  const isVisible = await productsLink.isVisible();
  expect(isVisible).to.equal(false);
});

Then('I should not see the About link', async function () {
  const aboutLink = await this.page.locator('.nav-links a:has-text("About")');
  const isVisible = await aboutLink.isVisible();
  expect(isVisible).to.equal(false);
});

When('I click the hamburger menu', async function () {
  await this.page.waitForSelector('.hamburger', { state: 'visible' });
  await this.page.click('.hamburger');
  await this.page.waitForTimeout(300);
});

Then('the mobile menu should open', async function () {
  const menu = await this.page.locator('#mobileMenu.active');
  const count = await menu.count();
  expect(count).to.equal(1);
});

Then('I should see the Home link', async function () {
  const homeLink = await this.page.locator('.mobile-menu-links a:has-text("Home")');
  const count = await homeLink.count();
  expect(count).to.be.greaterThan(0);
});

Then('I should see the Products link', async function () {
  const productsLink = await this.page.locator('.mobile-menu-links a:has-text("Products")');
  const count = await productsLink.count();
  expect(count).to.be.greaterThan(0);
});

Then('I should see the About link', async function () {
  const aboutLink = await this.page.locator('.mobile-menu-links a:has-text("About")');
  const count = await aboutLink.count();
  expect(count).to.be.greaterThan(0);
});

When('I open the mobile menu', async function () {
  // Navigate to homepage if not already on a page
  const url = await this.page.url();
  if (!url || url === 'about:blank') {
    await this.page.goto('http://localhost:8080/');
    await this.page.waitForLoadState('networkidle');
  }
  await this.page.waitForSelector('.hamburger', { state: 'visible' });
  await this.page.click('.hamburger');
  await this.page.waitForTimeout(300);
});

When('I click outside the menu', async function () {
  // Click on the mobile menu backdrop (not the content)
  await this.page.evaluate(() => {
    const menu = document.getElementById('mobileMenu');
    menu.click();
  });
  await this.page.waitForTimeout(300);
});

Then('the mobile menu should close', async function () {
  const menu = await this.page.locator('#mobileMenu.active');
  const count = await menu.count();
  expect(count).to.equal(0);
});

When('I click the {string} link in the menu', async function (linkText) {
  await this.page.click(`.mobile-menu-links a:has-text("${linkText}")`);
  await this.page.waitForLoadState('networkidle');
});

When('I am on any page', async function () {
  await this.page.goto('http://localhost:8080/');
  await this.page.waitForLoadState('networkidle');
});

Then('the cart button should be visible', async function () {
  const cartButton = await this.page.locator('.cart-button');
  const isVisible = await cartButton.isVisible();
  expect(isVisible).to.equal(true);
});

Then('the cart count badge should be visible if items exist', async function () {
  const cart = await this.page.evaluate(() => {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  });

  const badge = await this.page.locator('.cart-count');
  const isVisible = await badge.isVisible();

  if (cart.length > 0) {
    expect(isVisible).to.equal(true);
  }
});

Then('the navigation layout should match', async function () {
  const hamburger = await this.page.locator('.hamburger');
  const isVisible = await hamburger.isVisible();
  expect(isVisible).to.equal(true);
});

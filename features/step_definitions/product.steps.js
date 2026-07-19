import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('I am on a product page', async function () {
  await this.page.goto('http://localhost:8080/products.html');
  await this.page.waitForLoadState('networkidle');
});

When('I view the purchasing options', async function () {
  await this.page.waitForSelector('.product-options');
});

Then('I should see a colour selection with {int} options', async function (count) {
  const colorOptions = await this.page.locator('select[name="color"] option');
  const allOptions = await colorOptions.all();
  // Filter out empty placeholder option
  const validOptions = [];
  for (const option of allOptions) {
    const value = await option.getAttribute('value');
    if (value && value !== '') {
      validOptions.push(option);
    }
  }
  expect(validOptions.length).to.equal(count);
});

Then('I should see a size selection with XS, S, and M options', async function () {
  const sizeOptions = await this.page.locator('select[name="size"] option');
  const sizes = await sizeOptions.allTextContents();
  const hasSizes = sizes.some(s => s.includes('XS')) &&
                   sizes.some(s => s.includes('S')) &&
                   sizes.some(s => s.includes('M'));
  expect(hasSizes).to.equal(true);
});

Then('I should see size measurements in cm and inches', async function () {
  const sizeText = await this.page.textContent('.size-guide, select[name="size"]');
  expect(sizeText).to.match(/cm/);
  expect(sizeText).to.match(/in|"/);
});

Then('I should see a free charm selector', async function () {
  const charmSelector = await this.page.locator('select[name="charm"], .charm-selector');
  const count = await charmSelector.count();
  expect(count).to.be.greaterThan(0);
});

When('I have not selected all required options', async function () {
  // Default state - nothing selected
});

Then('the {string} button should be disabled', async function (buttonText) {
  const button = await this.page.locator(`button:has-text("${buttonText}")`);
  const isDisabled = await button.isDisabled();
  expect(isDisabled).to.equal(true);
});

When('I select a colour', async function () {
  await this.page.selectOption('select[name="color"]', { index: 1 });
});

When('I select a size', async function () {
  await this.page.selectOption('select[name="size"]', { index: 1 });
});

When('I select a free charm', async function () {
  await this.page.selectOption('select[name="charm"]', { index: 1 });
});

Then('the {string} button should be enabled', async function (buttonText) {
  const button = await this.page.locator(`button:has-text("${buttonText}")`);
  const isDisabled = await button.isDisabled();
  expect(isDisabled).to.equal(false);
});

Given('I have selected a colour and free charm', async function () {
  await this.page.selectOption('select[name="color"]', { index: 1 });
  await this.page.selectOption('select[name="charm"]', { index: 1 });
});

When('I change the size selection', async function () {
  await this.page.selectOption('select[name="size"]', { index: 2 });
  await this.page.waitForTimeout(100);
});

Then('the displayed price should update accordingly', async function () {
  const priceText = await this.page.textContent('.product-price, .price-display');
  expect(priceText).to.match(/£\d+\.\d{2}/);
});

Given('I have selected a colour, size, and free charm', async function () {
  await this.page.selectOption('select[name="color"]', { index: 1 });
  await this.page.selectOption('select[name="size"]', { index: 1 });
  await this.page.selectOption('select[name="charm"]', { index: 1 });
});

When('I click the {string} button', async function (buttonText) {
  // Try to find either a button element or .remove link with this text
  const selector = `button:has-text("${buttonText}"), .remove:has-text("${buttonText}")`;
  await this.page.click(selector);
  await this.page.waitForTimeout(200);
});

Then('the item should be added to my cart', async function () {
  const cartItems = await this.page.evaluate(() => {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  });
  expect(cartItems.length).to.be.greaterThan(0);
});

Then('the cart count should increase', async function () {
  const cartCount = await this.page.textContent('.cart-count, .cart-badge');
  expect(parseInt(cartCount)).to.be.greaterThan(0);
});

When('I scroll below the primary selection area', async function () {
  await this.page.evaluate(() => window.scrollBy(0, 400));
});

Then('I should see an {string} section', async function (sectionName) {
  const section = await this.page.locator(`.extra-charms-section, :has-text("${sectionName}")`);
  const count = await section.count();
  expect(count).to.be.greaterThan(0);
});

Then('I should be able to select additional charms', async function () {
  const extraCharms = await this.page.locator('.extra-charm-option, .additional-charm');
  const count = await extraCharms.count();
  expect(count).to.be.greaterThan(0);
});

Given('a specific colour and size combination is out of stock', async function () {
  // Mock out of stock by injecting into page data
  await this.page.evaluate(() => {
    window.stockLevels = {
      'chilli-xs': 0
    };
  });
});

When('I select that combination', async function () {
  await this.page.selectOption('select[name="color"]', 'chilli');
  await this.page.selectOption('select[name="size"]', 'xs');
  await this.page.waitForTimeout(100);
});

Then('the variant selector should show {string}', async function (text) {
  const content = await this.page.textContent('body');
  expect(content).to.include(text);
});

Then('the {string} button should show {string}', async function (buttonName, buttonText) {
  const button = await this.page.locator('button');
  const text = await button.textContent();
  expect(text).to.include(buttonText);
});

Given('I am viewing the product page on a mobile device', async function () {
  await this.page.setViewportSize({ width: 375, height: 667 });
  await this.page.goto('http://localhost:8080/products.html');
  await this.page.waitForLoadState('networkidle');
});

Then('all selectors should be stacked vertically', async function () {
  const productOptions = await this.page.locator('.product-options');
  const display = await productOptions.evaluate(el => window.getComputedStyle(el).flexDirection);
  expect(display).to.match(/column/);
});

Then('all elements should be finger-tap friendly', async function () {
  const buttons = await this.page.locator('button, select');
  const firstButton = buttons.first();
  const height = await firstButton.evaluate(el => el.offsetHeight);
  expect(height).to.be.greaterThan(40);
});

Then('there should be no horizontal scrolling required', async function () {
  const scrollWidth = await this.page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await this.page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).to.be.lessThanOrEqual(clientWidth + 1);
});

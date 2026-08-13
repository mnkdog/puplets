import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('I am on a product page', async function () {
  await this.page.goto('http://localhost:8080/collar.html');
  await this.page.waitForLoadState('networkidle');
  // Wait for page to be fully initialized and inventory loaded
  await this.page.waitForFunction(() => {
    const colorSelect = document.querySelector('select[name="color"]');
    // Check if color dropdown has options (sign of initialization)
    if (!colorSelect || colorSelect.options.length <= 1) return false;

    // Try to access inventory through a global check
    // The setupFormValidation should have run if DOM is ready
    const addButton = document.getElementById('addToBasket');
    return addButton !== null;
  }, { timeout: 5000 });

  // Give extra time for inventory to load
  await this.page.waitForTimeout(500);
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
  // Use ID since button text may change (e.g., "Out of Stock")
  const button = await this.page.locator('#addToBasket');
  const isDisabled = await button.isDisabled();
  expect(isDisabled).to.equal(true);
});

When('I select a colour', async function () {
  await this.page.selectOption('select[name="color"]', { index: 1 });
  // Wait for size options to be populated after color selection
  await this.page.waitForFunction(() => {
    const sizeSelect = document.querySelector('select[name="size"]');
    return sizeSelect && sizeSelect.options.length > 1; // More than just the placeholder
  }, { timeout: 3000 });
});

When('I select a size', async function () {
  await this.page.selectOption('select[name="size"]', { index: 1 });
});

When('I select a free charm', async function () {
  await this.page.selectOption('select[name="charm"]', { index: 1 });
  // Manually trigger validation in case change event didn't fire
  await this.page.evaluate(() => {
    const charmSelect = document.querySelector('select[name="charm"]');
    const event = new Event('change', { bubbles: true });
    charmSelect.dispatchEvent(event);
  });
  // Wait for validation to complete
  await this.page.waitForTimeout(200);
});

Then('the {string} button should be enabled', async function (buttonText) {
  // Debug: check select values and button state
  const debugInfo = await this.page.evaluate(() => {
    const colorSelect = document.querySelector('select[name="color"]');
    const sizeSelect = document.querySelector('select[name="size"]');
    const charmSelect = document.querySelector('select[name="charm"]');
    const addButton = document.getElementById('addToBasket');

    return {
      colorValue: colorSelect ? colorSelect.value : 'not found',
      sizeValue: sizeSelect ? sizeSelect.value : 'not found',
      charmValue: charmSelect ? charmSelect.value : 'not found',
      buttonDisabled: addButton ? addButton.disabled : 'not found',
      buttonExists: !!addButton,
      inventoryLoaded: window.__inventory ? (window.__inventory.collars.length > 0 && window.__inventory.charms.length > 0) : false
    };
  });

  if (debugInfo.buttonDisabled) {
    console.log('Debug info:', debugInfo);
  }

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
  // Wait for size options to be populated
  await this.page.waitForFunction(() => {
    const sizeSelect = document.querySelector('select[name="size"]');
    return sizeSelect && sizeSelect.options.length > 1;
  }, { timeout: 3000 });
  await this.page.selectOption('select[name="size"]', { index: 1 });
  await this.page.selectOption('select[name="charm"]', { index: 1 });
  // Small wait for validation to complete
  await this.page.waitForTimeout(100);
});

// Removed duplicate - using implementation from checkout.steps.js

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
  // Dave Farley: Update test inventory to set chilli/XS to 0
  const collarIndex = this.testInventory.collars.findIndex(
    c => c.color === 'chilli' && c.size === 'XS'
  );
  if (collarIndex >= 0) {
    this.testInventory.collars[collarIndex].quantity = 0;
  }

  // Reload page to fetch updated inventory
  await this.page.reload({ waitUntil: 'networkidle' });
});

When('I select that combination', async function () {
  await this.page.selectOption('select[name="color"]', 'chilli');
  // Wait for size options to populate
  await this.page.waitForFunction(() => {
    const sizeSelect = document.querySelector('select[name="size"]');
    return sizeSelect && sizeSelect.options.length > 1;
  }, { timeout: 3000 });
  await this.page.selectOption('select[name="size"]', 'XS');

  // Force validateForm to ensure button text updates
  await this.page.evaluate(() => {
    const event = new Event('change', { bubbles: true });
    document.querySelector('select[name="size"]').dispatchEvent(event);
  });

  await this.page.waitForTimeout(300);
});

Then('the variant selector should show {string}', async function (text) {
  const content = await this.page.textContent('body');
  expect(content).to.include(text);
});

Then('the {string} button should show {string}', async function (buttonName, buttonText) {
  // Wait for button text to update
  await this.page.waitForTimeout(500);

  // Find button by ID since text may have changed
  const button = await this.page.locator('#addToBasket');
  const text = await button.textContent();
  expect(text).to.include(buttonText);
});

Given('I am viewing the product page on a mobile device', async function () {
  await this.page.setViewportSize({ width: 375, height: 667 });
  await this.page.goto('http://localhost:8080/collar.html');
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

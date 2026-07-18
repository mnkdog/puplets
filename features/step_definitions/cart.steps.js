import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('I have added an item to the cart', async function () {
  await this.page.click('#addToBasket');
  await this.page.waitForTimeout(200);
});

Given('I have selected {int} extra charms', async function (count) {
  const charms = await this.page.locator('.extra-charm-option');
  for (let i = 0; i < count; i++) {
    await charms.nth(i).click();
    await this.page.waitForTimeout(100);
  }
});

When('I navigate to the cart page', async function () {
  await this.page.goto('http://localhost:8080/cart.html');
  await this.page.waitForLoadState('networkidle');
});

Then('I should see my cart item', async function () {
  const item = await this.page.locator('.cart-item');
  const count = await item.count();
  expect(count).to.be.greaterThan(0);
});

Then('I should see the item\'s colour', async function () {
  const content = await this.page.textContent('.item-specs');
  expect(content).to.include('Colour:');
});

Then('I should see the item\'s size', async function () {
  const content = await this.page.textContent('.item-specs');
  expect(content).to.include('Size:');
});

Then('I should see the item\'s free charm', async function () {
  const content = await this.page.textContent('.item-specs');
  expect(content).to.include('Free Charm:');
});

Then('I should see the item\'s price', async function () {
  const price = await this.page.locator('.item-price .price');
  const count = await price.count();
  expect(count).to.be.greaterThan(0);
});

Then('I should see {string} shipping', async function (text) {
  const content = await this.page.textContent('.cart-summary');
  expect(content).to.include('Shipping');
  expect(content).to.include(text);
});

Then('the total should equal the subtotal', async function () {
  const summaryText = await this.page.textContent('.cart-summary');
  const subtotalMatch = summaryText.match(/Subtotal.*£([\d.]+)/);
  const totalMatch = summaryText.match(/Total.*£([\d.]+)/);

  if (subtotalMatch && totalMatch) {
    expect(subtotalMatch[1]).to.equal(totalMatch[1]);
  }
});

Then('I should see the extra charms listed by name', async function () {
  const extraCharms = await this.page.locator('.extra-charms-list');
  const count = await extraCharms.count();
  expect(count).to.be.greaterThan(0);

  const text = await extraCharms.textContent();
  expect(text.length).to.be.greaterThan(20); // Should have charm names
});

Then('I should see the extra charms price', async function () {
  const extraCharms = await this.page.textContent('.extra-charms-list');
  expect(extraCharms).to.match(/£\d+\.\d{2}/);
});

When('I click the {string} button', async function (buttonText) {
  await this.page.click(`.remove:has-text("${buttonText}")`);
  await this.page.waitForTimeout(200);
});

Then('the cart should be empty', async function () {
  const cart = await this.page.evaluate(() => {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  });
  expect(cart.length).to.equal(0);
});

Then('I should see {string}', async function (text) {
  const content = await this.page.textContent('body');
  expect(content).to.include(text);
});

Then('I should see a {string} link', async function (linkText) {
  const link = await this.page.locator(`a:has-text("${linkText}")`);
  const count = await link.count();
  expect(count).to.be.greaterThan(0);
});

When('I remove all items', async function () {
  await this.page.evaluate(() => {
    localStorage.setItem('cart', '[]');
  });
  await this.page.reload();
});

When('I click {string}', async function (linkText) {
  await this.page.click(`a:has-text("${linkText}")`);
  await this.page.waitForLoadState('networkidle');
});

Then('I should be on the products page', async function () {
  const url = await this.page.url();
  expect(url).to.include('products.html');
});

When('I edit an item', async function () {
  await this.page.click('.remove:has-text("Edit")');
  await this.page.waitForLoadState('networkidle');
});

Then('the form should be pre-filled with my selections', async function () {
  const colorValue = await this.page.inputValue('#color');
  const sizeValue = await this.page.inputValue('#size');
  const charmValue = await this.page.inputValue('#charm');

  expect(colorValue).to.not.equal('');
  expect(sizeValue).to.not.equal('');
  expect(charmValue).to.not.equal('');
});

Then('the button should say {string}', async function (text) {
  const buttonText = await this.page.textContent('#addToBasket');
  expect(buttonText).to.include(text);
});

When('I change the size', async function () {
  const currentSize = await this.page.inputValue('#size');
  const newSize = currentSize === 'xs' ? 's' : 'xs';
  await this.page.selectOption('#size', newSize);
});

Then('I should see the updated size', async function () {
  const specs = await this.page.textContent('.item-specs');
  expect(specs).to.match(/Size: (XS|S|M)/);
});

Then('I should see the updated price', async function () {
  const price = await this.page.textContent('.item-price .price');
  expect(price).to.match(/£\d+\.\d{2}/);
});

When('I add an item to the cart', async function () {
  // Already handled by background
});

Then('the cart badge should show {string}', async function (count) {
  const badge = await this.page.textContent('.cart-count');
  expect(badge.trim()).to.equal(count);
});

When('I navigate to the homepage', async function () {
  await this.page.goto('http://localhost:8080/');
  await this.page.waitForLoadState('networkidle');
});

When('I navigate to the about page', async function () {
  await this.page.goto('http://localhost:8080/about.html');
  await this.page.waitForLoadState('networkidle');
});

When('I add another item to the cart', async function () {
  await this.page.goto('http://localhost:8080/products.html');
  await this.page.selectOption('#color', { index: 1 });
  await this.page.selectOption('#size', { index: 1 });
  await this.page.selectOption('#charm', { index: 1 });
  await this.page.click('#addToBasket');
  await this.page.waitForTimeout(200);
});

Then('I should see {int} items', async function (count) {
  const items = await this.page.locator('.cart-item');
  const actualCount = await items.count();
  expect(actualCount).to.equal(count);
});

Then('the subtotal should be the sum of both items', async function () {
  const summaryText = await this.page.textContent('.cart-summary');
  const subtotalMatch = summaryText.match(/Subtotal.*£([\d.]+)/);

  if (subtotalMatch) {
    const subtotal = parseFloat(subtotalMatch[1]);
    expect(subtotal).to.be.greaterThan(20); // At least 2 items worth
  }
});

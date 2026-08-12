import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

Given('the inventory system is initialized', async function () {
  // Create test inventory data
  const inventoryData = {
    collars: [
      { color: 'chilli', size: 'XS', quantity: 1000 },
      { color: 'chilli', size: 'S', quantity: 1000 },
      { color: 'chilli', size: 'M', quantity: 0 },
      { color: 'ocean', size: 'XS', quantity: 1000 },
      { color: 'ocean', size: 'S', quantity: 10 },
      { color: 'ocean', size: 'M', quantity: 1000 },
      { color: 'fern', size: 'XS', quantity: 1000 },
      { color: 'fern', size: 'S', quantity: 1000 },
      { color: 'fern', size: 'M', quantity: 1000 }
    ],
    charms: [
      { name: 'White paw', quantity: 0 },
      { name: 'Black paw', quantity: 200 },
      { name: 'Bone', quantity: 50 },
      { name: 'Heart', quantity: 0 },
      { name: 'Star', quantity: 5 },
      { name: 'Rainbow', quantity: 200 },
      { name: 'Donut', quantity: 200 },
      { name: 'Pizza slice', quantity: 200 },
      { name: 'Taco', quantity: 200 },
      { name: 'Avocado', quantity: 200 },
      { name: 'Strawberry', quantity: 200 },
      { name: 'Watermelon', quantity: 200 },
      { name: 'Crown', quantity: 200 },
      { name: 'Diamond', quantity: 200 },
      { name: 'Butterfly', quantity: 200 },
      { name: 'Bee', quantity: 200 },
      { name: 'Ghost', quantity: 200 },
      { name: 'Lightning bolt', quantity: 200 },
      { name: 'Sun', quantity: 200 },
      { name: 'Moon', quantity: 200 }
    ]
  };

  // Write inventory file for testing
  const inventoryPath = path.join(process.cwd(), 'src/content/inventory.json');
  fs.writeFileSync(inventoryPath, JSON.stringify(inventoryData, null, 2));
});

Given('I am on the collar product page', async function () {
  await this.page.goto('http://localhost:8080/collar.html');
  await this.page.waitForLoadState('networkidle');
});

Given('I am on the charms page', async function () {
  await this.page.goto('http://localhost:8080/charms.html');
  await this.page.waitForLoadState('networkidle');
});

Given('the {string} collar variant has {int} in stock', async function (variant, quantity) {
  // Stock is already set in inventory initialization
  // This step is for clarity in the test
});

Given('the {string} charm has {int} in stock', async function (charmName, quantity) {
  // Stock is already set in inventory initialization
  // This step is for clarity in the test
});

When('I select color {string}', async function (color) {
  await this.page.selectOption('#color', color);
  await this.page.waitForTimeout(200);
});

When('I select size {string}', async function (size) {
  await this.page.selectOption('#size', size);
  await this.page.waitForTimeout(200);
});

When('I select charm {string}', async function (charm) {
  const charmSelect = await this.page.locator('#charm');
  const options = await charmSelect.locator('option').all();

  for (const option of options) {
    const text = await option.textContent();
    if (text.includes(charm)) {
      const value = await option.getAttribute('value');
      await this.page.selectOption('#charm', value);
      break;
    }
  }
  await this.page.waitForTimeout(200);
});

When('I select quantity {string}', async function (quantity) {
  await this.page.selectOption('#quantity', quantity);
  await this.page.waitForTimeout(200);
});

Then('the add to basket button should be enabled', async function () {
  const button = await this.page.locator('#addToBasket');
  const isDisabled = await button.isDisabled();
  expect(isDisabled).to.equal(false, 'Add to basket button should be enabled');
});

Then('the add to basket button should be disabled', async function () {
  const button = await this.page.locator('#addToBasket');
  const isDisabled = await button.isDisabled();
  expect(isDisabled).to.equal(true, 'Add to basket button should be disabled');
});

Then('I should see {string} message', async function (message) {
  const content = await this.page.textContent('body');
  expect(content.toLowerCase()).to.include(message.toLowerCase());
});

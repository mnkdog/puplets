import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('the inventory system is initialized', async function () {
  // Dave Farley approach: Set specific test inventory for this scenario
  // Mock handles the rest - no file writes
  this.testInventory = {
    collars: [
      { color: 'chilli', size: 'xs', quantity: 1000 },
      { color: 'chilli', size: 's', quantity: 1000 },
      { color: 'chilli', size: 'm', quantity: 0 },
      { color: 'ocean', size: 'xs', quantity: 1000 },
      { color: 'ocean', size: 's', quantity: 10 },
      { color: 'ocean', size: 'm', quantity: 1000 },
      { color: 'fern', size: 'xs', quantity: 1000 },
      { color: 'fern', size: 's', quantity: 1000 },
      { color: 'fern', size: 'm', quantity: 1000 }
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
});

Given('I am on the collar product page', async function () {
  await this.page.goto('http://localhost:8080/collar.html');
  await this.page.waitForLoadState('networkidle');
});

Given('the {string} collar variant has {int} in stock', async function (variant, quantity) {
  // Parse variant (e.g., "ocean/S" -> color: ocean, size: S)
  const [color, size] = variant.split('/');

  // Update test inventory for this specific variant
  const collarIndex = this.testInventory.collars.findIndex(
    c => c.color === color && c.size === size
  );

  if (collarIndex >= 0) {
    this.testInventory.collars[collarIndex].quantity = quantity;
  } else {
    this.testInventory.collars.push({ color, size, quantity });
  }
});

Given('the {string} charm has {int} in stock', async function (charmName, quantity) {
  // Update test inventory for this specific charm
  const charmIndex = this.testInventory.charms.findIndex(
    c => c.name === charmName
  );

  if (charmIndex >= 0) {
    this.testInventory.charms[charmIndex].quantity = quantity;
  } else {
    this.testInventory.charms.push({ name: charmName, quantity });
  }
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

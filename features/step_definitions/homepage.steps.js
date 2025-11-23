import { Given, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('I am on the homepage', async function () {
  await this.page.goto('http://localhost:8080');
});

Then('I should see the text {string}', async function (text) {
  const content = await this.page.textContent('body');
  expect(content).to.include(text);
});

Then('I should see a link to the online store', async function () {
  const storeLink = await this.page.locator('a[href*="store"]');
  const count = await storeLink.count();
  expect(count).to.be.greaterThan(0, 'No link to online store found');
});

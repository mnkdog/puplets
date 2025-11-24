import { Given, Then } from '@cucumber/cucumber';
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

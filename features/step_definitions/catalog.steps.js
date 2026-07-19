import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('I am on the products catalog page', async function () {
  await this.page.goto('http://localhost:8080/products.html');
  await this.page.waitForLoadState('networkidle');
});

Then('I should be on the products catalog page', async function () {
  const url = await this.page.url();
  expect(url).to.include('products.html');
});

Then('I should see a {string} product card', async function (productName) {
  const card = await this.page.locator(`.product-card:has-text("${productName}")`);
  const count = await card.count();
  expect(count).to.be.greaterThan(0, `Product card "${productName}" not found`);
});

Then('each product card should have an image', async function () {
  const images = await this.page.locator('.product-card img');
  const count = await images.count();
  expect(count).to.be.greaterThan(1, 'Expected at least 2 product images');
});

Then('each product card should have a {string} link', async function (linkText) {
  const links = await this.page.locator(`.product-card a:has-text("${linkText}")`);
  const count = await links.count();
  expect(count).to.be.greaterThan(1, `Expected at least 2 "${linkText}" links`);
});

When('I click {string} on the collars card', async function (linkText) {
  const collarsCard = await this.page.locator('.product-card:has-text("Collars")');
  await collarsCard.locator(`a:has-text("${linkText}")`).click();
  await this.page.waitForLoadState('networkidle');
});

When('I click {string} on the charms card', async function (linkText) {
  const charmsCard = await this.page.locator('.product-card:has-text("Individual Charms")');
  await charmsCard.locator(`a:has-text("${linkText}")`).first().click();
  await this.page.waitForLoadState('networkidle');
});

Then('I should be on the collar detail page', async function () {
  const url = await this.page.url();
  expect(url).to.include('collar.html');
});

Then('I should be on the charms detail page', async function () {
  const url = await this.page.url();
  expect(url).to.include('charms.html');
});

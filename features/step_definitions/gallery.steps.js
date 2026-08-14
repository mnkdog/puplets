import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Then('I should see the main product image', async function () {
  const mainImage = await this.page.locator('#mainImage');
  const count = await mainImage.count();
  expect(count).to.equal(1);
});

Then('I should see thumbnail images', async function () {
  const thumbnails = await this.page.locator('.thumbnail');
  const count = await thumbnails.count();
  expect(count).to.be.greaterThan(3);
});

When('I click on a thumbnail image', async function () {
  const thumbnail = await this.page.locator('.thumbnail').nth(1);
  this.selectedThumbnailSrc = await thumbnail.getAttribute('data-src') || await thumbnail.getAttribute('src');
  const currentSrc = await this.page.getAttribute('#mainImage', 'src');
  await thumbnail.click();
  // Wait for main image src to change
  await this.page.waitForFunction((oldSrc) => {
    const mainImage = document.getElementById('mainImage');
    return mainImage && mainImage.src !== oldSrc;
  }, currentSrc, { timeout: 5000 });
});

Then('the main image should change to that thumbnail', async function () {
  const mainImageSrc = await this.page.getAttribute('#mainImage', 'src');
  expect(mainImageSrc).to.equal(this.selectedThumbnailSrc);
});

Then('the clicked thumbnail should be highlighted', async function () {
  const activeThumbnail = await this.page.locator('.thumbnail.active');
  const count = await activeThumbnail.count();
  expect(count).to.equal(1);
});

When('I click the next arrow', async function () {
  const currentSrc = await this.page.getAttribute('#mainImage', 'src');
  await this.page.click('.image-nav.next');
  // Wait for image to change
  await this.page.waitForFunction((oldSrc) => {
    const mainImage = document.getElementById('mainImage');
    return mainImage && mainImage.src !== oldSrc;
  }, currentSrc, { timeout: 2000 });
});

Then('the main image should change to the next image', async function () {
  const mainImageSrc = await this.page.getAttribute('#mainImage', 'src');
  expect(mainImageSrc).to.be.a('string');
  expect(mainImageSrc.length).to.be.greaterThan(0);
});

When('I click the previous arrow', async function () {
  const currentSrc = await this.page.getAttribute('#mainImage', 'src');
  await this.page.click('.image-nav.prev');
  // Wait for image to change
  await this.page.waitForFunction((oldSrc) => {
    const mainImage = document.getElementById('mainImage');
    return mainImage && mainImage.src !== oldSrc;
  }, currentSrc, { timeout: 2000 });
});

Then('the main image should change to the previous image', async function () {
  const mainImageSrc = await this.page.getAttribute('#mainImage', 'src');
  expect(mainImageSrc).to.be.a('string');
  expect(mainImageSrc.length).to.be.greaterThan(0);
});

When('I click on the main image', async function () {
  await this.page.click('#mainImage');
  // Wait for lightbox to open
  await this.page.waitForSelector('#lightbox.active', { state: 'visible', timeout: 3000 });
});

Then('a lightbox should open', async function () {
  const lightbox = await this.page.locator('#lightbox.active');
  const count = await lightbox.count();
  expect(count).to.equal(1);
});

Then('the lightbox should show the enlarged image', async function () {
  const lightboxImage = await this.page.locator('#lightboxImage');
  const src = await lightboxImage.getAttribute('src');
  expect(src).to.be.a('string');
  expect(src.length).to.be.greaterThan(0);
});

When('I open the lightbox', async function () {
  await this.page.click('#mainImage');
  // Wait for lightbox to open
  await this.page.waitForSelector('#lightbox.active', { state: 'visible', timeout: 3000 });
});

When('I click outside the image', async function () {
  await this.page.click('#lightbox');
  // Wait for lightbox to close
  await this.page.waitForFunction(() => {
    const lightbox = document.getElementById('lightbox');
    return !lightbox || !lightbox.classList.contains('active');
  }, { timeout: 3000 });
});

Then('the lightbox should close', async function () {
  const lightbox = await this.page.locator('#lightbox.active');
  const count = await lightbox.count();
  expect(count).to.equal(0);
});

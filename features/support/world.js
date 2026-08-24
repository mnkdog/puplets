import { setWorldConstructor, World } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.browser = null;
    this.context = null;
    this.page = null;
    this.testInventory = this.getDefaultInventory();
  }

  getDefaultInventory() {
    return {
      collars: [
        { color: 'chilli', size: 'xs', quantity: 1000 },
        { color: 'chilli', size: 's', quantity: 1000 },
        { color: 'chilli', size: 'm', quantity: 1000 },
        { color: 'ocean', size: 'xs', quantity: 1000 },
        { color: 'ocean', size: 's', quantity: 1000 },
        { color: 'ocean', size: 'm', quantity: 1000 },
        { color: 'fern', size: 'xs', quantity: 1000 },
        { color: 'fern', size: 's', quantity: 1000 },
        { color: 'fern', size: 'm', quantity: 1000 }
      ],
      charms: [
        { name: 'White paw', quantity: 200 },
        { name: 'Black paw', quantity: 200 },
        { name: 'Bone', quantity: 200 },
        { name: 'Heart', quantity: 200 },
        { name: 'Star', quantity: 200 },
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
  }

  async openBrowser() {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext({
      baseURL: 'http://localhost:8080'
    });
    this.page = await this.context.newPage();
    // Set 8s timeout for page operations
    this.page.setDefaultTimeout(8000);

    // Dave Farley approach: Mock all external data - no file writes

    // Mock inventory API - use arrow function to capture 'this' and evaluate testInventory at request time
    await this.page.route('**/content/inventory.json', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(this.testInventory)
      });
    });

    // Mock about page content - default to published
    this.aboutPagePublished = true;
    await this.page.route('**/content/about.md', route => {
      const aboutContent = `---
published: ${this.aboutPagePublished}
title: About Puplets
heading: A Future Vet's Mission
image: ""
---
## Our Story

Puplets was founded by a passionate veterinary student who has worked at Colchester Zoo and dog kennels.`;

      route.fulfill({
        status: 200,
        contentType: 'text/markdown',
        body: aboutContent
      });
    });
  }

  async closeBrowser() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }
}

setWorldConstructor(CustomWorld);

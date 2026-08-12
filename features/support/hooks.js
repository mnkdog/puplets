import { Before, After, setDefaultTimeout } from '@cucumber/cucumber';

// Set default timeout for all steps to 10 seconds
setDefaultTimeout(10000);

Before(async function () {
  await this.openBrowser();
});

After(async function () {
  await this.closeBrowser();
});

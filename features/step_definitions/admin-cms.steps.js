const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

When('I navigate to {string}', async function (path) {
  await this.page.goto(`${this.baseUrl}${path}`);
  this.currentPath = path;
});

Then('there should be no Content-Security-Policy violations in the console', async function () {
  // Listen for console errors
  const consoleErrors = [];
  this.page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Wait a bit for any CSP errors to appear
  await this.page.waitForTimeout(2000);

  // Check for CSP violations
  const cspViolations = consoleErrors.filter(err =>
    err.includes('Content-Security-Policy') ||
    err.includes('EvalError') ||
    err.includes('unsafe-eval')
  );

  if (cspViolations.length > 0) {
    throw new Error(`CSP violations found:\n${cspViolations.join('\n')}`);
  }
});

Then('the Decap CMS should initialize', async function () {
  // Wait for CMS to be available on window
  await this.page.waitForFunction(() => {
    return window.CMS !== undefined;
  }, { timeout: 10000 });

  const cmsLoaded = await this.page.evaluate(() => {
    return typeof window.CMS !== 'undefined';
  });

  expect(cmsLoaded).to.be.true;
});

When('I request the admin page', async function () {
  this.response = await this.page.goto(`${this.baseUrl}/admin/`);
});

Then('the CSP should allow unsafe-eval for CMS configuration', async function () {
  const headers = await this.response.headers();
  const csp = headers['content-security-policy'];

  expect(csp).to.exist;
  expect(csp).to.include("'unsafe-eval'");
});

Then('the CSP should allow connects to api.github.com', async function () {
  const headers = await this.response.headers();
  const csp = headers['content-security-policy'];

  expect(csp).to.exist;
  expect(csp).to.include('api.github.com');
});

Then('it should be configured for GitHub backend', async function () {
  const config = await this.page.evaluate(() => {
    // Access the CMS config that was passed to CMS.init()
    return window.CMS?._config?.backend;
  });

  expect(config).to.exist;
  expect(config.name).to.equal('github');
});

Then('it should point to the correct repository', async function () {
  const config = await this.page.evaluate(() => {
    return window.CMS?._config?.backend;
  });

  expect(config.repo).to.equal('mnkdog/puplets');
  expect(config.branch).to.equal('main');
});

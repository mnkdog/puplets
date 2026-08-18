import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('the admin CMS interface is available', function () {
  // Precondition: admin interface exists (verified by navigation in When step)
});

Given('the site is deployed to Vercel', function () {
  // Precondition: vercel.json configuration exists (verified in When step)
});

When('I navigate to {string}', async function (path) {
  const response = await this.page.goto(`http://localhost:8080${path}`);
  this.response = response;
  this.currentPath = path;
});

Then('the page should load successfully', async function () {
  // Verify HTTP response was successful
  expect(this.response.ok()).to.equal(true, `Expected successful response but got ${this.response.status()}`);

  // Verify page loaded and has expected URL
  expect(this.page.url()).to.include(this.currentPath);

  // Verify page has a non-empty title
  const title = await this.page.title();
  expect(title).to.be.a('string').and.not.equal('', 'Page title should not be empty');
});

Then('the page should include the Decap CMS script', async function () {
  const hasCMSScript = await this.page.evaluate(() => {
    const scripts = Array.from(document.getElementsByTagName('script'));
    return scripts.some(s =>
      s.src && s.src.includes('decap-cms')
    );
  });

  expect(hasCMSScript).to.be.true;
});

Then('the page should have CMS configuration', async function () {
  const hasConfig = await this.page.evaluate(() => {
    const scripts = Array.from(document.getElementsByTagName('script'));
    return scripts.some(s =>
      s.textContent && s.textContent.includes('CMS.init')
    );
  });

  expect(hasConfig).to.be.true;
});

Then('the CMS should be configured for GitHub backend', async function () {
  const hasGitHubBackend = await this.page.evaluate(() => {
    const scripts = Array.from(document.getElementsByTagName('script'));
    const initScript = scripts.find(s => s.textContent && s.textContent.includes('CMS.init'));
    return initScript && initScript.textContent.includes("name: 'github'");
  });

  expect(hasGitHubBackend).to.be.true;
});

Then('the CMS should point to mnkdog\\/puplets repository', async function () {
  const hasCorrectRepo = await this.page.evaluate(() => {
    const scripts = Array.from(document.getElementsByTagName('script'));
    const initScript = scripts.find(s => s.textContent && s.textContent.includes('CMS.init'));
    return initScript && initScript.textContent.includes("repo: 'mnkdog/puplets'");
  });

  expect(hasCorrectRepo).to.be.true;
});

Then('the CMS should use the main branch', async function () {
  const hasMainBranch = await this.page.evaluate(() => {
    const scripts = Array.from(document.getElementsByTagName('script'));
    const initScript = scripts.find(s => s.textContent && s.textContent.includes('CMS.init'));
    return initScript && initScript.textContent.includes("branch: 'main'");
  });

  expect(hasMainBranch).to.be.true;
});

// Production-only tests (marked with @vercel-only tag)
// These verify vercel.json config since CSP headers don't apply in local dev
When('I request the admin page in production', async function () {
  // In local dev, verify the vercel.json config instead of runtime headers
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile('vercel.json', 'utf-8'));
  this.adminHeaders = vercelConfig.headers.find(h => h.source === '/admin/(.*)')?.headers;
  expect(this.adminHeaders).to.exist;
});

Then('the admin CSP should allow scripts from cdn.jsdelivr.net', async function () {
  const cspHeader = this.adminHeaders?.find(h => h.key === 'Content-Security-Policy');
  expect(cspHeader).to.exist;
  expect(cspHeader.value).to.include('https://cdn.jsdelivr.net');
});

Then('the CSP should allow unsafe-eval for CMS configuration', async function () {
  const cspHeader = this.adminHeaders?.find(h => h.key === 'Content-Security-Policy');
  expect(cspHeader).to.exist;
  expect(cspHeader.value).to.include("'unsafe-eval'");
});

Then('the CSP should allow connects to api.github.com', async function () {
  const cspHeader = this.adminHeaders?.find(h => h.key === 'Content-Security-Policy');
  expect(cspHeader).to.exist;
  expect(cspHeader.value).to.include('https://api.github.com');
});

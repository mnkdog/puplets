import { When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

When('I navigate to {string}', async function (path) {
  await this.page.goto(`http://localhost:8080${path}`);
  this.currentPath = path;
});

Then('the page should load successfully', async function () {
  // Verify page loaded and has expected URL
  expect(this.page.url()).to.include(this.currentPath);

  // Verify page has a title
  const title = await this.page.title();
  expect(title).to.exist;
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
When('I request the admin page in production', async function () {
  // This would only work in production/Vercel environment
  // In local dev, CSP headers from vercel.json aren't applied
  return 'pending';
});

Then('the CSP should allow unsafe-eval for CMS configuration', async function () {
  // Vercel-only test - CSP headers only apply in production
  return 'pending';
});

Then('the CSP should allow connects to api.github.com', async function () {
  // Vercel-only test - CSP headers only apply in production
  return 'pending';
});

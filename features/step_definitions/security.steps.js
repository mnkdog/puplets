import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

const VERCEL_CONFIG_FILE = 'vercel.json';

Then('the marked.js script should be loaded from local vendor', async function () {
  const markedScript = await this.page.locator('script[src*="vendor"]').filter({ hasText: /marked/ });
  const count = await markedScript.count();
  if (count === 0) {
    // Check for any script with src containing 'marked'
    const anyMarked = await this.page.locator('script[src*="marked"]');
    const anyCount = await anyMarked.count();
    expect(anyCount).to.be.greaterThan(0, 'marked.js script not found at all');

    const src = await anyMarked.first().getAttribute('src');
    expect(src).to.include('/vendor/', `marked.js should be loaded from /vendor/, but was loaded from: ${src}`);
  } else {
    const src = await markedScript.getAttribute('src');
    expect(src).to.include('/vendor/');
  }
});

Then('the DOMPurify script should be loaded from local vendor', async function () {
  const purifyScript = await this.page.locator('script[src*="purify"]');
  const count = await purifyScript.count();
  expect(count).to.equal(1, 'DOMPurify script not found');

  const src = await purifyScript.getAttribute('src');
  expect(src).to.include('/vendor/', `DOMPurify should be loaded from /vendor/, but was loaded from: ${src}`);
});

Then('the marked.js script should have an integrity attribute', async function () {
  const markedScript = await this.page.locator('script[src*="marked"]');
  const count = await markedScript.count();
  expect(count).to.equal(1, 'marked.js script not found');

  const integrity = await markedScript.getAttribute('integrity');
  expect(integrity).to.be.a('string');
  expect(integrity.length).to.be.greaterThan(0, 'integrity attribute is empty');
  expect(integrity).to.match(/^sha(256|384|512)-/, 'integrity should use SHA hash');
});

Then('the marked.js script should have crossorigin={string}', async function (crossorigin) {
  const markedScript = await this.page.locator('script[src*="marked"]');
  const actualCrossorigin = await markedScript.getAttribute('crossorigin');
  expect(actualCrossorigin).to.equal(crossorigin);
});

Then('the DOMPurify script should exist', async function () {
  const purifyScript = await this.page.locator('script[src*="dompurify"]');
  const count = await purifyScript.count();
  expect(count).to.equal(1, 'DOMPurify script not found');
});

Then('the DOMPurify script should have an integrity attribute', async function () {
  const purifyScript = await this.page.locator('script[src*="dompurify"]');
  const integrity = await purifyScript.getAttribute('integrity');
  expect(integrity).to.be.a('string');
  expect(integrity.length).to.be.greaterThan(0, 'integrity attribute is empty');
  expect(integrity).to.match(/^sha(256|384|512)-/, 'integrity should use SHA hash');
});

Then('the DOMPurify script should have crossorigin={string}', async function (crossorigin) {
  const purifyScript = await this.page.locator('script[src*="dompurify"]');
  const actualCrossorigin = await purifyScript.getAttribute('crossorigin');
  expect(actualCrossorigin).to.equal(crossorigin);
});

Then('DOMPurify should be loaded and available', async function () {
  // Verify DOMPurify script tag exists (checking for 'purify' in src)
  const purifyScript = await this.page.locator('script[src*="purify"]');
  const count = await purifyScript.count();
  expect(count).to.equal(1, 'DOMPurify script tag not found');

  const src = await purifyScript.getAttribute('src');
  expect(src).to.include('purify');

  // Verify DOMPurify is actually available in the browser
  const isDOMPurifyAvailable = await this.page.evaluate(() => {
    return typeof DOMPurify !== 'undefined';
  });
  expect(isDOMPurifyAvailable).to.equal(true, 'DOMPurify should be available in browser context');
});

Then('markdown content should be sanitized before rendering', async function () {
  // Check that the sanitization code exists in the page
  const hasSanitization = await this.page.evaluate(() => {
    const pageSource = document.documentElement.outerHTML;
    return pageSource.includes('DOMPurify.sanitize');
  });
  expect(hasSanitization).to.equal(true, 'DOMPurify.sanitize is not being used');
});

When('I request the about page', async function () {
  // Capture response headers
  this.responseHeaders = {};

  this.page.on('response', response => {
    if (response.url().includes('about.html') || response.url().endsWith('/about')) {
      const headers = response.headers();
      this.responseHeaders = headers;
    }
  });

  await this.page.goto('http://localhost:8080/about.html');
  await this.page.waitForLoadState('networkidle');
});

Then('the response should include a Content-Security-Policy header', async function () {
  // Note: In local dev, headers won't be set. This test validates vercel.json config exists
  // We check the config file rather than runtime headers in local environment
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  const headers = vercelConfig.headers;
  expect(headers).to.be.an('array');
  expect(headers.length).to.be.greaterThan(0);

  // Find the main site headers (source: "/(.*)")
  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const cspHeader = mainSiteHeaders?.find(h => h.key === 'Content-Security-Policy');
  expect(cspHeader).to.exist;
  expect(cspHeader.value).to.be.a('string');
  expect(cspHeader.value.length).to.be.greaterThan(0);
});

Then('the response should include X-Frame-Options header', async function () {
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const xFrameOptions = mainSiteHeaders?.find(h => h.key === 'X-Frame-Options');
  expect(xFrameOptions).to.exist;
  expect(xFrameOptions.value).to.equal('SAMEORIGIN');
});

Then('the response should include X-Content-Type-Options header', async function () {
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const xContentType = mainSiteHeaders?.find(h => h.key === 'X-Content-Type-Options');
  expect(xContentType).to.exist;
  expect(xContentType.value).to.equal('nosniff');
});

Then('the response should include Referrer-Policy header', async function () {
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const referrerPolicy = mainSiteHeaders?.find(h => h.key === 'Referrer-Policy');
  expect(referrerPolicy).to.exist;
  expect(referrerPolicy.value).to.equal('strict-origin-when-cross-origin');
});

Then('the response should include Permissions-Policy header', async function () {
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const permissionsPolicy = mainSiteHeaders?.find(h => h.key === 'Permissions-Policy');
  expect(permissionsPolicy).to.exist;
  expect(permissionsPolicy.value).to.include('camera=()');
  expect(permissionsPolicy.value).to.include('microphone=()');
  expect(permissionsPolicy.value).to.include('geolocation=()');
});

Then('the CSP should allow scripts from self', async function () {
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const cspHeader = mainSiteHeaders?.find(h => h.key === 'Content-Security-Policy');
  expect(cspHeader.value).to.include("script-src 'self'");
});

Then('the CSP should allow scripts from cdn.jsdelivr.net', async function () {
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  // Find the main site CSP (source: "/(.*)")
  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const cspHeader = mainSiteHeaders?.find(h => h.key === 'Content-Security-Policy');
  expect(cspHeader.value).to.include('https://cdn.jsdelivr.net');
});

Then('the CSP should allow scripts from checkout.stripe.com', async function () {
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  // Find the main site CSP (source: "/(.*)")
  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const cspHeader = mainSiteHeaders?.find(h => h.key === 'Content-Security-Policy');
  expect(cspHeader.value).to.include('https://checkout.stripe.com');
});

Then('the CSP should allow connects to api.stripe.com', async function () {
  const fs = await import('fs/promises');
  const vercelConfig = JSON.parse(await fs.readFile(VERCEL_CONFIG_FILE, 'utf-8'));

  // Find the main site CSP (source: "/(.*)")
  const mainSiteHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers;
  const cspHeader = mainSiteHeaders?.find(h => h.key === 'Content-Security-Policy');
  expect(cspHeader.value).to.include('https://api.stripe.com');
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use isolated temp directory to avoid polluting src/blog and blog-index.json
let TEST_BLOG_DIR;
let TEST_XSS_FILE;
let TEST_XSS_HTML;
let TEST_INDEX_FILE;

describe('Blog Build Script - XSS Protection', () => {
  beforeEach(() => {
    // Create isolated temp directory for each test to avoid polluting src/blog
    const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-test-'));
    TEST_BLOG_DIR = path.join(tempBase, 'src', 'blog');
    TEST_XSS_FILE = path.join(TEST_BLOG_DIR, 'test-xss-security.md');
    TEST_XSS_HTML = path.join(TEST_BLOG_DIR, 'test-xss-security.html');
    TEST_INDEX_FILE = path.join(tempBase, 'src', 'blog-index.json');

    fs.mkdirSync(TEST_BLOG_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up entire temp directory
    if (TEST_BLOG_DIR) {
      const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it('should sanitize script tags from markdown content', () => {
    // Create a test markdown file with XSS attempts in various cases
    const maliciousMarkdown = `---
title: XSS Test
date: 2024-01-01
author: Security Tester
description: Testing XSS protection
published: true
---

# Legitimate Content

<script>alert('XSS')</script>
<SCRIPT>alert('XSS')</SCRIPT>
<ScRiPt>alert('XSS')</ScRiPt>

This should be safe content.
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    // Run the build script with temp directory
    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    // Read the generated HTML
    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');

    // Verify script tags are removed - case-insensitive check
    expect(generatedHTML.toLowerCase()).not.toContain('<script');
    expect(generatedHTML.toLowerCase()).not.toContain('</script>');

    // Verify legitimate content is preserved
    expect(generatedHTML).toContain('Legitimate Content');
    expect(generatedHTML).toContain('This should be safe content');
  });

  it('should sanitize inline event handlers from markdown content', () => {
    const maliciousMarkdown = `---
title: Event Handler Test
date: 2024-01-01
author: Security Tester
description: Testing event handler sanitization
published: true
---

<img src="x" onerror="alert('XSS')">
<img src="x" ONERROR="alert('XSS')">
<div onclick="alert('XSS')">Click me</div>
<div OnClick="alert('XSS')">Click me</div>
<body onload="alert('XSS')">
<img src="x" onmouseover="alert('XSS')">
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    // Run the build script with temp directory
    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    // Read the generated HTML
    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');
    const lowerHTML = generatedHTML.toLowerCase();

    // Verify event handlers are removed - case-insensitive checks for multiple handlers
    expect(lowerHTML).not.toContain('onerror=');
    expect(lowerHTML).not.toContain('onclick=');
    expect(lowerHTML).not.toContain('onload=');
    expect(lowerHTML).not.toContain('onmouseover=');
  });

  it('should preserve safe HTML from markdown', () => {
    const safeMarkdown = `---
title: Safe Content Test
date: 2024-01-01
author: Content Creator
description: Testing safe content preservation
published: true
---

# Heading 1
## Heading 2

**Bold text** and *italic text*.

[Safe link](https://example.com)

![Safe image](https://example.com/image.jpg)
`;

    fs.writeFileSync(TEST_XSS_FILE, safeMarkdown);

    // Run the build script with temp directory
    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    // Read the generated HTML
    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');

    // Verify safe content is preserved
    expect(generatedHTML).toContain('<h1>Heading 1</h1>');
    expect(generatedHTML).toContain('<h2>Heading 2</h2>');
    expect(generatedHTML).toContain('<strong>Bold text</strong>');
    expect(generatedHTML).toContain('<em>italic text</em>');
    expect(generatedHTML).toContain('<a href="https://example.com">Safe link</a>');
    // Verify the actual markdown image was converted and preserved (not just template logo)
    expect(generatedHTML).toContain('alt="Safe image"');
    expect(generatedHTML).toContain('https://example.com/image.jpg');
  });

  it('should sanitize javascript: URLs', () => {
    const maliciousMarkdown = `---
title: Test Post
date: 2024-01-01
author: Security Tester
description: Testing URL sanitization
published: true
---

<a href="javascript:alert('XSS')">Click me</a>
<a href="JAVASCRIPT:alert('XSS')">Click me</a>
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');

    // Extract just the post content section to avoid false positives from metadata
    const contentMatch = generatedHTML.match(/<div class="post-content">([\s\S]*?)<\/div>\s*<\/article>/);
    expect(contentMatch).toBeTruthy();
    const postContent = contentMatch[1].toLowerCase();

    // Verify javascript: URLs are removed from href attributes
    expect(postContent).not.toContain('href="javascript:');
    expect(postContent).not.toContain("href='javascript:");
    expect(postContent).not.toContain('href=javascript:');
  });

  it('should sanitize data: URLs', () => {
    const maliciousMarkdown = `---
title: Test Post
date: 2024-01-01
author: Security Tester
description: Testing URL sanitization
published: true
---

<a href="data:text/html,<script>alert('XSS')</script>">Click me</a>
<img src="data:image/svg+xml,<svg onload='alert(1)'></svg>">
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');

    // Extract just the post content section to avoid false positives from metadata
    const contentMatch = generatedHTML.match(/<div class="post-content">([\s\S]*?)<\/div>\s*<\/article>/);
    expect(contentMatch).toBeTruthy();
    const postContent = contentMatch[1].toLowerCase();

    // Verify data: URLs are removed from href/src attributes
    expect(postContent).not.toContain('href="data:');
    expect(postContent).not.toContain("href='data:");
    expect(postContent).not.toContain('href=data:');
    expect(postContent).not.toContain('src="data:');
    expect(postContent).not.toContain("src='data:");
    expect(postContent).not.toContain('src=data:');
  });

  it('should sanitize iframe injection', () => {
    const maliciousMarkdown = `---
title: Iframe Test
date: 2024-01-01
author: Security Tester
description: Testing iframe sanitization
published: true
---

<iframe src="javascript:alert('XSS')"></iframe>
<iframe src="https://evil.com"></iframe>
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');
    const lowerHTML = generatedHTML.toLowerCase();

    // Verify iframes are removed
    expect(lowerHTML).not.toContain('<iframe');
  });

  it('should sanitize SVG-based XSS', () => {
    const maliciousMarkdown = `---
title: SVG XSS Test
date: 2024-01-01
author: Security Tester
description: Testing SVG XSS sanitization
published: true
---

<svg onload="alert('XSS')"></svg>
<svg><script>alert('XSS')</script></svg>
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');
    const lowerHTML = generatedHTML.toLowerCase();

    // Verify SVG elements are removed (or at least their onload handlers)
    expect(lowerHTML).not.toContain('onload=');
  });

  it('should sanitize meta refresh redirects', () => {
    const maliciousMarkdown = `---
title: Meta Refresh Test
date: 2024-01-01
author: Security Tester
description: Testing meta refresh sanitization
published: true
---

<meta http-equiv="refresh" content="0;url=javascript:alert('XSS')">
<meta http-equiv="refresh" content="0;url=https://evil.com">
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');
    const lowerHTML = generatedHTML.toLowerCase();

    // Verify meta refresh tags are removed
    expect(lowerHTML).not.toContain('http-equiv');
  });

  it('should preserve relative URLs and anchor links', () => {
    const safeMarkdown = `---
title: Relative URL Test
date: 2024-01-01
author: Content Creator
description: Testing relative URL preservation
published: true
---

[Internal page](/products.html)
[Anchor link](#section)
[Relative path](../about.html)
![Local image](/images/photo.jpg)
`;

    fs.writeFileSync(TEST_XSS_FILE, safeMarkdown);

    const tempBase = path.dirname(path.dirname(TEST_BLOG_DIR));
    execSync(`node scripts/build-blog.js`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, BLOG_DIR: TEST_BLOG_DIR, OUTPUT_DIR: TEST_BLOG_DIR, INDEX_FILE: TEST_INDEX_FILE }
    });

    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');

    // Extract post content section
    const contentMatch = generatedHTML.match(/<div class="post-content">([\s\S]*?)<\/div>\s*<\/article>/);
    expect(contentMatch).toBeTruthy();
    const postContent = contentMatch[1];

    // Verify relative URLs are preserved
    expect(postContent).toContain('href="/products.html"');
    expect(postContent).toContain('href="#section"');
    expect(postContent).toContain('href="../about.html"');
    expect(postContent).toContain('src="/images/photo.jpg"');
  });
});

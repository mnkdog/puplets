import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_BLOG_DIR = path.join(__dirname, '../src/blog');
const TEST_XSS_FILE = path.join(TEST_BLOG_DIR, 'test-xss-security.md');
const TEST_XSS_HTML = path.join(TEST_BLOG_DIR, 'test-xss-security.html');

describe('Blog Build Script - XSS Protection', () => {
  beforeEach(() => {
    // Ensure blog directory exists
    if (!fs.existsSync(TEST_BLOG_DIR)) {
      fs.mkdirSync(TEST_BLOG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_XSS_FILE)) {
      fs.unlinkSync(TEST_XSS_FILE);
    }
    if (fs.existsSync(TEST_XSS_HTML)) {
      fs.unlinkSync(TEST_XSS_HTML);
    }
  });

  it('should sanitize script tags from markdown content', () => {
    // Create a test markdown file with XSS attempt
    const maliciousMarkdown = `---
title: XSS Test
date: 2024-01-01
author: Security Tester
description: Testing XSS protection
published: true
---

# Legitimate Content

<script>alert('XSS')</script>

This should be safe content.
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    // Run the build script
    execSync('node scripts/build-blog.js', { cwd: path.join(__dirname, '..') });

    // Read the generated HTML
    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');

    // Verify script tag is removed
    expect(generatedHTML).not.toContain('<script>');
    expect(generatedHTML).not.toContain('alert(');
    expect(generatedHTML).not.toContain('</script>');

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
<div onclick="alert('XSS')">Click me</div>
`;

    fs.writeFileSync(TEST_XSS_FILE, maliciousMarkdown);

    // Run the build script
    execSync('node scripts/build-blog.js', { cwd: path.join(__dirname, '..') });

    // Read the generated HTML
    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');

    // Verify event handlers are removed
    expect(generatedHTML).not.toContain('onerror=');
    expect(generatedHTML).not.toContain('onclick=');
    expect(generatedHTML).not.toContain('alert(');
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

    // Run the build script
    execSync('node scripts/build-blog.js', { cwd: path.join(__dirname, '..') });

    // Read the generated HTML
    const generatedHTML = fs.readFileSync(TEST_XSS_HTML, 'utf-8');

    // Verify safe content is preserved
    expect(generatedHTML).toContain('<h1>Heading 1</h1>');
    expect(generatedHTML).toContain('<h2>Heading 2</h2>');
    expect(generatedHTML).toContain('<strong>Bold text</strong>');
    expect(generatedHTML).toContain('<em>italic text</em>');
    expect(generatedHTML).toContain('<a href="https://example.com">Safe link</a>');
    expect(generatedHTML).toContain('img');
  });
});

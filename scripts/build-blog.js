#!/usr/bin/env node

/**
 * Build script for generating blog index and individual post pages from markdown
 * Run this after adding/editing blog posts via CMS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = path.join(__dirname, '../src/blog');
const OUTPUT_DIR = path.join(__dirname, '../src/blog');
const INDEX_FILE = path.join(__dirname, '../src/blog-index.json');

// Simple markdown to HTML converter (basic)
function markdownToHTML(markdown) {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br/>');
}

// Parse frontmatter from markdown
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter = {};
  const lines = match[1].split('\n');

  lines.forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      // Remove quotes if present
      frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });

  return {
    frontmatter,
    body: match[2].trim()
  };
}

async function buildBlog() {
  console.log('🚀 Building blog...\n');

  // Ensure blog directory exists
  if (!fs.existsSync(BLOG_DIR)) {
    console.log('📁 Creating blog directory...');
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }

  // Read all markdown files
  const files = fs.readdirSync(BLOG_DIR).filter(file => file.endsWith('.md'));

  if (files.length === 0) {
    console.log('📝 No blog posts found. Creating blog-index.json with empty array...');
    fs.writeFileSync(INDEX_FILE, JSON.stringify([], null, 2));
    console.log('✅ Done!\n');
    return;
  }

  const posts = [];

  // Process each markdown file
  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    const slug = file.replace('.md', '');

    posts.push({
      slug,
      title: frontmatter.title || 'Untitled Post',
      date: frontmatter.date || new Date().toISOString(),
      author: frontmatter.author || 'Puplets Team',
      description: frontmatter.description || '',
      featured_image: frontmatter.featured_image || '',
      categories: frontmatter.categories ? frontmatter.categories.split(',').map(c => c.trim()) : [],
      tags: frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : [],
      published: frontmatter.published !== 'false',
      body: body
    });

    // Generate individual post HTML
    const postHTML = generatePostHTML(frontmatter, body, slug);
    const postPath = path.join(OUTPUT_DIR, `${slug}.html`);
    fs.writeFileSync(postPath, postHTML);
    console.log(`✅ Generated: ${slug}.html`);
  }

  // Write index file
  fs.writeFileSync(INDEX_FILE, JSON.stringify(posts, null, 2));
  console.log(`\n✅ Generated blog-index.json with ${posts.length} post(s)\n`);
  console.log('🎉 Blog build complete!\n');
}

function generatePostHTML(frontmatter, body, slug) {
  const html = markdownToHTML(body);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${frontmatter.title || 'Blog Post'} - Puplets</title>
    <meta name="description" content="${frontmatter.description || ''}">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #F5F1ED;
            color: #101820;
            line-height: 1.8;
        }

        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 3rem;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .logo-nav {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.5rem;
            font-weight: 600;
            color: #101820;
            text-decoration: none;
        }

        .logo-icon { width: 40px; height: 40px; object-fit: contain; }

        .nav-links { display: flex; gap: 2rem; align-items: center; }
        .nav-links a { color: #101820; text-decoration: none; font-weight: 500; }
        .nav-links a:hover { color: #D6001C; }

        article {
            max-width: 800px;
            margin: 4rem auto;
            padding: 0 2rem;
        }

        .featured-image {
            width: 100%;
            max-height: 500px;
            object-fit: cover;
            border-radius: 15px;
            margin-bottom: 2rem;
        }

        .post-meta {
            display: flex;
            gap: 2rem;
            color: #5A4A42;
            margin-bottom: 2rem;
            font-size: 0.9rem;
        }

        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            line-height: 1.2;
        }

        .post-content {
            background: white;
            padding: 3rem;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .post-content p { margin-bottom: 1.5rem; }
        .post-content h2 { margin: 2rem 0 1rem; font-size: 1.8rem; }
        .post-content h3 { margin: 1.5rem 0 0.75rem; font-size: 1.4rem; }
        .post-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0; }
        .post-content a { color: #D6001C; text-decoration: underline; }

        .back-link {
            display: inline-block;
            margin-bottom: 2rem;
            color: #5A4A42;
            text-decoration: none;
        }

        .back-link:hover { color: #D6001C; }

        @media (max-width: 768px) {
            nav { padding: 1rem 1.5rem; }
            h1 { font-size: 2rem; }
            .post-content { padding: 2rem 1.5rem; }
        }
    </style>
</head>
<body>
    <nav>
        <a href="/" class="logo-nav">
            <img src="../logo.png" alt="Puplets Logo" class="logo-icon">
            Puplets
        </a>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/products.html">Products</a>
            <a href="/blog.html">Blog</a>
            <a href="/about.html">About</a>
        </div>
    </nav>

    <article>
        <a href="/blog.html" class="back-link">← Back to Blog</a>

        ${frontmatter.featured_image ? `<img src="${frontmatter.featured_image}" alt="${frontmatter.title}" class="featured-image">` : ''}

        <h1>${frontmatter.title || 'Untitled Post'}</h1>

        <div class="post-meta">
            <span>📅 ${formatDate(frontmatter.date)}</span>
            ${frontmatter.author ? `<span>✍️ ${frontmatter.author}</span>` : ''}
        </div>

        <div class="post-content">
            <p>${html}</p>
        </div>
    </article>
</body>
</html>`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Run the build
buildBlog().catch(console.error);

import { readFile, writeFile } from 'node:fs/promises';
import { renderLandingPage } from '../dist-ssr/entry-server.js';
import { getSeoTags, siteUrl } from '../seo.mjs';

const dist = new URL('../dist/', import.meta.url);
const template = await readFile(new URL('index.html', dist), 'utf8');
const rootMarker = '<div id="root"></div>';
if (!template.includes(rootMarker)) throw new Error('Missing root marker in the client build');

const landingHtml = template.replace(rootMarker, () => `<div id="root">${renderLandingPage()}</div>`);
const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const accountHead = getSeoTags(false).map(({ tag, attrs, children }) => {
  const attributes = Object.entries(attrs).map(([name, value]) => `${name}="${escapeHtml(value)}"`).join(' ');
  return tag === 'meta' ? `<meta ${attributes}>` : `<${tag} ${attributes}>${escapeHtml(children)}</${tag}>`;
}).join('\n');
const accountHtml = template
  .replace(/<(title|script)\b[^>]*data-washpro-seo[^>]*>[\s\S]*?<\/\1>|<(meta|link)\b[^>]*data-washpro-seo[^>]*>/g, '')
  .replace('</head>', `${accountHead}\n</head>`);

await writeFile(new URL('index.html', dist), landingHtml);
await writeFile(new URL('app.html', dist), accountHtml);
await writeFile(new URL('robots.txt', dist), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl}sitemap.xml\n`);
await writeFile(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}</loc></url>\n</urlset>\n`);
console.log('SEO build: prerendered homepage, noindex app shell, robots.txt, and sitemap.xml.');

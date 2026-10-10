import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const readArtifact = (name) => {
  const path = new URL(`../dist/${name}`, import.meta.url);
  assert.ok(existsSync(path), `Build must emit ${name}`);
  return readFileSync(path, 'utf8');
};
const siteUrl = 'https://washpro.my.id/';

test('homepage exposes its real content to crawlers without JavaScript', () => {
  const html = readArtifact('index.html');
  assert.match(html, /<h1\b[^>]*>[\s\S]*?Laundry beres\./);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /class="wp-eyebrow"[^>]*>[\s\S]*?Aplikasi kasir laundry online<\/span>/);
  assert.match(html, /<p>WashPro membantu bisnis laundry kiloan dan satuan/);
  assert.match(html, /WashPro cocok untuk laundry seperti apa/);
  assert.match(html, /href="\/register"/);
  assert.doesNotMatch(html, /<div id="root"><\/div>/);
});

test('homepage has one canonical and consistent social metadata', () => {
  const html = readArtifact('index.html');
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.match(html, /rel="canonical"[^>]*href="https:\/\/washpro\.my\.id\/"/);
  assert.match(html, /property="og:url"[^>]*content="https:\/\/washpro\.my\.id\/"/);
  assert.match(html, /property="og:image"[^>]*content="https:\/\/washpro\.my\.id\/logo\.png"/);
  assert.match(html, /name="twitter:card"[^>]*content="summary"/);
  assert.match(html, /name="robots"[^>]*content="index, follow/);
});

test('structured data describes the product without fabricated ratings or prices', () => {
  const html = readArtifact('index.html');
  const json = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(json, 'Structured data must be present in the initial HTML');
  const schema = JSON.parse(json[1]);
  assert.equal(schema['@context'], 'https://schema.org');
  const organization = schema['@graph'].find((item) => item['@type'] === 'Organization');
  const website = schema['@graph'].find((item) => item['@type'] === 'WebSite');
  const app = schema['@graph'].find((item) => item['@type'] === 'WebApplication');
  assert.equal(organization.name, 'WashPro');
  assert.equal(website.url, siteUrl);
  assert.equal(app.applicationCategory, 'BusinessApplication');
  assert.equal(app.url, siteUrl);
  assert.equal(app.aggregateRating, undefined);
  assert.equal(app.offers, undefined);
});

test('account app shell is not indexable and does not repeat homepage content', () => {
  const html = readArtifact('app.html');
  assert.match(html, /name="robots"[^>]*content="noindex, follow"/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.doesNotMatch(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /Laundry beres/);
  assert.match(html, /<script[^>]*type="module"/);
});

test('sitemap contains only the public canonical page and robots references it', () => {
  const sitemap = readArtifact('sitemap.xml');
  const robots = readArtifact('robots.txt');
  assert.match(sitemap, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(urls, [siteUrl]);
  assert.match(robots, /Sitemap: https:\/\/washpro\.my\.id\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m);
});

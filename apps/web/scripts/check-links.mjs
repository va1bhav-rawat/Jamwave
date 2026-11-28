#!/usr/bin/env node
/**
 * Crawl the public pages of a running Jamwave instance and fail on broken internal links.
 *
 *   node scripts/check-links.mjs http://localhost:3000
 *
 * Starts from the home page, follows every same-origin <a href> (and the sitemap), and reports
 * anything that does not answer 2xx/3xx. Jam rooms, the API and the analytics proxy are skipped.
 */

const base = new URL(process.argv[2] ?? 'http://localhost:3000');
const SKIP = [/^\/jam\//, /^\/api\//, /^\/ingest\//, /^mailto:/, /^#/];
const MAX_PAGES = 200;

const seen = new Map(); // path -> status
const queue = ['/', '/sitemap.xml', '/robots.txt', '/llms.txt'];

function normalise(href, from) {
  try {
    const url = new URL(href, new URL(from, base));
    if (url.origin !== base.origin) return null;
    const path = url.pathname + url.search;
    if (SKIP.some((re) => re.test(href) || re.test(url.pathname))) return null;
    return path;
  } catch {
    return null;
  }
}

async function visit(path) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  seen.set(path, response.status);
  const type = response.headers.get('content-type') ?? '';
  if (response.status >= 300 && response.status < 400) {
    const next = normalise(response.headers.get('location') ?? '', path);
    if (next && !seen.has(next)) queue.push(next);
    return;
  }
  if (!response.ok) return;
  const body = await response.text();
  const links = type.includes('xml')
    ? [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    : [...body.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of links) {
    const next = normalise(href, path);
    if (next && !seen.has(next) && !queue.includes(next)) queue.push(next);
  }
}

while (queue.length > 0 && seen.size < MAX_PAGES) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  try {
    await visit(path);
  } catch (error) {
    seen.set(path, `error: ${error.message}`);
  }
}

const broken = [...seen].filter(([, status]) => typeof status !== 'number' || status >= 400);
console.log(`Checked ${seen.size} URLs on ${base.origin}`);
for (const [path, status] of broken) console.log(`  BROKEN ${status}  ${path}`);
if (broken.length > 0) process.exit(1);
console.log('No broken internal links.');

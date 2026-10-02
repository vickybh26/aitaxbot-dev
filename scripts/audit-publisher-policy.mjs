import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';

const run = promisify(execFile);
const origin = 'https://www.aitaxbot.co.in';
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length)
  || 'docs/audits/2026-10-02-publisher-policy';
await mkdir(`${output}/html`, { recursive: true });
const offlineEvidence = process.argv.includes('--offline')
  ? JSON.parse(await readFile(`${output}/crawl.json`, 'utf8')) : null;
async function fetchRaw(url) {
  if (process.argv.includes('--offline')) {
    const path = new URL(url).pathname;
    const name = path === '/' ? 'home' : path.slice(1).replace(/[^\w.-]+/g, '_');
    const html = await readFile(path === '/sitemap.xml' ? `${output}/sitemap.xml` : `${output}/html/${name}.html`, 'utf8');
    const previous = offlineEvidence.results.find(row => row.url === url);
    if (path !== '/sitemap.xml' && !previous) throw new Error(`No cached HTTP evidence for ${url}`);
    return { html, status: previous?.status ?? 200, effectiveUrl: previous?.effectiveUrl ?? url, error: previous?.error };
  }
  try {
    const { stdout } = await run('curl.exe', ['-sS', '-L', '--max-time', '25', '-w', '\nAUDIT_HTTP:%{http_code}|%{url_effective}', url], { maxBuffer: 4 * 1024 * 1024 });
    const marker = stdout.lastIndexOf('\nAUDIT_HTTP:');
    const [status, effectiveUrl] = stdout.slice(marker + 12).split('|');
    return { html: stdout.slice(0, marker), status: Number(status), effectiveUrl };
  } catch (error) { return { html: '', status: 0, error: error.message }; }
}
const sitemap = await fetchRaw(`${origin}/sitemap.xml`);
if (sitemap.status !== 200) throw new Error(`Sitemap fetch failed: ${sitemap.status}`);
await writeFile(`${output}/sitemap.xml`, sitemap.html);
const urls = [...new Set([...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]))];
const extraPaths = ['/robots.txt', '/ads.txt', '/login', '/signup', '/dashboard', '/admin', '/calculators/income-tax-wizard', '/policy-audit-missing-page'];
const targets = [...new Set([...urls, ...extraPaths.map(path => origin + path)])];
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < targets.length) {
    const url = targets[cursor++];
    const response = await fetchRaw(url);
    const path = new URL(url).pathname;
    const $ = load(response.html, { scriptingEnabled: false });
    const toText = node => {
      const copy = node.clone();
      copy.find('script,style').remove();
      copy.find('*').append(' ');
      return copy.text().replace(/\s+/g, ' ').trim();
    };
    const staticCopy = $('#seo-static-content').clone();
    staticCopy.find('nav,script,style').remove();
    const mainText = toText(staticCopy);
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    const robots = $('meta[name="robots"]').attr('content') || '';
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const h1s = $('h1').map((_, e) => $(e).text()).get();
    const links = $('body a[href]').map((_, e) => $(e).attr('href')).get();
    const structured = $('script[type="application/ld+json"]').map((_, e) => $(e).text()).get();
    $('script,style').remove();
    const bodyText = toText($('body'));
    const words = text => text ? text.split(/\s+/).length : 0;
    const name = path === '/' ? 'home' : path.slice(1).replace(/[^\w.-]+/g, '_');
    await writeFile(`${output}/html/${name}.html`, response.html);
    results.push({ url, path, status: response.status, effectiveUrl: response.effectiveUrl, error: response.error,
      sitemap: urls.includes(url), title, description, robots, canonical, h1s, links, structured,
      bodyWords: words(bodyText), contentWords: words(mainText), htmlBytes: Buffer.byteLength(response.html),
      textToHtmlPercent: response.html.length ? +(100 * bodyText.length / response.html.length).toFixed(2) : 0,
      contentHash: createHash('sha256').update(mainText).digest('hex'), mainText, bodyText });
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
results.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(`${output}/crawl.json`, JSON.stringify({ auditedAt: new Date().toISOString(), method: 'curl raw HTML; cheerio strips scripts/styles; content count excludes static navigation and noscript fallback; body count includes both', sitemapCount: urls.length, results }, null, 2));
const csv = ['path,status,sitemap,bodyWords,contentWords,htmlBytes,textToHtmlPercent,links,robots', ...results.map(r => [r.path,r.status,r.sitemap,r.bodyWords,r.contentWords,r.htmlBytes,r.textToHtmlPercent,r.links.length,JSON.stringify(r.robots)].join(','))].join('\n');
await writeFile(`${output}/crawl.csv`, csv);
console.log(JSON.stringify({ sitemapCount: urls.length, totalChecked: results.length, statuses: results.reduce((a,r) => ({...a,[r.status]:(a[r.status]||0)+1}),{}), shortest: results.filter(r=>r.sitemap).sort((a,b)=>a.contentWords-b.contentWords).slice(0,12).map(r=>({path:r.path,words:r.contentWords})), output },null,2));

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import express from 'express';
import { load } from 'cheerio';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { injectSeoContent } from '../server/vite';
import { PrivacyPolicyContent, TermsOfServiceContent } from '../shared/legalContent';
import { SEO_CONTENT_BY_PATH } from '../shared/seoContent';
import { SWP_FAQS } from '../shared/swpGuidance';
import { NRI_ACCOUNT_FAQS } from '../shared/nriAccountGuidance';
import { PUBLISHER_ARTICLE_PATHS } from '../shared/publisherArticlePaths';
import { blogPosts } from '../client/src/data/blogPosts';

const shell = readFileSync('client/index.html', 'utf8');
assert.deepEqual([...PUBLISHER_ARTICLE_PATHS].sort(), blogPosts.filter(p => p.status === 'published').map(p => `/blog/${p.slug}`).sort());
assert(!/src="https:\/\/(www\.googletagmanager|www\.clarity)/.test(shell));
assert(!shell.includes("gtag('config'"), 'no pre-consent SDK config in shell');
assert.equal(SEO_CONTENT_BY_PATH['/calculators/swp'].faqs, SWP_FAQS);
assert.equal(SEO_CONTENT_BY_PATH['/nri/nro-nre-comparison'].faqs, NRI_ACCOUNT_FAQS);

// Test the production injection function through real HTTP; this harness does
// not initialise Firestore, background jobs or paid AI integrations.
const app = express();
app.get('*', (req, res) => res.type('html').send(injectSeoContent(shell, req.path)));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const port = (server.address() as { port: number }).port;
try {
  for (const [path, Component] of [
    ['/privacy-policy', PrivacyPolicyContent],
    ['/terms-of-service', TermsOfServiceContent],
  ] as const) {
    const { stdout } = await promisify(execFile)('curl.exe', ['--silent', '--show-error', '--max-time', '15', '-w', '\n%{http_code}', `http://127.0.0.1:${port}${path}`]);
    assert(stdout.endsWith('\n200'));
    const $ = load(stdout.slice(0, -4));
    const expected = load(renderToStaticMarkup(createElement(Component)));
    assert.equal($('#seo-static-content .prose').text(), expected('.prose').text());
    assert(!stdout.includes("<script>document.getElementById('seo-static-content')?.remove();</script>"));
    console.log(`${path}: HTTP 200; full legal text parity; ${expected('.prose').text().trim().split(/\s+/).length} words`);
  }
  for (const path of ['/calculators/swp', '/nri/nro-nre-comparison']) {
    const html = injectSeoContent(shell, path);
    assert(!html.includes('LTCG tax is 10% above'));
    assert(!html.includes('dividend income, and capital gains are all 100% tax-free'));
    console.log(`${path}: shared FAQ; stale audited claims absent`);
  }
  const privacy = renderToStaticMarkup(createElement(PrivacyPolicyContent));
  assert(!privacy.includes('Calculator inputs are never transmitted'));
  console.log('Publisher content regressions passed. Browser consent interaction still requires separate testing.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

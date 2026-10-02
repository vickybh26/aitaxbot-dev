import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('client/src/lib/publisherConsent.ts', 'utf8');
const inventory = fs.readFileSync('shared/publisherArticlePaths.ts', 'utf8');
const articlePaths = JSON.parse(inventory.slice(inventory.indexOf('= [') + 2, inventory.lastIndexOf(';')));
function harness(enabled, prefs, path) {
  const scripts = new Map();
  const calls = [];
  const window = { gtag: (...args) => calls.push(args), dispatchEvent() {} };
  const context = {
    exports: {}, window, Event: class {}, PUBLISHER_ARTICLE_PATHS: articlePaths,
    localStorage: { getItem: () => prefs },
    document: {
      title: 'Test', getElementById: id => scripts.get(id),
      createElement: () => ({}), head: { appendChild: script => scripts.set(script.id, script) },
    },
  };
  // Simulate the Vite compile-time flag, keeping the implementation under test.
  const prepared = source.replace(/^import .*publisherArticlePaths';\r?\n/m, '').replace("import.meta.env?.VITE_ADSENSE_ENABLED === 'true'", String(enabled));
  vm.runInNewContext(ts.transpileModule(prepared, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const api = context.exports;
  if (prefs !== null) {
    try { api.applyPublisherConsent(JSON.parse(prefs), path); } catch { /* malformed JSON: caller shows the banner */ }
  }
  return { api, scripts, calls };
}

for (const path of ['/', '/blog', articlePaths[0]]) {
  for (const prefs of [null, 'broken', JSON.stringify({ analytics: false, advertising: false })]) {
    const { scripts } = harness(false, prefs, path);
    assert.equal(scripts.size, 0, 'no SDK before opt-in or after rejection');
  }
  const { scripts, calls } = harness(false, JSON.stringify({ analytics: true, advertising: true }), path);
  assert(scripts.has('analytics-script'));
  assert(scripts.has('clarity-script'));
  assert(!scripts.has('adsbygoogle-script'), 'ads disabled until account verification');
  assert(calls.every(c => c[0] !== 'consent' || c[2].ad_personalization === 'denied'));
}
for (const path of ['/admin', '/admin/ai-review', '/profile', '/dashboard', '/login', '/signup', '/accounting', '/tools/ais-26as-form16', '/calculators/income-tax', '/nri/income-tax-calculator', '/blog/not-a-real-post-xyz']) {
  const { scripts, api } = harness(true, JSON.stringify({ analytics: true, advertising: true }), path);
  assert.equal(scripts.size, 0, `private/financial path ${path}`);
  assert.equal(api.canRequestAds(path), false);
}
const { scripts } = harness(true, JSON.stringify({ analytics: true, advertising: true }), '/blog');
assert(scripts.has('adsbygoogle-script'), 'verified-config simulation permits editorial ads only');
const shell = fs.readFileSync('client/index.html', 'utf8');
assert(!shell.includes('https://www.googletagmanager.com/gtag/js'));
assert(!shell.includes('https://www.clarity.ms/tag/'));
assert(fs.readFileSync('client/src/components/Footer.tsx', 'utf8').includes('open-cookie-preferences'));
console.log('Consent regressions passed: opt-in gating, rejection, malformed preferences, default ads-off and 11 excluded paths. This is a mocked SDK test, not a browser network trace.');

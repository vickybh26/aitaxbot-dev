/**
 * test-seo-parity.ts — fails the build when a page shows users one thing and
 * crawlers another.
 *
 * WHY THIS EXISTS
 * ---------------
 * This codebase has two sources of truth for what a page says. React renders
 * the real page; shared/seoContent.ts holds a hand-written parallel copy that
 * server/vite.ts injects for clients that do not run JavaScript — which is what
 * the AdSense crawler and Googlebot's first pass are.
 *
 * Nothing kept those two in agreement, so a page added after seoContent.ts was
 * written got no entry, and silently served ~50 words under the homepage's
 * title. It rendered perfectly in a browser, so nobody noticed. That produced,
 * over months, in order:
 *
 *   - every page returning 200, so invalid URLs looked like the homepage
 *     (fixed 74eec10, guarded by test-routes.ts)
 *   - /blog serving 50 words and linking to none of its 36 articles
 *     (fixed d74b670)
 *   - zero internal <a href> anywhere, because the nav renders through
 *     wouter's <Link> (fixed d74b670)
 *   - /find-ca, /ca/register, /accounting and the income-tax-wizard serving the
 *     shell and a duplicate homepage title
 *   - 89% of the blog's words never injected at all, because the generator only
 *     read "intro" sections
 *
 * Those were treated as five bugs. They are one bug found five times. A human
 * cannot catch this by looking at the site, because looking at the site runs
 * the JavaScript that hides the problem. So it gets asserted here instead.
 *
 * WHAT IT CHECKS
 *   1. every public route has crawler content — no route falls back to the shell
 *   2. no two routes ship the same <title>
 *   3. no route ships the generic index.html title
 *   4. each route's injected copy clears a word floor
 *   5. every blog post ships most of its body, not just its opening paragraph
 *
 * Run: npm run test:seo
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { SEO_CONTENT_BY_PATH, SITE_NAV } from "../shared/seoContent";
import { STATIC_ROUTES, PRIVATE_ROUTES, NOINDEX_ROUTES, isNoIndexRoute, indexableRoutes } from "../shared/routes";
import { blogPosts } from "../client/src/data/blogPosts";

const root = resolve(import.meta.dirname, "..");
let failed = 0;

function check(label: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}

/**
 * Routes that legitimately have no crawler content.
 *
 * Only two reasons qualify. Either the page is behind a login, so its content
 * belongs to one person and there is nothing public to inject; or robots.txt
 * disallows it. "We have not written the copy yet" is NOT a reason — that is
 * the bug this file exists to catch, so a new page either gets an entry or
 * fails here.
 */
const NO_CRAWLER_CONTENT = new Set([...PRIVATE_ROUTES, ...NOINDEX_ROUTES]);

/** The fallback title in client/index.html. Any route still serving it has no entry. */
const GENERIC_TITLE_FRAGMENT = "Free ITR Filing & Income Tax Calculator";

/** Words of injected copy a public page must carry, excluding nav and boilerplate. */
const MIN_WORDS = 120;

/** Share of a blog post's written words that must reach a crawler. */
const MIN_BLOG_COVERAGE = 0.6;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

console.log("\n1. Every public route has crawler content");
console.log("────────────────────────────────────────────────────────────");

const publicRoutes = STATIC_ROUTES.filter((r) => !NO_CRAWLER_CONTENT.has(r));
const missing = publicRoutes.filter((r) => !SEO_CONTENT_BY_PATH[r]);
check(
  `${publicRoutes.length} public routes, all with an entry`,
  missing.length === 0,
  missing.length
    ? `no entry in shared/seoContent.ts, so these serve the generic shell:\n      ${missing.join("\n      ")}`
    : "",
);

console.log("\n2. Titles are unique and specific");
console.log("────────────────────────────────────────────────────────────");

const byTitle = new Map<string, string[]>();
for (const [path, page] of Object.entries(SEO_CONTENT_BY_PATH)) {
  const list = byTitle.get(page.title) ?? [];
  list.push(path);
  byTitle.set(page.title, list);
}
const dupes = [...byTitle.entries()].filter(([, paths]) => paths.length > 1);
check(
  "no two routes share a <title>",
  dupes.length === 0,
  dupes.map(([t, paths]) => `"${t.slice(0, 60)}" on ${paths.join(", ")}`).join("\n      "),
);

const generic = Object.entries(SEO_CONTENT_BY_PATH)
  .filter(([, p]) => p.title.includes(GENERIC_TITLE_FRAGMENT))
  .map(([path]) => path);
check(
  "no route reuses the index.html fallback title",
  generic.length === 0,
  generic.join(", "),
);

console.log("\n3. Injected copy clears the word floor");
console.log("────────────────────────────────────────────────────────────");

const thin: string[] = [];
for (const [path, page] of Object.entries(SEO_CONTENT_BY_PATH)) {
  const n =
    words(page.h1) +
    words(page.intro) +
    (page.sections ?? []).reduce((sum, sec) => sum + words(sec.heading ?? "") + words(sec.body), 0) +
    page.faqs.reduce((sum, f) => sum + words(f.question) + words(f.answer), 0) +
    (page.links ?? []).reduce((sum, l) => sum + words(l.label), 0);
  if (n < MIN_WORDS) thin.push(`${path} — ${n} words`);
}
check(
  `all ${Object.keys(SEO_CONTENT_BY_PATH).length} entries carry ≥ ${MIN_WORDS} words`,
  thin.length === 0,
  thin.join("\n      "),
);

console.log("\n4. Blog posts ship their body, not just their opening");
console.log("────────────────────────────────────────────────────────────");

// Count what the post actually contains against what the entry ships. The
// generator reads bodySections; if it ever narrows again to one section type,
// coverage collapses and this fails.
const poor: string[] = [];
let totalWritten = 0;
let totalShipped = 0;

for (const post of blogPosts.filter((p: any) => p.status === "published")) {
  // FAQ text lives in `items`, not `content_md`, so counting only content_md
  // undercounts the denominator and reports coverage above 100%.
  const written = (post.bodySections as any[]).reduce((sum, s) => {
    if (typeof s.content_md === "string") return sum + words(s.content_md);
    if (Array.isArray(s.items)) {
      return sum + s.items.reduce(
        (n: number, it: any) => n + words(it.q ?? "") + words(it.a ?? ""), 0);
    }
    return sum;
  }, 0);
  const entry = SEO_CONTENT_BY_PATH[`/blog/${post.slug}`];
  if (!entry) {
    poor.push(`${post.slug} — no entry at all`);
    continue;
  }
  const shipped =
    words(entry.intro) +
    (entry.sections ?? []).reduce((sum, sec) => sum + words(sec.heading ?? "") + words(sec.body), 0) +
    entry.faqs.reduce((sum, f) => sum + words(f.question) + words(f.answer), 0);
  totalWritten += written;
  totalShipped += shipped;
  if (written > 200 && shipped / written < MIN_BLOG_COVERAGE) {
    poor.push(
      `${post.slug} — ${shipped} of ${written} words (${Math.round((100 * shipped) / written)}%)`,
    );
  }
}

const coverage = totalWritten ? Math.round((100 * totalShipped) / totalWritten) : 0;
check(
  `every post ships ≥ ${Math.round(MIN_BLOG_COVERAGE * 100)}% of its words (library-wide: ${coverage}%)`,
  poor.length === 0,
  poor.slice(0, 12).join("\n      ") + (poor.length > 12 ? `\n      …and ${poor.length - 12} more` : ""),
);

console.log("\n5. Crawlable navigation exists");
console.log("────────────────────────────────────────────────────────────");

// The header and footer render through wouter's <Link>, which emits no href
// until React mounts. SITE_NAV is the only thing putting real anchors in the
// static payload; if it empties out, every page becomes an island again.
check(`SITE_NAV has ${SITE_NAV.length} links`, SITE_NAV.length >= 10);

const navTargets = SITE_NAV.map((l) => l.href);
const navBroken = navTargets.filter((h) => !STATIC_ROUTES.includes(h.replace(/\/+$/, "") || "/"));
check("every nav link points at a real route", navBroken.length === 0, navBroken.join(", "));

for (const required of ["/privacy-policy", "/terms-of-service", "/contact", "/about"]) {
  check(`nav reaches ${required}`, navTargets.includes(required));
}

console.log("\n────────────────────────────────────────────────────────────");
if (failed === 0) {
  console.log("Crawlers and users see the same site.\n");
} else {
  console.log(`${failed} check(s) FAILED — a page shows users and crawlers different things.\n`);
  process.exit(1);
}

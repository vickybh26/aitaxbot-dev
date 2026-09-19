/**
 * test-routes.ts — drift guard for shared/routes.ts.
 *
 * shared/routes.ts lists every path the SPA serves, and server/vite.ts uses it
 * to decide whether an unmatched URL gets 200 or 404. That list is a copy of
 * the <Route path="..."> declarations in client/src/App.tsx, and a copy that
 * nothing checks is a copy that drifts.
 *
 * The failure mode is quiet and bad in both directions:
 *   - a route added to App.tsx but not here starts returning 404 in production
 *     while rendering perfectly, so it disappears from search and nobody
 *     notices until traffic to it dies;
 *   - a route removed from App.tsx but left here keeps answering 200, which is
 *     the soft-404 bug this whole mechanism exists to fix.
 *
 * Same approach as the engine drift guard in scripts/test-tax-calculations.ts:
 * re-read the source of truth as text and assert the derived copy matches.
 *
 * Run: npm run test:routes
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { STATIC_ROUTES, isKnownRoute } from "../shared/routes";

const root = resolve(import.meta.dirname, "..");
let failed = 0;

function check(label: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail && !ok ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

console.log("\nRoute manifest vs App.tsx");
console.log("────────────────────────────────────────────────────────────");

const appSrc = readFileSync(resolve(root, "client/src/App.tsx"), "utf-8");
const declared = [...appSrc.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]);
const declaredStatic = declared.filter((p) => !p.includes(":") && !p.includes("*")).sort();
const manifest = [...STATIC_ROUTES].sort();

const missing = declaredStatic.filter((p) => !manifest.includes(p));
const extra = manifest.filter((p) => !declaredStatic.includes(p));

check(`App.tsx declares ${declaredStatic.length} static routes`, declaredStatic.length > 0);
check(
  "every App.tsx route is in the manifest",
  missing.length === 0,
  `missing from shared/routes.ts: ${missing.join(", ")}`,
);
check(
  "manifest has no routes App.tsx does not declare",
  extra.length === 0,
  `stale in shared/routes.ts: ${extra.join(", ")}`,
);

console.log("\nisKnownRoute() behaviour");
console.log("────────────────────────────────────────────────────────────");

check("'/' is known", isKnownRoute("/"));
check("'/calculators/income-tax' is known", isKnownRoute("/calculators/income-tax"));
check("trailing slash normalises", isKnownRoute("/calculators/hra/"));
check("unknown path is rejected", !isKnownRoute("/this-page-does-not-exist-xyz"));
check("unknown nested path is rejected", !isKnownRoute("/calculators/not-a-calculator"));

// /blog/:slug resolves against real post slugs rather than accepting anything —
// a made-up slug renders the not-found view, so it must not answer 200.
const realSlug = (readFileSync(resolve(root, "client/src/data/blogPosts.ts"), "utf-8")
  .match(/slug:\s*["']([^"']+)["']/) || [])[1];
check(`a real blog slug is known (${realSlug})`, !!realSlug && isKnownRoute(`/blog/${realSlug}`));
check("a made-up blog slug is rejected", !isKnownRoute("/blog/not-a-real-post-xyz"));

console.log("\n────────────────────────────────────────────────────────────");
if (failed === 0) {
  console.log(`All route checks pass (${manifest.length} static routes).\n`);
} else {
  console.log(`${failed} check(s) FAILED.\n`);
  process.exit(1);
}

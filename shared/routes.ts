/**
 * routes.ts — the canonical list of paths this SPA actually serves.
 *
 * WHY THIS EXISTS
 * ---------------
 * The production catch-all in server/vite.ts answers every unmatched URL with
 * index.html. Without a route list it cannot tell /calculators/hra from
 * /nonsense, so it returned HTTP 200 for both. Measured 2026-09-19:
 * /this-page-does-not-exist-xyz returned 200 with 11,117 bytes and the generic
 * site title — a soft 404 on every invalid URL, which also made broken-link
 * detection impossible, since nothing could ever return 404 to be found.
 *
 * KEEPING IT HONEST
 * -----------------
 * This list is generated from the <Route path="..."> declarations in
 * client/src/App.tsx and must stay in step with them. scripts/test-routes.ts
 * re-parses App.tsx and fails if the two disagree — the same drift-guard
 * approach scripts/test-tax-calculations.ts uses for the slab tables. Add a
 * route in App.tsx without adding it here and that check goes red, rather than
 * the page quietly 404ing in production.
 */
import { blogPosts } from "@/data/blogPosts";

/** Every static path declared in App.tsx. Dynamic patterns are handled below. */
export const STATIC_ROUTES: readonly string[] = [
  "/",
  "/about",
  "/accounting",
  "/admin",
  "/admin/ai-review",
  "/admin/analytics",
  "/admin/cas",
  "/admin/digest",
  "/admin/users",
  "/blog",
  "/ca/my-profile",
  "/ca/register",
  "/calculators",
  "/calculators/home-loan",
  "/calculators/hra",
  "/calculators/income-tax",
  "/calculators/income-tax-wizard",
  "/calculators/nps",
  "/calculators/pf",
  "/calculators/sip",
  "/calculators/swp",
  "/calculators/trading-tax",
  "/calculators/vehicle-loan",
  "/contact",
  "/dashboard",
  "/find-ca",
  "/login",
  "/nri",
  "/nri/dtaa-calculator",
  "/nri/income-tax-calculator",
  "/nri/nro-nre-comparison",
  "/nri/repatriation-planner",
  "/privacy-policy",
  "/profile",
  "/signup",
  "/terms-of-service",
  "/tools",
  "/tools/ais-26as-form16",
  "/tools/rent-receipt",
] as const;

/**
 * Is this a path the app actually renders?
 *
 * Trailing slashes are normalised because Googlebot requests both forms, and
 * /blog/:slug is resolved against real post slugs — a made-up slug renders the
 * not-found view, so it should carry a 404 status rather than 200.
 */
export function isKnownRoute(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (STATIC_ROUTES.includes(p)) return true;
  if (p.startsWith("/blog/")) {
    const slug = p.slice("/blog/".length);
    return blogPosts.some((b) => b.slug === slug);
  }
  return false;
}

/**
 * Routes that must never be indexed, and why.
 *
 * A route belongs to exactly one of three categories, and "nobody has written
 * the copy yet" is not one of them. That omission is what produced /find-ca,
 * /ca/register and /accounting serving 50 words under the homepage's title
 * while rendering fine in a browser — invisible for months because looking at
 * the site runs the JavaScript that hides the problem.
 *
 *   1. PRIVATE  — behind a login. Nothing public to say.
 *   2. NOINDEX  — public but deliberately not for search.
 *   3. everything else — MUST have an entry in shared/seoContent.ts.
 *
 * scripts/test-seo-parity.ts enforces that, and server/vite.ts emits a robots
 * noindex for the first two, so the declaration has teeth rather than being a
 * comment nobody reads.
 */
export const PRIVATE_ROUTES: readonly string[] = [
  "/login",
  "/signup",
  "/dashboard",
  "/profile",
  "/ca/my-profile",
  "/admin",
  "/admin/analytics",
  "/admin/users",
  "/admin/cas",
  "/admin/digest",
  "/admin/ai-review",
  // Redirects straight to /login with a returnUrl — it was in the sitemap,
  // so Google was being asked to index a page that bounces every visitor.
  "/accounting",
];

export const NOINDEX_ROUTES: readonly string[] = [
  // Unfinished. Its own <h1> says "(Preview)". Not linked from anywhere and
  // not in the sitemap, but publicly reachable, so it is marked explicitly
  // rather than left to chance.
  "/calculators/income-tax-wizard",
];

/** Should this path carry a robots noindex? */
export function isNoIndexRoute(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return PRIVATE_ROUTES.includes(p) || NOINDEX_ROUTES.includes(p);
}

/** The routes that belong in the sitemap: public, indexable, and rendered. */
export function indexableRoutes(): string[] {
  return STATIC_ROUTES.filter((r) => !isNoIndexRoute(r));
}

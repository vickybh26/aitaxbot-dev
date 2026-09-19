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

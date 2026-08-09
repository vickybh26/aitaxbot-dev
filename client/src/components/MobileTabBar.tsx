/**
 * MobileTabBar — persistent bottom navigation on phones.
 *
 * WHY
 * ---
 * 99% of sessions are first-time visitors and the overwhelming majority arrive
 * on a calculator page, not the homepage (`/calculators/income-tax` drew 391 of
 * 464 page views in the last measured week, against 67 for the homepage). Until
 * now the only way to reach anything else was the hamburger menu, so a visitor
 * who landed on the income tax calculator had no visible route to the AIS
 * reconciliation tool — which is the actual differentiator and had recorded
 * zero uses by a real user.
 *
 * A fixed tab bar puts the four destinations on screen at all times, which is
 * both the ordinary convention on mobile and the cheapest fix available for
 * that discoverability problem.
 *
 * Desktop keeps the existing header — this is hidden from `md` upwards.
 *
 * Dashboard is the first tab for everyone, signed in or not: for a returning
 * user it holds their saved results, and for a first-time visitor it is the
 * closest thing we have to a home screen.
 */

import { Link, useLocation } from "wouter";
import { LayoutGrid, Calculator, FileSearch, Wrench, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Tab {
  label: string;
  href: string;
  icon: typeof LayoutGrid;
  /** Extra path prefixes that should also light this tab up. */
  matches?: string[];
}

/**
 * Tab 1 is auth-aware.
 *
 * It used to be Dashboard unconditionally, with `matches: ["/"]` so it also lit
 * up on the homepage. Two problems for the 99% of sessions that are first-time
 * visitors: /dashboard is a ProtectedRoute, so the most likely first tap on the
 * new navigation bounced them to /login?returnUrl=/dashboard — where the payoff
 * is an empty dashboard — and the active state claimed they were on Dashboard
 * while they were looking at the marketing page.
 *
 * Signed out they get Home; signed in they get Dashboard, where their saved
 * results actually are.
 */
const tabsFor = (signedIn: boolean): Tab[] => [
  signedIn
    ? { label: "Dashboard", href: "/dashboard", icon: LayoutGrid }
    : { label: "Home", href: "/", icon: HomeIcon },
  { label: "Calculators", href: "/calculators", icon: Calculator },
  { label: "AIS Check", href: "/tools/ais-26as-form16", icon: FileSearch },
  { label: "Tools", href: "/tools", icon: Wrench },
];

function isActive(tab: Tab, path: string): boolean {
  // The AIS tool lives under /tools/, so an ordinary startsWith check would
  // light up both it and the Tools tab at once. Exact-match the AIS route and
  // exclude it from the Tools prefix to keep exactly one tab active.
  if (tab.href === "/tools/ais-26as-form16") return path === tab.href;
  if (tab.href === "/tools") return path === "/tools" || (path.startsWith("/tools/") && path !== "/tools/ais-26as-form16");
  // Exact match only — "/" is a prefix of every route, so a startsWith check
  // would light the Home tab up on every page.
  if (tab.href === "/") return path === "/";
  if (tab.href === "/dashboard") return path === "/dashboard";
  return path === tab.href || path.startsWith(`${tab.href}/`);
}

export default function MobileTabBar() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const TABS = tabsFor(isAuthenticated);

  return (
    <nav
      aria-label="Primary"
      // z-40 is deliberate and part of a shared bottom-edge stack. Three
      // elements anchor to the bottom of the viewport and they previously all
      // sat at z-50, so paint order decided the winner: the cookie banner
      // (mounted later in App.tsx) covered this entire bar on every first
      // visit, and the WhatsApp FAB sat on top of the fourth tab permanently.
      //   z-40 → this bar        z-45 → WhatsApp FAB       z-60 → cookie banner
      // Keep those three in sync if any of them changes.
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200
                 pb-[env(safe-area-inset-bottom)]"
      data-testid="mobile-tab-bar"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = isActive(tab, location);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                data-testid={`tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
                // min-h-[56px] keeps every target above the 44px accessibility
                // floor even on small phones.
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1
                  text-[11px] font-medium transition-colors
                  ${active ? "text-persian-blue-700" : "text-slate-500"}`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className="leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

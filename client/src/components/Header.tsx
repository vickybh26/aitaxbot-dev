import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { trackButtonClick } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/lib/firebase";
import logoImageWebP from "@assets/aitaxbot-logo-lovable.webp";
import logoImagePng from "@assets/aitaxbot-logo-lovable.png";
import {
  Menu, X, Calculator, LogOut, User, LayoutDashboard,
  Globe, Shield, ChevronDown, UserCheck, FileText,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface HeaderProps {
  showModal?: (modalType: string) => void;
}

export default function Header({ showModal }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { isAuthenticated, user, adminLevel } = useAuth();
  const [currentPath] = useLocation();
  const { t } = useTranslation();
  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside interaction.
  //
  // `mousedown` alone was the previous behaviour and it missed touch entirely
  // on some mobile browsers, so an outside tap could leave a panel open. The
  // `touchstart` listener covers that. Escape is handled here too — without it
  // the only way out of an open menu was to find and click elsewhere.
  useEffect(() => {
    function handlePointer(e: Event) {
      const t = e.target as Node;
      if (moreRef.current && !moreRef.current.contains(t)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(t)) setUserOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMoreOpen(false);
      setUserOpen(false);
      setMobileMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Close every menu on navigation. Previously each link carried its own
  // onClick to do this, which meant the drawer stayed open on browser
  // back/forward and on any navigation triggered from outside the header.
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreOpen(false);
    setUserOpen(false);
  }, [currentPath]);

  const getLoginUrl = () => {
    if (currentPath && currentPath !== "/" && currentPath !== "/login") {
      return `/login?returnUrl=${encodeURIComponent(currentPath)}`;
    }
    return "/login";
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  // Matches Lovable's exact nav-link/dropdown-item treatment (ink/rule
  // tokens, rounded-2xl panels) — 2026-09-05.
  const navLink =
    "text-ink/70 hover:text-ink font-medium transition-colors text-sm";
  const dropItem =
    "flex items-center gap-2 px-4 py-2.5 text-sm text-ink/75 hover:bg-secondary hover:text-ink transition-colors rounded-xl";

  /**
   * Active-state props for a mobile drawer link.
   *
   * The drawer had no active-state indication at all, unlike MobileTabBar,
   * which sets aria-current and a visual highlight. A screen-reader user
   * opening the drawer had no way to tell which item was the current page;
   * a sighted user got no visual confirmation either. This mirrors the same
   * aria-current + colour treatment the tab bar already uses.
   */
  const mobileNavLink = (href: string) => {
    const active = currentPath === href;
    return {
      "aria-current": active ? ("page" as const) : undefined,
      className: active ? "text-ink font-semibold" : "text-ink/75",
    };
  };

  return (
    <header className="glass-header sticky top-0 z-50 shadow-soft">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity shrink-0"
            onClick={() => trackButtonClick("Logo Home", "Header")}
            data-testid="link-home-logo"
          >
            <picture>
              <source srcSet={logoImageWebP} type="image/webp" />
              <img
                src={logoImagePng}
                alt="AiTaxBot Logo"
                className="h-10 md:h-11 w-auto"
                width={320}
                height={195}
              />
            </picture>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-5">

            {/* Core links */}
            <Link
              href="/calculators"
              onClick={() => trackButtonClick("Calculators", "Header Navigation")}
              className={navLink}
              data-testid="link-header-calculators"
            >
              Calculators
            </Link>
            <Link
              href="/nri"
              onClick={() => trackButtonClick("NRI Corner", "Header Navigation")}
              className={navLink}
              data-testid="link-header-nri"
            >
              NRI
            </Link>
            <Link
              href="/blog"
              onClick={() => trackButtonClick("Blog", "Header Navigation")}
              className={navLink}
              data-testid="link-header-blog"
            >
              Guides
            </Link>

            {/* Find a CA — prominent direct link */}
            <Link
              href="/find-ca"
              onClick={() => trackButtonClick("Find a CA", "Header Navigation")}
              className={`${navLink} flex items-center gap-1.5`}
              data-testid="link-header-find-ca"
            >
              <UserCheck className="w-4 h-4" />
              Find a CA
            </Link>

            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={`${navLink} flex items-center gap-1`}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-controls="header-more-menu"
              >
                More
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div id="header-more-menu" role="menu" className="absolute top-full left-0 mt-3 w-60 rounded-2xl border border-rule bg-card p-2 shadow-[0_18px_40px_-18px] shadow-ink/30 z-50">
                  <Link href="/tools/ais-26as-form16" onClick={() => { trackButtonClick("AIS Reconciliation", "Header More"); setMoreOpen(false); }} className={dropItem}>
                    AIS Reconciliation
                  </Link>
                  <Link href="/tools/rent-receipt" onClick={() => { trackButtonClick("Rent Receipt", "Header More"); setMoreOpen(false); }} className={dropItem}>
                    Rent Receipt
                  </Link>
                  <Link href="/accounting" onClick={() => { trackButtonClick("Accounting", "Header More"); setMoreOpen(false); }} className={dropItem}>
                    Accounting
                  </Link>
                  {/* Supply-side entry point for the CA directory. Without this,
                      /ca/register was only reachable from inside /find-ca — a
                      page no Chartered Accountant has any reason to visit. */}
                  <Link href="/ca/register" onClick={() => { trackButtonClick("List Your Practice", "Header More"); setMoreOpen(false); }} className={dropItem}>
                    For CAs — List Your Practice
                  </Link>
                  <Link href="/about" onClick={() => { trackButtonClick("About", "Header More"); setMoreOpen(false); }} className={dropItem}>
                    About
                  </Link>
                  <Link href="/contact" onClick={() => { trackButtonClick("Contact", "Header More"); setMoreOpen(false); }} className={dropItem}>
                    Contact
                  </Link>
                </div>
              )}
            </div>

            {/* Tax Calculator CTA */}
            <Link
              href="/calculators/income-tax"
              onClick={() => trackButtonClick("Income Tax Calculator", "Header Navigation")}
              /* Brand navy, matching every other primary button (<Button> resolves
                 to .bg-primary = --primary-blue). This was bg-blue-600, i.e. the
                 interactive-blue reserved for links and secondary actions — which
                 is also what "Find a CA" and "Login" use in this same bar, so the
                 site's main CTA was colour-coded as a link. */
              className="bg-ink hover:bg-credit text-paper text-sm px-4 py-2 rounded-full font-medium transition-colors whitespace-nowrap"
              data-testid="button-header-tax-calculator"
            >
              Compute tax
            </Link>

            {/* The हिंदी / EN switcher used to sit here and has been removed.
                It was given prime position in both the desktop and mobile bars,
                but only 3 files ever called t() — 18 call sites against ~18,850
                lines of UI — so switching translated the nav and the hero and
                nothing else. A Hindi-preferring user was told the product spoke
                their language, chose it, and got the same English calculator.
                The i18n plumbing (lib/i18n.tsx, locales/*) is intact and the
                remaining t() calls still work, so restoring the control is a
                one-line change once a page is genuinely translated end to end.
                Start with /calculators/income-tax — 84% of traffic lands there. */}

            {/* Auth: user dropdown OR login */}
            {isAuthenticated ? (
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-sm font-medium text-ink/70 hover:text-ink transition-colors"
                  aria-expanded={userOpen}
                  aria-haspopup="menu"
                  aria-controls="header-user-menu"
                  aria-label="Account menu"
                  data-testid="button-user-menu"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userOpen ? "rotate-180" : ""}`} />
                </button>
                {userOpen && (
                  <div id="header-user-menu" role="menu" className="absolute top-full right-0 mt-3 w-52 rounded-2xl border border-rule bg-card p-2 shadow-[0_18px_40px_-18px] shadow-ink/30 z-50">
                    {isAuthenticated && (
                      <Link href="/dashboard" onClick={() => { trackButtonClick("Dashboard", "User Menu"); setUserOpen(false); }} className={dropItem} data-testid="link-header-dashboard">
                        <LayoutDashboard className="w-4 h-4 text-ink/50" />
                        Dashboard
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setUserOpen(false)} className={dropItem} data-testid="link-header-profile">
                      <User className="w-4 h-4 text-ink/50" />
                      {t("nav.profile")}
                    </Link>
                    {adminLevel !== null && (
                      <Link href="/admin" onClick={() => setUserOpen(false)} className={`${dropItem} text-persian-blue-700`} data-testid="link-header-admin">
                        <Shield className="w-4 h-4 text-persian-blue-400" />
                        {t("nav.adminPanel")}
                      </Link>
                    )}
                    <div className="border-t border-rule my-1" />
                    <button
                      onClick={() => { handleLogout(); setUserOpen(false); }}
                      className={`${dropItem} w-full text-red-600 hover:bg-red-50`}
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={getLoginUrl()}
                onClick={() => trackButtonClick("Login", "Header Navigation")}
                className={navLink}
                data-testid="link-header-login"
              >
                {t("nav.login")}
              </Link>
            )}
          </nav>

          {/* ── Mobile Menu Button ── */}
          <div className="md:hidden flex items-center gap-2">
            {/* Language switcher removed — see the note in the desktop nav above. */}
            <button
              className="p-2 text-ink/70 hover:text-ink transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Navigation ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-rule shadow-lg">
          <div className="px-5 py-4 space-y-1">
            {isAuthenticated && (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} aria-current={mobileNavLink("/dashboard")["aria-current"]} className={`flex items-center gap-2 py-2.5 text-sm font-medium ${mobileNavLink("/dashboard").className}`}>
                <LayoutDashboard className="w-4 h-4" />{t("nav.dashboard")}
              </Link>
            )}
            <Link href="/calculators" onClick={() => { trackButtonClick("Calculators", "Mobile Header"); setMobileMenuOpen(false); }} aria-current={mobileNavLink("/calculators")["aria-current"]} className={`flex items-center gap-2 py-2.5 text-sm font-medium ${mobileNavLink("/calculators").className}`}>
              <Calculator className="w-4 h-4" />Calculators
            </Link>
            <Link href="/nri" onClick={() => { trackButtonClick("NRI", "Mobile Header"); setMobileMenuOpen(false); }} aria-current={mobileNavLink("/nri")["aria-current"]} className={`flex items-center gap-2 py-2.5 text-sm font-medium ${mobileNavLink("/nri").className}`}>
              <Globe className="w-4 h-4" />NRI
            </Link>
            <Link href="/tools/ais-26as-form16" onClick={() => { trackButtonClick("AIS Reconciliation", "Mobile Header"); setMobileMenuOpen(false); }} aria-current={mobileNavLink("/tools/ais-26as-form16")["aria-current"]} className={`flex items-center gap-2 py-2.5 text-sm font-medium ${mobileNavLink("/tools/ais-26as-form16").className}`}>
              <FileText className="w-4 h-4" />AIS Reconciliation
            </Link>
            <Link href="/accounting" onClick={() => setMobileMenuOpen(false)} aria-current={mobileNavLink("/accounting")["aria-current"]} className={`py-2.5 text-sm font-medium block ${mobileNavLink("/accounting").className}`}>Accounting</Link>
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)} aria-current={mobileNavLink("/blog")["aria-current"]} className={`py-2.5 text-sm font-medium block ${mobileNavLink("/blog").className}`}>Guides</Link>
            <Link href="/find-ca" onClick={() => { trackButtonClick("Find a CA", "Mobile Header"); setMobileMenuOpen(false); }} aria-current={mobileNavLink("/find-ca")["aria-current"]} className={`flex items-center gap-2 py-2.5 text-sm font-medium ${mobileNavLink("/find-ca").className}`}>
              <UserCheck className="w-4 h-4" />Find a CA
            </Link>
            <Link href="/ca/register" onClick={() => { trackButtonClick("List Your Practice", "Mobile Header"); setMobileMenuOpen(false); }} aria-current={mobileNavLink("/ca/register")["aria-current"]} className={`py-2.5 text-sm font-medium block ${mobileNavLink("/ca/register").className}`}>
              For CAs — List Your Practice
            </Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)} aria-current={mobileNavLink("/about")["aria-current"]} className={`py-2.5 text-sm font-medium block ${mobileNavLink("/about").className}`}>About</Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} aria-current={mobileNavLink("/contact")["aria-current"]} className={`py-2.5 text-sm font-medium block ${mobileNavLink("/contact").className}`}>Contact</Link>

            <div className="pt-3 border-t border-rule space-y-2">
              <Link
                href="/calculators/income-tax"
                onClick={() => setMobileMenuOpen(false)}
                className="block bg-ink text-paper text-center text-sm font-medium px-4 py-3 rounded-full hover:bg-credit transition-colors"
              >
                Compute tax
              </Link>
              {isAuthenticated ? (
                <>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm text-ink/75">
                    <User className="w-4 h-4" />{t("nav.profile")}
                  </Link>
                  {adminLevel !== null && (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm text-persian-blue-700">
                      <Shield className="w-4 h-4" />{t("nav.adminPanel")}
                    </Link>
                  )}
                  <Button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    variant="outline"
                    className="w-full text-sm border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />{t("nav.logout")}
                  </Button>
                </>
              ) : (
                <Link
                  href={getLoginUrl()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block border border-rule text-ink/75 text-center text-sm font-medium px-4 py-3 rounded-full hover:bg-secondary transition-colors"
                >
                  {t("nav.login")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

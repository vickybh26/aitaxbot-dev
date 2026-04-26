import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { trackButtonClick } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/lib/firebase";
import logoImage from "@assets/aitaxbot-logo-lovable.png";
import {
  Menu, X, Calculator, LogOut, User, LayoutDashboard,
  Globe, Shield, ChevronDown,
} from "lucide-react";
import { useTranslation, type Lang } from "@/lib/i18n";

interface HeaderProps {
  showModal?: (modalType: string) => void;
}

export default function Header({ showModal }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { isAuthenticated, user, adminLevel } = useAuth();
  const [currentPath] = useLocation();
  const { t, lang, setLang } = useTranslation();
  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "hi" : "en";
    setLang(next);
    trackButtonClick(`Language: ${next}`, "Header");
  };

  const navLink =
    "text-slate-600 hover:text-slate-900 font-medium transition-colors text-sm";
  const dropItem =
    "flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors";

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
            <img
              src={logoImage}
              alt="AiTaxBot Logo"
              className="h-14 w-auto"
            />
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
              Blog
            </Link>

            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={`${navLink} flex items-center gap-1`}
              >
                More
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                  <Link href="/accounting" onClick={() => { trackButtonClick("Accounting", "Header More"); setMoreOpen(false); }} className={dropItem}>
                    Accounting
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
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
              data-testid="button-header-tax-calculator"
            >
              Tax Calculator
            </Link>

            {/* Language switcher */}
            <button
              onClick={toggleLang}
              className="text-xs font-semibold px-2 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              aria-label="Switch language"
              title={lang === "en" ? "हिंदी में बदलें" : "Switch to English"}
            >
              {lang === "en" ? t("lang.hi") : t("lang.en")}
            </button>

            {/* Auth: user dropdown OR login */}
            {isAuthenticated ? (
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  data-testid="button-user-menu"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userOpen ? "rotate-180" : ""}`} />
                </button>
                {userOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                    {isAuthenticated && (
                      <Link href="/dashboard" onClick={() => { trackButtonClick("Dashboard", "User Menu"); setUserOpen(false); }} className={dropItem} data-testid="link-header-dashboard">
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        Dashboard
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setUserOpen(false)} className={dropItem} data-testid="link-header-profile">
                      <User className="w-4 h-4 text-slate-400" />
                      {t("nav.profile")}
                    </Link>
                    {adminLevel !== null && (
                      <Link href="/admin" onClick={() => setUserOpen(false)} className={`${dropItem} text-indigo-600`} data-testid="link-header-admin">
                        <Shield className="w-4 h-4 text-indigo-400" />
                        {t("nav.adminPanel")}
                      </Link>
                    )}
                    <div className="border-t border-slate-100 my-1" />
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
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                data-testid="link-header-login"
              >
                {t("nav.login")}
              </Link>
            )}
          </nav>

          {/* ── Mobile Menu Button ── */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="text-xs font-semibold px-2 py-1 rounded border border-slate-200 text-slate-600"
              aria-label="Switch language"
            >
              {lang === "en" ? t("lang.hi") : t("lang.en")}
            </button>
            <button
              className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
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
        <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-5 py-4 space-y-1">
            {isAuthenticated && (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2.5 text-sm font-medium text-slate-700">
                <LayoutDashboard className="w-4 h-4" />{t("nav.dashboard")}
              </Link>
            )}
            <Link href="/calculators" onClick={() => { trackButtonClick("Calculators", "Mobile Header"); setMobileMenuOpen(false); }} className="flex items-center gap-2 py-2.5 text-sm font-medium text-slate-700">
              <Calculator className="w-4 h-4" />Calculators
            </Link>
            <Link href="/nri" onClick={() => { trackButtonClick("NRI", "Mobile Header"); setMobileMenuOpen(false); }} className="flex items-center gap-2 py-2.5 text-sm font-medium text-slate-700">
              <Globe className="w-4 h-4" />NRI
            </Link>
            <Link href="/accounting" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-sm font-medium text-slate-700 block">Accounting</Link>
            <Link href="/blog" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-sm font-medium text-slate-700 block">Blog</Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-sm font-medium text-slate-700 block">About</Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-sm font-medium text-slate-700 block">Contact</Link>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Link
                href="/calculators/income-tax"
                onClick={() => setMobileMenuOpen(false)}
                className="block bg-blue-600 text-white text-center text-sm font-medium px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tax Calculator
              </Link>
              {isAuthenticated ? (
                <>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm text-slate-700">
                    <User className="w-4 h-4" />{t("nav.profile")}
                  </Link>
                  {adminLevel !== null && (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm text-indigo-600">
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
                  className="block bg-green-600 text-white text-center text-sm font-medium px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
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

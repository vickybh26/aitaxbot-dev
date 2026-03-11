// ─────────────────────────────────────────────────────────────────────────────
// English translations
// ─────────────────────────────────────────────────────────────────────────────

const en = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  nav: {
    dashboard:     "Dashboard",
    calculators:   "Calculators",
    nri:           "NRI",
    accounting:    "Accounting",
    blog:          "Blog",
    about:         "About",
    contact:       "Contact",
    taxCalculator: "Tax Calculator",
    login:         "Login",
    logout:        "Logout",
    profile:       "Profile",
    myProfile:     "My Profile",
    adminPanel:    "Admin Panel",
    nriCorner:     "NRI Corner",
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    tagline:        "Your partner in financial growth. Making money simple with smart AI tools and real-time market data.",
    calculators:    "Calculators",
    incomeTax:      "Income Tax Calculator",
    hra:            "HRA Calculator",
    sip:            "SIP Calculator",
    swp:            "SWP Calculator",
    pf:             "PF Calculator",
    marketTools:    "Market Tools",
    mutualFunds:    "Mutual Funds",
    stockQuotes:    "Stock Quotes",
    marketNews:     "Market News",
    ipoAnalyzer:    "IPO Analyzer",
    legalSupport:   "Legal & Support",
    privacyPolicy:  "Privacy Policy",
    termsOfService: "Terms of Service",
    contactSupport: "Contact Support",
    copyright:      "© 2026 AiTaxBot. All rights reserved. Built with real financial APIs.",
  },

  // ── Landing / Hero ───────────────────────────────────────────────────────────
  hero: {
    badge:       "AI-Powered • CA-Reviewed • Always Free",
    headline:    "Smart Tax Calculator for\nIndian Taxpayers",
    subheadline: "Calculate your tax liability in minutes — compare Old vs New Regime, estimate deductions, and get personalised AI suggestions. Built for salaried employees, freelancers, and investors.",
    cta:         "Calculate Tax Now",
    ctaFree:     "100% Free — no signup needed",
    trustBadge:  "Trusted by {count}+ taxpayers",
  },

  // ── Common UI ────────────────────────────────────────────────────────────────
  common: {
    calculate:    "Calculate",
    download:     "Download",
    reset:        "Reset",
    submit:       "Submit",
    loading:      "Loading…",
    required:     "Required",
    optional:     "Optional",
    learnMore:    "Learn More",
    viewAll:      "View All",
    back:         "Back",
    save:         "Save",
    cancel:       "Cancel",
    yes:          "Yes",
    no:           "No",
    rupee:        "₹",
    perYear:      "per year",
    perMonth:     "per month",
  },

  // ── Language switcher ────────────────────────────────────────────────────────
  lang: {
    en: "EN",
    hi: "हिंदी",
  },
} as const;

export default en;
export type Translations = typeof en;

import { Link } from "wouter";
import { Linkedin, Instagram } from "lucide-react";
import logoImagePng from "@assets/aitaxbot-logo-white.png";
import logoImageWebP from "@assets/aitaxbot-logo-white.webp";

export default function Footer() {
  const calculators: [string, string][] = [
    ["Income Tax", "/calculators/income-tax"],
    ["HRA Calculator", "/calculators/hra"],
    ["SIP Calculator", "/calculators/sip"],
    ["SWP Calculator", "/calculators/swp"],
    ["NPS Calculator", "/calculators/nps"],
    ["PF Calculator", "/calculators/pf"],
    ["Home Loan", "/calculators/home-loan"],
    ["Trading Tax", "/calculators/trading-tax"],
  ];

  const tools: [string, string][] = [
    ["Rent Receipt", "/tools/rent-receipt"],
    ["AIS Reconciliation", "/tools/ais-26as-form16"],
    ["Find a CA", "/find-ca"],
    ["NRI Corner", "/nri"],
    ["GST Invoicing", "/accounting"],
    ["Tax Guides", "/blog"],
  ];

  // Supply side of the CA directory. Until now /ca/register was linked from
  // exactly two places, both inside /find-ca — a page built for taxpayers, so
  // no Chartered Accountant ever reached the registration form. The directory
  // sat on a single profile for two months as a result.
  const forCAs: [string, string][] = [
    ["List Your Practice", "/ca/register"],
    ["My CA Profile", "/ca/my-profile"],
    ["Browse the Directory", "/find-ca"],
  ];

  const company: [string, string][] = [
    ["About Us", "/about"],
    ["Contact", "/contact"],
    ["Privacy Policy", "/privacy-policy"],
    ["Terms of Service", "/terms-of-service"],
  ];

  return (
    <>
      {/* Disclaimer */}
      <div className="py-4 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Calculations are indicative only — not professional tax advice. AiTaxBot is not affiliated with the Income Tax Department or CBDT.{" "}
            <Link href="/privacy-policy" className="underline hover:text-slate-600">Privacy Policy</Link>
            {" · "}
            <Link href="/about" className="underline hover:text-slate-600">About Us</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-12 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">

            {/* Brand column */}
            <div>
              <Link href="/" aria-label="AiTaxBot home">
                <picture>
                  <source srcSet={logoImageWebP} type="image/webp" />
                  <img
                    src={logoImagePng}
                    alt="AiTaxBot"
                    className="h-16 w-auto mb-3"
                    width={328}
                    height={200}
                    loading="lazy"
                    data-testid="logo-footer"
                  />
                </picture>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                AI-powered tax tools for India. CA-reviewed, IT Act 2025 ready.
              </p>
              <div className="flex gap-2">
                <a
                  href="https://www.linkedin.com/company/aitaxbot/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2 transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://www.instagram.com/aitaxbot/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2 transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Calculators column */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                Calculators
              </h4>
              <ul className="space-y-2.5">
                {calculators.map(([name, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools & Services column */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                Tools &amp; Services
              </h4>
              <ul className="space-y-2.5">
                {tools.map(([name, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* For CAs column — the supply-side entry point for the directory */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                For CAs
              </h4>
              <ul className="space-y-2.5">
                {forCAs.map(([name, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Free listing. No platform fee, no commission.
              </p>
            </div>

            {/* Company column */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                Company
              </h4>
              <ul className="space-y-2.5">
                {company.map(([name, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-3 bg-slate-800 rounded-lg">
                {/* One address, on the canonical domain. There used to be two —
                    info@aitaxbot.in and admin@aitaxbot.co.in — with no
                    indication of which to use for what. On a page where people
                    are deciding whether to trust you with financial data, a
                    second address on a different TLD reads as either a typo or
                    a different organisation. */}
                <p className="text-xs text-slate-400 mb-1">Email us</p>
                <a
                  href="mailto:admin@aitaxbot.co.in"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  admin@aitaxbot.co.in
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} AiTaxBot. Not affiliated with CBDT or the Income Tax Department of India.
            </p>
            <p className="text-xs text-slate-500">
              FY 2026-27 / AY 2027-28 Compliant · IT Act 2025 Ready
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

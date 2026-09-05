import { Link } from "wouter";
import logoImagePng from "@assets/aitaxbot-logo-white.png";
import logoImageWebP from "@assets/aitaxbot-logo-white.webp";

/**
 * Word-for-word port of Lovable's footer card (2026-09-05) — same
 * rounded-[2rem] bg-ink card, same 4-column grid, same copy. Two
 * deliberate departures from their exact text, both to avoid regressing
 * something real:
 *  - Email is admin@aitaxbot.co.in, not their support@ — that's the one
 *    address every backend flow (Brevo, grievance officer, DPDP contact)
 *    is already wired to.
 *  - The bottom disclaimer keeps our "not affiliated with CBDT or the
 *    Income Tax Department" line appended to theirs — a real compliance
 *    disclaimer their static demo has no reason to carry.
 * The "For CAs" column this replaces (the CA-directory supply-side entry
 * point) still lives in the header's "More" dropdown, desktop and mobile —
 * see Header.tsx — so that path isn't lost, just no longer duplicated here.
 */
export default function Footer() {
  const calculators: [string, string][] = [
    ["Income Tax", "/calculators/income-tax"],
    ["HRA Exemption", "/calculators/hra"],
    ["SIP", "/calculators/sip"],
    ["NPS", "/calculators/nps"],
    ["Full index", "/calculators"],
  ];

  const tools: [string, string][] = [
    ["AIS / 26AS / Form 16", "/tools/ais-26as-form16"],
    ["Rent Receipts", "/tools/rent-receipt"],
    ["CA Directory", "/find-ca"],
    ["NRI Corner", "/nri"],
  ];

  const company: [string, string][] = [
    ["About", "/about"],
    ["Guides", "/blog"],
    ["Contact", "/contact"],
    ["Privacy", "/privacy-policy"],
    ["Terms", "/terms-of-service"],
  ];

  return (
    <footer className="px-4 pb-6 pt-10">
      <div className="mx-auto max-w-[1180px] rounded-[2rem] bg-ink px-7 py-12 text-paper sm:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="AiTaxBot home">
              <picture>
                <source srcSet={logoImageWebP} type="image/webp" />
                <img src={logoImagePng} alt="AiTaxBot" className="h-9 w-auto" width={320} height={195} loading="lazy" />
              </picture>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-paper/65">
              Indian tax computation, reviewed by practising Chartered Accountants — for FY 2026-27
              (AY 2027-28) under the Income Tax Act 2025.
            </p>
            <a
              href="mailto:admin@aitaxbot.co.in"
              className="mt-5 inline-block rounded-full bg-paper/10 px-4 py-2 text-sm text-paper/85 transition-colors hover:bg-paper/20 hover:text-paper"
            >
              admin@aitaxbot.co.in
            </a>
          </div>

          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/50">Calculators</h2>
            <ul className="mt-4 space-y-2.5">
              {calculators.map(([name, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-paper/70 transition-colors hover:text-paper">{name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/50">Tools</h2>
            <ul className="mt-4 space-y-2.5">
              {tools.map(([name, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-paper/70 transition-colors hover:text-paper">{name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/50">Company</h2>
            <ul className="mt-4 space-y-2.5">
              {company.map(([name, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-paper/70 transition-colors hover:text-paper">{name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 grid gap-4 border-t border-paper/15 pt-6 text-xs leading-relaxed text-paper/45 md:grid-cols-[1fr_auto]">
          <p className="max-w-2xl">
            Figures produced here are informational computations, not professional advice. Verify
            against your Form 16, AIS and 26AS, or consult a qualified Chartered Accountant, before
            filing. AiTaxBot is not affiliated with the Income Tax Department or CBDT.
          </p>
          <p>© {new Date().getFullYear()} AiTaxBot</p>
        </div>
      </div>
    </footer>
  );
}

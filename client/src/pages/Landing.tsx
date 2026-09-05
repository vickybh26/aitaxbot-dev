import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import {
  FileSpreadsheet,
  ShieldCheck,
  House,
  Receipt,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import { generateHomePageSchema } from "@/lib/structuredData";
import TaxCalculator from "@/components/calculators/TaxCalculator";
import KeyDates from "@/components/KeyDates";
import HRACalculator from "@/components/calculators/HRACalculator";
import SIPCalculator from "@/components/calculators/SIPCalculator";
import SWPCalculator from "@/components/calculators/SWPCalculator";

interface LandingProps {
  activeModal?: string | null;
  setActiveModal?: (modal: string | null) => void;
}

/**
 * This whole page is a word-for-word structural port of Lovable's homepage
 * (clear-tax-answers.lovable.app, "Warm Ledger" extended layout, ported
 * 2026-09-05 per explicit request to match it exactly, section for
 * section, markup for markup). The one line drawn: numbers and factual
 * claims are still ours, never theirs — see calcTax below and the two
 * tool-card descriptions that were adjusted because the Lovable copy
 * described behaviour our calculators don't actually have (noted inline).
 */
const TOOLS = [
  {
    icon: FileSpreadsheet,
    badge: "Core",
    name: "Income Tax Computation",
    desc: "Slab-by-slab working for both regimes, with surcharge, marginal relief, cess and the 87A rebate as separate lines.",
    href: "/calculators/income-tax",
  },
  {
    icon: ShieldCheck,
    badge: "New",
    name: "AIS · 26AS · Form 16",
    desc: "Upload all three and see, line by line, where the department's records disagree with your salary certificate.",
    href: "/tools/ais-26as-form16",
  },
  {
    icon: House,
    badge: null,
    name: "HRA Exemption",
    // Lovable's copy here read "computed month by month for mid-year rent or
    // city changes" — our HRA calculator takes one annual figure, it doesn't
    // do a monthly breakdown, so that claim would be false for this product.
    // Replaced with what the calculator actually does.
    desc: "The least-of-three test under Section 10(13A), with the 8-metro-city rule applied automatically.",
    href: "/calculators/hra",
  },
  {
    icon: Receipt,
    badge: null,
    name: "Rent Receipt Generator",
    desc: "Dated, numbered receipts with landlord PAN handling, formatted the way payroll teams expect them.",
    href: "/tools/rent-receipt",
  },
  {
    icon: TrendingUp,
    badge: null,
    name: "SIP Projection",
    desc: "Maturity value of a monthly investment plan, with the invested amount and gain separated.",
    href: "/calculators/sip",
  },
  {
    icon: PiggyBank,
    badge: null,
    name: "NPS Corpus & Annuity",
    desc: "Corpus at 60, the annuity you can expect, and the extra ₹50,000 deduction under 80CCD(1B).",
    href: "/calculators/nps",
  },
] as const;

function slab(income: number, tiers: [number, number][]): number {
  let tax = 0, prev = 0;
  for (const [cap, rate] of tiers) {
    if (income > prev) { tax += (Math.min(income, cap) - prev) * rate; prev = cap; }
    else break;
  }
  return tax;
}

function calcTax(gross: number) {
  const tN = Math.max(0, gross - 75000);
  let nt = slab(tN, [[400000,0],[800000,0.05],[1200000,0.10],[1600000,0.15],[2000000,0.20],[2400000,0.25],[Infinity,0.30]]);
  if (tN <= 1200000) nt = 0;
  nt = Math.round(nt * 1.04);
  const tO = Math.max(0, gross - 200000);
  let ot = slab(tO, [[250000,0],[500000,0.05],[1000000,0.20],[Infinity,0.30]]);
  if (tO <= 500000) ot = 0;
  ot = Math.round(ot * 1.04);
  const newBetter = nt <= ot;
  return { oldTax: ot, newTax: nt, saving: Math.abs(ot - nt), newBetter };
}

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

const useAnimatedNumber = (target: number, duration = 600): number => {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const start = prevRef.current;
    const diff = target - start;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * ease));
      if (p < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { prevRef.current = target; setDisplay(target); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return display;
};

function RegimeComparisonCard() {
  const [salary, setSalary] = useState(1500000);
  const result = calcTax(salary);
  const animSaving = useAnimatedNumber(result.saving);
  const maxTax = Math.max(result.oldTax, result.newTax) || 1;
  const oldPct = (result.oldTax / maxTax) * 100;
  const newPct = (result.newTax / maxTax) * 100;

  return (
    <div className="bento p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Regime comparison</h2>
        <span className="rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-ink/70">
          FY 2026-27 · AY 2027-28
        </span>
      </div>
      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label htmlFor="savings-income" className="field-label mb-2 block">
              Annual gross income
            </label>
            <div className="rounded-2xl bg-paper px-5 py-4">
              <div className="tabular-figures font-display text-3xl font-bold leading-none">{inr(salary)}</div>
              <input
                id="savings-income"
                type="range"
                min={300000}
                max={5000000}
                step={50000}
                value={salary}
                onChange={(e) => setSalary(+e.target.value)}
                className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-credit"
              />
              <div className="mt-2 flex justify-between text-[11px] font-medium text-ink/45">
                <span>₹3,00,000</span>
                <span>₹50,00,000</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-paper p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Old regime tax</span>
              <span className="tabular-figures font-display text-lg font-bold">{inr(result.oldTax)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${oldPct}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="rounded-[1.5rem] bg-credit p-7 text-paper">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-paper/80">
              Difference in your favour
            </span>
            <div className="tabular-figures font-display text-4xl font-extrabold leading-none">{inr(animSaving)}</div>
            <p className="mt-2 text-sm text-paper/85">
              By choosing the {result.newBetter ? "new" : "old"} regime · assumes ₹1,50,000 under 80C
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-credit">New regime tax</span>
              <span className="tabular-figures font-display text-lg font-bold text-credit">{inr(result.newTax)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-credit transition-[width] duration-500" style={{ width: `${newPct}%` }} />
            </div>
          </div>
        </div>
      </div>
      <Link
        href="/calculators/income-tax"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-ink/90"
      >
        See the full computation <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

export default function Landing({ activeModal, setActiveModal }: LandingProps) {
  useEffect(() => { trackPageView("/", "Home - AiTaxBot"); }, []);
  const closeModal = () => setActiveModal?.(null);

  return (
    <>
      <Helmet>
        <title>AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28</title>
        <meta name="description" content="AI-powered tax calculator for India. Compare old vs new regime, ₹12L tax-free under Section 87A. Free SIP, SWP, HRA, PF calculators. CA-reviewed. FY 2026-27 & AY 2027-28 ready." />
        <meta name="keywords" content="income tax calculator, tax calculator India, new tax regime, old tax regime, SIP calculator, HRA calculator, AY 2027-28, Income Tax Act 2025" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/" />
        <meta property="og:title" content="AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28" />
        <meta property="og:description" content="AI-powered income tax calculator with ₹12L tax-free limit. CA-reviewed calculators for salaried, freelancers & investors. Income Tax Act 2025 ready." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aitaxbot.co.in/" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(generateHomePageSchema())}</script>
      </Helmet>

      <div className="mx-auto grid max-w-[1180px] grid-cols-12 gap-5 px-5 py-10 sm:gap-6 lg:py-14">
        {/* Hero */}
        <div className="col-span-12 mb-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-ink/70">
            <span className="h-1.5 w-1.5 rounded-full bg-credit" aria-hidden="true" />
            For individual taxpayers · AY 2027-28
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight">
            Maximise your savings, <span className="text-credit">minus the complexity.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/70">
            Every figure on AiTaxBot arrives with the line of the Act behind it. Compare the old and
            new regimes, reconcile your AIS against Form 16, and see exactly where each rupee of
            liability comes from.
          </p>
        </div>

        {/* Regime comparison */}
        <div className="col-span-12 lg:col-span-8">
          <RegimeComparisonCard />
        </div>

        {/* Dates to watch */}
        <div className="col-span-12 lg:col-span-4">
          <KeyDates />
        </div>

        {/* Everything you need */}
        <div className="col-span-12 mt-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Everything you need</h2>
          <Link href="/calculators" className="text-sm font-semibold text-credit underline-offset-4 hover:underline">
            View all 11 tools →
          </Link>
        </div>

        {/* Tools grid */}
        <div className="col-span-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ icon: Icon, badge, name, desc, href }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-[1.5rem] border border-rule bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-credit hover:shadow-[0_16px_34px_-18px] hover:shadow-ink/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-ink transition-colors group-hover:bg-credit/10 group-hover:text-credit">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                {badge && (
                  <span
                    className={
                      badge === "New"
                        ? "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-credit/10 text-credit"
                        : "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-secondary text-ink/60"
                    }
                  >
                    {badge}
                  </span>
                )}
              </div>
              <h3 className="mt-5 font-display text-base font-bold">{name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{desc}</p>
            </Link>
          ))}
        </div>

        {/* How the numbers are checked */}
        <div className="col-span-12 mt-4 rounded-[2rem] border border-rule bg-card p-8 sm:p-10">
          <h2 className="font-display text-2xl font-bold">How the numbers are checked</h2>
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="font-display text-base font-bold">Reviewed by CAs</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                Each computation is signed off against the bare Act and the current Finance Act before it ships.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold">Both Acts supported</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                Income Tax Act 1961 and the Income Tax Act 2025 run side by side through the transition years.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold">Working shown</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                Slabs, surcharge, marginal relief and cess appear as separate lines you can audit.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold">Private by default</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                Calculations run in your browser as a guest. Once you sign in, your result and figures
                are saved to your account automatically so your dashboard can show your history.
              </p>
            </div>
          </div>
        </div>
      </div>

      {activeModal === "tax-calculator" && <TaxCalculator onClose={closeModal} />}
      {activeModal === "hra-calculator" && <HRACalculator onClose={closeModal} onApplyHRA={() => {}} />}
      {activeModal === "sip-calculator" && <SIPCalculator onClose={closeModal} />}
      {activeModal === "swp-calculator" && <SWPCalculator onClose={closeModal} />}
    </>
  );
}

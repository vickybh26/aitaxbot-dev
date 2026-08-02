import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  TrendingUp,
  ArrowRight,
  FileText,
  PiggyBank,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  Newspaper,
  Home as HomeIcon,
  Send,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Instagram,
  BookOpen,
  BarChart2,
  Users,
  ChevronDown,
  UserCheck,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/aitaxbot-logo-lovable.png";
import { trackPageView } from "@/lib/analytics";
import { generateHomePageSchema } from "@/lib/structuredData";
import { blogPosts } from "@/data/blogPosts";
import { useTranslation } from "@/lib/i18n";
import TaxCalculator from "@/components/calculators/TaxCalculator";
import HRACalculator from "@/components/calculators/HRACalculator";
import SIPCalculator from "@/components/calculators/SIPCalculator";
import SWPCalculator from "@/components/calculators/SWPCalculator";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  date: string;
  snippet?: string;
  thumbnail?: string;
}

interface LandingProps {
  activeModal?: string | null;
  setActiveModal?: (modal: string | null) => void;
}

const latestBlogPosts = [...blogPosts]
  .reverse()
  .slice(0, 3)
  .map(p => ({
    slug: p.slug,
    title: p.metaTitle.replace(/\s*[|—–-]\s*AiTaxBot.*$/i, "").trim(),
    readTime: `${p.readingTimeMinutes} min`,
    tag: p.tags[0] || "General",
  }));

const TOOLS = [
  { icon: Calculator, name: "Income Tax Calculator",  desc: "Old vs New Regime, 87A rebate, cess — AY 2027-28 ready.",                href: "/calculators/income-tax",  color: "text-blue-600",         bg: "bg-blue-50",         badge: "Popular" },
  { icon: HomeIcon,   name: "HRA Calculator",         desc: "Section 10(13A) — 8 metro cities, actual rent, IT Act 2025.",            href: "/calculators/hra",         color: "text-violet-600",       bg: "bg-violet-50"        },
  { icon: TrendingUp, name: "SIP Calculator",         desc: "Project mutual fund corpus with annual step-ups.",                       href: "/calculators/sip",         color: "text-cyan-600",         bg: "bg-cyan-50"          },
  { icon: PiggyBank,  name: "NPS Calculator",         desc: "Model retirement corpus + ₹50K extra deduction under 80CCD(1B).", href: "/calculators/nps",         color: "text-emerald-600",      bg: "bg-emerald-50"       },
  { icon: BarChart2,  name: "Trading Tax Calculator", desc: "STCG, LTCG and F&O tax for equity, MF, and VDA under IT Act 2025.",     href: "/calculators/trading-tax", color: "text-red-500",          bg: "bg-red-50"           },
  { icon: FileText,   name: "Rent Receipt Generator", desc: "Generate stamped, AO-ready rent receipts as PDFs instantly.",           href: "/tools/rent-receipt",      color: "text-orange-500",       bg: "bg-orange-50"        },
  { icon: Layers,     name: "AIS · 26AS · Form 16", desc: "AI spots mismatches across all three documents before notices.", href: "/tools/ais-26as-form16", color: "text-persian-blue-600", bg: "bg-persian-blue-50", badge: "New" },
  { icon: UserCheck,  name: "Find a Verified CA",     desc: "Free introductions — capital gains, NRI filing, notice response.",      href: "/find-ca",                 color: "text-green-600",        bg: "bg-green-50"         },
  { icon: BookOpen,   name: "Tax Guides & Blog",      desc: "34 in-depth articles on ITR, HRA, capital gains, and IT Act 2025.",    href: "/blog",                    color: "text-persian-blue-700",       bg: "bg-persian-blue-50"        },
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

const useCountUp = (target: number, duration = 900) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / duration, 1);
          setCount(Math.round(p * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return { count, ref };
};

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

function SavingsCard() {
  const [salary, setSalary] = useState(1500000);
  const result = calcTax(salary);
  const animSaving = useAnimatedNumber(result.saving);
  const pct = ((salary - 300000) / (5000000 - 300000)) * 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.10),0 4px 8px rgba(0,0,0,0.08)" }}>
      <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Tax Savings Calculator</span>
        </div>
        <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">AY 2027-28</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500">Annual gross income</span>
          <span className="text-2xl font-black text-slate-900 tabular-nums">{inr(salary)}</span>
        </div>
        <div>
          <input
            type="range" min={300000} max={5000000} step={50000} value={salary}
            onChange={e => setSalary(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(90deg,#16a34a 0%,#16a34a ${pct}%,#e2e8f0 ${pct}%,#e2e8f0 100%)` }}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1.5"><span>₹3L</span><span>₹50L</span></div>
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {([
            { label: "New Regime", value: result.newTax, better: result.newBetter },
            { label: "Old Regime", value: result.oldTax, better: !result.newBetter },
          ] as const).map(({ label, value, better }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 bg-white">
              <span className="flex items-center gap-2 text-sm text-slate-600">
                {label}
                {better && <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">SAVES MORE</span>}
              </span>
              <span className={cn("text-base font-semibold tabular-nums", better ? "text-green-700" : "text-slate-400 line-through")}>{inr(value)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-5 text-white" style={{ background: "linear-gradient(135deg,#16a34a 0%,#22c55e 100%)" }}>
          <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1.5">You save vs the other regime</div>
          <div className="text-4xl font-black tabular-nums leading-none tracking-tight">{inr(animSaving)}</div>
          <div className="text-xs mt-2 opacity-80">Assumes ₹1.5L 80C claimed (Old Regime) · FY 2026-27</div>
        </div>
        <Link href="/calculators/income-tax"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
          <Calculator className="h-4 w-4" />See full computation<ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function Landing({ activeModal, setActiveModal }: LandingProps) {
  const { t } = useTranslation();
  useEffect(() => { trackPageView("/", "Home - AiTaxBot"); }, []);

  const { data: marketNewsData, isLoading: newsLoading } = useQuery<{ news: NewsItem[] }>({
    queryKey: ["/api/market-news"],
    refetchInterval: () => document.visibilityState === "visible" ? 7200000 : false,
    refetchOnWindowFocus: false,
  });

  const { data: calcStatsData } = useQuery<{ count: number }>({
    queryKey: ["/api/stats/calculations-count"],
    refetchInterval: false, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000,
  });
  const calcCount = calcStatsData?.count ?? 0;
  const calcCountDisplay = calcCount > 0 ? calcCount.toLocaleString("en-IN") + "+" : "10,000+";
  const closeModal = () => setActiveModal?.(null);

  const s1 = useCountUp(12);
  const s2 = useCountUp(75);
  const s3 = useCountUp(18);
  const s4 = useCountUp(5);

  return (
    <>
      <Helmet>
        <title>AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28</title>
        <meta name="description" content="AI-powered tax calculator for India. Compare old vs new regime, ₹12L tax-free under Section 87A. Free SIP, SWP, HRA, PF calculators. CA-reviewed. FY 2026-27 & AY 2027-28 ready." />
        <meta name="keywords" content="income tax calculator, tax calculator India, new tax regime, old tax regime, SIP calculator, HRA calculator, AY 2027-28, Income Tax Act 2025" />
        <link rel="canonical" href="https://aitaxbot.co.in/" />
        <meta property="og:title" content="AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28" />
        <meta property="og:description" content="AI-powered income tax calculator with ₹12L tax-free limit. CA-reviewed calculators for salaried, freelancers & investors. Income Tax Act 2025 ready." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitaxbot.co.in/" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(generateHomePageSchema())}</script>
      </Helmet>

      <div className="min-h-screen bg-white">

        {/* Trust Ribbon */}
        <div className="bg-slate-900 text-slate-300 text-xs py-2.5 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-5 whitespace-nowrap min-w-max">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />CA-reviewed calculators</span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />IT Act 2025 &amp; IT Act 1961 ready</span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5 text-orange-300 font-semibold"><Clock className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />ITR Deadline: July 31, 2026</span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />Runs in browser — data never stored</span>
          </div>
        </div>

        {/* Hero */}
        <section className="relative bg-white overflow-hidden">
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          <div className="relative max-w-7xl mx-auto px-4 py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <div className="mb-5">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                    FY 2026-27 · AY 2027-28 · IT Act 2025 Ready
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-5">
                  {t("hero.headline").split("\n")[0]}
                  <span className="block mt-2 text-blue-600">{t("hero.headline").split("\n")[1] ?? "Indian Taxpayers"}</span>
                </h1>
                <p className="text-base lg:text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">{t("hero.subheadline")}</p>
                <div className="flex flex-wrap gap-3 mb-8">
                  <Link href="/calculators/income-tax" data-testid="button-calculate-tax"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm">
                    <Calculator className="h-4 w-4" />{t("hero.cta")}
                  </Link>
                  <Link href="/tools/ais-26as-form16" data-testid="button-ais-recon"
                    className="inline-flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 font-semibold px-5 py-3.5 rounded-xl transition-colors text-sm">
                    <Layers className="h-4 w-4" />AIS Reconciliation
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">New</span>
                  </Link>
                  <Link href="/find-ca" data-testid="button-find-ca-hero"
                    className="inline-flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 font-semibold px-5 py-3.5 rounded-xl transition-colors text-sm">
                    <UserCheck className="h-4 w-4" />Find a CA
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />, text: t("hero.ctaFree") },
                    { icon: <Shield className="h-3.5 w-3.5 text-blue-500" />, text: "CA-reviewed" },
                    { icon: <Zap className="h-3.5 w-3.5 text-blue-500" />, text: "AI-powered" },
                    { icon: <BarChart2 className="h-3.5 w-3.5 text-orange-500" />, text: `${calcCountDisplay} calculations` },
                  ].map(({ icon, text }) => (
                    <span key={text} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                      {icon}{text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="lg:pl-4"><SavingsCard /></div>
            </div>
          </div>
        </section>

        {/* Stat Spine */}
        <div className="border-t border-b border-slate-200 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200">
              {[
                { val: `₹${s1.count}L`,  label: "Zero tax limit",     sub: "New Regime FY 2026-27",     ref: s1.ref },
                { val: `₹${s2.count}K`,  label: "Standard deduction", sub: "For salaried employees",    ref: s2.ref },
                { val: `${s3.count}+`,         label: "Free tools",         sub: "Calculators & generators",  ref: s3.ref },
                { val: `${s4.count} min`,       label: "Time to clarity",    sub: "ITR complexity decoded",    ref: s4.ref },
              ].map(({ val, label, sub, ref }) => (
                <div key={label} ref={ref} className="text-center px-6 py-8">
                  <div className="text-3xl font-black text-slate-900 tracking-tight mb-1">{val}</div>
                  <div className="text-sm font-semibold text-slate-700 mb-0.5">{label}</div>
                  <div className="text-xs text-slate-400">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">All Tools</p>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Everything you need for taxes &amp; investments</h2>
              <p className="text-slate-500 max-w-xl mx-auto text-sm">Calculators, document tools, CA directory — all free, all built for India.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TOOLS.map(({ icon: Icon, name, desc, href, color, bg, badge }: any) => (
                <Link key={href} href={href}
                  className="group flex gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-200">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110", bg)}>
                    <Icon className={cn("h-5 w-5", color)} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{name}</span>
                      {badge && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">{badge}</span>}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* AIS Recon Dark Section */}
        <section className="py-16 lg:py-20 bg-slate-900">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 bg-blue-900/50 border border-blue-800 px-3 py-1.5 rounded-full mb-5">
                  <Zap className="h-3 w-3" />AI-Powered Document Analysis
                </span>
                <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-5">
                  AIS · 26AS · Form 16
                  <span className="block text-blue-400">Reconciliation in minutes</span>
                </h2>
                <p className="text-slate-300 leading-relaxed mb-8 text-sm lg:text-base">
                  Upload all three PDFs. Our AI parses them in parallel, spots every mismatch, and flags which ones could trigger a notice — before you file.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    "Parses locked TRACES PDFs with AI — no manual entry",
                    "Flags income mismatches and TDS discrepancies",
                    "Classifies issues as Critical / Warning / Info",
                    "AI summary explains each gap in plain language",
                    "Download reconciliation report as PDF",
                  ].map(check => (
                    <div key={check} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-300">{check}</span>
                    </div>
                  ))}
                </div>
                <Link href="/tools/ais-26as-form16"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm">
                  <Layers className="h-4 w-4" />Try AIS Reconciliation<ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div>
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-slate-600" />
                      <div className="w-3 h-3 rounded-full bg-slate-600" />
                      <div className="w-3 h-3 rounded-full bg-slate-600" />
                    </div>
                    <span className="text-xs text-slate-500 ml-2">AIS Reconciliation Report</span>
                  </div>
                  <div className="p-5 space-y-2.5">
                    {[
                      { label: "Gross Salary",    ais: "₹8,20,000", f16: "₹8,20,000", ok: true  },
                      { label: "Interest (Bank)", ais: "₹12,400",   f16: "—",          ok: false },
                      { label: "TDS Deducted",    ais: "₹82,000",   f16: "₹82,000",   ok: true  },
                      { label: "Dividend Income", ais: "₹3,800",    f16: "—",          ok: false },
                    ].map(({ label, ais, f16, ok }) => (
                      <div key={label} className={cn("flex items-center justify-between px-3 py-2.5 rounded-lg text-xs", ok ? "bg-green-900/30 border border-green-800/50" : "bg-red-900/30 border border-red-800/50")}>
                        <span className="text-slate-300 font-medium">{label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 tabular-nums">{ais}</span>
                          <span className="text-slate-400 tabular-nums">{f16}</span>
                          <span className={cn("font-bold text-base leading-none", ok ? "text-green-400" : "text-red-400")}>{ok ? "✓" : "⚠"}</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-700">
                      <span className="text-red-400 font-semibold">2 discrepancies found</span>
                      <span className="text-slate-500">AIS · 26AS · Form 16</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Posts */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Tax Guides &amp; Blog</p>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Latest from AiTaxBot</h2>
              </div>
              <Link href="/blog" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                View all 34 guides <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {latestBlogPosts.map(post => (
                <Link key={post.slug} href={`/blog/${post.slug}`}
                  className="group block bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md p-6 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold border border-blue-100">{post.tag}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" />{post.readTime}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2 mb-3">{post.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
                    Read guide <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">View all 34 guides <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        {/* Tax News */}
        {(newsLoading || (marketNewsData?.news?.length ?? 0) > 0) && (
          <section className="py-10 border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center gap-2 mb-5">
                <Newspaper className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Tax &amp; Finance News</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {newsLoading
                  ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="animate-pulse bg-slate-100 rounded-xl p-4 h-20" />)
                  : marketNewsData!.news.slice(0, 6).map((item: NewsItem, i: number) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                      data-testid={`news-card-${i}`}>
                      <h4 className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">{item.title}</h4>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-medium truncate max-w-[120px]">{item.source}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.date}</span>
                      </div>
                    </a>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Find a CA */}
        <section className="py-12 lg:py-16 bg-blue-50 border-t border-blue-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">CA Directory</p>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">Need a CA for ITR filing?</h2>
                <p className="text-slate-600 max-w-lg text-sm leading-relaxed">
                  Connect with a verified, practicing Chartered Accountant near you — for complex ITR, capital gains, NRI filing, or notice responses. Free introduction.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4 text-green-500" />ICAI-verified Chartered Accountants</div>
                  <div className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4 text-green-500" />Free introduction — no platform fees</div>
                  <div className="flex items-center gap-2 text-sm text-orange-700"><Clock className="h-4 w-4 text-orange-500" />Deadline: July 31, 2026 — act now</div>
                </div>
                <Link href="/find-ca"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm">
                  <UserCheck className="h-4 w-4" />Find a CA near you<ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Band */}
        <section className="py-14 lg:py-16" style={{ background: "linear-gradient(135deg,#4685d8 0%,#2563eb 100%)" }}>
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">Ready to file smarter?</h2>
            <p className="text-white/80 mb-8 text-base max-w-xl mx-auto">Free calculators, CA-reviewed logic, AI document reconciliation — all in one place.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/calculators/income-tax"
                className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-slate-50 font-bold px-7 py-3.5 rounded-xl transition-colors text-sm">
                <Calculator className="h-4 w-4" />Calculate My Tax
              </Link>
              <Link href="/tools/ais-26as-form16"
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white/40 hover:border-white/80 text-white font-bold px-7 py-3.5 rounded-xl transition-colors text-sm">
                <Layers className="h-4 w-4" />Reconcile Documents
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">How It Works</p>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">3 simple steps to your tax answer</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { num: "01", icon: <FileText className="h-6 w-6 text-blue-600" />,     bg: "bg-blue-50",    title: "Enter your income",  desc: "Input your salary, business, capital gains, or other income. Takes 10 seconds." },
                { num: "02", icon: <Calculator className="h-6 w-6 text-emerald-600" />, bg: "bg-emerald-50", title: "Enter deductions",    desc: "Add 80C, HRA, home loan interest — only what applies to you." },
                { num: "03", icon: <BarChart2 className="h-6 w-6 text-orange-500" />,   bg: "bg-orange-50",  title: "See your result",     desc: "Get a side-by-side Old vs New Regime comparison with personalized AI tax tips." },
              ].map(({ num, icon, bg, title, desc }) => (
                <div key={num} className="relative p-6 bg-white rounded-2xl border border-slate-200">
                  <div className="text-6xl font-black text-slate-100 absolute top-4 right-4 leading-none select-none">{num}</div>
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", bg)}>{icon}</div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 border-t border-slate-100" id="faq">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">FAQ</p>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Frequently asked questions</h2>
            </div>
            <div className="space-y-3">
              {[
                { q: "Which regime — Old or New — is better for me?", a: "It depends on your deductions. If your total 80C + HRA + home loan deductions exceed ₹3.75 lakh, the Old Regime usually saves more. Below that threshold, the New Regime is typically better. Use our calculator above to get your exact answer in seconds." },
                { q: "Is income up to ₹12 lakh really tax-free in FY 2026-27?", a: "Yes — under the New Regime for FY 2026-27, the rebate under Section 87A has been enhanced so that taxpayers with net taxable income up to ₹12 lakh pay zero tax. The ₹75,000 standard deduction means a salaried person earning up to ₹12.75 lakh pays no tax." },
                { q: "What is the 87A rebate and am I eligible?", a: "Section 87A gives a full rebate on tax if your net taxable income is within the specified limit (₹12 lakh under New Regime for FY 2026-27). Our calculator automatically applies this rebate and shows you whether you qualify." },
                { q: "Can I switch between Old and New Regime every year?", a: "Salaried individuals with no business income can choose their regime every year at the time of filing. If you have business or professional income, you can switch only once. Our calculator shows you both options so you can decide each year." },
                { q: "Is the data I enter in the calculator saved anywhere?", a: "No. AiTaxBot calculators run entirely in your browser. Your income and deduction details are never sent to our servers or stored in any database." },
                { q: "How is AY (Assessment Year) different from FY (Financial Year)?", a: "Financial Year (FY) is when you earn the income — e.g., FY 2026-27 runs April 2026 to March 2027. Assessment Year (AY) is when you file and pay tax on that income — so AY 2027-28 corresponds to FY 2026-27." },
              ].map(({ q, a }, i) => (
                <details key={i} className="group rounded-xl border border-slate-200 bg-white open:border-blue-200 transition-all">
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden focus:outline-none">
                    {q}<ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 pt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100">{a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Get in Touch</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"><Mail className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Email</p>
                  <div className="flex flex-col">
                    <a href="mailto:info@aitaxbot.in" className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                      info@aitaxbot.in
                    </a>
                    <a href="mailto:admin@aitaxbot.co.in" className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                      admin@aitaxbot.co.in
                    </a>
                  </div>
                </div>
              </div>
              <a href="tel:+917899869036" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-green-200 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0"><Phone className="h-5 w-5 text-green-600" /></div>
                <div><p className="text-xs text-slate-500 mb-0.5">Phone</p><p className="text-sm font-semibold text-slate-800 group-hover:text-green-600 transition-colors">+91 78998 69036</p></div>
              </a>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0"><MapPin className="h-5 w-5 text-orange-500" /></div>
                <div><p className="text-xs text-slate-500 mb-0.5">Location</p><p className="text-sm font-semibold text-slate-800">Bengaluru, India</p></div>
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Follow:</span>
                <a href="https://www.linkedin.com/company/aitaxbot/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-2 transition-colors"><Linkedin className="h-4 w-4" /></a>
                <a href="https://www.instagram.com/aitaxbot/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="bg-pink-100 hover:bg-pink-200 text-pink-600 rounded-full p-2 transition-colors"><Instagram className="h-4 w-4" /></a>
              </div>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                <Send className="h-4 w-4" />Send a Message
              </Link>
            </div>
          </div>
        </section>

        {activeModal === "tax-calculator" && <TaxCalculator onClose={closeModal} />}
        {activeModal === "hra-calculator" && <HRACalculator onClose={closeModal} onApplyHRA={() => {}} />}
        {activeModal === "sip-calculator" && <SIPCalculator onClose={closeModal} />}
        {activeModal === "swp-calculator" && <SWPCalculator onClose={closeModal} />}

      </div>
    </>
  );
}

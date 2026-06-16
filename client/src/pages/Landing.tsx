import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
  Home as HomeIcon,
  Send,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Instagram,
  AlertCircle,
  Info,
  BookOpen,
  BarChart2,
  Users,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/aitaxbot-logo-lovable.png";
import { trackPageView } from "@/lib/analytics";
import { generateHomePageSchema } from "@/lib/structuredData";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { blogPosts } from "@/data/blogPosts";
import { useTranslation } from "@/lib/i18n";

// Import calculator components
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

// ── Latest 3 blog posts for sidebar ──────────────────────────────────────────
const latestBlogPosts = [...blogPosts]
  .reverse()
  .slice(0, 3)
  .map(p => ({
    slug: p.slug,
    title: p.metaTitle.replace(/\s*[|—–-]\s*AiTaxBot.*$/i, "").trim(),
    readTime: `${p.readingTimeMinutes} min`,
    tag: p.tags[0] || "General",
    publishedAt: p.publishedAt,
  }));

// ── Count-up hook (fires once when element enters viewport) ──────────────────
function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.round(progress * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

export default function Landing({ activeModal, setActiveModal }: LandingProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  // Count-up refs for hero stats
  const stat1 = useCountUp(12);
  const stat2 = useCountUp(150);
  const stat3 = useCountUp(75);
  const stat4 = useCountUp(30);

  // Contact form state
  const [contactFormData, setContactFormData] = useState({
    name: "", email: "", subject: "", message: "",
  });

  const contactMutation = useMutation({
    mutationFn: async (data: typeof contactFormData) =>
      await apiRequest("POST", "/api/contact", data),
    onSuccess: () => {
      toast({ title: "Message Sent!", description: "Thank you! We'll get back to you within 24 hours." });
      setContactFormData({ name: "", email: "", subject: "", message: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to send message. Please try again.", variant: "destructive" });
    },
  });

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setContactFormData({ ...contactFormData, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactMutation.mutate(contactFormData);
  };

  useEffect(() => {
    trackPageView("/", "Home - AiTaxBot");
  }, []);

  // Market News
  const { data: marketNewsData, isLoading: newsLoading } = useQuery<{ news: NewsItem[] }>({
    queryKey: ["/api/market-news"],
    refetchInterval: () => document.visibilityState === "visible" ? 7200000 : false,
    refetchOnWindowFocus: false,
  });

  // Live calculation counter
  const { data: calcStatsData } = useQuery<{ count: number }>({
    queryKey: ["/api/stats/calculations-count"],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const calcCount = calcStatsData?.count ?? 0;
  const calcCountDisplay = calcCount > 0 ? `${calcCount.toLocaleString("en-IN")}+` : null;

  const showModal = (modalType: string) => setActiveModal?.(modalType);
  const closeModal = () => setActiveModal?.(null);

  // Calculator quick links for sidebar
  const calculators = [
    { title: "Income Tax", description: "Old vs New Regime", icon: Calculator, href: "/calculators/income-tax", color: "from-persian-blue-500 to-persian-blue-600", badge: "Popular" },
    { title: "HRA Calculator", description: "Section 10(13A)", icon: HomeIcon, href: "/calculators/hra", color: "from-blue-500 to-cyan-600" },
    { title: "SIP Calculator", description: "Wealth Builder", icon: TrendingUp, href: "/calculators/sip", color: "from-green-500 to-emerald-600" },
    { title: "SWP Calculator", description: "Retirement Plan", icon: PiggyBank, href: "/calculators/swp", color: "from-purple-500 to-pink-600" },
    { title: "PF Calculator", description: "EPF / VPF / PPF", icon: Shield, href: "/calculators/pf", color: "from-indigo-500 to-indigo-600" },
    { title: "Rent Receipt", description: "HRA Proof PDF", icon: FileText, href: "/tools/rent-receipt", color: "from-orange-500 to-amber-600" },
    { title: "AIS Reconciliation", description: "AIS vs 26AS vs Form 16", icon: FileText, href: "/tools/ais-26as-form16", color: "from-blue-600 to-indigo-700", badge: "New" },
  ];

  return (
    <>
      <Helmet>
        <title>AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28</title>
        <meta name="description" content="AI-powered tax calculator for India. Compare old vs new regime, ₹12L tax-free under Section 87A. Free SIP, SWP, HRA, PF calculators. CA-reviewed. FY 2026-27 & Tax Year 2026-27 ready." />
        <meta name="keywords" content="income tax calculator, tax calculator India, AI tax calculator, new tax regime, old tax regime, SIP calculator, SWP calculator, HRA calculator, PF calculator, AY 2027-28, Income Tax Act 2025" />
        <link rel="canonical" href="https://aitaxbot.co.in/" />
        <meta property="og:title" content="AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28" />
        <meta property="og:description" content="AI-powered income tax calculator with ₹12L tax-free limit. CA-reviewed calculators for salaried, freelancers & investors. Income Tax Act 2025 ready." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitaxbot.co.in/" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AiTaxBot - Income Tax Calculator India FY 2026-27 | AY 2027-28" />
        <meta name="twitter:description" content="AI-powered income tax calculator for India. ₹12L tax-free under new regime. Compare tax regimes instantly." />
        <script type="application/ld+json">{JSON.stringify(generateHomePageSchema())}</script>
      </Helmet>

      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 pt-6 pb-12">

            {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">

              {/* Hero */}
              <section className="py-12 lg:py-16 border-b border-slate-100">
                <div className="px-4 lg:px-8">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">FY 2026-27 · AY 2027-28 · IT Act 2025 Ready</p>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 leading-tight">
                    {t("hero.headline").split("\n")[0]}
                    <span className="block mt-1 text-blue-600">{t("hero.headline").split("\n")[1] ?? "Indian Taxpayers"}</span>
                  </h1>
                  <p className="text-base lg:text-lg text-slate-600 mb-6 leading-relaxed max-w-2xl">
                    {t("hero.subheadline")}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      onClick={() => window.location.href = "/calculators/income-tax"}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors"
                      data-testid="button-calculate-tax"
                    >
                      <Calculator className="mr-2 h-5 w-5" />
                      {t("hero.cta")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = "/find-ca"}
                      className="border border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50 px-6 py-4 rounded-lg font-semibold transition-colors"
                      data-testid="button-find-ca-hero"
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Find a CA
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = "/blog"}
                      className="border border-slate-300 text-slate-700 hover:border-slate-400 px-6 py-4 rounded-lg font-semibold transition-colors"
                    >
                      <Newspaper className="mr-2 h-4 w-4" />
                      Tax Guides
                    </Button>
                  </div>

                  {/* Trust signals */}
                  <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{t("hero.ctaFree")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Built &amp; reviewed by Chartered Accountants</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Zap className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>AI Powered</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>IT Act 1961 &amp; IT Act 2025 Ready</span>
                    </div>
                    {calcCountDisplay && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <BarChart2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <span><strong className="text-orange-700">{calcCountDisplay} calculations done</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* How It Works */}
              <section className="py-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  How It Works — 3 Simple Steps
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: "01", icon: <Users className="h-6 w-6 text-persian-blue-600" />, title: "Pick Your Profile", desc: "Salaried, freelancer, or investor — select what fits you and enter your income." },
                    { step: "02", icon: <Calculator className="h-6 w-6 text-emerald-600" />, title: "Enter Deductions", desc: "Add 80C investments, HRA, home loan, NPS — only what applies to you." },
                    { step: "03", icon: <BarChart2 className="h-6 w-6 text-orange-500" />, title: "See Your Result", desc: "Instantly compare Old vs New Regime. Know exactly which saves you more tax." },
                  ].map(({ step, icon, title, desc }) => (
                    <div key={step} className="relative p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-4xl font-black text-slate-200 absolute top-4 right-4 leading-none select-none" aria-hidden="true">{step}</div>
                      <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-soft mb-3 border border-slate-100">
                        {icon}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Key Stats — with context */}
              <section className="py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div ref={stat1.ref} className="bg-white border border-slate-200 text-center p-5 rounded-xl">
                    <div className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">₹{stat1.count}L</div>
                    <div className="text-slate-700 font-medium text-xs">Zero tax at this income under New Regime</div>
                  </div>
                  <div ref={stat2.ref} className="bg-white border border-slate-200 text-center p-5 rounded-xl">
                    <div className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">₹{stat2.count >= 100 ? "1.5L" : stat2.count + "K"}</div>
                    <div className="text-slate-700 font-medium text-xs">Save up to ₹46,800 via 80C deduction</div>
                  </div>
                  <div ref={stat3.ref} className="bg-white border border-slate-200 text-center p-5 rounded-xl">
                    <div className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">₹{stat3.count}K</div>
                    <div className="text-slate-700 font-medium text-xs">Standard deduction for salaried employees</div>
                  </div>
                  <div ref={stat4.ref} className="bg-white border border-slate-200 text-center p-5 rounded-xl">
                    <div className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">{stat4.count}%</div>
                    <div className="text-slate-700 font-medium text-xs">Flat tax on crypto / VDA income</div>
                  </div>
                </div>
              </section>

              {/* Features */}
              <section id="features" className="py-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  Everything You Need for Tax Planning
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-5 border border-slate-200 hover:border-blue-200 transition-all duration-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calculator className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Income Tax Calculator</h3>
                        <ul className="space-y-1 text-slate-600 text-sm mb-4">
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />Compares Old vs New Regime side-by-side</li>
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />87A rebate eligibility calculated automatically</li>
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />Handles crypto income (Section 115BBH)</li>
                        </ul>
                        <Button
                          onClick={() => window.location.href = "/calculators/income-tax"}
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 text-sm font-semibold transition-colors"
                        >
                          Calculate Now
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border border-slate-200 hover:border-slate-300 transition-all duration-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">GST Invoicing</h3>
                        <ul className="space-y-1 text-slate-600 text-sm mb-4">
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />GST-compliant invoices in seconds</li>
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />Sales register & multi-firm support</li>
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />Built for freelancers & small businesses</li>
                        </ul>
                        <Button
                          variant="outline"
                          className="border border-slate-300 text-slate-700 hover:bg-slate-50 w-full py-3 text-sm font-semibold transition-colors"
                          onClick={() => window.location.href = "/accounting"}
                          data-testid="button-start-invoicing"
                        >
                          Start Invoicing
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </section>

              {/* Why AiTaxBot — specific differentiators */}
              <section className="py-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Why AiTaxBot</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <Zap className="h-6 w-6 text-blue-600 mb-3" />
                    <h3 className="text-base font-bold text-slate-900 mb-1">Regime comparison in 30 seconds</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Enter your salary and deductions once — see Old vs New Regime results instantly, with the saving amount highlighted.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <Shield className="h-6 w-6 text-green-600 mb-3" />
                    <h3 className="text-base font-bold text-slate-900 mb-1">CA-reviewed, not generic</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Every calculator covers IT Act 1961 (FY 2026-27) and IT Act 2025 (Tax Year 2026-27). Logic reviewed by Chartered Accountants.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <BookOpen className="h-6 w-6 text-orange-500 mb-3" />
                    <h3 className="text-base font-bold text-slate-900 mb-1">Guides for every situation</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Salaried? Freelancer? Crypto investor? Our blog covers HRA, 80C, capital gains, marginal relief, and the new IT Act 2025 — in plain language.</p>
                  </div>
                </div>
              </section>

              {/* Disclaimer — condensed */}
              <section className="py-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Calculations are indicative only — not professional tax advice. AiTaxBot is not affiliated with the Income Tax Department or CBDT.{" "}
                  <a href="/privacy-policy" className="underline hover:text-slate-600">Privacy Policy</a>
                  {" · "}
                  <a href="/about" className="underline hover:text-slate-600">About Us</a>
                </p>
              </section>

              {/* Contact — simple strip (no embedded form) */}
              {/* FAQ Section */}
              <section className="py-8" id="faq">
                <div className="flex items-center gap-2 mb-6">
                  <Info className="h-5 w-5 text-persian-blue-600" />
                  <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      q: "Which regime — Old or New — is better for me?",
                      a: "It depends on your deductions. If your total 80C + HRA + home loan deductions exceed ₹3.75 lakh, the Old Regime usually saves more. Below that threshold, the New Regime is typically better. Use our calculator above to get your exact answer in seconds."
                    },
                    {
                      q: "Is income up to ₹12 lakh really tax-free in FY 2026-27?",
                      a: "Yes — under the New Regime for FY 2026-27, the rebate under Section 87A has been enhanced so that taxpayers with net taxable income up to ₹12 lakh pay zero tax. The ₹75,000 standard deduction means a salaried person earning up to ₹12.75 lakh pays no tax."
                    },
                    {
                      q: "What is the 87A rebate and am I eligible?",
                      a: "Section 87A gives a full rebate on tax if your net taxable income is within the specified limit (₹12 lakh under New Regime for FY 2026-27). Our calculator automatically applies this rebate and shows you whether you qualify."
                    },
                    {
                      q: "Can I switch between Old and New Regime every year?",
                      a: "Salaried individuals with no business income can choose their regime every year at the time of filing. If you have business or professional income, you can switch only once. Our calculator shows you both options so you can decide each year."
                    },
                    {
                      q: "Is the data I enter in the calculator saved anywhere?",
                      a: "No. AiTaxBot calculators run entirely in your browser. Your income and deduction details are never sent to our servers or stored in any database."
                    },
                    {
                      q: "How is AY (Assessment Year) different from FY (Financial Year)?",
                      a: "Financial Year (FY) is when you earn the income — e.g., FY 2026-27 runs from April 2025 to March 2026. Assessment Year (AY) is when you file and pay tax on that income — so AY 2027-28 corresponds to FY 2026-27."
                    },
                  ].map(({ q, a }, i) => (
                    <details key={i} className="group rounded-xl border border-slate-200 bg-white open:border-persian-blue-200 transition-all">
                      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden">
                        {q}
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              <section className="py-6 pb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-5 w-5 text-persian-blue-600" />
                  <h2 className="text-xl font-bold text-slate-900">Get in Touch</h2>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="grid md:grid-cols-3 gap-4 mb-5">
                    <a href="mailto:info@aitaxbot.in" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-persian-blue-200 hover:shadow-soft transition-all group">
                      <div className="w-9 h-9 bg-persian-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4 text-persian-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Email</p>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-persian-blue-600 transition-colors">info@aitaxbot.in</p>
                      </div>
                    </a>
                    <a href="tel:+917899869036" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-persian-blue-200 hover:shadow-soft transition-all group">
                      <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Phone</p>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-persian-blue-600 transition-colors">+91 78998 69036</p>
                      </div>
                    </a>
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100">
                      <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Location</p>
                        <p className="text-sm font-semibold text-slate-800">Bengaluru, India</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-slate-500">Follow us:</p>
                      <a href="https://www.linkedin.com/company/aitaxbot/" target="_blank" rel="noopener noreferrer" aria-label="AiTaxBot on LinkedIn" className="bg-persian-blue-100 hover:bg-persian-blue-200 text-persian-blue-700 rounded-full p-2 transition-colors">
                        <Linkedin className="h-4 w-4" />
                      </a>
                      <a href="https://www.instagram.com/aitaxbot/" target="_blank" rel="noopener noreferrer" aria-label="AiTaxBot on Instagram" className="bg-pink-100 hover:bg-pink-200 text-pink-600 rounded-full p-2 transition-colors">
                        <Instagram className="h-4 w-4" />
                      </a>
                    </div>
                    <a href="/contact" className="inline-flex items-center gap-2 bg-persian-blue-600 hover:bg-persian-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                      <Send className="h-4 w-4" /> Send a Message
                    </a>
                  </div>
                </div>
              </section>

            </div>

            {/* ── RIGHT COLUMN — Sticky Sidebar ────────────────────────────── */}
            <aside className="lg:w-80 xl:w-96 flex-shrink-0">
              <div className="lg:sticky lg:top-20 space-y-6">

                {/* Quick Calculators */}
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-persian-blue-600" />
                    Quick Calculators
                  </h3>
                  <div className="space-y-3">
                    {calculators.map((calc, index) => (
                      <a
                        key={index}
                        href={calc.href}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-100 hover:border-blue-200 transition-colors group"
                        data-testid={`calc-link-${index}`}
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <calc.icon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{calc.title}</span>
                            {calc.badge && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-persian-blue-100 text-persian-blue-700">
                                {calc.badge}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{calc.description}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-persian-blue-600 group-hover:translate-x-1 transition-all" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Latest from Blog */}
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      Latest Articles
                    </h3>
                    <a href="/blog" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      View All <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="space-y-3">
                    {latestBlogPosts.map((post) => (
                      <a
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className="block p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors group"
                      >
                        <h4 className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors line-clamp-2 mb-1.5 leading-snug">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                            {post.tag}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />{post.readTime}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Tax & Finance News */}
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Newspaper className="h-4 w-4 text-blue-600" />
                      Tax & Finance News
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                    {newsLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse p-3 rounded-lg bg-slate-50">
                          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))
                    ) : marketNewsData?.news?.length ? (
                      marketNewsData.news.slice(0, 6).map((item, index) => (
                        <a
                          key={index}
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
                          data-testid={`news-card-${index}`}
                        >
                          <h4 className="text-sm font-medium text-slate-800 line-clamp-2 group-hover:text-persian-blue-600 transition-colors mb-1">
                            {item.title}
                          </h4>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-medium truncate max-w-[100px]">{item.source}</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{item.date}</span>
                            </div>
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 py-6">
                        <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No news available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA Card */}
                <div className="bg-gradient-to-br from-persian-blue-600 to-persian-blue-700 rounded-2xl p-5 text-white">
                  <h3 className="text-lg font-bold mb-2">Ready to Calculate?</h3>
                  <p className="text-sm text-white/80 mb-4">Get accurate tax calculations in seconds</p>
                  <Button
                    onClick={() => window.location.href = "/calculators"}
                    className="w-full bg-white text-persian-blue-600 hover:bg-slate-50 font-semibold"
                    data-testid="button-start-calculating"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Explore All Calculators
                  </Button>
                </div>

                {/* Find a CA Card */}
                <a
                  href="/find-ca"
                  className="block bg-white rounded-2xl p-5 border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <UserCheck className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">Need a CA for ITR filing?</p>
                      <p className="text-xs text-slate-500">Free introduction — no fees</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Connect with a verified, practicing Chartered Accountant near you. Deadline: <span className="font-semibold text-orange-700">July 31, 2026</span>.
                  </p>
                  <div className="mt-3 text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Find a CA near you <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>

              </div>
            </aside>

          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <img src={logoImage} alt="AiTaxBot Logo" className="h-14 w-auto brightness-110" loading="lazy" data-testid="logo-footer" />
                <div>
                  <div className="font-bold text-white text-base leading-tight">AiTaxBot</div>
                  <div className="text-slate-400 text-xs">Smart Tax Calculator for India</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400 justify-center md:justify-end">
                <a href="/find-ca" className="hover:text-white transition-colors font-medium text-blue-400 hover:text-blue-300">Find a CA</a>
                <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
                <a href="/terms-of-service" className="hover:text-white transition-colors">Terms</a>
                <a href="/contact" className="hover:text-white transition-colors">Contact</a>
                <span>FY 2026-27 / AY 2027-28 Compliant</span>
              </div>
            </div>
          </div>
        </footer>

        {/* Calculator Modals */}
        {activeModal === "tax-calculator" && <TaxCalculator onClose={closeModal} />}
        {activeModal === "hra-calculator" && <HRACalculator onClose={closeModal} onApplyHRA={() => {}} />}
        {activeModal === "sip-calculator" && <SIPCalculator onClose={closeModal} />}
        {activeModal === "swp-calculator" && <SWPCalculator onClose={closeModal} />}
      </div>
    </>
  );
}

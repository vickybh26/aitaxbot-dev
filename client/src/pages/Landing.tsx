import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  TrendingUp,
  ArrowRight,
  FileText,
  PiggyBank,
  BarChart3,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  Newspaper,
  ExternalLink,
  Home as HomeIcon,
  ChevronDown,
  ChevronUp,
  Send,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Instagram,
  AlertCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/aitaxbot-logo.png";
import { ResponsiveAd, LeaderboardAd } from "@/components/AdBanner";
import { trackPageView } from "@/lib/analytics";
import { generateHomePageSchema } from "@/lib/structuredData";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface MetalPricesData {
  gold24k: number;
  gold22k: number;
  silver: number;
  currency: string;
  lastUpdated: string;
  nextUpdateAt: string;
  source: string;
  cached?: boolean;
}

interface LandingProps {
  activeModal?: string | null;
  setActiveModal?: (modal: string | null) => void;
}

export default function Landing({ activeModal, setActiveModal }: LandingProps) {
  const { toast } = useToast();

  // Contact form state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: '', email: '', subject: '', message: ''
  });

  const contactMutation = useMutation({
    mutationFn: async (data: typeof contactFormData) => {
      return await apiRequest('POST', '/api/contact', data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent!",
        description: "Thank you! We'll get back to you within 24 hours.",
      });
      setContactFormData({ name: '', email: '', subject: '', message: '' });
      setContactOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
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
    trackPageView('/', 'Home - AiTaxBot');
  }, []);

  // Market News Query
  const { 
    data: marketNewsData, 
    isLoading: newsLoading 
  } = useQuery<{ news: NewsItem[] }>({
    queryKey: ['/api/market-news'],
    refetchInterval: (query) => {
      return document.visibilityState === 'visible' ? 7200000 : false;
    },
    refetchOnWindowFocus: false,
  });

  // Metal Prices Query (Gold & Silver)
  const {
    data: metalPrices,
    isLoading: metalPricesLoading
  } = useQuery<MetalPricesData>({
    queryKey: ['/api/metal-prices'],
    refetchInterval: false, // Fixed update times on server, no client refresh
    refetchOnWindowFocus: false,
    staleTime: 8 * 60 * 60 * 1000, // 8 hours - match server cache
  });

  // Live calculation counter from Firestore
  const { data: calcStatsData } = useQuery<{ count: number }>({
    queryKey: ['/api/stats/calculations-count'],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const calcCount = calcStatsData?.count ?? 0;
  const calcCountDisplay = calcCount > 0
    ? `${calcCount.toLocaleString('en-IN')}+ calculations done`
    : null;

  const showModal = (modalType: string) => {
    if (setActiveModal) {
      setActiveModal(modalType);
    }
  };
  
  const closeModal = () => {
    if (setActiveModal) {
      setActiveModal(null);
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  // Calculator quick links for sidebar
  const calculators = [
    {
      title: "Income Tax",
      description: "Old vs New Regime",
      icon: Calculator,
      href: "/calculators/income-tax",
      color: "from-persian-blue-500 to-persian-blue-600",
      badge: "Popular"
    },
    {
      title: "HRA Calculator",
      description: "Section 10(13A)",
      icon: HomeIcon,
      href: "/calculators/hra",
      color: "from-blue-500 to-cyan-600"
    },
    {
      title: "SIP Calculator",
      description: "Wealth Builder",
      icon: TrendingUp,
      href: "/calculators/sip",
      color: "from-green-500 to-emerald-600"
    },
    {
      title: "SWP Calculator",
      description: "Retirement Plan",
      icon: PiggyBank,
      href: "/calculators/swp",
      color: "from-purple-500 to-pink-600"
    },
    {
      title: "PF Calculator",
      description: "EPF / VPF / PPF",
      icon: Shield,
      href: "/calculators/pf",
      color: "from-indigo-500 to-indigo-600",
      badge: "New"
    }
  ];

  return (
    <>
      <Helmet>
        <title>AiTaxBot - Income Tax Calculator India FY 2025-26 | AY 2026-27</title>
        <meta name="description" content="AI tax calculator India AY 2026-27. Compare old vs new regime, ₹12L tax-free under Section 202. Free SIP, SWP, HRA, PF calculators. Live gold rates." />
        <meta name="keywords" content="income tax calculator, tax calculator India, AI tax calculator, new tax regime, old tax regime, SIP calculator, SWP calculator, HRA calculator, PF calculator, EPF calculator, provident fund, AY 2026-27, AY 2027-28, Income Tax Act 2025, gold rates, market news, commodity prices" />
        <link rel="canonical" href="https://aitaxbot.co.in/" />
        
        <meta property="og:title" content="AiTaxBot - Income Tax Calculator India FY 2025-26 | AY 2026-27" />
        <meta property="og:description" content="AI-powered income tax calculator with ₹12L tax-free limit. Live market news, gold/silver rates, and financial calculators. Income Tax Act, 2025 ready." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitaxbot.co.in/" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AiTaxBot - Income Tax Calculator India FY 2025-26 | AY 2026-27" />
        <meta name="twitter:description" content="AI-powered income tax calculator for India. ₹12L tax-free under new regime. Compare tax regimes, live market news, and gold rates." />
        
        {/* Structured Data - Organization and WebSite schema */}
        <script type="application/ld+json">
          {JSON.stringify(generateHomePageSchema())}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-white">
        {/* Main Two-Column Layout */}
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 pt-6 pb-12">
            
            {/* LEFT COLUMN - Main Content */}
            <div className="flex-1 min-w-0">
              {/* Hero Section */}
              <section className="relative py-12 lg:py-16 overflow-hidden">
                {/* Gradient Mesh Background */}
                <div className="absolute inset-0 gradient-mesh opacity-40 rounded-3xl"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white rounded-3xl"></div>
                
                <div className="relative z-10 px-4 lg:px-8">
                  <Badge className="mb-4 bg-white/80 backdrop-blur-sm text-persian-blue-700 border-persian-blue-200 shadow-soft px-3 py-1 text-xs font-semibold">
                    ✨ FY 2025-26 (AY 2026-27) & Tax Year 2026-27 Ready
                  </Badge>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 leading-tight">
                    Smart Tax Calculator for
                    <span className="gradient-text block mt-1">Indian Taxpayers</span>
                  </h1>
                  
                  <p className="text-base lg:text-lg text-slate-600 mb-6 leading-relaxed max-w-2xl">
                    Say goodbye to tax stress with Ai Tax Bot – your smart and reliable tax companion. Calculate your tax liability in minutes with AI-powered tools for salaried individuals, freelancers, and crypto traders.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg" 
                      onClick={() => window.location.href = "/calculators/income-tax"}
                      className="gradient-blue text-white px-6 py-5 rounded-xl shadow-colored hover:shadow-colored-hover transition-all duration-300 font-semibold hover:scale-105 transform"
                      data-testid="button-calculate-tax"
                    >
                      <Calculator className="mr-2 h-5 w-5" />
                      Calculate Tax Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = "/blog"}
                      className="border-2 border-persian-blue-600 text-persian-blue-600 hover:bg-persian-blue-600 hover:text-white px-6 py-5 rounded-xl"
                    >
                      <Newspaper className="mr-2 h-4 w-4" />
                      Tax Guides
                    </Button>
                  </div>

                  {/* Trust signals — honest early-stage */}
                  <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <span className="text-green-500 font-bold text-base">✓</span>
                      <span>100% Free — no signup needed for calculators</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <span className="text-green-500 font-bold text-base">✓</span>
                      <span>Built &amp; reviewed by Chartered Accountants</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <span className="text-purple-500 font-bold text-base">✦</span>
                      <span>Powered by <strong className="text-purple-700">Gemini AI</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <span className="text-blue-500 font-bold text-base">✓</span>
                      <span>FY 2025-26 &amp; Income Tax Act 2025 ready</span>
                    </div>
                    {calcCountDisplay && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <span className="text-orange-500 font-bold text-base">📊</span>
                        <span><strong className="text-orange-600">{calcCountDisplay}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Key Stats - Compact */}
              <section className="py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="glass-card text-center p-4 rounded-xl hover:scale-105 transition-transform duration-300">
                    <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">₹12L</div>
                    <div className="text-slate-700 font-medium text-xs">Tax-Free Limit</div>
                  </div>
                  <div className="glass-card text-center p-4 rounded-xl hover:scale-105 transition-transform duration-300">
                    <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">30%</div>
                    <div className="text-slate-700 font-medium text-xs">Crypto Tax Rate</div>
                  </div>
                  <div className="glass-card text-center p-4 rounded-xl hover:scale-105 transition-transform duration-300">
                    <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">₹1.5L</div>
                    <div className="text-slate-700 font-medium text-xs">80C Deduction</div>
                  </div>
                  <div className="glass-card text-center p-4 rounded-xl hover:scale-105 transition-transform duration-300">
                    <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">₹75K</div>
                    <div className="text-slate-700 font-medium text-xs">Std. Deduction</div>
                  </div>
                </div>
              </section>

              {/* Live Gold & Silver Prices - Compact */}
              <section className="py-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                  Live <span className="gradient-text">Gold & Silver Prices</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {metalPricesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="border border-gray-100">
                        <CardContent className="p-4">
                          <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <>
                      {/* Gold 24K */}
                      <Card className="border border-yellow-200 hover:border-yellow-400 transition-all duration-300 bg-gradient-to-br from-yellow-50 to-amber-50">
                        <CardContent className="p-4">
                          <div data-testid="card-gold-24k">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">🪙</span>
                              <span className="text-sm font-semibold text-yellow-800">Gold 24K</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">
                              ₹{formatNumber(metalPrices?.gold24k || 7850)}<span className="text-sm font-normal text-slate-600">/gram</span>
                            </div>
                            <div className="text-xs text-yellow-700 mt-1">
                              Pure Gold (99.9%)
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Gold 22K */}
                      <Card className="border border-amber-200 hover:border-amber-400 transition-all duration-300 bg-gradient-to-br from-amber-50 to-orange-50">
                        <CardContent className="p-4">
                          <div data-testid="card-gold-22k">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">💍</span>
                              <span className="text-sm font-semibold text-amber-800">Gold 22K</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">
                              ₹{formatNumber(metalPrices?.gold22k || 7200)}<span className="text-sm font-normal text-slate-600">/gram</span>
                            </div>
                            <div className="text-xs text-amber-700 mt-1">
                              Jewellery Gold (91.6%)
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Silver */}
                      <Card className="border border-gray-200 hover:border-gray-400 transition-all duration-300 bg-gradient-to-br from-gray-50 to-slate-100">
                        <CardContent className="p-4">
                          <div data-testid="card-silver">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">🥈</span>
                              <span className="text-sm font-semibold text-gray-700">Silver</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900">
                              ₹{formatNumber(metalPrices?.silver || 95)}<span className="text-sm font-normal text-slate-600">/gram</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Pure Silver (99.9%)
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
                
                {metalPrices && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-500 mt-3">
                    <span>Source: {metalPrices.source}</span>
                    <span className="hidden sm:inline">|</span>
                    <span>Updated: {new Date(metalPrices.lastUpdated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                )}
              </section>

              {/* Features Section */}
              <section id="features" className="py-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  Everything You Need for <span className="gradient-text">Tax Planning</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tax Calculator Card */}
                  <Card className="p-5 border-2 border-persian-blue-100 hover:border-persian-blue-300 transition-all duration-300 shadow-soft hover:shadow-medium">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 gradient-blue rounded-lg flex items-center justify-center shadow-colored flex-shrink-0">
                        <Calculator className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Income Tax Calculator</h3>
                        <ul className="space-y-1 text-slate-600 text-sm mb-4">
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />Compare Old vs New Regime</li>
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />80C, 80D Deductions</li>
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />Crypto Tax (30% rate)</li>
                        </ul>
                        <Button 
                          onClick={() => window.location.href = "/calculators/income-tax"}
                          className="gradient-blue hover:shadow-colored transition-all duration-300 text-white w-full py-4 text-sm font-semibold"
                        >
                          Calculate Now
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Invoicing & Accounting Card */}
                  <Card className="p-5 border-2 border-green-100 hover:border-green-300 transition-all duration-300 shadow-soft hover:shadow-medium">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-soft flex-shrink-0">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">GST Invoicing</h3>
                        <ul className="space-y-1 text-slate-600 text-sm mb-4">
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />GST-Compliant Invoices</li>
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />Sales Register</li>
                          <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" />Multi-Firm Support</li>
                        </ul>
                        <Button 
                          variant="outline"
                          className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white w-full py-4 text-sm font-semibold transition-all duration-300"
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

              {/* Why Choose AiTaxBot */}
              <section className="py-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  Why Choose AiTaxBot?
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-slate-50">
                    <div className="w-12 h-12 bg-persian-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Zap className="h-6 w-6 text-persian-blue-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Smart Calculations</h3>
                    <p className="text-slate-600 text-sm">Intelligent tax computation with regime comparison and optimization suggestions.</p>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-slate-50">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Tax Compliant</h3>
                    <p className="text-slate-600 text-sm">Updated for FY 2025-26 (AY 2026-27) with latest Income Tax Act, 2025 provisions.</p>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-slate-50">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Instant Results</h3>
                    <p className="text-slate-600 text-sm">Get immediate tax calculations with savings suggestions.</p>
                  </div>
                </div>
              </section>

              {/* ── LEGAL DECLARATION SECTION ──────────────────────────────── */}
              <section className="py-6">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <h2 className="text-base font-bold text-amber-800">Important Declarations & Disclaimers</h2>
                  </div>

                  <div className="space-y-4 text-sm text-slate-700">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-persian-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800 mb-0.5">For Informational Purposes Only</p>
                          <p className="text-slate-600 leading-relaxed">
                            All calculations provided by AiTaxBot are indicative and for general reference only.
                            Results should not be treated as legal, financial, or professional tax advice.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-persian-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800 mb-0.5">Consult a Chartered Accountant</p>
                          <p className="text-slate-600 leading-relaxed">
                            For official ITR filing, audit, tax planning with legal validity, or complex cases
                            (capital gains, business income, foreign assets), please consult a qualified CA or tax professional.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-persian-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800 mb-0.5">Not Affiliated with Income Tax Dept.</p>
                          <p className="text-slate-600 leading-relaxed">
                            AiTaxBot is an independent private platform. We are not affiliated with, endorsed by,
                            or connected to the Income Tax Department of India, CBDT, or any government body.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-persian-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800 mb-0.5">Not a Tax Return Preparer (TRP)</p>
                          <p className="text-slate-600 leading-relaxed">
                            AiTaxBot is a self-service calculation tool only. We are not registered as a Tax
                            Return Preparer under the TRP Scheme and do not file returns on behalf of users.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-persian-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800 mb-0.5">Data Privacy (DPDP Act 2023)</p>
                          <p className="text-slate-600 leading-relaxed">
                            Any personal or financial data you enter for saved calculations is stored securely
                            and used solely to provide our services. We never sell or share your data with third
                            parties. You can request deletion at any time. See our{' '}
                            <a href="/privacy-policy" className="text-persian-blue-600 hover:underline font-medium">Privacy Policy</a>.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-persian-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800 mb-0.5">Accuracy & Updates</p>
                          <p className="text-slate-600 leading-relaxed">
                            Calculations are based on FY 2025-26 / AY 2026-27 rules under the Income Tax Act 2025.
                            Tax laws may change; always verify with the latest CBDT notifications or official
                            sources before making financial decisions.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Compliance badges */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-xs font-medium text-amber-700">
                        <CheckCircle2 className="h-3 w-3" /> Income Tax Act 2025 Compliant
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-xs font-medium text-amber-700">
                        <CheckCircle2 className="h-3 w-3" /> DPDP Act 2023 Aware
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-xs font-medium text-amber-700">
                        <CheckCircle2 className="h-3 w-3" /> CA-Reviewed Calculations
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-xs font-medium text-amber-700">
                        <CheckCircle2 className="h-3 w-3" /> No Govt. Affiliation
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── COLLAPSIBLE CONTACT US SECTION ───────────────────────────── */}
              <section className="py-4 pb-8">
                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => setContactOpen(prev => !prev)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-persian-blue-600 hover:bg-persian-blue-700 text-white font-semibold transition-all duration-300 shadow-colored group"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    <span>Contact Us / Get Help</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-normal text-white/80">
                    <span className="hidden sm:inline">info@aitaxbot.co.in  ·  +91 78998 69036</span>
                    {contactOpen
                      ? <ChevronUp className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      : <ChevronDown className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                  </div>
                </button>

                {/* Collapsible body */}
                {contactOpen && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid md:grid-cols-5 gap-0">

                      {/* Left: info strip */}
                      <div className="md:col-span-2 bg-gradient-to-br from-persian-blue-600 to-persian-blue-800 p-6 text-white">
                        <h3 className="text-base font-bold mb-4">Get in Touch</h3>
                        <div className="space-y-4 text-sm">
                          <div className="flex items-start gap-3">
                            <Mail className="h-4 w-4 flex-shrink-0 mt-0.5 text-persian-blue-200" />
                            <div>
                              <p className="text-persian-blue-200 text-xs mb-0.5">Email</p>
                              <a href="mailto:info@aitaxbot.co.in" className="font-medium hover:text-persian-blue-100 transition-colors">
                                info@aitaxbot.co.in
                              </a>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Phone className="h-4 w-4 flex-shrink-0 mt-0.5 text-persian-blue-200" />
                            <div>
                              <p className="text-persian-blue-200 text-xs mb-0.5">Phone</p>
                              <a href="tel:+917899869036" className="font-medium hover:text-persian-blue-100 transition-colors">
                                +91 78998 69036
                              </a>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-persian-blue-200" />
                            <div>
                              <p className="text-persian-blue-200 text-xs mb-0.5">Location</p>
                              <span className="font-medium">Bengaluru, Karnataka, India</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-persian-blue-500">
                          <p className="text-persian-blue-200 text-xs mb-3">Follow Us</p>
                          <div className="flex gap-3">
                            <a
                              href="https://www.linkedin.com/company/aitaxbot/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                            >
                              <Linkedin className="h-4 w-4" />
                            </a>
                            <a
                              href="https://www.instagram.com/aitaxbot/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                            >
                              <Instagram className="h-4 w-4" />
                            </a>
                          </div>
                        </div>

                        <p className="text-persian-blue-200 text-xs mt-6">
                          We reply within 24 hours on business days.
                        </p>
                      </div>

                      {/* Right: form */}
                      <div className="md:col-span-3 p-6">
                        <h3 className="text-base font-bold text-slate-900 mb-4">Send us a Message</h3>
                        <form onSubmit={handleContactSubmit} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                              <input
                                type="text"
                                name="name"
                                required
                                value={contactFormData.name}
                                onChange={handleContactChange}
                                disabled={contactMutation.isPending}
                                placeholder="Your full name"
                                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-persian-blue-500 focus:border-persian-blue-500 transition-colors disabled:opacity-50 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                              <input
                                type="email"
                                name="email"
                                required
                                value={contactFormData.email}
                                onChange={handleContactChange}
                                disabled={contactMutation.isPending}
                                placeholder="your@email.com"
                                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-persian-blue-500 focus:border-persian-blue-500 transition-colors disabled:opacity-50 bg-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
                            <select
                              name="subject"
                              value={contactFormData.subject}
                              onChange={handleContactChange}
                              disabled={contactMutation.isPending}
                              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-persian-blue-500 focus:border-persian-blue-500 transition-colors disabled:opacity-50 bg-white"
                            >
                              <option value="">Select a topic...</option>
                              <option value="Tax calculation query">Tax calculation query</option>
                              <option value="Bug or incorrect result">Bug / incorrect result</option>
                              <option value="Feature request">Feature request</option>
                              <option value="GST / Invoicing help">GST / Invoicing help</option>
                              <option value="Account / Login issue">Account / Login issue</option>
                              <option value="General feedback">General feedback</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Message *</label>
                            <textarea
                              name="message"
                              rows={4}
                              required
                              value={contactFormData.message}
                              onChange={handleContactChange}
                              disabled={contactMutation.isPending}
                              placeholder="Describe your question or feedback..."
                              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-persian-blue-500 focus:border-persian-blue-500 transition-colors resize-none disabled:opacity-50 bg-white"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-slate-400">* Required fields</p>
                            <button
                              type="submit"
                              disabled={contactMutation.isPending}
                              className="inline-flex items-center gap-2 bg-persian-blue-600 hover:bg-persian-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send className="h-4 w-4" />
                              {contactMutation.isPending ? 'Sending...' : 'Send Message'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </section>

            </div>

            {/* RIGHT COLUMN - Sticky Sidebar */}
            <aside className="lg:w-80 xl:w-96 flex-shrink-0">
              <div className="lg:sticky lg:top-20 space-y-6">
                
                {/* Calculators Section */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-100 shadow-soft">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-persian-blue-600" />
                    Quick Calculators
                  </h3>
                  <div className="space-y-3">
                    {calculators.map((calc, index) => (
                      <a
                        key={index}
                        href={calc.href}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-persian-blue-200 hover:shadow-medium transition-all duration-300 group"
                        data-testid={`calc-link-${index}`}
                      >
                        <div className={`w-10 h-10 bg-gradient-to-br ${calc.color} rounded-lg flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-300`}>
                          <calc.icon className="h-5 w-5 text-white" />
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

                {/* News Section - Scrollable */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Newspaper className="h-5 w-5 text-blue-600" />
                      Market News
                    </h3>
                    <a
                      href="/blog"
                      className="text-xs text-persian-blue-600 hover:underline flex items-center gap-1"
                    >
                      View All
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
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
                  <p className="text-sm text-white/80 mb-4">
                    Get accurate tax calculations in seconds
                  </p>
                  <Button 
                    onClick={() => window.location.href = "/calculators"}
                    className="w-full bg-white text-persian-blue-600 hover:bg-slate-50 font-semibold"
                    data-testid="button-start-calculating"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Explore All Calculators
                  </Button>
                </div>

              </div>
            </aside>

          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <img 
                  src={logoImage} 
                  alt="AiTaxBot Logo" 
                  className="h-10 w-auto"
                  loading="lazy"
                  data-testid="logo-footer"
                />
                <span className="text-slate-400">Smart Tax Calculator for India</span>
              </div>
              <div className="flex space-x-6 text-sm text-slate-400">
                <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
                <a href="/terms-of-service" className="hover:text-white transition-colors">Terms</a>
                <span>FY 2025-26 / AY 2026-27 Compliant</span>
              </div>
            </div>
          </div>
        </footer>

        {/* Calculator Modals */}
        {activeModal === "tax-calculator" && (
          <TaxCalculator onClose={closeModal} />
        )}
        {activeModal === "hra-calculator" && (
          <HRACalculator onClose={closeModal} onApplyHRA={() => {}} />
        )}
        {activeModal === "sip-calculator" && (
          <SIPCalculator onClose={closeModal} />
        )}
        {activeModal === "swp-calculator" && (
          <SWPCalculator onClose={closeModal} />
        )}
      </div>
    </>
  );
}

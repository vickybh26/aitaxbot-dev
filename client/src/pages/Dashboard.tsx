import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trackPageView } from "@/lib/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ProfileCompletionModal from "@/components/ProfileCompletionModal";
import SavedResultCards from "@/components/SavedResultCards";
import { blogPosts } from "@/data/blogPosts";
import {
  Calculator,
  FileText,
  TrendingUp,
  Building2,
  BookOpen,
  ArrowRight,
  User,
  Activity,
  DollarSign,
  Loader2,
  Download,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Layers,
  PiggyBank,
  Home,
  UserCheck,
  Target,
  Clock,
  Search,
  ChevronRight
} from "lucide-react";
import jsPDF from 'jspdf';

/**
 * Personal dashboard stats — served by GET /api/dashboard/stats.
 *
 * This deliberately does NOT come from /api/accounting/dashboard/stats any
 * more. That endpoint belongs to the accounting module (firms → invoices →
 * clients → revenue), so every user who isn't running a CA practice saw a row
 * of zeroes, and its `taxCalculations` field counted the `taxProfiles`
 * collection — which nothing in the codebase has ever written to.
 *
 * `accounting` is null unless the user actually has firms, so the accounting
 * row is omitted rather than rendered as 0 / 0 / ₹0.
 */
interface DashboardStats {
  calculationsRun: number;
  toolsUsed: number;
  savedCalculations: number;
  savedResults: number;
  activeDays: number;
  lastActivityAt: string | null;
  accounting: {
    firmsCount: number;
    invoicesCount: number;
    clientsCount: number;
    totalRevenue: string;
    paidInvoices: number;
    unpaidInvoices: number;
  } | null;
}

interface ToolUsageEvent {
  id: string;
  tool: string;
  route: string | null;
  summary: string | null;
  createdAt: string;
}

interface TaxCalculationHistory {
  id: string;
  financialYear: string;
  assessmentYear: string;
  ageGroup: string;
  inputData: any;
  oldRegimeResult: any;
  newRegimeResult: any;
  recommendedRegime: string;
  savings: string;
  grossIncome: string;
  taxableIncomeOld: string;
  taxableIncomeNew: string;
  totalTaxOld: string;
  totalTaxNew: string;
  createdAt: string;
  expiresAt: string;
}

export default function Dashboard() {
  const { user, userProfile, isProfileComplete, getIdToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // The automatic once-per-session nudge now lives in GlobalProfilePrompt
  // (mounted once at the app root — see App.tsx) so it fires for every entry
  // point, not just visits to this page. This local state is only for the
  // manual "Complete Now" button below — a separate, user-initiated trigger
  // that doesn't conflict with the automatic global one.
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    trackPageView('/dashboard', 'User Dashboard - AiTaxBot');
  }, []);

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });

  // NOTE: the old /api/accounting/dashboard/activities query used to live here.
  // Nothing on this page ever rendered its result — it only emits invoice and
  // firm events, so it was empty for every non-accounting user — yet it fired a
  // firms→invoices→clients fan-out against Firestore on every dashboard load.
  // Recent activity is shown from /api/tool-usage below instead.

  // Fetch recent calculator activity
  const { data: toolUsageEvents = [], isLoading: toolUsageLoading } = useQuery<ToolUsageEvent[]>({
    queryKey: ['/api/tool-usage'],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const response = await fetch('/api/tool-usage', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Fetch tax calculation history
  const { data: taxCalculations = [], isLoading: taxCalcLoading, refetch: refetchCalcs } = useQuery<TaxCalculationHistory[]>({
    queryKey: ['/api/tax-calculations'],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const response = await fetch('/api/tax-calculations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user
  });

  // Delete calculation mutation
  const deleteCalculation = async (id: string) => {
    setDeletingId(id);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`/api/tax-calculations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      toast({
        title: "Deleted",
        description: "Tax calculation removed successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/tax-calculations'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete calculation",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Generate PDF for a saved calculation
  const generatePDFFromHistory = (calc: TaxCalculationHistory) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const formatAmount = (amount: number | string) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      return '₹' + num.toLocaleString('en-IN');
    };

    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text('AiTaxBot', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('Saved Tax Calculation Report', pageWidth / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(10);
    doc.text(`Financial Year: ${calc.financialYear} (AY ${calc.assessmentYear})`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('RECOMMENDATION', 20, y);
    y += 6;

    doc.setFontSize(11);
    doc.setTextColor(0);
    const regimeName = calc.recommendedRegime === 'old' ? 'Old Tax Regime' : 'New Tax Regime';
    doc.text(`Best Option: ${regimeName}`, 20, y);
    y += 5;
    doc.text(`Potential Savings: ${formatAmount(calc.savings)}`, 20, y);
    y += 12;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('INCOME SUMMARY', 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Gross Income: ${formatAmount(calc.grossIncome)}`, 25, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('OLD REGIME', 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Taxable Income: ${formatAmount(calc.taxableIncomeOld)}`, 25, y);
    y += 5;
    doc.text(`Total Tax: ${formatAmount(calc.totalTaxOld)}`, 25, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('NEW REGIME', 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Taxable Income: ${formatAmount(calc.taxableIncomeNew)}`, 25, y);
    y += 5;
    doc.text(`Total Tax: ${formatAmount(calc.totalTaxNew)}`, 25, y);
    y += 12;

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 20, y);
    doc.text('www.aitaxbot.co.in', pageWidth - 20, y, { align: 'right' });

    doc.save(`tax-calculation-fy-${calc.financialYear}.pdf`);
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Helper to calculate days until expiry
  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Helper to format time ago.
  // Declared ABOVE quickStats deliberately: quickStats is a plain const array
  // evaluated during render, and it calls getTimeAgo. Leaving this below it
  // would put the call in the temporal dead zone and throw at runtime.
  const getTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  // Headline cards describe THIS user's activity on the tax tools — the thing
  // the rest of the page is about. Previously three of the four were accounting
  // figures (invoices / clients / revenue) which are zero for anyone not running
  // a CA practice, and the fourth counted an empty collection. The accounting
  // row below is rendered separately, and only when the user has firms.
  //
  // COLOUR: these use the token utilities defined in index.css
  // (.text-primary / .bg-primary-light / .text-success / .bg-success-light /
  // .bg-persian-blue-*), all of which resolve through CSS variables. That keeps
  // the cards on whatever palette the design system settles on rather than
  // pinning them to raw Tailwind blue/green/orange.
  //
  // Green is reserved for money-positive outcomes and genuine success states —
  // so it appears on Total Revenue and on the "paid invoices" note, and nowhere
  // else. A count of saved calculations is neither, so it stays navy.
  const quickStats = [
    {
      title: "Calculations Run",
      value: statsLoading ? "..." : (stats?.calculationsRun ?? 0).toString(),
      icon: Calculator,
      change: stats?.calculationsRun ? `Across ${stats.toolsUsed} tool${stats.toolsUsed === 1 ? '' : 's'}` : "Get started",
      color: "text-primary",
      bgColor: "bg-primary-light"
    },
    {
      title: "Saved Calculations",
      value: statsLoading ? "..." : (stats?.savedCalculations ?? 0).toString(),
      icon: FileText,
      change: stats?.savedCalculations ? "Stored for 30 days" : "Nothing saved yet",
      color: "text-persian-blue-600",
      bgColor: "bg-persian-blue-50"
    },
    {
      title: "Results Kept",
      value: statsLoading ? "..." : (stats?.savedResults ?? 0).toString(),
      icon: Layers,
      change: stats?.savedResults ? "Waiting on your dashboard" : "Run a tool to save one",
      color: "text-persian-blue-700",
      bgColor: "bg-persian-blue-50"
    },
    {
      title: "Active Days",
      value: statsLoading ? "..." : (stats?.activeDays ?? 0).toString(),
      icon: Activity,
      change: stats?.lastActivityAt ? `Last active ${getTimeAgo(stats.lastActivityAt)}` : "No activity yet",
      color: "text-slate-600",
      bgColor: "bg-slate-100"
    }
  ];

  // Accounting figures only make sense once the user has registered a firm.
  const accountingStats = stats?.accounting ? [
    {
      title: "Invoices Generated",
      value: stats.accounting.invoicesCount.toString(),
      icon: FileText,
      change: stats.accounting.paidInvoices
        ? `${stats.accounting.paidInvoices} paid, ${stats.accounting.unpaidInvoices} pending`
        : "No invoices yet",
      color: "text-slate-600",
      bgColor: "bg-slate-100"
    },
    {
      title: "Total Clients",
      value: stats.accounting.clientsCount.toString(),
      icon: Building2,
      change: stats.accounting.clientsCount ? "Managed clients" : "Add your first client",
      color: "text-primary",
      bgColor: "bg-primary-light"
    },
    {
      // The one genuinely money-positive figure on this page — the only place
      // green is earned under the redesign's colour rule.
      title: "Total Revenue",
      value: `₹${parseFloat(stats.accounting.totalRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      change: stats.accounting.invoicesCount ? `From ${stats.accounting.invoicesCount} invoices` : "No revenue yet",
      color: "text-success",
      bgColor: "bg-success-light"
    }
  ] : [];

  const features = [
    {
      title: "Tax Calculator",
      description: "Calculate income tax with old vs new regime comparison",
      icon: Calculator,
      link: "/calculators/income-tax",
      color: "text-blue-600",
      bgGradient: "from-blue-500 to-persian-blue-600"
    },
    {
      title: "AIS Reconciliation",
      description: "Verify your income across AIS, 26AS & Form 16 before filing",
      icon: Layers,
      link: "/tools/ais-26as-form16",
      color: "text-persian-blue-700",
      bgGradient: "from-persian-blue-600 to-persian-blue-700",
      badge: "New"
    },
    {
      title: "Tax Blog & Guides",
      description: `${blogPosts.length} CA-reviewed articles on ITR, HRA, capital gains & more`,
      icon: BookOpen,
      link: "/blog",
      color: "text-persian-blue-700",
      bgGradient: "from-persian-blue-600 to-persian-blue-700"
    },
    {
      title: "Find a CA",
      description: "Free CA directory — verified CAs by city, no platform fee",
      icon: UserCheck,
      link: "/find-ca",
      color: "text-teal-600",
      bgGradient: "from-teal-500 to-teal-600"
    }
  ];

  return (
    <>
      <Helmet>
        <title>My Dashboard - AiTaxBot Personal Finance Hub</title>
        <meta name="description" content="Access your personal tax calculations, manage invoices, track clients, and view financial analytics. Comprehensive dashboard for Indian tax and financial management." />
        <meta name="keywords" content="tax dashboard, personal finance, invoice management, client tracking, tax analytics" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/dashboard" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {showProfileModal && (
        <ProfileCompletionModal onClose={() => setShowProfileModal(false)} />
      )}

      <div className="bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">

        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-persian-blue-600 to-persian-blue-700 rounded-2xl p-6 text-white mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-white/40" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {(userProfile?.firstName || user?.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome back, {userProfile?.firstName || user?.displayName?.split(' ')?.[0] || 'there'}!
                </h1>
                <p className="text-blue-100 text-sm">{user?.email}</p>
              </div>
            </div>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <User className="w-4 h-4 mr-1" /> My Profile
              </Button>
            </Link>
          </div>

          {/* Profile completion nudge */}
          {!isProfileComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Complete your profile to get personalised tax tips and faster support.</span>
              </div>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={() => setShowProfileModal(true)}>
                Complete Now
              </Button>
            </div>
          )}
        </div>

        {/* ── WHERE YOU LEFT OFF ──
            Deliberately the first thing below the welcome banner: it's the only
            section on this page that is about THIS user rather than about the
            product. Renders nothing when there's nothing saved yet. */}
        <SavedResultCards />

        {/* ── ITR DEADLINE COUNTDOWN ── */}
        {(() => {
          const deadline = new Date(2026, 6, 31); // July 31, 2026
          const now = new Date(); now.setHours(0,0,0,0);
          const days = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
          if (days < 0) return null;
          const urgent = days <= 14;
          return (
            <div className={`mb-6 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap
              ${urgent ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${urgent ? 'bg-red-100' : 'bg-amber-100'}`}>
                  <Clock className={`w-5 h-5 ${urgent ? 'text-red-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${urgent ? 'text-red-900' : 'text-amber-900'}`}>
                    {days === 0 ? 'TODAY is the ITR Deadline!' : `${days} days left to file your ITR`}
                  </p>
                  <p className={`text-xs ${urgent ? 'text-red-700' : 'text-amber-700'}`}>
                    ITR filing deadline for FY 2025-26 (AY 2026-27) — July 31, 2026
                  </p>
                </div>
              </div>
              <Link href="/blog/how-to-file-itr-1-online-fy-2025-26">
                <Button size="sm" className={urgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}>
                  Filing Guide <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          );
        })()}

        {/* ── TAX SEASON CHECKLIST ── */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Your ITR Filing Roadmap
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { step: 1, title: "AIS Reconciliation", desc: "Verify your income matches AIS & Form 16", href: "/tools/ais-26as-form16", badge: "Start here", icon: Search, from: "from-persian-blue-600", to: "to-persian-blue-700" },
              { step: 2, title: "Compare Regimes", desc: "Old vs New — find which saves you more", href: "/calculators/income-tax", badge: null, icon: Calculator, from: "from-blue-500", to: "to-persian-blue-600" },
              { step: 3, title: "Claim Deductions", desc: "HRA, 80C, NPS, home loan — don't miss any", href: "/calculators/hra", badge: null, icon: Target, from: "from-persian-blue-600", to: "to-persian-blue-700" },
              { step: 4, title: "File ITR by Jul 31", desc: "Step-by-step guide for ITR-1 & ITR-4", href: "/blog/how-to-file-itr-1-online-fy-2025-26", badge: null, icon: FileText, from: "from-green-500", to: "to-green-600" },
            ].map(({ step, title, desc, href, badge, icon: Icon, from, to }) => (
              <Link key={step} href={href}>
                <div className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${from} ${to} flex items-center justify-center shrink-0`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-500">Step {step}</span>
                    {badge && <span className="ml-auto text-[10px] font-bold text-persian-blue-800 bg-persian-blue-50 border border-persian-blue-100 px-1.5 py-0.5 rounded-full">{badge}</span>}
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{title}</p>
                  <p className="text-xs text-slate-500 leading-snug">{desc}</p>
                  <div className="mt-3 flex items-center text-xs font-semibold text-blue-600 group-hover:gap-1.5 gap-1 transition-all">
                    Go <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── TAX SAVING SCOPE (Prosperr-style) ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Your Tax Saving Scope
            </h2>
            <span className="text-xs text-slate-500">Based on FY 2026-27 rules · 100% free</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: PiggyBank, label: "Section 80C", color: "blue",
                bg: "bg-blue-50", iconColor: "text-blue-600", border: "border-blue-100",
                amount: "₹1,50,000", sub: "ELSS · PPF · LIC · ULIP",
                taxSaved: "Save up to ₹31,200 in tax",
                href: "/calculators/income-tax", cta: "Calculate Now"
              },
              {
                icon: Home, label: "HRA Exemption", color: "violet",
                bg: "bg-violet-50", iconColor: "text-violet-600", border: "border-violet-100",
                amount: "Varies", sub: "Section 10(13A) · 8 metro cities",
                taxSaved: "Use calculator for exact amount",
                href: "/calculators/hra", cta: "Calculate HRA"
              },
              {
                icon: Target, label: "NPS 80CCD(1B)", color: "emerald",
                bg: "bg-emerald-50", iconColor: "text-emerald-600", border: "border-emerald-100",
                amount: "₹50,000", sub: "Extra deduction beyond 80C",
                taxSaved: "Save up to ₹15,600 in tax",
                href: "/calculators/nps", cta: "Calculate NPS"
              },
              {
                icon: Layers, label: "AIS Reconciliation", color: "indigo",
                bg: "bg-persian-blue-50", iconColor: "text-persian-blue-700", border: "border-persian-blue-100",
                amount: "Avoid Notices", sub: "Match AIS · 26AS · Form 16",
                taxSaved: "Spot mismatches before filing",
                href: "/tools/ais-26as-form16", cta: "Run Free →", badge: "New"
              },
            ].map(({ icon: Icon, label, bg, iconColor, border, amount, sub, taxSaved, href, cta, badge }) => (
              <div key={label} className={`bg-white border ${border} rounded-2xl p-5 flex flex-col gap-3`}>
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                  </div>
                  {badge && <span className="text-[10px] font-bold text-persian-blue-800 bg-persian-blue-50 border border-persian-blue-100 px-1.5 py-0.5 rounded-full">{badge}</span>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-0.5">{label}</p>
                  <p className="text-2xl font-black text-slate-900">{amount}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
                <p className="text-xs text-green-700 font-medium bg-green-50 rounded-lg px-2.5 py-1.5">{taxSaved}</p>
                <Link href={href} className="mt-auto">
                  <Button size="sm" variant="outline" className={`w-full text-xs font-semibold border-slate-200 hover:bg-slate-50`}>
                    {cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">* Tax saved estimates based on 30% slab. Actual savings depend on your income & deductions.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                  {/* tabular-figures: the redesign uses IBM Plex's tabular
                      numerals so figures don't jitter or misalign between cards */}
                  <p className="text-2xl font-bold text-slate-900 tabular-figures">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Accounting stats — rendered only for users who have registered a
            firm. Everyone else previously saw these three cards permanently
            reading 0 / 0 / ₹0, which read as "the dashboard is broken". */}
        {accountingStats.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Your Practice</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {accountingStats.map((stat, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-slate-900 tabular-figures">{stat.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}


        {/* Saved Tax Calculations */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Saved Tax Calculations</h2>
            <Link href="/calculators/income-tax">
              <Button variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                <Calculator className="h-4 w-4 mr-2" />
                New Calculation
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-6">
              {taxCalcLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : taxCalculations.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No saved calculations</p>
                  <p className="text-sm text-slate-500 mb-4">Use the Income Tax Calculator and click "Save Calculation" to store your results here.</p>
                  <Link href="/calculators/income-tax">
                    <Button variant="default">
                      Go to Tax Calculator
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 mb-4">
                    Your last {taxCalculations.length} calculation{taxCalculations.length > 1 ? 's' : ''}. 
                    Calculations are automatically deleted after 30 days.
                  </p>
                  {taxCalculations.map((calc) => {
                    const daysLeft = getDaysUntilExpiry(calc.expiresAt);
                    return (
                      <div
                        key={calc.id}
                        className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        data-testid={`saved-calc-${calc.id}`}
                      >
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Calculator className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900">
                              FY {calc.financialYear} (AY {calc.assessmentYear})
                            </p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              calc.recommendedRegime === 'new' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {calc.recommendedRegime === 'new' ? 'New Regime' : 'Old Regime'} Recommended
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Gross Income: ₹{parseFloat(calc.grossIncome).toLocaleString('en-IN')} • 
                            Tax Savings: ₹{parseFloat(calc.savings).toLocaleString('en-IN')}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Saved {formatDate(calc.createdAt)}
                            </span>
                            <span className={`flex items-center gap-1 ${daysLeft <= 7 ? 'text-orange-500' : ''}`}>
                              {daysLeft > 0 ? `Expires in ${daysLeft} days` : 'Expired'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePDFFromHistory(calc)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => deleteCalculation(calc.id)}
                            disabled={deletingId === calc.id}
                            title="Delete"
                          >
                            {deletingId === calc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Link key={index} href={feature.link}>
                <Card className="group hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden" data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className={`h-2 bg-gradient-to-r ${feature.bgGradient}`}></div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg bg-slate-50 group-hover:scale-110 transition-transform`}>
                          <feature.icon className={`h-6 w-6 ${feature.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{feature.title}</CardTitle>
                            {(feature as any).badge && (
                              <span className="text-[10px] font-bold text-persian-blue-800 bg-persian-blue-50 border border-persian-blue-100 px-1.5 py-0.5 rounded-full">{(feature as any).badge}</span>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {feature.description}
                          </CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Calculator Activity */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Recent Calculator Activity</h2>
          </div>
          <Card>
            <CardContent className="p-6">
              {toolUsageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : toolUsageEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No calculator activity yet</p>
                  <p className="text-sm text-slate-500">Use any calculator while logged in and your activity will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {toolUsageEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-4 pb-3 border-b last:border-b-0 last:pb-0"
                    >
                      <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                        <Calculator className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{event.tool}</p>
                        {event.summary && (
                          <p className="text-sm text-slate-600 mt-0.5 truncate">{event.summary}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">{getTimeAgo(event.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        {/* ── TAX CALENDAR — fully dynamic, auto-updates FY and done status ── */}
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // FY runs Apr 1 – Mar 31. April = month index 3 (0-based).
          const fyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
          const fyEnd   = fyStart + 1;
          const fyLabel = `FY ${fyStart}-${String(fyEnd).slice(2)} Tax Calendar`;

          const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const fmt = (y: number, m: number, d: number) => {
            // m is 1-based
            return `${String(d).padStart(2,'0')} ${MONTHS[m-1]} ${y}`;
          };
          const deadline = (y: number, m: number, d: number) => {
            const dt = new Date(y, m - 1, d); // local midnight
            return { display: fmt(y, m, d), past: today > dt };
          };

          const events = [
            { ...deadline(fyStart, 6, 15),  label: "Advance Tax",  sub: "1st instalment — 15% of liability",    color: "green"  },
            { ...deadline(fyStart, 9, 15),  label: "Advance Tax",  sub: "2nd instalment — 45% cumulative",       color: "green"  },
            { ...deadline(fyStart, 12, 15), label: "Advance Tax",  sub: "3rd instalment — 75% cumulative",       color: "green"  },
            { ...deadline(fyEnd,   3, 15),  label: "Advance Tax",  sub: "4th instalment — 100% cumulative",      color: "amber"  },
            { ...deadline(fyEnd,   4, 30),  label: "TDS Return Q4",sub: "Form 26Q / 24Q",                        color: "purple" },
            { ...deadline(fyEnd,   6, 15),  label: "Form 16",      sub: "Employer must issue by this date",      color: "indigo" },
            { ...deadline(fyEnd,   7, 31),  label: "ITR Filing",   sub: "Last date to file without penalty",     color: "blue"   },
            { ...deadline(fyEnd,  12, 31),  label: "Belated ITR",  sub: "Last date with penalty",                color: "red"    },
          ];

          return (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {fyLabel}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {events.map((item, i) => (
                  <div key={i} className={`bg-white rounded-xl border p-3 flex items-start gap-3 ${item.past ? 'opacity-60' : ''}`}>
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold
                      ${item.past        ? 'bg-green-500'  :
                        item.color === 'amber'  ? 'bg-amber-500'  :
                        item.color === 'blue'   ? 'bg-blue-600'   :
                        item.color === 'purple' ? 'bg-persian-blue-700' :
                        item.color === 'indigo' ? 'bg-persian-blue-700' : 'bg-red-500'}`}>
                      {item.past ? '✓' : <Calendar className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.display}</p>
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-500 leading-tight">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        </div>

      </div>
    </div>
    </>
  );
}

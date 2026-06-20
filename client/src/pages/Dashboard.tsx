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
import {
  Calculator,
  FileText,
  TrendingUp,
  Building2,
  BookOpen,
  ArrowRight,
  User,
  Activity,
  CreditCard,
  DollarSign,
  Loader2,
  Download,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import jsPDF from 'jspdf';

interface DashboardStats {
  firmsCount: number;
  invoicesCount: number;
  clientsCount: number;
  totalRevenue: string;
  paidInvoices: number;
  unpaidInvoices: number;
  taxCalculations: number;
}

interface DashboardActivity {
  type: string;
  title: string;
  description: string;
  time: string;
  icon: string;
  color: string;
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
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Show profile completion modal once for new users
  useEffect(() => {
    if (userProfile && !isProfileComplete) {
      const dismissed = sessionStorage.getItem('profileModalDismissed');
      if (!dismissed) setShowProfileModal(true);
    }
  }, [userProfile, isProfileComplete]);

  useEffect(() => {
    trackPageView('/dashboard', 'User Dashboard - AiTaxBot');
  }, []);

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/accounting/dashboard/stats'],
  });

  // Fetch recent activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<DashboardActivity[]>({
    queryKey: ['/api/accounting/dashboard/activities'],
  });

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

  const quickStats = [
    {
      title: "Tax Calculations",
      value: statsLoading ? "..." : (stats?.taxCalculations || 0).toString(),
      icon: Calculator,
      change: stats?.taxCalculations ? "Completed" : "Get started",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Invoices Generated",
      value: statsLoading ? "..." : (stats?.invoicesCount || 0).toString(),
      icon: FileText,
      change: stats?.paidInvoices ? `${stats.paidInvoices} paid, ${stats.unpaidInvoices} pending` : "No invoices yet",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Clients",
      value: statsLoading ? "..." : (stats?.clientsCount || 0).toString(),
      icon: Building2,
      change: stats?.clientsCount ? "Managed clients" : "Add your first client",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Total Revenue",
      value: statsLoading ? "..." : (stats?.totalRevenue ? `₹${parseFloat(stats.totalRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : "₹0"),
      icon: DollarSign,
      change: stats?.invoicesCount ? `From ${stats.invoicesCount} invoices` : "No revenue yet",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const features = [
    {
      title: "Tax Calculator",
      description: "Calculate income tax with old vs new regime comparison",
      icon: Calculator,
      link: "/",
      color: "text-blue-600",
      bgGradient: "from-blue-500 to-blue-600"
    },
    {
      title: "GST Invoicing",
      description: "Create GST-compliant invoices and manage clients",
      icon: FileText,
      link: "/accounting",
      color: "text-green-600",
      bgGradient: "from-green-500 to-green-600"
    },
    {
      title: "Tax Blog",
      description: "Expert CA articles on tax planning and savings",
      icon: TrendingUp,
      link: "/blog",
      color: "text-purple-600",
      bgGradient: "from-purple-500 to-purple-600"
    },
    {
      title: "Tax Blog",
      description: "Latest updates on tax laws and financial planning",
      icon: BookOpen,
      link: "/blog",
      color: "text-orange-600",
      bgGradient: "from-orange-500 to-orange-600"
    }
  ];

  // Helper to format time ago
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

  // Helper to get icon component
  const getIconComponent = (iconName: string) => {
    const icons: any = {
      FileText,
      Building2,
      Calculator,
      TrendingUp,
      User
    };
    return icons[iconName] || FileText;
  };

  return (
    <>
      <Helmet>
        <title>My Dashboard - AiTaxBot Personal Finance Hub</title>
        <meta name="description" content="Access your personal tax calculations, manage invoices, track clients, and view financial analytics. Comprehensive dashboard for Indian tax and financial management." />
        <meta name="keywords" content="tax dashboard, personal finance, invoice management, client tracking, tax analytics" />
        <link rel="canonical" href="https://aitaxbot.co.in/dashboard" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      {showProfileModal && (
        <ProfileCompletionModal onClose={() => {
          sessionStorage.setItem('profileModalDismissed', '1');
          setShowProfileModal(false);
        }} />
      )}

      <div className="bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">

        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-4 flex items-center justify-between gap-4 flex-wrap">
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
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>


        {/* Saved Tax Calculations */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Saved Tax Calculations</h2>
            <Link href="/">
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
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No saved calculations</p>
                  <p className="text-sm text-gray-500 mb-4">Use the Income Tax Calculator and click "Save Calculation" to store your results here.</p>
                  <Link href="/">
                    <Button variant="default">
                      Go to Tax Calculator
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Your last {taxCalculations.length} calculation{taxCalculations.length > 1 ? 's' : ''}. 
                    Calculations are automatically deleted after 30 days.
                  </p>
                  {taxCalculations.map((calc) => {
                    const daysLeft = getDaysUntilExpiry(calc.expiresAt);
                    return (
                      <div
                        key={calc.id}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        data-testid={`saved-calc-${calc.id}`}
                      >
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Calculator className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">
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
                          <p className="text-sm text-gray-600">
                            Gross Income: ₹{parseFloat(calc.grossIncome).toLocaleString('en-IN')} • 
                            Tax Savings: ₹{parseFloat(calc.savings).toLocaleString('en-IN')}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Link key={index} href={feature.link}>
                <Card className="group hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden" data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className={`h-2 bg-gradient-to-r ${feature.bgGradient}`}></div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg bg-gray-50 group-hover:scale-110 transition-transform`}>
                          <feature.icon className={`h-6 w-6 ${feature.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{feature.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {feature.description}
                          </CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
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
            <h2 className="text-2xl font-bold text-gray-900">Recent Calculator Activity</h2>
          </div>
          <Card>
            <CardContent className="p-6">
              {toolUsageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : toolUsageEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No calculator activity yet</p>
                  <p className="text-sm text-gray-500">Use any calculator while logged in and your activity will appear here.</p>
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
                        <p className="font-semibold text-gray-900 truncate">{event.tool}</p>
                        {event.summary && (
                          <p className="text-sm text-gray-600 mt-0.5 truncate">{event.summary}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{getTimeAgo(event.createdAt)}</p>
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
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                        item.color === 'purple' ? 'bg-purple-600' :
                        item.color === 'indigo' ? 'bg-indigo-600' : 'bg-red-500'}`}>
                      {item.past ? '✓' : <Calendar className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{item.display}</p>
                      <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-500 leading-tight">{item.sub}</p>
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

import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trackPageView } from "@/lib/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveAd, LeaderboardAd } from "@/components/AdBanner";
import { useToast } from "@/hooks/use-toast";
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
  CheckCircle
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
  const { user, getIdToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    doc.text('www.aitaxbot.in', pageWidth - 20, y, { align: 'right' });

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
      title: "Market Data",
      description: "Real-time Indian stock market data and analytics",
      icon: TrendingUp,
      link: "/market-data",
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
        <link rel="canonical" href="https://aitaxbot.in/dashboard" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Hello {user?.displayName?.split(' ')?.[0] || user?.email?.split('@')?.[0] || 'User'}! Welcome to Your AiTaxBot Dashboard
              </h1>
              <p className="text-gray-600">
                {user?.email || 'User'}
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Personalized Financial Control Center</h2>
            <p className="text-gray-700 mb-3">
              Welcome to your comprehensive financial management dashboard at AiTaxBot. This centralized hub provides you with complete visibility 
              and control over your tax calculations, GST invoicing, client management, and financial analytics. Our platform is designed to streamline 
              your tax compliance workflow while providing real-time insights into your business performance.
            </p>
            <p className="text-gray-700 mb-3">
              Track your tax calculations across old and new regimes, manage client invoices with GST compliance, and monitor your revenue streams 
              all from one intuitive interface. The dashboard automatically aggregates data from all your activities, giving you instant access to 
              critical metrics like total revenue, pending invoices, client counts, and tax optimization opportunities.
            </p>
            <p className="text-gray-700">
              Access powerful tools including our advanced tax calculator with regime comparison, GST-compliant invoice generator, Indian stock 
              market data integration, and comprehensive tax blog with latest updates. Whether you're a freelancer, small business owner, or 
              accounting professional, AiTaxBot provides the tools you need to manage finances efficiently and stay compliant with Indian tax regulations.
            </p>
          </div>
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

        {/* Ad after Stats */}
        <div className="mb-8 flex justify-center">
          <ResponsiveAd />
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

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
          </div>
          <Card>
            <CardContent className="p-6">
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No recent activity</p>
                  <p className="text-sm text-gray-500">Start using AiTaxBot to see your activities here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity, index) => {
                    const IconComponent = getIconComponent(activity.icon);
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0"
                        data-testid={`activity-${index}`}
                      >
                        <div className={`p-2 rounded-lg bg-gray-50`}>
                          <IconComponent className={`h-5 w-5 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{getTimeAgo(activity.time)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ad at Bottom of Dashboard */}
        <div className="mt-8 flex justify-center">
          <LeaderboardAd />
        </div>
      </div>
    </div>
    </>
  );
}

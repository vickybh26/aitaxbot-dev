import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import WhatsAppButton from "@/components/WhatsAppButton";
import Layout from "@/components/Layout";

// Landing and Login are eagerly loaded — they're needed on first paint
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";

// All other pages are lazy-loaded — loaded only when the user navigates to them.
// This reduces the initial bundle by ~600-800 KiB, dramatically improving LCP/TBT.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const AccountingDashboard = lazy(() => import("@/pages/accounting/AccountingDashboard"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const TermsOfService = lazy(() => import("@/pages/terms-of-service"));
const Calculators = lazy(() => import("@/pages/Calculators"));
const IncomeTaxCalculator = lazy(() => import("@/pages/IncomeTaxCalculator"));
const HRACalculator = lazy(() => import("@/pages/HRACalculator"));
const SIPCalculator = lazy(() => import("@/pages/SIPCalculator"));
const SWPCalculator = lazy(() => import("@/pages/SWPCalculator"));
const PFCalculator = lazy(() => import("@/pages/PFCalculator"));
const NPSCalculator = lazy(() => import("@/pages/NPSCalculator"));
const HomeLoanCalculator = lazy(() => import("@/pages/HomeLoanCalculator"));
const VehicleLoanCalculator = lazy(() => import("@/pages/VehicleLoanCalculator"));
const TradingTaxCalculatorPage = lazy(() => import("@/pages/TradingTaxCalculator"));
const NRICorner = lazy(() => import("@/pages/NRICorner"));
const DTAACalculator = lazy(() => import("@/pages/nri/DTAACalculator"));
const NRONREComparison = lazy(() => import("@/pages/nri/NRONREComparison"));
const NRIIncomeTaxCalculator = lazy(() => import("@/pages/nri/NRIIncomeTaxCalculator"));
const RepatriationPlanner = lazy(() => import("@/pages/nri/RepatriationPlanner"));
const RentReceiptGenerator = lazy(() => import("@/pages/RentReceiptGenerator"));
const AIS26ASForm16Tool = lazy(() => import("@/pages/AIS26ASForm16Tool"));
const FindCA = lazy(() => import("@/pages/FindCA"));
const CARegister = lazy(() => import("@/pages/CARegister"));
const CAMyProfile = lazy(() => import("@/pages/CAMyProfile"));
const Profile = lazy(() => import("@/pages/Profile"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminCAs = lazy(() => import("@/pages/admin/AdminCAs"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Minimal full-screen spinner shown while a lazy chunk loads
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-persian-blue-600 mx-auto" />
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login with returnUrl
      const returnUrl = encodeURIComponent(location);
      setLocation(`/login?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}

// Admin-only route — requires adminLevel to be set (1, 2, or 3)
function AdminRoute({ component: Component, minLevel = 3 }: { component: any; minLevel?: number }) {
  const { isAuthenticated, adminLevel, adminLoading, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for BOTH firebase auth AND the admin-level check to resolve before redirecting.
    // Previously we redirected as soon as loading=false, but adminLoading could still be true
    // (the /api/admin/me fetch runs in parallel and was not awaited), causing a race condition
    // that kicked every admin back to "/" on page load.
    if (!loading && !adminLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
      } else if (adminLevel === null) {
        // Logged in but confirmed not an admin — redirect home
        setLocation("/");
      }
    }
  }, [isAuthenticated, adminLevel, adminLoading, loading, setLocation]);

  // Show spinner while Firebase auth OR admin check is still in-flight
  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-persian-blue-400" />
      </div>
    );
  }

  if (!isAuthenticated || adminLevel === null || adminLevel > minLevel) {
    return null;
  }

  return <Component />;
}

function Router() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [location] = useLocation();

  const showModal = (modalType: string) => {
    setActiveModal(modalType);
  };

  // Admin pages use their own AdminLayout — skip the main site Layout
  const isAdminRoute = location.startsWith("/admin");
  if (isAdminRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/admin">
            {() => <AdminRoute component={AdminDashboard} minLevel={3} />}
          </Route>
          <Route path="/admin/users">
            {() => <AdminRoute component={AdminUsers} minLevel={3} />}
          </Route>
          <Route path="/admin/analytics">
            {() => <AdminRoute component={AdminAnalytics} minLevel={3} />}
          </Route>
          <Route path="/admin/cas">
            {() => <AdminRoute component={AdminCAs} minLevel={3} />}
          </Route>
          <Route path="/admin/leads">
            {() => <AdminRoute component={AdminLeads} minLevel={3} />}
          </Route>
        </Switch>
      </Suspense>
    );
  }

  return (
    <Layout showModal={showModal}>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={(props) => <Landing {...props} activeModal={activeModal} setActiveModal={setActiveModal} />} />
          <Route path="/login" component={Login} />
          <Route path="/dashboard">
            {() => <ProtectedRoute component={Dashboard} />}
          </Route>
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/profile">
            {() => <ProtectedRoute component={Profile} />}
          </Route>
          <Route path="/accounting" component={AccountingDashboard} />
          <Route path="/calculators" component={Calculators} />
          <Route path="/calculators/income-tax" component={IncomeTaxCalculator} />
          <Route path="/calculators/hra" component={HRACalculator} />
          <Route path="/calculators/sip" component={SIPCalculator} />
          <Route path="/calculators/swp" component={SWPCalculator} />
          <Route path="/calculators/pf" component={PFCalculator} />
          <Route path="/calculators/nps" component={NPSCalculator} />
          <Route path="/calculators/home-loan" component={HomeLoanCalculator} />
          <Route path="/calculators/vehicle-loan" component={VehicleLoanCalculator} />
          <Route path="/calculators/trading-tax" component={TradingTaxCalculatorPage} />
          <Route path="/nri" component={NRICorner} />
          <Route path="/nri/dtaa-calculator" component={DTAACalculator} />
          <Route path="/nri/nro-nre-comparison" component={NRONREComparison} />
          <Route path="/nri/income-tax-calculator" component={NRIIncomeTaxCalculator} />
          <Route path="/nri/repatriation-planner" component={RepatriationPlanner} />
          <Route path="/tools/rent-receipt" component={RentReceiptGenerator} />
          <Route path="/tools/ais-26as-form16" component={AIS26ASForm16Tool} />
          <Route path="/find-ca" component={FindCA} />
          <Route path="/ca/register" component={CARegister} />
          <Route path="/ca/my-profile" component={CAMyProfile} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <CookieConsent />
            <WhatsAppButton />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;

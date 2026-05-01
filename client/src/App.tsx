import { useState, useEffect } from "react";
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
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import AccountingDashboard from "@/pages/accounting/AccountingDashboard";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import Calculators from "@/pages/Calculators";
import IncomeTaxCalculator from "@/pages/IncomeTaxCalculator";
import HRACalculator from "@/pages/HRACalculator";
import SIPCalculator from "@/pages/SIPCalculator";
import SWPCalculator from "@/pages/SWPCalculator";
import PFCalculator from "@/pages/PFCalculator";
import NPSCalculator from "@/pages/NPSCalculator";
import HomeLoanCalculator from "@/pages/HomeLoanCalculator";
import VehicleLoanCalculator from "@/pages/VehicleLoanCalculator";
import TradingTaxCalculatorPage from "@/pages/TradingTaxCalculator";
import NRICorner from "@/pages/NRICorner";
import DTAACalculator from "@/pages/nri/DTAACalculator";
import NRONREComparison from "@/pages/nri/NRONREComparison";
import NRIIncomeTaxCalculator from "@/pages/nri/NRIIncomeTaxCalculator";
import RepatriationPlanner from "@/pages/nri/RepatriationPlanner";
import RentReceiptGenerator from "@/pages/RentReceiptGenerator";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import NotFound from "@/pages/not-found";

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
  const { isAuthenticated, adminLevel, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        setLocation("/login");
      } else if (adminLevel === null) {
        // Logged in but not an admin — redirect home
        setLocation("/");
      }
    }
  }, [isAuthenticated, adminLevel, loading, setLocation]);

  if (loading) {
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
      </Switch>
    );
  }

  return (
    <Layout showModal={showModal}>
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
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
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

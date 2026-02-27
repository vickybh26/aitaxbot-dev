import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import MarketData from "@/pages/MarketData";
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

function Router() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  const showModal = (modalType: string) => {
    setActiveModal(modalType);
  };

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
        <Route path="/market-data" component={MarketData} />
        <Route path="/accounting" component={AccountingDashboard} />
        <Route path="/calculators" component={Calculators} />
        <Route path="/calculators/income-tax" component={IncomeTaxCalculator} />
        <Route path="/calculators/hra" component={HRACalculator} />
        <Route path="/calculators/sip" component={SIPCalculator} />
        <Route path="/calculators/swp" component={SWPCalculator} />
        <Route path="/calculators/pf" component={PFCalculator} />
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
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;

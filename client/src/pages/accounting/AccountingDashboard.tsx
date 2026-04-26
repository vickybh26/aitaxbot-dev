import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, BookOpen, Lock, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trackPageView } from "@/lib/analytics";
import FirmSetup from "@/components/accounting/FirmSetup";
import ClientManager from "@/components/accounting/ClientManager";
import InvoiceGenerator from "@/components/accounting/InvoiceGenerator";
import SalesRegister from "@/components/accounting/SalesRegister";

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState("firms");
  const [selectedFirmId, setSelectedFirmId] = useState<string>("");
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    trackPageView('/accounting', 'Accounting & Invoicing - AiTaxBot');
  }, []);

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
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto mt-16">
          <Card className="border-2 border-blue-100">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Login Required</CardTitle>
              <CardDescription className="text-base mt-2">
                Please login to access the Accounting & Invoicing module
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 text-gray-900">Features you'll get access to:</h3>
                <ul className="text-left space-y-2 mb-6 max-w-md mx-auto">
                  <li className="flex items-start">
                    <Building2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Multi-firm management with GST/Non-GST support</span>
                  </li>
                  <li className="flex items-start">
                    <Users className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Client management with complete contact details</span>
                  </li>
                  <li className="flex items-start">
                    <FileText className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">GST-compliant invoice generation with auto-calculations</span>
                  </li>
                  <li className="flex items-start">
                    <BookOpen className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Sales register and GST reports</span>
                  </li>
                </ul>
              </div>
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.location.href = "/login"}
                data-testid="button-login-to-accounting"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Login to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>GST Accounting & Invoicing | AiTaxBot</title>
        <meta name="description" content="Manage GST invoicing, sales register, purchase register and accounting for your business with AiTaxBot." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Accounting & Invoicing
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage firms, clients, GST invoices, and sales registers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="firms" className="flex items-center gap-2" data-testid="tab-firms">
            <Building2 className="h-4 w-4" />
            Firms
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2" data-testid="tab-clients">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2" data-testid="tab-invoices">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center gap-2" data-testid="tab-register">
            <BookOpen className="h-4 w-4" />
            Sales Register
          </TabsTrigger>
        </TabsList>

        <TabsContent value="firms">
          <Card>
            <CardHeader>
              <CardTitle>Firm Management</CardTitle>
              <CardDescription>
                Create and manage your firms/companies with GST details and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FirmSetup onFirmSelected={setSelectedFirmId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Client Management</CardTitle>
              <CardDescription>
                Manage clients for your selected firm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientManager firmId={selectedFirmId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Generator</CardTitle>
              <CardDescription>
                Generate branded GST invoices with automatic calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceGenerator firmId={selectedFirmId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Sales Register</CardTitle>
              <CardDescription>
                View monthly sales summaries and GST reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesRegister firmId={selectedFirmId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}

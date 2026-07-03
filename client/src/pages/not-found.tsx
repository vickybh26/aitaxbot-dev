import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Calculator, BookOpen, Mail, AlertCircle } from "lucide-react";
import { trackPageView } from "@/lib/analytics";

export default function NotFound() {
  // Track 404 page view
  useEffect(() => {
    trackPageView('/404', '404 - Page Not Found | AiTaxBot');
  }, []);

  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | AiTaxBot</title>
        <meta name="description" content="The page you are looking for does not exist. Return to AiTaxBot home for tax calculators and financial tools." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4 py-12">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">404</h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
                Page Not Found
              </h2>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved. 
                Let's get you back on track!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <Link
                href="/"
                className="w-full h-auto py-4 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer text-center justify-center"
                data-testid="button-home-404"
              >
                <Home className="h-6 w-6" />
                <span className="font-semibold">Go to Home</span>
              </Link>

              <Link
                href="/calculators"
                className="w-full h-auto py-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors cursor-pointer text-center justify-center"
                data-testid="button-calculators-404"
              >
                <Calculator className="h-6 w-6" />
                <span className="font-semibold">Tax Calculators</span>
              </Link>

              <Link
                href="/blog"
                className="w-full h-auto py-4 flex flex-col items-center gap-2 border-2 border-gray-300 hover:border-gray-400 rounded-md transition-colors cursor-pointer text-center justify-center"
                data-testid="button-blog-404"
              >
                <BookOpen className="h-6 w-6" />
                <span className="font-semibold">Read Our Blog</span>
              </Link>

              <Link
                href="/contact"
                className="w-full h-auto py-4 flex flex-col items-center gap-2 border-2 border-gray-300 hover:border-gray-400 rounded-md transition-colors cursor-pointer text-center justify-center"
                data-testid="button-contact-404"
              >
                <Mail className="h-6 w-6" />
                <span className="font-semibold">Contact Us</span>
              </Link>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Looking for something specific? Try our{" "}
                <Link href="/calculators/income-tax" className="text-blue-600 hover:underline font-medium">
                  Income Tax Calculator
                </Link>
                {" "}or{" "}
                <Link href="/blog" className="text-blue-600 hover:underline font-medium">
                  Read our Blog
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

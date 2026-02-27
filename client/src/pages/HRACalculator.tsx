import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import HRACalculator from '@/components/calculators/HRACalculator';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import { 
  generateCalculatorSchema, 
  generateBreadcrumbSchema, 
  generateOrganizationSchema 
} from '@/lib/structuredData';
import { AlertCircle } from 'lucide-react';
import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';

const hraFAQs = [
  {
    question: "How is HRA exemption calculated in India for FY 2025-26?",
    answer: "HRA exemption is the minimum of three amounts: (1) Actual HRA received from employer, (2) Rent paid minus 10% of basic salary, and (3) 50% of basic salary for metro cities or 40% for non-metro cities. Use our free HRA Calculator to compute instantly."
  },
  {
    question: "Can I claim HRA if I own a house in another city?",
    answer: "Yes, you can claim HRA exemption even if you own a house in another city, as long as you are living in rented accommodation in your city of employment."
  },
  {
    question: "What if I pay rent to my parents?",
    answer: "You can claim HRA exemption for rent paid to parents, provided you have a proper rent agreement, rent receipts, and your parents declare this as rental income in their tax returns."
  },
  {
    question: "Is HRA available in the New Tax Regime?",
    answer: "No, HRA exemption under Section 10(13A) is not available under the New Tax Regime. You must opt for the Old Tax Regime to claim HRA and other deductions."
  },
  {
    question: "Which cities are considered metro for HRA calculation?",
    answer: "For HRA calculation, only Mumbai, Delhi, Kolkata, and Chennai are considered metro cities. All other cities and towns are non-metro. Metro city residents can claim up to 50% of basic salary, while non-metro residents can claim up to 40%."
  }
];

export default function HRACalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/hra', 'HRA Calculator Section 10(13A) - AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "HRA Calculator - House Rent Allowance Exemption",
    description: "Free HRA Calculator to compute House Rent Allowance tax exemption under Section 10(13A) for metro and non-metro cities in India.",
    url: "https://aitaxbot.in/calculators/hra",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.in/" },
    { name: "Calculators", url: "https://aitaxbot.in/calculators" },
    { name: "HRA Calculator", url: "https://aitaxbot.in/calculators/hra" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>HRA Calculator India FY 2025-26 - Section 10(13A) | AiTaxBot</title>
        <meta name="description" content="Free HRA Calculator for FY 2025-26 (AY 2026-27). Compute House Rent Allowance exemption under Section 10(13A) for metro & non-metro cities in India." />
        <meta name="keywords" content="HRA calculator, house rent allowance, section 10 13a, HRA exemption, HRA deduction, metro HRA, non-metro HRA, rent calculator India" />
        <link rel="canonical" href="https://aitaxbot.in/calculators/hra" />
        <meta property="og:title" content="HRA Calculator India FY 2025-26 - Section 10(13A) | AiTaxBot" />
        <meta property="og:description" content="Free HRA Calculator FY 2025-26. Compute House Rent Allowance exemption under Section 10(13A) for metro & non-metro cities in India." />
        <meta property="og:url" content="https://aitaxbot.in/calculators/hra" />
        <meta property="og:type" content="website" />
        
        <script type="application/ld+json">
          {JSON.stringify(calculatorSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header with Breadcrumb */}
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Link href="/" className="hover:text-persian-blue-600">Home</Link>
              <span>/</span>
              <Link href="/calculators" className="hover:text-persian-blue-600">Calculators</Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">HRA Calculator</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 px-6 bg-gradient-to-r from-green-600 to-green-700">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              HRA Calculator India - FY 2025-26 (AY 2026-27)
            </h1>
            <p className="text-lg text-white/90 max-w-3xl">
              Calculate your House Rent Allowance (HRA) tax exemption under Section 10(13A) for FY 2025-26. 
              Find out the maximum HRA deduction you can claim based on your salary, rent paid, and city type (Old Tax Regime only).
            </p>
          </div>
        </section>

        {/* Important Notice */}
        <section className="py-4 px-6 bg-blue-50 border-b border-blue-200">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-3 p-4 bg-white/80 rounded-lg border border-blue-300 shadow-sm">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> HRA exemption is available only under the <strong>Old Tax Regime</strong>. 
                  Under the New Regime (default from FY 2023-24), HRA is taxable. 
                  Use our <Link href="/calculators/income-tax" className="underline text-blue-700 hover:text-blue-900">Income Tax Calculator</Link> to compare both regimes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <HRACalculator />
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">How to Calculate HRA Exemption</h2>
            
            <div className="grid md:grid-cols-2 gap-8 not-prose mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What is HRA?</h3>
                <p className="text-slate-600">
                  House Rent Allowance (HRA) is a component of your salary provided by employers to compensate 
                  for accommodation expenses. It's partially or fully exempt from income tax under Section 10(13A).
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Who Can Claim HRA?</h3>
                <p className="text-slate-600">
                  Salaried individuals living in rented accommodation can claim HRA exemption. You must receive 
                  HRA as part of your salary and actually pay rent to claim this benefit.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">HRA Calculation Formula</h2>
            <p className="text-slate-600 mb-4">
              The HRA exemption is the minimum of the following three amounts:
            </p>
            <ol className="list-decimal list-inside text-slate-600 mb-6 space-y-2">
              <li>Actual HRA received from employer</li>
              <li>Rent paid minus 10% of basic salary</li>
              <li>50% of basic salary (for metro cities) or 40% of basic salary (for non-metro cities)</li>
            </ol>

            <h3 className="text-xl font-semibold text-slate-900 mb-3">Metro vs Non-Metro Cities</h3>
            <p className="text-slate-600 mb-4">
              For HRA calculation, metro cities are defined as:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-1">
              <li>Mumbai</li>
              <li>Delhi</li>
              <li>Kolkata</li>
              <li>Chennai</li>
            </ul>
            <p className="text-slate-600 mb-6">
              All other cities and towns are considered non-metro. Metro city residents can claim up to 50% of 
              basic salary, while non-metro residents can claim up to 40%.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Requirements for HRA Exemption</h2>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>You must be a salaried employee receiving HRA as part of your salary structure</li>
              <li>You must live in rented accommodation (not your own house)</li>
              <li>You must actually pay rent (cannot claim if living with parents rent-free)</li>
              <li>Rent receipts must be maintained for amounts above ₹3,000 per month</li>
              <li>PAN of landlord required if annual rent exceeds ₹1 lakh</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Example Calculation</h2>
            <div className="bg-slate-50 p-6 rounded-lg mb-6 not-prose">
              <p className="text-slate-900 font-semibold mb-2">Scenario:</p>
              <ul className="text-slate-600 space-y-1 mb-4">
                <li>Basic Salary: ₹40,000 per month (₹4,80,000 annually)</li>
                <li>HRA Received: ₹20,000 per month (₹2,40,000 annually)</li>
                <li>Rent Paid: ₹15,000 per month (₹1,80,000 annually)</li>
                <li>City: Mumbai (Metro)</li>
              </ul>
              <p className="text-slate-900 font-semibold mb-2">Calculation:</p>
              <ul className="text-slate-600 space-y-1">
                <li>1. Actual HRA received: ₹2,40,000</li>
                <li>2. Rent paid - 10% of basic: ₹1,80,000 - ₹48,000 = ₹1,32,000</li>
                <li>3. 50% of basic salary (metro): ₹2,40,000</li>
                <li className="font-semibold text-slate-900 pt-2">HRA Exemption: ₹1,32,000 (minimum of above three)</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Can I claim HRA if I own a house in another city?</h4>
                <p className="text-slate-600">
                  Yes, you can claim HRA exemption even if you own a house in another city, as long as you're 
                  living in rented accommodation in your city of employment.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What if I pay rent to my parents?</h4>
                <p className="text-slate-600">
                  You can claim HRA exemption for rent paid to parents, provided you have a proper rent agreement, 
                  rent receipts, and your parents declare this as rental income in their tax returns.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Is HRA available in the New Tax Regime?</h4>
                <p className="text-slate-600">
                  No, HRA exemption is not available under the New Tax Regime. You must opt for the Old Tax Regime 
                  to claim HRA and other deductions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <FAQSchema faqs={hraFAQs} />

        <AuthorBox />

        {/* Related Tax Calculators - Topic Cluster */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Related Tax Calculators
            </h2>
            <p className="text-slate-600 mb-6">
              HRA is a key deduction under the Old Tax Regime. Use these related tools to plan your complete tax strategy.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/income-tax">
                <div className="p-4 bg-white rounded-lg border hover:border-persian-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Income Tax Calculator</h3>
                  <p className="text-sm text-slate-600">Compare Old vs New regime with all deductions including HRA</p>
                </div>
              </Link>
              <Link href="/calculators/pf">
                <div className="p-4 bg-white rounded-lg border hover:border-indigo-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">PF Calculator</h3>
                  <p className="text-sm text-slate-600">EPF contribution adds to 80C deduction under Old Regime</p>
                </div>
              </Link>
              <Link href="/calculators/sip">
                <div className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SIP Calculator</h3>
                  <p className="text-sm text-slate-600">Invest tax savings in ELSS mutual funds via SIP</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-green-700 mb-1">All Calculators</h3>
                  <p className="text-sm text-green-600">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              © 2024 AiTaxBot. All rights reserved. | HRA Calculator Section 10(13A)
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

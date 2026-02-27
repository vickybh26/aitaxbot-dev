import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import TaxCalculator from '@/components/calculators/TaxCalculator';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import { 
  generateCalculatorSchema, 
  generateBreadcrumbSchema, 
  generateOrganizationSchema 
} from '@/lib/structuredData';
import { AlertCircle, Sparkles } from 'lucide-react';
import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';

const incomeTaxFAQs = [
  {
    question: "Which tax regime should I choose - Old or New for FY 2025-26?",
    answer: "Use the AiTaxBot Income Tax Calculator to compare both regimes. Generally, the Old Regime is better if you have significant 80C investments (₹1.5L+) and HRA. The New Regime (Section 202 under Income Tax Act, 2025) is better if you have minimal deductions and prefer lower rates."
  },
  {
    question: "Can I switch between tax regimes every year?",
    answer: "Yes, salaried individuals can switch between Old and New regime every financial year. Business/professional taxpayers can switch only once."
  },
  {
    question: "What is marginal relief in income tax?",
    answer: "Marginal relief ensures that your tax increase doesn't exceed the income increase when your income crosses a tax slab threshold. Our calculator automatically computes marginal relief for both regimes."
  },
  {
    question: "What is the Income Tax Act, 2025?",
    answer: "The Income Tax Act, 2025 is a new consolidated law that replaces the Income-tax Act, 1961. It was passed by Parliament and received Presidential assent on 21st August, 2025. The new Act comes into effect from 1st April, 2026 (FY 2026-27 / AY 2027-28). Key section changes: New regime is Section 202, Rebate is Section 156."
  },
  {
    question: "What is the Section 87A / Section 156 rebate for FY 2025-26 (AY 2026-27)?",
    answer: "Under the New Regime (Section 202), taxpayers with taxable income up to ₹12 lakh can claim rebate of up to ₹60,000, making their effective tax zero. This is Section 156 under Income Tax Act, 2025 (was Section 87A under 1961 Act)."
  }
];

export default function IncomeTaxCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/income-tax', 'Income Tax Calculator FY 2025-26 (AY 2026-27) - AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "Income Tax Calculator FY 2025-26 (AY 2026-27)",
    description: "Free Income Tax Calculator for FY 2025-26 (AY 2026-27). Compare Old vs New tax regime, calculate Section 87A rebate and marginal relief.",
    url: "https://aitaxbot.in/calculators/income-tax",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.in/" },
    { name: "Calculators", url: "https://aitaxbot.in/calculators" },
    { name: "Income Tax Calculator", url: "https://aitaxbot.in/calculators/income-tax" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>Income Tax Calculator India FY 2025-26 (AY 2026-27) | AiTaxBot</title>
        <meta name="description" content="Free Income Tax Calculator for FY 2025-26 (AY 2026-27). Compare Old vs New regime, Section 87A rebate & marginal relief. Latest tax slabs & deductions." />
        <meta name="keywords" content="income tax calculator, tax calculator India, FY 2025-26, AY 2026-27, old vs new regime, section 87a rebate, marginal relief, tax calculation, income tax slab" />
        <link rel="canonical" href="https://aitaxbot.in/calculators/income-tax" />
        <meta property="og:title" content="Income Tax Calculator India FY 2025-26 (AY 2026-27) | AiTaxBot" />
        <meta property="og:description" content="Free Income Tax Calculator for FY 2025-26 (AY 2026-27). Compare Old vs New regime, Section 87A rebate & marginal relief." />
        <meta property="og:url" content="https://aitaxbot.in/calculators/income-tax" />
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
              <span className="text-slate-900 font-medium">Income Tax Calculator</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 px-6 bg-gradient-to-r from-persian-blue-600 to-persian-blue-700">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Income Tax Calculator FY 2025-26 / AY 2026-27
            </h1>
            <p className="text-lg text-white/90 max-w-3xl">
              Calculate your income tax liability with our free calculator. Compare Old vs New tax regime, 
              check Section 87A rebate eligibility, and get detailed tax breakdown with marginal relief computation.
            </p>
          </div>
        </section>

        {/* Income Tax Act 2025 Notice Banner */}
        <section className="py-4 px-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-3 p-4 bg-white/80 rounded-lg border border-amber-300 shadow-sm">
              <Sparkles className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">
                  New Income Tax Act, 2025 Enacted
                </h3>
                <p className="text-sm text-amber-800">
                  The Income Tax Act, 2025 (replacing the 1961 Act) received Presidential assent on 21st August, 2025 
                  and comes into effect from <strong>1st April, 2026</strong>. Under the new Act, the term <strong>"Tax Year"</strong> replaces the old PY/FY, 
                  and <strong>"Assessment Year" (AY)</strong> is no longer used — Tax Year 2026-27 is equivalent to AY 2027-28 under the 1961 Act.
                  Key section changes: New tax regime is now <strong>Section 202</strong> (was 115BAC), Rebate is now <strong>Section 156</strong> (was 87A).
                  Select <strong>"Tax Year 2026-27"</strong> in the calculator to plan under the new Act.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <TaxCalculator />
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">How to Use the Income Tax Calculator</h2>
            
            <div className="grid md:grid-cols-2 gap-8 not-prose mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Step 1: Enter Your Income</h3>
                <p className="text-slate-600">
                  Input your total annual income including salary, business income, rental income, and other sources. 
                  The calculator accepts income in rupees.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Step 2: Add Deductions</h3>
                <p className="text-slate-600">
                  For Old Regime: Enter deductions under Section 80C, 80D, 80G, HRA, and other applicable sections. 
                  New Regime: Limited deductions available (standard deduction only).
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Step 3: Compare Regimes</h3>
                <p className="text-slate-600">
                  The calculator automatically compares both Old and New tax regimes to show you which option 
                  results in lower tax liability and higher take-home income.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Step 4: Review Results</h3>
                <p className="text-slate-600">
                  Get a detailed breakdown including taxable income, tax before and after rebate, cess, 
                  and final tax payable for both regimes.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Understanding Tax Regimes (AY 2026-27 / Tax Year 2026-27)</h2>
            
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Old Tax Regime</h3>
            <p className="text-slate-600 mb-4">
              The Old (Traditional) Regime offers multiple deductions and exemptions including Section 80C 
              (up to ₹1.5 lakh), HRA, LTA, and others. Best suited for taxpayers with significant investments 
              and eligible deductions.
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Section 80C deductions: PPF, EPF, ELSS, life insurance premiums, home loan principal</li>
              <li>Section 80D: Medical insurance premiums (up to ₹25,000/₹50,000)</li>
              <li>Section 80G: Donations to charitable institutions</li>
              <li>HRA exemption for house rent paid</li>
              <li>Standard deduction: ₹50,000 for salaried individuals</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-3">New Tax Regime (Default from FY 2025-26)</h3>
            <p className="text-slate-600 mb-4">
              The New Regime (Section 202 under Income Tax Act, 2025) offers lower tax rates with simplified structure. 
              Standard deduction of <strong>₹75,000</strong> is available. This is the default regime from FY 2023-24 onwards.
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>No tax up to ₹4 lakh income</li>
              <li>5% tax on income between ₹4-8 lakh</li>
              <li>10% tax on income between ₹8-12 lakh</li>
              <li>15% tax on income between ₹12-16 lakh</li>
              <li>20% tax on income between ₹16-20 lakh</li>
              <li>25% tax on income between ₹20-24 lakh</li>
              <li>30% tax on income above ₹24 lakh</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-3">Rebate under Section 156 / 87A</h3>
            <p className="text-slate-600 mb-6">
              Under the new regime (Section 202), taxpayers with taxable income up to <strong>₹12 lakh</strong> can claim rebate 
              (up to ₹60,000), making their effective tax zero. This is Section 156 under Income Tax Act, 2025 (was Section 87A under 1961 Act). 
              Marginal relief is also available for income slightly above ₹12 lakh.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Which tax regime should I choose?</h4>
                <p className="text-slate-600">
                  Use our calculator to compare both regimes. Generally, Old Regime is better if you have 
                  significant 80C investments (₹1.5L+) and HRA. New Regime is better if you have minimal 
                  deductions and prefer lower rates.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Can I switch between regimes every year?</h4>
                <p className="text-slate-600">
                  Yes, salaried individuals can switch between Old and New regime every financial year. 
                  Business/professional taxpayers can switch only once.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What is marginal relief?</h4>
                <p className="text-slate-600">
                  Marginal relief ensures that your tax increase doesn't exceed the income increase when 
                  your income crosses a tax slab threshold. The calculator automatically computes this.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What is the Income Tax Act, 2025?</h4>
                <p className="text-slate-600">
                  The Income Tax Act, 2025 is a new consolidated law that replaces the Income-tax Act, 1961. 
                  It was passed by Parliament and received Presidential assent on 21st August, 2025. 
                  The new Act simplifies tax language and structure while maintaining the same tax rates under the new regime. 
                  It comes into effect from 1st April, 2026 (FY 2026-27 / AY 2027-28).
                </p>
              </div>
            </div>
          </div>
        </section>

        <FAQSchema faqs={incomeTaxFAQs} />

        <AuthorBox />

        {/* Related Tax Calculators - Topic Cluster */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Related Tax & Financial Calculators
            </h2>
            <p className="text-slate-600 mb-6">
              Optimise your tax planning with these related tools for FY 2025-26
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/hra">
                <div className="p-4 bg-white rounded-lg border hover:border-green-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">HRA Calculator</h3>
                  <p className="text-sm text-slate-600">Claim HRA deduction under Section 10(13A) in Old Regime</p>
                </div>
              </Link>
              <Link href="/calculators/pf">
                <div className="p-4 bg-white rounded-lg border hover:border-indigo-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">PF Calculator</h3>
                  <p className="text-sm text-slate-600">Section 80C deduction via EPF & PPF contributions</p>
                </div>
              </Link>
              <Link href="/calculators/sip">
                <div className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SIP Calculator</h3>
                  <p className="text-sm text-slate-600">Invest tax savings in mutual funds via SIP</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-persian-blue-50 rounded-lg border border-persian-blue-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-persian-blue-700 mb-1">All Calculators</h3>
                  <p className="text-sm text-persian-blue-600">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              © 2025 AiTaxBot. All rights reserved. | FY 2025-26 / AY 2026-27 | Income Tax Calculator
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

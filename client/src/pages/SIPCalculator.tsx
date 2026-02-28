import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import SIPCalculator from '@/components/calculators/SIPCalculator';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import { 
  generateCalculatorSchema, 
  generateBreadcrumbSchema, 
  generateOrganizationSchema 
} from '@/lib/structuredData';

import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';

const sipFAQs = [
  {
    question: "What is the minimum SIP amount in India?",
    answer: "Most mutual funds allow SIPs starting from ₹500 per month, though some funds may have a minimum of ₹1,000. There's no maximum limit — you can invest as much as you want."
  },
  {
    question: "Can I stop my SIP anytime?",
    answer: "Yes, SIPs are completely flexible. You can pause, stop, or restart your SIP anytime without penalties. However, staying invested longer maximizes compounding benefits."
  },
  {
    question: "What returns can I expect from SIP in India?",
    answer: "Returns depend on the mutual fund category. Historically, equity funds have given 12-15% returns, debt funds 7-9%, and hybrid funds 9-11% over long periods. Past performance doesn't guarantee future returns."
  },
  {
    question: "Are SIP returns guaranteed?",
    answer: "No, SIP returns are not guaranteed as mutual funds are market-linked investments. Returns vary based on market performance, fund management, and economic conditions."
  },
  {
    question: "How does SIP compounding work?",
    answer: "In SIP, your returns are reinvested and generate additional returns over time. The longer you stay invested, the more significant the compounding effect. For example, ₹10,000/month for 15 years at 12% grows to nearly ₹50 lakh from just ₹18 lakh invested."
  }
];

export default function SIPCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/sip', 'SIP Calculator - Systematic Investment Plan | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "SIP Calculator - Systematic Investment Plan",
    description: "Free SIP Calculator to estimate mutual fund returns. Calculate your Systematic Investment Plan (SIP) returns with compounding for long-term wealth creation.",
    url: "https://aitaxbot.in/calculators/sip",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.in/" },
    { name: "Calculators", url: "https://aitaxbot.in/calculators" },
    { name: "SIP Calculator", url: "https://aitaxbot.in/calculators/sip" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>SIP Calculator India FY 2025-26 - Mutual Fund Returns | AiTaxBot</title>
        <meta name="description" content="Free SIP Calculator India. Calculate Systematic Investment Plan (SIP) mutual fund returns with compounding. Plan monthly investments for wealth creation." />
        <meta name="keywords" content="SIP calculator, systematic investment plan, mutual fund calculator, SIP returns, monthly investment, compound interest, wealth creation, investment planning India" />
        <link rel="canonical" href="https://aitaxbot.in/calculators/sip" />
        <meta property="og:title" content="SIP Calculator India FY 2025-26 - Mutual Fund Returns | AiTaxBot" />
        <meta property="og:description" content="Free SIP Calculator India. Calculate Systematic Investment Plan mutual fund returns with compounding for wealth creation." />
        <meta property="og:url" content="https://aitaxbot.in/calculators/sip" />
        <meta property="og:image" content="https://aitaxbot.in/images/aitaxbot-logo.png" />
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
              <span className="text-slate-900 font-medium">SIP Calculator</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              SIP Calculator India - Mutual Fund Returns
            </h1>
            <p className="text-lg text-white/90 max-w-3xl">
              Calculate your mutual fund SIP returns and plan your monthly investments for FY 2025-26. 
              See how small, regular investments can grow into significant wealth through the power of compounding.
            </p>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <SIPCalculator />
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Understanding SIP Investment</h2>
            
            <div className="grid md:grid-cols-2 gap-8 not-prose mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What is SIP?</h3>
                <p className="text-slate-600">
                  Systematic Investment Plan (SIP) is a method of investing a fixed amount regularly in mutual funds. 
                  Instead of investing a lump sum, you invest small amounts monthly, making wealth creation accessible 
                  and disciplined.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Why Choose SIP?</h3>
                <p className="text-slate-600">
                  SIP offers rupee cost averaging, eliminating the need to time the market. By investing regularly 
                  regardless of market conditions, you buy more units when prices are low and fewer when prices are high.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">How SIP Works</h2>
            <p className="text-slate-600 mb-4">
              When you start a SIP, a fixed amount is automatically deducted from your bank account on a chosen date 
              each month and invested in your selected mutual fund scheme. The key components are:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li><strong>Monthly Investment:</strong> The fixed amount you invest every month (can start from ₹500)</li>
              <li><strong>Investment Period:</strong> The duration for which you plan to continue the SIP (typically 5-20 years)</li>
              <li><strong>Expected Return:</strong> The anticipated annual return rate from the mutual fund (historically 10-15% for equity funds)</li>
              <li><strong>Compounding:</strong> Returns are reinvested, generating returns on returns over time</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">SIP Calculation Formula</h2>
            <p className="text-slate-600 mb-4">
              The SIP future value is calculated using the compound interest formula:
            </p>
            <div className="bg-slate-50 p-6 rounded-lg mb-6 not-prose">
              <p className="font-mono text-slate-900 mb-2">
                FV = P × [(1 + r)^n - 1] / r × (1 + r)
              </p>
              <p className="text-sm text-slate-600 mt-2">Where:</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>FV = Future Value of investment</li>
                <li>P = Monthly investment amount</li>
                <li>r = Expected monthly return rate (annual rate ÷ 12)</li>
                <li>n = Total number of months (years × 12)</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Benefits of SIP Investment</h2>
            <div className="grid md:grid-cols-2 gap-6 not-prose mb-8">
              <div className="bg-slate-50 p-6 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">1. Disciplined Investing</h4>
                <p className="text-slate-600">
                  Automated monthly investments create a saving habit and ensure consistent wealth accumulation 
                  without requiring active decision-making.
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">2. Power of Compounding</h4>
                <p className="text-slate-600">
                  Your returns generate additional returns over time. The longer you stay invested, the more 
                  significant the compounding effect on your wealth.
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">3. Rupee Cost Averaging</h4>
                <p className="text-slate-600">
                  By investing fixed amounts regularly, you automatically buy more units when prices are low 
                  and fewer when prices are high, averaging out your purchase cost.
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">4. Flexible & Affordable</h4>
                <p className="text-slate-600">
                  Start with as little as ₹500 per month. Increase, decrease, pause, or stop your SIP anytime 
                  based on your financial situation.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Example: SIP Growth Over Time</h2>
            <div className="bg-blue-50 p-6 rounded-lg mb-6 not-prose">
              <p className="text-slate-900 font-semibold mb-3">Monthly Investment: ₹10,000 for 15 years @ 12% annual return</p>
              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span>Total Investment (Principal):</span>
                  <span className="font-semibold">₹18,00,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Returns:</span>
                  <span className="font-semibold">₹31,90,641</span>
                </div>
                <div className="flex justify-between border-t-2 border-blue-200 pt-2">
                  <span className="font-bold">Total Corpus:</span>
                  <span className="font-bold text-blue-700">₹49,90,641</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-3">
                Your ₹18 lakh investment grows to nearly ₹50 lakh through compounding!
              </p>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Tips for Successful SIP Investing</h2>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Start early - even small amounts invested for longer periods create substantial wealth</li>
              <li>Stay invested for the long term (minimum 5-7 years for equity funds)</li>
              <li>Don't stop SIPs during market downturns - this is when you accumulate more units</li>
              <li>Gradually increase SIP amount as your income grows (step-up SIP)</li>
              <li>Choose funds based on your goals and risk tolerance</li>
              <li>Review portfolio annually but avoid frequent switching</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What is the minimum SIP amount?</h4>
                <p className="text-slate-600">
                  Most mutual funds allow SIPs starting from ₹500 per month, though some funds may have a 
                  minimum of ₹1,000. There's no maximum limit - you can invest as much as you want.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Can I stop my SIP anytime?</h4>
                <p className="text-slate-600">
                  Yes, SIPs are completely flexible. You can pause, stop, or restart your SIP anytime without 
                  penalties. However, staying invested longer maximizes compounding benefits.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What returns can I expect from SIP?</h4>
                <p className="text-slate-600">
                  Returns depend on the mutual fund category. Historically, equity funds have given 12-15% returns, 
                  debt funds 7-9%, and hybrid funds 9-11% over long periods. Past performance doesn't guarantee future returns.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Are SIP returns guaranteed?</h4>
                <p className="text-slate-600">
                  No, SIP returns are not guaranteed as mutual funds are market-linked investments. Returns vary 
                  based on market performance, fund management, and economic conditions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <FAQSchema faqs={sipFAQs} />

        <AuthorBox />

        {/* Related Investment Calculators - Topic Cluster */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Related Investment & Retirement Calculators
            </h2>
            <p className="text-slate-600 mb-6">
              Plan your complete investment journey - from building wealth via SIP to planning retirement withdrawals.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/swp">
                <div className="p-4 bg-white rounded-lg border hover:border-purple-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SWP Calculator</h3>
                  <p className="text-sm text-slate-600">Plan systematic withdrawals from your SIP corpus in retirement</p>
                </div>
              </Link>
              <Link href="/calculators/pf">
                <div className="p-4 bg-white rounded-lg border hover:border-indigo-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">PF Calculator</h3>
                  <p className="text-sm text-slate-600">Combine EPF + SIP for a diversified retirement corpus</p>
                </div>
              </Link>
              <Link href="/calculators/income-tax">
                <div className="p-4 bg-white rounded-lg border hover:border-persian-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Income Tax Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate tax on SIP capital gains under LTCG rules</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-blue-700 mb-1">All Calculators</h3>
                  <p className="text-sm text-blue-600">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              © 2024 AiTaxBot. All rights reserved. | SIP Calculator - Systematic Investment Plan
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

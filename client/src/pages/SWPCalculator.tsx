import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import SWPCalculator from '@/components/calculators/SWPCalculator';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import { 
  generateCalculatorSchema, 
  generateBreadcrumbSchema, 
  generateOrganizationSchema 
} from '@/lib/structuredData';

import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';
import { ResponsiveAd, RectangleAd } from '@/components/AdBanner';

const swpFAQs = [
  {
    question: "What is a safe SWP withdrawal rate for retirement in India?",
    answer: "A withdrawal rate of 4-6% of your initial corpus annually is generally considered safe for retirement. Higher rates risk depleting your corpus too quickly, especially if returns are lower than expected or markets are volatile."
  },
  {
    question: "Can I change my SWP amount?",
    answer: "Yes, you can modify your SWP amount, frequency, or even stop it completely. Most fund houses allow changes online through their portal or app. It's recommended to review annually and adjust based on your needs and corpus performance."
  },
  {
    question: "What happens if markets fall during SWP?",
    answer: "During market downturns, you'll be redeeming more units to meet the fixed withdrawal amount. This is why it's important to choose balanced funds and maintain an emergency buffer. Consider temporarily reducing withdrawals during severe market corrections."
  },
  {
    question: "SWP vs Dividend option - which is better?",
    answer: "SWP is generally better as it offers predictable income, better tax treatment (capital gains vs dividend tax), and you control the withdrawal amount. Dividends are uncertain and taxed as income."
  },
  {
    question: "How is SWP taxed in India?",
    answer: "Only the capital gains portion of each SWP withdrawal is taxable, not the entire amount. For equity funds held over 1 year, LTCG tax is 10% above ₹1 lakh. SWP is more tax-efficient than FD interest which is fully taxable."
  }
];

export default function SWPCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/swp', 'SWP Calculator - Systematic Withdrawal Plan | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "SWP Calculator - Systematic Withdrawal Plan",
    description: "Free SWP Calculator to plan systematic withdrawals from mutual funds. Calculate how long your corpus will last with regular monthly withdrawals. Perfect for retirement planning.",
    url: "https://aitaxbot.co.in/calculators/swp",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.co.in/" },
    { name: "Calculators", url: "https://aitaxbot.co.in/calculators" },
    { name: "SWP Calculator", url: "https://aitaxbot.co.in/calculators/swp" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>SWP Calculator India FY 2025-26 - Retirement Planning | AiTaxBot</title>
        <meta name="description" content="Free SWP Calculator India for systematic withdrawals. See how long your corpus lasts with monthly withdrawals. Ideal for retirement income planning." />
        <meta name="keywords" content="SWP calculator, systematic withdrawal plan, retirement planning, mutual fund withdrawal, monthly income calculator, pension planning, corpus calculator India" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators/swp" />
        <meta property="og:title" content="SWP Calculator India FY 2025-26 - Retirement Planning | AiTaxBot" />
        <meta property="og:description" content="Free SWP Calculator India for systematic withdrawals. See how long your corpus lasts with monthly withdrawals. Retirement income planning." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators/swp" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
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
              <span className="text-slate-900 font-medium">SWP Calculator</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 px-6 bg-gradient-to-r from-purple-600 to-purple-700">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              SWP Calculator India - Retirement Income Planning
            </h1>
            <p className="text-lg text-white/90 max-w-3xl">
              Plan your retirement income with our SWP Calculator for FY 2025-26. Find out how long your 
              investment corpus will last with regular monthly withdrawals while your remaining funds continue to grow.
            </p>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <SWPCalculator />
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Understanding Systematic Withdrawal Plan (SWP)</h2>
            
            <div className="grid md:grid-cols-2 gap-8 not-prose mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What is SWP?</h3>
                <p className="text-slate-600">
                  Systematic Withdrawal Plan (SWP) is a facility that allows you to withdraw a fixed amount from 
                  your mutual fund investment at regular intervals (monthly, quarterly, or annually). It's ideal 
                  for generating regular income during retirement.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Who Should Use SWP?</h3>
                <p className="text-slate-600">
                  SWP is perfect for retirees needing regular income, investors wanting to create monthly cash flow, 
                  or anyone looking to systematically liquidate their mutual fund investments while keeping the 
                  remaining corpus invested and growing.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">How SWP Works</h2>
            <p className="text-slate-600 mb-4">
              You invest a lump sum in a mutual fund scheme and set up an SWP to withdraw a fixed amount regularly. 
              The key aspects are:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li><strong>Initial Investment:</strong> The lump sum corpus you invest (retirement savings, inheritance, etc.)</li>
              <li><strong>Monthly Withdrawal:</strong> The fixed amount you withdraw every month for expenses</li>
              <li><strong>Expected Return:</strong> The anticipated annual return on your remaining investment (typically 7-12%)</li>
              <li><strong>Withdrawal Period:</strong> How long you plan to make withdrawals (e.g., throughout retirement)</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">SWP vs Traditional Withdrawal</h2>
            <div className="grid md:grid-cols-2 gap-6 not-prose mb-8">
              <div className="bg-purple-50 p-6 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-3">Traditional Fixed Deposits</h4>
                <ul className="text-slate-600 space-y-2 text-sm">
                  <li>✗ Lower returns (6-7% typically)</li>
                  <li>✗ Interest fully taxable as income</li>
                  <li>✗ No capital appreciation</li>
                  <li>✓ Guaranteed returns</li>
                  <li>✓ Capital protection</li>
                </ul>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-3">SWP from Mutual Funds</h4>
                <ul className="text-slate-600 space-y-2 text-sm">
                  <li>✓ Higher potential returns (9-12%)</li>
                  <li>✓ Tax-efficient (only capital gains taxed)</li>
                  <li>✓ Remaining corpus can grow</li>
                  <li>✓ Flexible withdrawal amounts</li>
                  <li>✗ Market-linked (not guaranteed)</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Tax Benefits of SWP</h2>
            <p className="text-slate-600 mb-4">
              SWP offers significant tax advantages over traditional income sources:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Only capital gains portion is taxable (not the entire withdrawal)</li>
              <li>For equity funds held &gt;1 year: LTCG tax at 10% above ₹1 lakh (exemption limit)</li>
              <li>For debt funds: LTCG tax with indexation benefit (held &gt;3 years)</li>
              <li>No TDS deduction on withdrawals</li>
              <li>More tax-efficient than FD interest (which is fully taxable)</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Example: Retirement Income via SWP</h2>
            <div className="bg-purple-50 p-6 rounded-lg mb-6 not-prose">
              <p className="text-slate-900 font-semibold mb-3">
                Scenario: ₹1 Crore corpus, ₹50,000 monthly withdrawal @ 9% annual return
              </p>
              <div className="space-y-2 text-slate-700 text-sm mb-4">
                <div className="flex justify-between">
                  <span>Initial Corpus:</span>
                  <span className="font-semibold">₹1,00,00,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Withdrawal:</span>
                  <span className="font-semibold">₹50,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Annual Withdrawal:</span>
                  <span className="font-semibold">₹6,00,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Return:</span>
                  <span className="font-semibold">9% per year</span>
                </div>
              </div>
              <div className="border-t-2 border-purple-200 pt-3">
                <p className="text-slate-900 font-semibold mb-2">Result:</p>
                <p className="text-slate-600 text-sm">
                  With 9% annual returns, your ₹1 crore corpus can sustain ₹50,000 monthly withdrawals for 
                  approximately <strong>26 years</strong>, with remaining corpus of over ₹31 lakhs at the end!
                </p>
                <p className="text-slate-600 text-sm mt-2">
                  Total withdrawn: ₹1.56 crores | Remaining corpus: ₹31+ lakhs
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Benefits of SWP</h2>
            <div className="grid md:grid-cols-2 gap-6 not-prose mb-8">
              <div className="bg-slate-50 p-6 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">1. Regular Income Stream</h4>
                <p className="text-slate-600">
                  Receive predictable monthly income similar to salary or pension, perfect for meeting regular 
                  expenses during retirement without selling assets hurriedly.
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">2. Corpus Longevity</h4>
                <p className="text-slate-600">
                  Your remaining investment continues to grow, potentially extending the life of your corpus 
                  beyond what lump sum withdrawals would allow.
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">3. Tax Efficiency</h4>
                <p className="text-slate-600">
                  SWP is more tax-efficient than FD interest or annuity income. Each withdrawal is partially 
                  capital (tax-free) and partially gains (taxed favorably).
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">4. Flexibility</h4>
                <p className="text-slate-600">
                  Adjust withdrawal amounts, pause withdrawals, or stop SWP anytime. You can also make additional 
                  lump sum withdrawals when needed.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Tips for Effective SWP Planning</h2>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-2">
              <li>Keep withdrawal rate sustainable (typically 4-6% of corpus annually)</li>
              <li>Choose balanced or conservative hybrid funds for stable returns</li>
              <li>Maintain 1-2 years of expenses in liquid funds as emergency buffer</li>
              <li>Review and adjust withdrawal amounts annually based on corpus performance</li>
              <li>Consider inflation - increase withdrawal amounts periodically</li>
              <li>Start SWP from funds held &gt;1 year to avail LTCG tax benefits</li>
              <li>Diversify across 2-3 funds to manage risk</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What is a safe withdrawal rate?</h4>
                <p className="text-slate-600">
                  A withdrawal rate of 4-6% of your initial corpus annually is generally considered safe for 
                  retirement. Higher rates risk depleting your corpus too quickly, especially if returns are lower 
                  than expected or markets are volatile.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Can I change my SWP amount?</h4>
                <p className="text-slate-600">
                  Yes, you can modify your SWP amount, frequency, or even stop it completely. Most fund houses 
                  allow changes online through their portal or app. It's recommended to review annually and adjust 
                  based on your needs and corpus performance.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What happens if markets fall during SWP?</h4>
                <p className="text-slate-600">
                  During market downturns, you'll be redeeming more units to meet the fixed withdrawal amount. 
                  This is why it's important to choose balanced funds and maintain an emergency buffer. Consider 
                  temporarily reducing withdrawals during severe market corrections.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">SWP vs Dividend option - which is better?</h4>
                <p className="text-slate-600">
                  SWP is generally better as it offers predictable income, better tax treatment (capital gains vs 
                  dividend tax), and you control the withdrawal amount. Dividends are uncertain and taxed as income.
                </p>
              </div>
            </div>
          </div>
        </section>

        <FAQSchema faqs={swpFAQs} />

        <AuthorBox />

        {/* Ad Units */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <ResponsiveAd />
          <RectangleAd />
        </div>

        {/* Related Investment Calculators - Topic Cluster */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Related Investment & Retirement Calculators
            </h2>
            <p className="text-slate-600 mb-6">
              Build your corpus with SIP, then plan withdrawals through SWP. Complete your retirement planning journey.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/sip">
                <div className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SIP Calculator</h3>
                  <p className="text-sm text-slate-600">Build your retirement corpus through systematic monthly investing</p>
                </div>
              </Link>
              <Link href="/calculators/pf">
                <div className="p-4 bg-white rounded-lg border hover:border-indigo-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">PF Calculator</h3>
                  <p className="text-sm text-slate-600">Add EPF/PPF growth to your retirement planning</p>
                </div>
              </Link>
              <Link href="/calculators/income-tax">
                <div className="p-4 bg-white rounded-lg border hover:border-persian-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Income Tax Calculator</h3>
                  <p className="text-sm text-slate-600">Understand tax on SWP capital gains withdrawals</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-purple-700 mb-1">All Calculators</h3>
                  <p className="text-sm text-purple-600">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              © 2024 AiTaxBot. All rights reserved. | SWP Calculator - Systematic Withdrawal Plan
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import PFCalculator from '@/components/calculators/PFCalculator';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import {
  generateCalculatorSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema
} from '@/lib/structuredData';
import { AlertCircle, Shield, Clock, IndianRupee, FileWarning, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';

const pfFAQs = [
  {
    question: "What is the EPF interest rate for FY 2025-26?",
    answer: "The EPF interest rate for FY 2025-26 is 8.25% per annum. Interest on employee contributions exceeding ₹2.5 Lakh/year is taxable from FY 2021-22 onwards."
  },
  {
    question: "How is employer PF contribution split in India?",
    answer: "Employer contributes 12% of Basic + DA, split as: 3.67% to EPF (your corpus), 8.33% to EPS (pension fund, capped at ₹1,250/month), and 0.50% to EDLI (insurance). Only the EPF portion grows in your PF account."
  },
  {
    question: "When can I withdraw PF tax-free?",
    answer: "PF withdrawal is tax-free after 5 years of continuous service. If you switch jobs and transfer your PF balance, previous tenure counts. Withdrawal before 5 years is taxable — TDS of 10% is deducted if PAN is linked, otherwise 30%."
  },
  {
    question: "What is the difference between EPF, VPF and PPF?",
    answer: "EPF is mandatory for salaried employees in organizations with 20+ members (8.25% interest). VPF is voluntary additional contribution to EPF beyond 12% (same 8.25% rate). PPF is open to all Indian residents with 7.1% interest and 15-year lock-in."
  },
  {
    question: "Can I withdraw PF while still employed?",
    answer: "Yes, partial withdrawal (advance) is allowed via Form 31 for specific purposes like medical emergency, education, marriage, or home purchase. After EPFO's October 2025 updates, minimum service period is reduced to 12 months with up to 100% of eligible balance withdrawable."
  }
];

export default function PFCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/pf', 'PF Calculator - Provident Fund | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "PF Calculator - EPF, VPF & PPF Contribution Calculator",
    description: "Free Provident Fund Calculator to estimate EPF, VPF and PPF contributions, employer split, interest growth and retirement corpus for Indian employees.",
    url: "https://aitaxbot.co.in/calculators/pf",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.co.in/" },
    { name: "Calculators", url: "https://aitaxbot.co.in/calculators" },
    { name: "PF Calculator", url: "https://aitaxbot.co.in/calculators/pf" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>PF Calculator India FY 2025-26 - EPF & PPF | AiTaxBot</title>
        <meta name="description" content="Free PF Calculator for FY 2025-26. Calculate EPF, VPF and PPF contributions with employer split breakdown, 8.25% interest growth, and retirement corpus projection." />
        <meta name="keywords" content="PF calculator, EPF calculator, provident fund calculator, PPF calculator, VPF calculator, EPF interest rate 2025-26, PF contribution, employer PF, employee PF, PF withdrawal rules" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators/pf" />
        <meta property="og:title" content="PF Calculator India FY 2025-26 - EPF & PPF | AiTaxBot" />
        <meta property="og:description" content="Free PF Calculator for EPF, VPF and PPF. Calculate employee-employer contribution split, interest growth, and retirement corpus." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators/pf" />
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
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Link href="/" className="hover:text-persian-blue-600">Home</Link>
              <span>/</span>
              <Link href="/calculators" className="hover:text-persian-blue-600">Calculators</Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">PF Calculator</span>
            </div>
          </div>
        </header>

        <section className="py-12 px-6 bg-gradient-to-r from-persian-blue-600 to-persian-blue-700">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              PF Calculator - Provident Fund
            </h1>
            <p className="text-lg text-white/90 max-w-3xl">
              Calculate your EPF, VPF & PPF contributions with employer split breakdown,
              year-wise growth projection, and estimated retirement corpus. Updated for FY 2025-26 (8.25% interest rate).
            </p>
          </div>
        </section>

        <section className="py-4 px-6 bg-blue-50 border-b border-blue-200">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-3 p-4 bg-white/80 rounded-lg border border-blue-300 shadow-sm">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>FY 2025-26:</strong> EPF interest rate is <strong>8.25% p.a.</strong> Interest on employee
                  contributions exceeding ₹2.5 Lakh/year is taxable. PF withdrawal after 5 years of continuous
                  service is tax-free under EEE status.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <PFCalculator />
          </div>
        </section>

        {/* EPF vs PPF Comparison */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">EPF vs VPF vs PPF - Quick Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-persian-blue-50">
                    <th className="text-left p-4 font-semibold border">Feature</th>
                    <th className="text-center p-4 font-semibold border">EPF</th>
                    <th className="text-center p-4 font-semibold border">VPF</th>
                    <th className="text-center p-4 font-semibold border">PPF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-4 border font-medium">Who can invest?</td>
                    <td className="p-4 border text-center">Salaried (org 20+ employees)</td>
                    <td className="p-4 border text-center">Salaried (beyond 12% mandatory)</td>
                    <td className="p-4 border text-center">Any Indian resident</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-4 border font-medium">Interest Rate (FY 2025-26)</td>
                    <td className="p-4 border text-center"><Badge>8.25%</Badge></td>
                    <td className="p-4 border text-center"><Badge>8.25%</Badge></td>
                    <td className="p-4 border text-center"><Badge variant="secondary">7.1%</Badge></td>
                  </tr>
                  <tr>
                    <td className="p-4 border font-medium">Tax Status</td>
                    <td className="p-4 border text-center">EEE*</td>
                    <td className="p-4 border text-center">EEE* (shared with EPF limits)</td>
                    <td className="p-4 border text-center">EEE</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-4 border font-medium">Lock-in Period</td>
                    <td className="p-4 border text-center">Till retirement / 5 years for tax-free</td>
                    <td className="p-4 border text-center">Same as EPF</td>
                    <td className="p-4 border text-center">15 years</td>
                  </tr>
                  <tr>
                    <td className="p-4 border font-medium">Employer Contribution</td>
                    <td className="p-4 border text-center"><CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /></td>
                    <td className="p-4 border text-center"><XCircle className="w-4 h-4 text-red-400 mx-auto" /></td>
                    <td className="p-4 border text-center"><XCircle className="w-4 h-4 text-red-400 mx-auto" /></td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-4 border font-medium">80C Deduction</td>
                    <td className="p-4 border text-center">Up to ₹1.5 Lakh</td>
                    <td className="p-4 border text-center">Up to ₹1.5 Lakh (combined with EPF)</td>
                    <td className="p-4 border text-center">Up to ₹1.5 Lakh</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              * Interest on employee EPF/VPF contribution exceeding ₹2.5 Lakh/year is taxable from FY 2021-22 onwards.
            </p>
          </div>
        </section>

        {/* Employer Contribution Split Explained */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">How EPF Contribution Works</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Contribution Basis</h3>
                <p className="text-slate-600 mb-4">
                  PF contribution is calculated on <strong>Basic Salary + Dearness Allowance (DA)</strong>.
                  Both employee and employer contribute 12% each, but the employer's share is split differently:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">E</div>
                    <div>
                      <div className="font-medium text-blue-900">Employee Share: 12%</div>
                      <div className="text-sm text-blue-700">Entire 12% goes to your EPF account</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">R</div>
                    <div>
                      <div className="font-medium text-green-900">Employer EPF: 3.67%</div>
                      <div className="text-sm text-green-700">Goes to your EPF account (part of corpus)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                    <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">P</div>
                    <div>
                      <div className="font-medium text-amber-900">Employer EPS: 8.33%</div>
                      <div className="text-sm text-amber-700">Goes to Pension Fund (capped at ₹1,250/month)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-100 rounded-lg">
                    <div className="w-8 h-8 bg-slate-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">I</div>
                    <div>
                      <div className="font-medium text-slate-900">Employer EDLI: 0.50%</div>
                      <div className="text-sm text-slate-700">Insurance premium (paid by employer separately)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Example Calculation</h3>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <p className="text-slate-900 font-semibold mb-3">If Basic + DA = ₹50,000/month:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Employee Contribution (12%)</span>
                      <span className="font-medium text-blue-600">₹6,000</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Employer EPF (3.67%)</span>
                      <span className="font-medium text-green-600">₹4,750</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Employer EPS (8.33%, cap ₹1,250)</span>
                      <span className="font-medium text-amber-600">₹1,250</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between py-1.5 font-bold">
                      <span>Total to Your PF Account</span>
                      <span className="text-persian-blue-600">₹10,750/month</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-500">
                      <span>EPS (goes to pension, not PF)</span>
                      <span>₹1,250/month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Early Withdrawal Guide */}
        <section className="py-12 px-6 bg-white" id="early-withdrawal-guide">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                PF Withdrawal Rules - Complete Guide (Updated Oct 2025)
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Comprehensive guide covering EPFO's latest withdrawal rules, Form 31 advance categories,
                TDS implications, online withdrawal process, and pension rules.
              </p>
            </div>

            {/* New EPFO Rules Oct 2025 */}
            <Card className="mb-8 border-2 border-persian-blue-200">
              <CardHeader className="bg-persian-blue-50">
                <CardTitle className="text-xl flex items-center gap-2 text-persian-blue-800">
                  <AlertCircle className="w-6 h-6" />
                  New EPFO Rules (October 2025)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-slate-700">
                  On <strong>13 October 2025</strong>, EPFO's Central Board of Trustees approved major updates to simplify
                  EPF withdrawal for over 7 crore subscribers:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      100% Withdrawal Allowed
                    </h4>
                    <p className="text-sm text-slate-600">Members can now withdraw up to 100% of eligible EPF balance (both employee and employer contributions), up from partial limits earlier.</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      25% Minimum Balance Rule
                    </h4>
                    <p className="text-sm text-slate-600">At least 25% of total balance must remain in the account even after maximum withdrawal. This continues earning 8.25% interest.</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      Reduced Service Period
                    </h4>
                    <p className="text-sm text-slate-600">Minimum service period for partial withdrawal reduced to just 12 months (previously ranged from 5-10 years for many categories).</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      Simplified Categories
                    </h4>
                    <p className="text-sm text-slate-600">Previous 13 grounds consolidated into 3 categories: essential needs (illness, education, marriage), housing requirements, and special circumstances.</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      More Withdrawal Frequency
                    </h4>
                    <p className="text-sm text-slate-600">Education withdrawals: up to 10 times. Marriage withdrawals: up to 5 times (previously combined limit of 3).</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      Extended Waiting Periods
                    </h4>
                    <p className="text-sm text-slate-600">PF settlement for unemployed: 12 months wait. EPS (pension) settlement: 36 months wait (up from 2 months earlier).</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Full vs Partial Withdrawal */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <IndianRupee className="w-6 h-6 text-persian-blue-600" />
                  Complete vs Partial Withdrawal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Complete Withdrawal (Form 19 + Form 10C)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-persian-blue-50">
                          <th className="text-left p-3 font-semibold border">Condition</th>
                          <th className="text-left p-3 font-semibold border">Withdrawal Limit</th>
                          <th className="text-left p-3 font-semibold border">Form Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 border font-medium">Retirement (age 58+)</td>
                          <td className="p-3 border">100% of PF balance</td>
                          <td className="p-3 border">Form 19 + Form 10C/10D</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">Unemployed for 1-2 months</td>
                          <td className="p-3 border">75% of PF balance</td>
                          <td className="p-3 border">Form 19</td>
                        </tr>
                        <tr>
                          <td className="p-3 border font-medium">Unemployed for 2+ months</td>
                          <td className="p-3 border">100% of PF balance</td>
                          <td className="p-3 border">Form 19 + Form 10C</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">Pre-retirement (age 54+)</td>
                          <td className="p-3 border">90% of total balance</td>
                          <td className="p-3 border">Form 31</td>
                        </tr>
                        <tr>
                          <td className="p-3 border font-medium">Permanent disability</td>
                          <td className="p-3 border">100% of PF balance</td>
                          <td className="p-3 border">Form 19 + Form 10C</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">Permanent emigration abroad</td>
                          <td className="p-3 border">100% of PF balance</td>
                          <td className="p-3 border">Form 19 + Form 10C</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Pension (EPS) Withdrawal Rules</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-amber-50">
                          <th className="text-left p-3 font-semibold border">Service Period</th>
                          <th className="text-left p-3 font-semibold border">Eligibility</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 border font-medium">Less than 6 months</td>
                          <td className="p-3 border">Cannot withdraw pension</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">6 months to 9.5 years</td>
                          <td className="p-3 border">Full pension withdrawal via Form 10C</td>
                        </tr>
                        <tr>
                          <td className="p-3 border font-medium">More than 9.5 years</td>
                          <td className="p-3 border">Cannot withdraw lump sum; eligible for monthly pension (Form 10D) after age 58</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5-Year Rule */}
            <Card className="mb-8 border-2 border-red-200">
              <CardHeader className="bg-red-50">
                <CardTitle className="text-xl flex items-center gap-2 text-red-800">
                  <Shield className="w-6 h-6" />
                  The Critical 5-Year Rule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-slate-700">
                  To enjoy <strong>tax-free withdrawal</strong> from EPF, you must complete <strong>5 years of continuous service</strong>.
                  This is the most important compliance point for tax planning.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Service Continuity Preserved</span>
                    </div>
                    <p className="text-sm text-green-700">
                      If you switch jobs and <strong>transfer your PF balance</strong> to the new employer,
                      your previous tenure counts towards the 5-year requirement.
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">Continuity Breaks</span>
                    </div>
                    <p className="text-sm text-red-700">
                      If you <strong>withdraw PF without transferring</strong>, the continuity breaks
                      and the entire amount becomes taxable.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TDS on EPF Withdrawal */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileWarning className="w-6 h-6 text-amber-600" />
                  TDS on EPF Withdrawal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-slate-700 mb-2">
                  TDS rules depend on your service duration, withdrawal amount, and documentation submitted:
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-amber-50">
                        <th className="text-left p-3 font-semibold border">Scenario</th>
                        <th className="text-center p-3 font-semibold border">TDS Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border">Service 5+ years (continuous)</td>
                        <td className="p-3 border text-center"><Badge className="bg-green-600">No TDS</Badge></td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border">Withdrawal less than ₹50,000</td>
                        <td className="p-3 border text-center"><Badge className="bg-green-600">No TDS</Badge></td>
                      </tr>
                      <tr>
                        <td className="p-3 border">Ill health / business closure / reasons beyond control</td>
                        <td className="p-3 border text-center"><Badge className="bg-green-600">No TDS</Badge></td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border">Form 15G/15H submitted with PAN (service &lt; 5 years)</td>
                        <td className="p-3 border text-center"><Badge className="bg-green-600">No TDS</Badge></td>
                      </tr>
                      <tr>
                        <td className="p-3 border">Service &lt; 5 years, amount 50K+, PAN submitted (no Form 15G/15H)</td>
                        <td className="p-3 border text-center"><Badge className="bg-amber-600">10% TDS</Badge></td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border">Service &lt; 5 years, amount 50K+, PAN NOT submitted</td>
                        <td className="p-3 border text-center"><Badge className="bg-red-600">34.608% TDS</Badge></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">If you withdraw before 5 years, these components become taxable:</p>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <ArrowRight className="w-4 h-4 text-slate-600 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Employer Contribution + Interest:</span>
                      <span className="text-slate-600"> Taxed under "Income from Salaries"</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <ArrowRight className="w-4 h-4 text-slate-600 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Employee Contribution (if 80C claimed):</span>
                      <span className="text-slate-600"> Taxable under "Salaries"</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <ArrowRight className="w-4 h-4 text-slate-600 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Interest on Employee Contribution:</span>
                      <span className="text-slate-600"> Taxed under "Income from Other Sources"</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Exceptions - When Early Withdrawal is Tax-Free:</h4>
                  <ul className="space-y-1 text-sm text-green-700">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Employee terminated due to ill health</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Employer's business is closed down</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Reasons beyond employee's control (e.g., downsizing/layoffs)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> PF balance transferred to new employer (not withdrawn)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Partial Withdrawal Rules - Form 31 */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Clock className="w-6 h-6 text-persian-blue-600" />
                  Partial Withdrawal Rules - Form 31 Advances
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-700 mb-2">
                  EPFO allows partial withdrawals (advances) for specific purposes without closing your account.
                  These are <strong>not loans</strong> and have <strong>no repayment requirement</strong>.
                  Use Form 31 for all partial withdrawals.
                </p>
                <p className="text-xs text-slate-500 mb-6">
                  Based on EPF Scheme 1952 - Paras 68B, 68BB, 68H, 68J, 68K, 68KK, 68N, 68NN
                </p>

                <h4 className="font-semibold text-slate-900 mb-3">I. Housing - Purchase, Construction & Renovation (Para 68B)</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-persian-blue-50">
                        <th className="text-left p-3 font-semibold border">Purpose</th>
                        <th className="text-center p-3 font-semibold border">Service Required</th>
                        <th className="text-left p-3 font-semibold border">Maximum Limit</th>
                        <th className="text-center p-3 font-semibold border">Times Allowed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border font-medium">Purchase site for house construction</td>
                        <td className="p-3 border text-center"><Badge>5 years</Badge></td>
                        <td className="p-3 border">24 months' Basic + DA</td>
                        <td className="p-3 border text-center">1</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border font-medium">Purchase house/flat (from individual)</td>
                        <td className="p-3 border text-center"><Badge>5 years</Badge></td>
                        <td className="p-3 border">36 months' Basic + DA <strong>OR</strong> total employee + employer share with interest <strong>OR</strong> total cost - whichever is least</td>
                        <td className="p-3 border text-center">1</td>
                      </tr>
                      <tr>
                        <td className="p-3 border font-medium">Purchase flat from promoter/builder</td>
                        <td className="p-3 border text-center"><Badge>5 years</Badge></td>
                        <td className="p-3 border">36 months' Basic + DA <strong>OR</strong> total employee + employer share with interest <strong>OR</strong> total cost - whichever is least</td>
                        <td className="p-3 border text-center">1</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border font-medium">Construction on own/spouse's site</td>
                        <td className="p-3 border text-center"><Badge>5 years</Badge></td>
                        <td className="p-3 border">36 months' Basic + DA <strong>OR</strong> total employee + employer share with interest <strong>OR</strong> total cost - whichever is least</td>
                        <td className="p-3 border text-center">1 or more installments</td>
                      </tr>
                      <tr>
                        <td className="p-3 border font-medium">Addition/alteration/improvement of house</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">5 yrs after house completion</Badge></td>
                        <td className="p-3 border">12 months' Basic + DA <strong>OR</strong> employee share with interest <strong>OR</strong> cost - whichever is least</td>
                        <td className="p-3 border text-center">1</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border font-medium">Second renovation/repair</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">10 yrs after first renovation</Badge></td>
                        <td className="p-3 border">12 months' Basic + DA <strong>OR</strong> employee share with interest <strong>OR</strong> cost - whichever is least</td>
                        <td className="p-3 border text-center">1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-semibold text-slate-900 mb-3">II. Home Loan Repayment (Para 68BB)</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-persian-blue-50">
                        <th className="text-left p-3 font-semibold border">Purpose</th>
                        <th className="text-center p-3 font-semibold border">Service Required</th>
                        <th className="text-left p-3 font-semibold border">Maximum Limit</th>
                        <th className="text-center p-3 font-semibold border">Times Allowed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border font-medium">Repay outstanding home loan (principal + interest)</td>
                        <td className="p-3 border text-center"><Badge>10 years</Badge></td>
                        <td className="p-3 border">36 months' Basic + DA <strong>OR</strong> total employee + employer share with interest <strong>OR</strong> outstanding loan amount - whichever is least</td>
                        <td className="p-3 border text-center">1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-semibold text-slate-900 mb-3">III. Medical Treatment (Para 68J)</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-persian-blue-50">
                        <th className="text-left p-3 font-semibold border">Purpose</th>
                        <th className="text-center p-3 font-semibold border">Service Required</th>
                        <th className="text-left p-3 font-semibold border">Maximum Limit</th>
                        <th className="text-left p-3 font-semibold border">Documents</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border font-medium">Own treatment or hospitalisation</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">No minimum</Badge></td>
                        <td className="p-3 border">6 months' Basic + DA <strong>OR</strong> employee share with interest - whichever is less</td>
                        <td className="p-3 border text-xs">Certificate C signed by employer and doctor</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border font-medium">Treatment of family member</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">No minimum</Badge></td>
                        <td className="p-3 border">6 months' Basic + DA <strong>OR</strong> employee share with interest - whichever is less</td>
                        <td className="p-3 border text-xs">Certificate C signed by employer and doctor</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-semibold text-slate-900 mb-3">IV. Marriage & Education (Para 68K)</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-persian-blue-50">
                        <th className="text-left p-3 font-semibold border">Purpose</th>
                        <th className="text-center p-3 font-semibold border">Service Required</th>
                        <th className="text-left p-3 font-semibold border">Maximum Limit</th>
                        <th className="text-center p-3 font-semibold border">Times Allowed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border font-medium">Marriage (self / son / daughter / brother / sister)</td>
                        <td className="p-3 border text-center"><Badge>7 years</Badge></td>
                        <td className="p-3 border">50% of employee share with interest</td>
                        <td className="p-3 border text-center">Up to 5 times</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border font-medium">Post-matriculation education of son/daughter</td>
                        <td className="p-3 border text-center"><Badge>7 years</Badge></td>
                        <td className="p-3 border">50% of employee share with interest</td>
                        <td className="p-3 border text-center">Up to 10 times</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-semibold text-slate-900 mb-3">V. Special Circumstances (Para 68H)</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-persian-blue-50">
                        <th className="text-left p-3 font-semibold border">Situation</th>
                        <th className="text-center p-3 font-semibold border">Service Required</th>
                        <th className="text-left p-3 font-semibold border">Maximum Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border font-medium">Lockout/closure of establishment (15+ days) or no wages for 2+ months</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">None</Badge></td>
                        <td className="p-3 border">Employee share with interest</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border font-medium">Dismissal/retrenchment challenged in court</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">None</Badge></td>
                        <td className="p-3 border">50% of employee share with interest (requires copy of court petition)</td>
                      </tr>
                      <tr>
                        <td className="p-3 border font-medium">Establishment closed for 6+ months, employees still unemployed</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">None</Badge></td>
                        <td className="p-3 border">100% of employer share with interest (recoverable; converted to non-recoverable after 5 years on request)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-semibold text-slate-900 mb-3">VI. Other Advances</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-persian-blue-50">
                        <th className="text-left p-3 font-semibold border">Purpose</th>
                        <th className="text-center p-3 font-semibold border">Service Required</th>
                        <th className="text-left p-3 font-semibold border">Maximum Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border font-medium">Purchase of equipment by physically handicapped member (Para 68KK)</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">None</Badge></td>
                        <td className="p-3 border">6 months' Basic + DA or employee share with interest (whichever is less)</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-3 border font-medium">Natural calamity / pandemic (Para 68N)</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">None</Badge></td>
                        <td className="p-3 border">Up to 3 months' Basic + DA (non-refundable)</td>
                      </tr>
                      <tr>
                        <td className="p-3 border font-medium">Pre-retirement withdrawal at age 54+ (Para 68NN)</td>
                        <td className="p-3 border text-center"><Badge variant="secondary">Age 54+</Badge></td>
                        <td className="p-3 border">90% of total PF balance</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Online Withdrawal Process */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ArrowRight className="w-6 h-6 text-persian-blue-600" />
                  How to Withdraw PF Online (Step-by-Step)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-slate-700 mb-4">
                  Follow these steps to withdraw your EPF online through the EPFO Unified Member Portal:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-medium text-slate-900">Log in to UAN Member Portal</p>
                      <p className="text-sm text-slate-600">Visit unifiedportal-mem.epfindia.gov.in and log in with your UAN and password.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-medium text-slate-900">Verify KYC Status</p>
                      <p className="text-sm text-slate-600">Go to Manage &gt; KYC to ensure Aadhaar, PAN, and Bank details are linked and verified.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-medium text-slate-900">Go to Online Services &gt; Claim</p>
                      <p className="text-sm text-slate-600">Select "Claim (Form-31, 19, 10C & 10D)" from the Online Services tab.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                    <div>
                      <p className="font-medium text-slate-900">Verify Bank Account</p>
                      <p className="text-sm text-slate-600">Enter the last 4 digits of your bank account linked with UAN and verify.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
                    <div>
                      <p className="font-medium text-slate-900">Select Claim Type</p>
                      <p className="text-sm text-slate-600">
                        Choose: <strong>PF Advance (Form 31)</strong> if still employed |
                        <strong> PF Withdrawal (Form 19)</strong> if left job |
                        <strong> Pension Withdrawal (Form 10C)</strong> for EPS.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">6</div>
                    <div>
                      <p className="font-medium text-slate-900">Upload Documents & Submit</p>
                      <p className="text-sm text-slate-600">Upload Form 15G/15H (if applicable), cheque/passbook image. Enter Aadhaar OTP and submit.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Processing Time:</strong> Online claims with updated KYC are typically settled in <strong>3-5 working days</strong>.
                    Offline claims take 15-20 working days. Make sure your Date of Exit is updated in Service History for Form 19/10C claims.
                  </p>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold text-slate-900 mb-2">Which Form Do You Need?</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-persian-blue-50">
                          <th className="text-left p-3 font-semibold border">Your Status</th>
                          <th className="text-left p-3 font-semibold border">Purpose</th>
                          <th className="text-center p-3 font-semibold border">Form</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 border">Currently employed</td>
                          <td className="p-3 border">Emergency / Partial advance</td>
                          <td className="p-3 border text-center font-medium">Form 31</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border">Left job / Unemployed 2+ months</td>
                          <td className="p-3 border">Full PF settlement</td>
                          <td className="p-3 border text-center font-medium">Form 19 + Form 10C</td>
                        </tr>
                        <tr>
                          <td className="p-3 border">Retired (58+)</td>
                          <td className="p-3 border">Final settlement</td>
                          <td className="p-3 border text-center font-medium">Form 19 + Form 10C/10D</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border">Retired (58+)</td>
                          <td className="p-3 border">Monthly pension</td>
                          <td className="p-3 border text-center font-medium">Form 10D</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Common Claim Rejection Reasons */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-red-600" />
                  Common Reasons for PF Claim Rejection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-800 mb-1">Name Mismatch</p>
                    <p className="text-sm text-red-700">Name in EPFO database differs from Aadhaar or bank records. Fix: Submit Joint Declaration Form.</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-800 mb-1">Unclear Cheque Image</p>
                    <p className="text-sm text-red-700">Officer could not read name or IFSC code on uploaded scan. Fix: Upload clear, high-resolution image.</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-800 mb-1">Wrong Form Selected</p>
                    <p className="text-sm text-red-700">Applied for Form 31 (Advance) but selected "Out of Service" reason, or similar mismatch.</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-800 mb-1">Bank Account Issue</p>
                    <p className="text-sm text-red-700">Money sent but bounced because bank account is dormant, frozen, or IFSC code is incorrect.</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-800 mb-1">Date of Exit Not Updated</p>
                    <p className="text-sm text-red-700">Form 19/10C claims cannot proceed if Date of Exit is missing in your Service History section.</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-800 mb-1">Service History Overlap</p>
                    <p className="text-sm text-red-700">Overlapping dates between two companies in your service history will cause rejection.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h3>

              <div className="space-y-4">
                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">Can I withdraw EPF while still employed?</h4>
                  <p className="text-slate-600 text-sm">
                    Yes, under the latest October 2025 rules, you can withdraw portions of your EPF balance even while
                    employed, for approved needs like medical emergencies, education, marriage, or house purchase.
                    However, at least 25% of your total EPF balance must remain in the account.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">Can I withdraw 100% of my PF balance?</h4>
                  <p className="text-slate-600 text-sm">
                    Full 100% withdrawal is allowed at retirement (age 58+), permanent disability, emigration abroad,
                    or after 2+ months of continuous unemployment. While employed, the 25% minimum balance rule
                    applies even after maximum withdrawal.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">What defines "Continuous Service" for tax-free withdrawal?</h4>
                  <p className="text-slate-600 text-sm">
                    To be tax-exempt, you must complete 5 years of continuous service. If you switch jobs,
                    transfer your PF balance to the new employer - the previous tenure then adds up. If you
                    withdraw without transferring, the continuity breaks and the withdrawal becomes taxable.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">How long does EPF withdrawal take?</h4>
                  <p className="text-slate-600 text-sm">
                    Online claims with updated KYC (Aadhaar, PAN, bank details verified) are typically processed
                    within 3-5 working days. Offline claims through the EPFO office take 15-20 working days.
                    Make sure your KYC is complete and Date of Exit is updated for faster processing.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">What happens to my EPF account after leaving a job?</h4>
                  <p className="text-slate-600 text-sm">
                    Your EPF account will continue to exist and earn interest. You can transfer it to your new
                    employer's EPF account using UAN (recommended). If you don't withdraw or transfer within
                    36 months of being eligible, the account becomes inoperative and stops earning interest.
                    You should always transfer rather than withdraw to maintain the 5-year continuity for tax-free benefits.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">Can I contribute more than 12% to my PF?</h4>
                  <p className="text-slate-600 text-sm">
                    Yes, through VPF (Voluntary Provident Fund). You can contribute up to 100% of your Basic + DA
                    above the mandatory 12%. VPF earns the same 8.25% interest rate as EPF. However, the employer
                    does not match VPF contributions, and interest on combined EPF+VPF employee contributions exceeding
                    ₹2.5 Lakh/year is taxable.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">How is EPF interest calculated?</h4>
                  <p className="text-slate-600 text-sm">
                    EPF interest is calculated monthly on the running balance (opening balance + contributions made that month),
                    but accumulated interest is credited annually on March 31st. The monthly interest rate is the annual rate divided by 12
                    (8.25% / 12 = 0.6875% per month for FY 2025-26).
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">What happens to my EPS (pension) amount?</h4>
                  <p className="text-slate-600 text-sm">
                    The employer's 8.33% contribution (capped at ₹1,250/month) goes to the Employee Pension Scheme.
                    This does not go into your PF account. You're eligible for monthly pension after 10+ years of
                    service and reaching age 58. If service is between 6 months to 9.5 years, you can withdraw pension
                    via Form 10C. Under new rules, pension withdrawal requires 36 months of unemployment (up from 2 months).
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">Is PF deduction available under the New Tax Regime?</h4>
                  <p className="text-slate-600 text-sm">
                    Under the New Tax Regime, Section 80C deduction (including EPF contribution) is not available.
                    However, the employer's contribution to EPF is still exempt up to ₹7.5 Lakh combined limit
                    (EPF + NPS + Superannuation). Employee contributions will still earn tax-free interest (up to ₹2.5L limit),
                    and withdrawal after 5 years remains tax-free under both regimes.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">How do I transfer my PF when changing jobs?</h4>
                  <p className="text-slate-600 text-sm">
                    Log in to the EPFO Unified Portal with your UAN, go to "Online Services" &gt;
                    "One Member - One EPF Account (Transfer Request)". Link your previous and current EPF accounts
                    and submit. Processing takes 10-20 days. Always transfer rather than withdraw to maintain
                    5-year continuity for tax-free benefits.
                  </p>
                </div>

                <div className="p-5 bg-white rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">EPFO Helpline & Contact</h4>
                  <p className="text-slate-600 text-sm">
                    Toll-free: <strong>14470</strong> |
                    Missed call for PF details: <strong>9966044425</strong> |
                    SMS "EPFOHO UAN" to <strong>7738299899</strong> for balance inquiry |
                    Email: employeefeedback@epfindia.gov.in
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FAQSchema faqs={pfFAQs} />

        <AuthorBox />

        {/* Related Calculators - Topic Cluster */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Related Tax & Retirement Calculators
            </h2>
            <p className="text-slate-600 mb-6">
              PF is both a retirement tool and a tax-saving instrument. Use these related calculators for complete planning.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/income-tax">
                <div className="p-4 bg-white rounded-lg border hover:border-persian-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Income Tax Calculator</h3>
                  <p className="text-sm text-slate-600">Claim 80C deduction for EPF/PPF in Old Regime</p>
                </div>
              </Link>
              <Link href="/calculators/sip">
                <div className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SIP Calculator</h3>
                  <p className="text-sm text-slate-600">Supplement PF with equity SIP for higher growth</p>
                </div>
              </Link>
              <Link href="/calculators/swp">
                <div className="p-4 bg-white rounded-lg border hover:border-purple-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SWP Calculator</h3>
                  <p className="text-sm text-slate-600">Plan post-retirement withdrawals from your corpus</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-indigo-700 mb-1">All Calculators</h3>
                  <p className="text-sm text-indigo-600">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              © 2024 AiTaxBot. All rights reserved. | PF Calculator - EPF Interest Rate 8.25% (FY 2025-26)
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
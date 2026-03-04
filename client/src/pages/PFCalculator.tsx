import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
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
import PFCalculator from '@/components/calculators/PFCalculator';
import { AlertCircle, Shield, Clock, IndianRupee, FileWarning, CheckCircle2, XCircle, ArrowRight, Badge as BadgeIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const pfFAQs = [
  {
    question: "What is the current EPF interest rate for FY 2025-26?",
    answer: "The EPF interest rate for FY 2025-26 is 8.25% per annum. However, interest on employee contributions exceeding ₹2.5 Lakh/year becomes taxable from FY 2021-22 onwards. This applies to both EPF and VPF contributions combined."
  },
  {
    question: "Is EPF maturity amount completely tax-free?",
    answer: "Yes, EPF withdrawal is completely tax-free (EEE status) after 5 years of continuous service. If you switch jobs and transfer your PF balance via UAN portal, the previous tenure counts towards the 5-year requirement. However, withdrawing early without transferring makes the amount taxable."
  },
  {
    question: "Can I withdraw EPF before retirement?",
    answer: "Yes, partial withdrawals are allowed via Form 31 after 12 months of service for specific purposes: housing, home loan repayment, medical treatment, marriage, education, and special circumstances. Complete withdrawal (Form 19) is allowed after unemployment for 2+ months or at age 54+ (90% withdrawal allowed). Withdrawal before 5 years of service may attract TDS."
  },
  {
    question: "What is VPF and is it better than PPF?",
    answer: "VPF (Voluntary PF) is additional contribution to EPF beyond the mandatory 12%. It gets the SAME 8.25% tax-free interest as EPF with NO maximum limit (unlike PPF's ₹1.5L/year within 80C). For salaried employees, VPF is superior to PPF because it offers higher returns (8.25% vs 7.1%), the same tax treatment (EEE), and employer can also contribute to VPF."
  },
  {
    question: "What happens to my EPF when I change jobs?",
    answer: "Your EPF is completely portable via your UAN (Unique Account Number). When you change jobs, you can transfer your entire EPF balance from the old employer to the new employer through the EPFO UAN portal — no withdrawal required. Your service continuity is preserved, so the previous tenure counts towards the 5-year tax-free withdrawal requirement."
  },
  {
    question: "How is EPS (Employee Pension Scheme) different from EPF?",
    answer: "EPS is part of your employer's 12% contribution (8.33% goes to EPS, capped at ₹1,250/month). EPF is the corpus that grows in your account. EPS gives a monthly pension post-retirement based on service and last drawn salary, while EPF is a lump sum corpus. If service is under 9.5 years, EPS can be withdrawn as lump sum via Form 10C, but if over 9.5 years, you must take monthly pension."
  }
];

export default function PFCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/pf', 'PF Calculator - Provident Fund | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "PF Calculator - EPF VPF PPF",
    description: "Free PF Calculator India FY 2025-26. Calculate EPF, VPF and PPF corpus with employer contribution split, 8.25% interest growth, withdrawal rules, and retirement planning.",
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
        <title>PF Calculator India FY 2025-26 - EPF VPF PPF Corpus | AiTaxBot</title>
        <meta name="description" content="Free PF Calculator India FY 2025-26. Calculate EPF, VPF and PPF corpus with employer split, 8.25% tax-free interest, withdrawal guide, and retirement planning. CA verified." />
        <meta name="keywords" content="PF calculator, EPF calculator, VPF calculator, PPF calculator, provident fund calculator, EPF interest rate 2025-26, PF withdrawal rules, employee pension scheme, PF tax rules" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators/pf" />
        <meta property="og:title" content="PF Calculator India FY 2025-26 - EPF VPF PPF Corpus & Withdrawal Guide" />
        <meta property="og:description" content="Calculate your EPF, VPF, and PPF retirement corpus with employer contribution breakdown, tax implications, and complete withdrawal rules. Updated for FY 2025-26." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators/pf" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-slate-50">

        {/* Breadcrumb */}
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Link href="/" className="hover:text-emerald-600">Home</Link>
              <span>/</span>
              <Link href="/calculators" className="hover:text-emerald-600">Calculators</Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">PF Calculator</span>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-12 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              PF Calculator India — EPF, VPF & PPF Corpus FY 2025-26
            </h1>
            <p className="text-lg text-white/90 max-w-3xl">
              Calculate your Provident Fund retirement corpus, employer contribution split, 8.25% tax-free interest growth,
              and explore complete withdrawal rules. Understand EPF vs VPF vs PPF for better retirement planning.
              CA verified and updated for FY 2025-26.
            </p>
          </div>
        </section>

        {/* Calculator */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <PFCalculator />
          </div>
        </section>

        {/* Misconception Buster */}
        <section className="py-6 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                ⚠️ Common PF Misconception — VPF is Better Than PPF & FDs
              </h3>
              <p className="text-red-700 mb-2">
                Most salaried employees think EPF is the only mandatory deduction and ignore VPF. They don't know that <strong>VPF (Voluntary PF)
                gives the SAME 8.25% tax-free interest as EPF with NO maximum limit</strong> — unlike PPF's ₹1.5L/year limit within 80C.
              </p>
              <p className="text-red-700">
                Depositing extra ₹5,000/month via VPF earns 8.25% tax-free (₹6 lakh over 10 years at 8.25%), while a Fixed Deposit gives only 7%
                and is <strong>fully taxable</strong> (net return at 30% slab: ~4.9%). Max your VPF before looking elsewhere for fixed-income returns.
              </p>
            </div>
          </div>
        </section>

        {/* Educational Content */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Understanding PF — Provident Fund in India</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What is EPF?</h3>
                <p className="text-slate-600">
                  The Employee Provident Fund (EPF) is a mandatory savings scheme for salaried employees in organizations
                  with 20+ members. Both you and your employer contribute 12% of Basic Salary + DA. The entire employee
                  contribution and employer's 3.67% go into your EPF account earning 8.25% annual interest. This grows
                  tax-free and is completely tax-free at withdrawal after 5 years of service.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Who Benefits Most from PF?</h3>
                <p className="text-slate-600">
                  Salaried employees in the 20-30% tax bracket get the maximum benefit. Since the returns are tax-free (even
                  better than PPF which is subject to surcharge at high incomes), and employer also contributes, EPF is a
                  powerful wealth builder. Those planning to stay in one organization for 5+ years benefit from service continuity,
                  while job changers benefit from the portable UAN system.
                </p>
              </div>
            </div>

            {/* EPF vs VPF vs PPF Comparison Table */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">EPF vs VPF vs PPF — Quick Comparison</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-3 text-left font-semibold">Feature</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-emerald-700">EPF</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-teal-700">VPF</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-green-700">PPF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Who can invest?</td>
                    <td className="border border-slate-200 p-3 text-center">Salaried (20+ org)</td>
                    <td className="border border-slate-200 p-3 text-center">Salaried (beyond 12%)</td>
                    <td className="border border-slate-200 p-3 text-center">Any resident</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Interest Rate FY 2025-26</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">8.25%</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">8.25%</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">7.1%</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Annual Limit</td>
                    <td className="border border-slate-200 p-3 text-center">12% of Basic+DA</td>
                    <td className="border border-slate-200 p-3 text-center">No limit</td>
                    <td className="border border-slate-200 p-3 text-center">₹1.5L within 80C</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Employer Contribution</td>
                    <td className="border border-slate-200 p-3 text-center"><CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" /></td>
                    <td className="border border-slate-200 p-3 text-center"><XCircle className="w-4 h-4 text-red-400 mx-auto" /></td>
                    <td className="border border-slate-200 p-3 text-center"><XCircle className="w-4 h-4 text-red-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Tax on Returns</td>
                    <td className="border border-slate-200 p-3 text-center">Tax-free (EEE)*</td>
                    <td className="border border-slate-200 p-3 text-center">Tax-free (EEE)*</td>
                    <td className="border border-slate-200 p-3 text-center">Tax-free (EEE)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Maturity Tax</td>
                    <td className="border border-slate-200 p-3 text-center">Tax-free (5+ yrs service)</td>
                    <td className="border border-slate-200 p-3 text-center">Tax-free (5+ yrs service)</td>
                    <td className="border border-slate-200 p-3 text-center">Fully tax-free</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Lock-in Period</td>
                    <td className="border border-slate-200 p-3 text-center">Till retirement/5 yrs</td>
                    <td className="border border-slate-200 p-3 text-center">Same as EPF</td>
                    <td className="border border-slate-200 p-3 text-center">15 years</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">80C Deduction</td>
                    <td className="border border-slate-200 p-3 text-center">₹1.5L combined</td>
                    <td className="border border-slate-200 p-3 text-center">₹1.5L combined w/ EPF</td>
                    <td className="border border-slate-200 p-3 text-center">₹1.5L combined</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">*Interest on EPF+VPF contributions exceeding ₹2.5L/year is taxable from FY 2021-22 onwards.</p>
            </div>

            {/* How EPF Contribution Works */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How EPF Contribution Works</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Contribution Breakdown</h3>
                <p className="text-slate-600 mb-4">
                  PF contribution is calculated on <strong>Basic Salary + Dearness Allowance (DA)</strong>.
                  Both employee and employer contribute 12% each, but the employer's share is split:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                    <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">E</div>
                    <div>
                      <div className="font-medium text-emerald-900">Employee: 12%</div>
                      <div className="text-sm text-emerald-700">Entire 12% goes to your EPF account</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-teal-50 rounded-lg">
                    <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">P</div>
                    <div>
                      <div className="font-medium text-teal-900">Employer EPF: 3.67%</div>
                      <div className="text-sm text-teal-700">Goes to your EPF account (grows with interest)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                    <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">S</div>
                    <div>
                      <div className="font-medium text-amber-900">Employer EPS: 8.33%</div>
                      <div className="text-sm text-amber-700">Pension fund (capped ₹1,250/month)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-100 rounded-lg">
                    <div className="w-8 h-8 bg-slate-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">I</div>
                    <div>
                      <div className="font-medium text-slate-900">Employer EDLI: 0.50%</div>
                      <div className="text-sm text-slate-700">Insurance (paid by employer separately)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Example Calculation</h3>
                <div className="bg-slate-50 p-6 rounded-lg border">
                  <p className="text-slate-900 font-semibold mb-3">If Basic + DA = ₹50,000/month:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Employee Contribution (12%)</span>
                      <span className="font-medium text-emerald-600">₹6,000</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Employer EPF (3.67%)</span>
                      <span className="font-medium text-teal-600">₹1,835</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span>Employer EPS (8.33%, capped ₹1,250)</span>
                      <span className="font-medium text-amber-600">₹1,250</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between py-1.5 font-bold">
                      <span>Total to Your PF Account</span>
                      <span className="text-emerald-600">₹7,835/month</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-500">
                      <span>EPS (goes to pension, not PF)</span>
                      <span>₹1,250/month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Worked Examples */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Worked Examples</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">

              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 1 — Basic Salary ₹30,000</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Basic + DA:</span><span className="font-semibold">₹30,000/month</span></div>
                  <div className="flex justify-between"><span>Monthly EPF Contribution:</span><span className="font-semibold">₹3,600 (12%)</span></div>
                  <div className="flex justify-between"><span>Employer EPF (3.67%):</span><span className="font-semibold">₹1,101</span></div>
                  <div className="flex justify-between"><span>Total Monthly to Account:</span><span className="font-semibold">₹4,701</span></div>
                  <div className="flex justify-between"><span>Investment Period:</span><span className="font-semibold">30 years</span></div>
                  <div className="flex justify-between"><span>Return Assumed:</span><span className="font-semibold">8.25% p.a.</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>Corpus at Age 60:</span><span className="font-bold text-emerald-700">~₹60-70 Lakh</span></div>
                  <div className="text-xs text-slate-500 mt-2">Note: Assumes no salary increases or VPF additions</div>
                </div>
              </div>

              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 2 — Adding VPF ₹5,000/Month</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Mandatory EPF:</span><span className="font-semibold">₹4,701/month</span></div>
                  <div className="flex justify-between"><span>Additional VPF:</span><span className="font-semibold">₹5,000/month</span></div>
                  <div className="flex justify-between"><span>Total Monthly:</span><span className="font-semibold">₹9,701</span></div>
                  <div className="flex justify-between"><span>Investment Period:</span><span className="font-semibold">30 years</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>Corpus with VPF:</span><span className="font-bold text-emerald-700">~₹1.15-1.30 Cr</span></div>
                  <div className="flex justify-between"><span>Additional Gain from VPF:</span><span className="font-bold text-green-700">₹50-60 Lakh</span></div>
                  <div className="text-xs text-slate-500 mt-2">VPF adds ₹5,000/month, earning 8.25% tax-free for 30 years</div>
                </div>
              </div>

            </div>

            {/* PF Withdrawal Guide */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">PF Withdrawal Guide & Tax Rules</h2>

            <Card className="mb-8 border-2 border-emerald-200">
              <CardHeader className="bg-emerald-50">
                <CardTitle className="text-xl flex items-center gap-2 text-emerald-800">
                  <AlertCircle className="w-6 h-6" />
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
                      If you switch jobs and <strong>transfer your PF</strong> via UAN portal, your previous tenure counts
                      towards the 5-year requirement. No withdrawal needed.
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">Continuity Breaks</span>
                    </div>
                    <p className="text-sm text-red-700">
                      If you <strong>withdraw PF without transferring</strong>, continuity breaks and the entire amount
                      becomes taxable. TDS of 10-30% is deducted.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                  Complete vs Partial Withdrawal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Complete Withdrawal (Form 19 + Form 10C)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left p-3 font-semibold border">Condition</th>
                          <th className="text-left p-3 font-semibold border">Limit</th>
                          <th className="text-left p-3 font-semibold border">Form Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 border font-medium">Retirement (age 58+)</td>
                          <td className="p-3 border">100% of balance</td>
                          <td className="p-3 border">Form 19 + Form 10C/10D</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">Unemployed 1-2 months</td>
                          <td className="p-3 border">75% of balance</td>
                          <td className="p-3 border">Form 19</td>
                        </tr>
                        <tr>
                          <td className="p-3 border font-medium">Unemployed 2+ months</td>
                          <td className="p-3 border">100% of balance</td>
                          <td className="p-3 border">Form 19 + Form 10C</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">Pre-retirement (age 54+)</td>
                          <td className="p-3 border">90% of balance</td>
                          <td className="p-3 border">Form 31</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Partial Withdrawal — Form 31 Advances (Oct 2025 Updated Rules)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left p-3 font-semibold border">Purpose</th>
                          <th className="text-center p-3 font-semibold border">Min Service</th>
                          <th className="text-left p-3 font-semibold border">Limit</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 border font-medium">Housing (purchase/construction/renovation)</td>
                          <td className="p-3 border text-center"><Badge>5 years</Badge></td>
                          <td className="p-3 border">24-36 months Basic+DA or cost</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">Home loan repayment</td>
                          <td className="p-3 border text-center"><Badge>10 years</Badge></td>
                          <td className="p-3 border">36 months Basic+DA or loan balance</td>
                        </tr>
                        <tr>
                          <td className="p-3 border font-medium">Medical treatment (self/family)</td>
                          <td className="p-3 border text-center"><Badge variant="secondary">No min</Badge></td>
                          <td className="p-3 border">6 months Basic+DA (with doctor cert)</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">Marriage (self/children/siblings)</td>
                          <td className="p-3 border text-center"><Badge>7 years</Badge></td>
                          <td className="p-3 border">50% of account (up to 5 times)</td>
                        </tr>
                        <tr>
                          <td className="p-3 border font-medium">Education of children</td>
                          <td className="p-3 border text-center"><Badge>7 years</Badge></td>
                          <td className="p-3 border">50% of account (up to 10 times)</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-3 border font-medium">Natural calamity/pandemic relief</td>
                          <td className="p-3 border text-center"><Badge variant="secondary">None</Badge></td>
                          <td className="p-3 border">3 months Basic+DA (non-refundable)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">TDS on Early Withdrawal (Before 5 Years)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Service 5+ years:</strong> No TDS, fully tax-free</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Amount &lt; ₹50,000:</strong> No TDS regardless of service</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Service &lt; 5 years, PAN linked:</strong> 10% TDS deducted if no Form 15G/15H</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded">
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Service &lt; 5 years, no PAN:</strong> 34.608% TDS deducted</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pro Tips */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Pro Tips on PF — Maximize Your Retirement Corpus</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">1</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">VPF is the best fixed-income instrument in India</p>
                  <p className="text-slate-600 text-sm mt-1">8.25% tax-free returns with no contribution limit. No surcharge even at high incomes. Better than PPF (7.1%) or FDs (7% taxable). Maximize VPF within your savings capacity.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">2</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Don't withdraw EPF when changing jobs</p>
                  <p className="text-slate-600 text-sm mt-1">Always transfer your PF to the new employer via UAN portal. Withdrawal breaks service continuity and makes the entire amount taxable (10-30% TDS). The new employer can receive your balance without any hassle.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">3</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Watch the ₹2.5L contribution threshold</p>
                  <p className="text-slate-600 text-sm mt-1">EPF/VPF interest becomes taxable if your combined annual contributions exceed ₹2.5L. At 30% slab, interest above this threshold is taxed. Plan VPF contributions accordingly to stay under the limit.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">4</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">EPS vs EPF — understand the trade-off</p>
                  <p className="text-slate-600 text-sm mt-1">EPS is the employer's 8.33% contribution that gives you a monthly pension (capped at ₹1,250). It locks in lower corpus but provides pension security. Choose based on your retirement income needs.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">5</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Nominate your beneficiary in EPFO portal</p>
                  <p className="text-slate-600 text-sm mt-1">In case of your death, the nomination ensures your family gets the EPF balance without legal complications or delays. Complete the nomination within 3 months of EPF account opening. Update if life situations change.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">6</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Combine EPF + VPF + NPS for 3-pillar retirement</p>
                  <p className="text-slate-600 text-sm mt-1">Don't rely on EPF alone. Add VPF for extra corpus, NPS for the ₹50,000 extra deduction under 80CCD(1B), and other investments. This diversified approach reduces risk and maximizes tax efficiency.</p>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {pfFAQs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <FAQSchema faqs={pfFAQs} />
        <AuthorBox />

        {/* Ads */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <ResponsiveAd />
          <RectangleAd />
        </div>

        {/* Related Calculators */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Related Tax & Retirement Calculators</h2>
            <p className="text-slate-600 mb-6">
              Plan your complete retirement strategy — combine PF with NPS, SIP, and smart tax planning.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/nps">
                <div className="p-4 bg-white rounded-lg border hover:border-emerald-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">NPS Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate NPS corpus and ₹50,000 extra 80CCD(1B) tax saving</p>
                </div>
              </Link>
              <Link href="/calculators/sip">
                <div className="p-4 bg-white rounded-lg border hover:border-emerald-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SIP Calculator</h3>
                  <p className="text-sm text-slate-600">Build mutual fund wealth alongside your PF corpus</p>
                </div>
              </Link>
              <Link href="/calculators/swp">
                <div className="p-4 bg-white rounded-lg border hover:border-emerald-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SWP Calculator</h3>
                  <p className="text-sm text-slate-600">Plan post-retirement monthly withdrawals</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-emerald-700 mb-1">All Calculators</h3>
                  <p className="text-sm text-emerald-600">Explore our complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              © 2026 AiTaxBot. All rights reserved. | PF Calculator — EPF VPF PPF India
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}

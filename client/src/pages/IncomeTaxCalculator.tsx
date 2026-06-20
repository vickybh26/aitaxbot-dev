import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { trackPageView } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import FindCABanner from '@/components/FindCABanner';
import TaxDownloadModal from '@/components/TaxDownloadModal';
import {
  generateCalculatorSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema
} from '@/lib/structuredData';
import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';
import { ResponsiveAd, RectangleAd } from '@/components/AdBanner';
import CalcPageHeader from '@/components/CalcPageHeader';
import TaxCalculator from '@/components/calculators/TaxCalculator';

const incomeTaxFAQs = [
  {
    question: "Which tax regime should I choose - Old or New for FY 2026-27?",
    answer: "Use the AiTaxBot Income Tax Calculator to compare both regimes. Generally, the Old Regime is better if you have significant 80C investments (₹1.5L+) and HRA. The New Regime (Section 202 under Income Tax Act, 2025) is better if you have minimal deductions and prefer lower rates."
  },
  {
    question: "Can I switch between tax regimes every year?",
    answer: "Yes, salaried individuals can switch between Old and New regime every financial year. Business/professional taxpayers can switch only once."
  },
  {
    question: "If my income is ₹12.1 lakh, do I pay tax on the full ₹12.1 lakh?",
    answer: "No — this is a very common misconception. Thanks to marginal relief, you only pay tax on the excess income above ₹12 lakh. At ₹12.1 lakh taxable income, your tax liability is only ₹10,000 + 4% cess = ₹10,400 (not the ₹63,960 that would apply without marginal relief). The tax increase can never exceed the income increase over the ₹12 lakh threshold."
  },
  {
    question: "What is marginal relief in income tax and when does it apply?",
    answer: "Marginal relief is a safeguard that prevents your extra tax liability from exceeding your extra income when you cross a tax threshold. It applies at two key points: (1) The ₹12 lakh rebate limit in the new regime — if your taxable income is ₹12.1L, you pay tax of only ₹10,000 + cess, not ₹61,500. (2) Surcharge thresholds — at ₹50L, ₹1Cr, ₹2Cr, and ₹5Cr, the additional tax due to surcharge cannot exceed the income over the threshold. Our calculator automatically computes marginal relief for all these scenarios."
  },
  {
    question: "What is surcharge on income tax and when does it apply?",
    answer: "Surcharge is an additional tax levied on your income tax (not on income). It applies when your total income exceeds: ₹50 lakh (10% surcharge), ₹1 crore (15% surcharge), ₹2 crore (25% surcharge), ₹5 crore (37% surcharge under old regime; capped at 25% under new regime for most income types). Marginal relief is available at each surcharge threshold to prevent your net-of-tax income from falling below someone earning exactly at the threshold."
  },
  {
    question: "Is it worth planning my income to stay below ₹50 lakh to avoid surcharge?",
    answer: "Not necessarily — marginal relief protects you. If your income slightly exceeds ₹50 lakh, your extra tax cannot exceed the extra income. For example, at ₹50.1 lakh taxable income, the additional tax over the ₹50L case is just ₹10,000 + cess, not ₹1.15 lakh (what 10% surcharge would cost without relief). However, deliberately planning income to stay below thresholds may make sense if the excess is very small and there are legitimate deduction options available."
  }
];

export default function IncomeTaxCalculatorPage() {
  const { user } = useAuth();
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [computationSummary, setComputationSummary] = useState("");

  useEffect(() => {
    trackPageView('/calculators/income-tax', 'Income Tax Calculator India FY 2026-27 — New vs Old Regime | AiTaxBot');

    // Disable browser print (Ctrl+P / Cmd+P)
    const blockPrint = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', blockPrint);
    // Override window.print so programmatic calls also do nothing
    const origPrint = window.print;
    window.print = () => {};
    return () => {
      document.removeEventListener('keydown', blockPrint);
      window.print = origPrint;
    };
  }, []);

  function handleCalculated(summaryText: string) {
    // Only update the summary — no auto-popup
    setComputationSummary(summaryText);
  }

  // Called by TaxCalculator when Download PDF is clicked and user is NOT logged in
  function handleGuestDownloadRequest() {
    setShowDownloadModal(true);
  }

  const calculatorSchema = generateCalculatorSchema({
    name: "Income Tax Calculator FY 2026-27 (AY 2027-28)",
    description: "Free Income Tax Calculator for FY 2026-27 (AY 2027-28). Compare Old vs New tax regime, calculate Section 87A rebate and marginal relief.",
    url: "https://aitaxbot.co.in/calculators/income-tax",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.co.in/" },
    { name: "Calculators", url: "https://aitaxbot.co.in/calculators" },
    { name: "Income Tax Calculator", url: "https://aitaxbot.co.in/calculators/income-tax" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>Income Tax Calculator India FY 2026-27 (AY 2027-28) — New vs Old Regime | AiTaxBot</title>
        <meta name="description" content="Free Income Tax Calculator for FY 2026-27 (AY 2027-28). Compare Old vs New regime, Section 87A rebate & marginal relief. Latest tax slabs & deductions." />
        <meta name="keywords" content="income tax calculator, tax calculator India, FY 2026-27, AY 2027-28, old vs new regime, section 87a rebate, marginal relief, tax calculation, income tax slab" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators/income-tax" />
        <meta property="og:title" content="Income Tax Calculator India FY 2026-27 (AY 2027-28) — New vs Old Regime | AiTaxBot" />
        <meta property="og:description" content="Free Income Tax Calculator for FY 2026-27 (AY 2027-28). Compare Old vs New regime, Section 87A rebate & marginal relief." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators/income-tax" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="bg-white">

        <CalcPageHeader
          title="Income Tax Calculator — New vs Old Regime FY 2026-27"
          subtitle="Compare your tax liability under both regimes. Includes Section 87A rebate, marginal relief, and all deductions for AY 2027-28."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Calculators", href: "/calculators" },
            { label: "Income Tax Calculator" }
          ]}
          badge="FY 2026-27 ✓"
        />

        {/* Calculator */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <TaxCalculator
              onCalculated={handleCalculated}
              onGuestDownload={handleGuestDownloadRequest}
            />
          </div>
        </section>

        {/* Misconception Buster */}
        <section className="py-6 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                ⚠️ Common Misconception — ₹12.1 Lakh Income Does NOT Mean Paying Tax on Full Amount
              </h3>
              <p className="text-red-700 mb-2">
                Most people think: "If I earn ₹12.1 lakh, I'll pay tax on ₹12.1 lakh at the applicable slab rates."
                This is wrong. Thanks to <strong>marginal relief</strong>, at ₹12.1 lakh taxable income your tax is only
                <strong> ₹10,000 + 4% cess = ₹10,400</strong> — NOT ₹63,960 (what you'd incorrectly calculate without relief).
              </p>
              <p className="text-red-700">
                <strong>Your extra ₹10,000 income costs you only ₹10,400 in tax — not ₹51,960 more.</strong> The law ensures
                that crossing the ₹12 lakh threshold never costs you more than the extra income you earned. This calculator
                automatically applies marginal relief at all thresholds: ₹12L, ₹50L, ₹1Cr, ₹2Cr, and ₹5Cr.
              </p>
            </div>
          </div>
        </section>

        {/* Educational Content */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Income Tax Slabs FY 2026-27</h2>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-3 text-left font-semibold">Income Range</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-blue-700">New Regime Tax Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">₹0 – ₹4 lakh</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold text-green-700">0%</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">₹4 – ₹8 lakh</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">5%</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">₹8 – ₹12 lakh</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">10%</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">₹12 – ₹16 lakh</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">15%</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">₹16 – ₹20 lakh</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">20%</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">₹20 – ₹24 lakh</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">25%</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Above ₹24 lakh</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">30%</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">Plus 4% Health & Education Cess on final tax amount. Old Regime has different slabs and allows more deductions.</p>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">New vs Old Regime — Which Should You Choose?</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-blue-900 mb-3">New Regime (Default)</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="text-blue-600 font-bold">✓</span> Lower tax rates (0-30%)</li>
                  <li className="flex gap-2"><span className="text-blue-600 font-bold">✓</span> Standard deduction ₹75,000</li>
                  <li className="flex gap-2"><span className="text-blue-600 font-bold">✓</span> Rebate up to ₹60,000 (income ≤ ₹12L)</li>
                  <li className="flex gap-2"><span className="text-blue-600 font-bold">✓</span> Simple, fewer deduction claims</li>
                  <li className="flex gap-2"><span className="text-red-600 font-bold">✗</span> No HRA, home loan, 80C deductions</li>
                  <li className="flex gap-2"><span className="text-red-600 font-bold">✗</span> Better only if income &gt; ₹15L with few deductions</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-green-900 mb-3">Old Regime (Traditional)</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> All deductions available (80C, HRA, etc.)</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Section 80CCD(1B): +₹50,000 NPS deduction</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Standard deduction ₹50,000</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Better for salaried with investments</li>
                  <li className="flex gap-2"><span className="text-red-600 font-bold">✗</span> Higher tax rates (higher slabs)</li>
                  <li className="flex gap-2"><span className="text-red-600 font-bold">✗</span> No rebate above ₹12L</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Tax Calculation Worked Examples</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-8">

              {/* Example 1: ₹12L Zero Tax */}
              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">EXAMPLE 1</span>
                  ₹12 Lakh — Zero Tax
                </h3>
                <p className="text-sm text-slate-600 mb-4">Salaried person, New Regime, FY 2026-27</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Gross Salary</span><span className="font-semibold">₹12,75,000</span></div>
                  <div className="flex justify-between"><span>Less: Standard Deduction</span><span className="font-semibold">−₹75,000</span></div>
                  <div className="flex justify-between border-t pt-1"><span className="text-slate-700 font-medium">Taxable Income</span><span className="font-bold">₹12,00,000</span></div>
                  <div className="flex justify-between"><span>Tax on ₹12L (new slabs)</span><span className="font-semibold">₹60,000</span></div>
                  <div className="flex justify-between"><span>Less: Section 87A Rebate</span><span className="font-semibold text-green-700">−₹60,000</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="text-green-800 font-bold">Total Tax Payable</span><span className="font-bold text-green-700 text-base">₹0</span></div>
                </div>
                <p className="text-xs text-green-700 mt-3 bg-green-100 rounded p-2">
                  ✔ Full rebate available. Net take-home from ₹12.75L gross = ₹12.75L (zero tax). Standard deduction automatically applies.
                </p>
              </div>

              {/* Example 2: ₹12.1L Marginal Relief */}
              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded">EXAMPLE 2</span>
                  ₹12.1 Lakh — Marginal Relief
                </h3>
                <p className="text-sm text-slate-600 mb-4">Salaried person, just over rebate limit</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Taxable Income</span><span className="font-semibold">₹12,10,000</span></div>
                  <div className="flex justify-between"><span>Tax (normal calculation)</span><span className="font-semibold">₹61,500</span></div>
                  <div className="flex justify-between"><span>Without marginal relief + cess</span><span className="font-semibold line-through text-red-500">₹63,960</span></div>
                  <div className="flex justify-between"><span>Extra income over ₹12L</span><span className="font-semibold">₹10,000</span></div>
                  <div className="flex justify-between"><span>Marginal relief applied</span><span className="font-semibold text-amber-700">Tax capped at ₹10,000</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="text-amber-800 font-bold">Total Tax Payable</span><span className="font-bold text-amber-700 text-base">₹10,400</span></div>
                </div>
                <p className="text-xs text-amber-700 mt-3 bg-amber-100 rounded p-2">
                  ✔ Tax = ₹10,000 + 4% cess = ₹10,400. NOT ₹63,960. Marginal relief saves ₹53,560.
                </p>
              </div>

              {/* Example 3: ₹50L Surcharge */}
              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-700 text-white text-xs font-bold px-2 py-1 rounded">EXAMPLE 3</span>
                  ₹50 Lakh — Surcharge Cliff Protection
                </h3>
                <p className="text-sm text-slate-600 mb-4">New Regime — 10% surcharge kicks in above ₹50L</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-700 text-xs font-semibold mb-2"><span>At ₹50L income</span><span>At ₹50.1L income</span></div>
                  <div className="flex justify-between"><span>Income Tax</span><span className="font-semibold">₹10,80,000</span></div>
                  <div className="flex justify-between"><span>Surcharge (10%)</span><span className="font-semibold">Nil</span></div>
                  <div className="flex justify-between border-t pt-1"><span className="font-medium">Subtotal at ₹50L</span><span className="font-bold">₹11,23,200</span></div>
                  <div className="border my-2"></div>
                  <div className="flex justify-between"><span>Income Tax</span><span className="font-semibold">₹10,83,000</span></div>
                  <div className="flex justify-between"><span>Surcharge (10%)</span><span className="font-semibold">₹1,08,300</span></div>
                  <div className="flex justify-between"><span className="text-red-600 line-through">Without relief</span><span className="font-semibold line-through text-red-600">Extra ₹1,15,832</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="text-blue-800 font-bold">WITH marginal relief</span><span className="font-bold text-blue-700 text-base">Extra only ₹10,400</span></div>
                </div>
                <p className="text-xs text-blue-700 mt-3 bg-blue-100 rounded p-2">
                  ✔ 10% surcharge (and 15% at ₹1Cr, 25% at ₹2Cr) all have marginal relief protection. Your extra ₹10,000 income costs proportionally only ₹10,400 tax.
                </p>
              </div>

              {/* Example 4: Old vs New Regime Breakeven */}
              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="bg-purple-700 text-white text-xs font-bold px-2 py-1 rounded">EXAMPLE 4</span>
                  Old vs New Regime — Breakeven Analysis
                </h3>
                <p className="text-sm text-slate-600 mb-4">Income ₹15L: Which regime saves more tax?</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2"><span>OLD REGIME</span><span>NEW REGIME</span></div>
                  <div className="flex justify-between"><span>Gross Income</span><span className="font-semibold">₹15,00,000 | ₹15,00,000</span></div>
                  <div className="flex justify-between"><span>Std deduction</span><span className="font-semibold">₹50,000 | ₹75,000</span></div>
                  <div className="flex justify-between"><span>80C + HRA</span><span className="font-semibold">₹2,00,000 | Nil</span></div>
                  <div className="flex justify-between"><span>Taxable income</span><span className="font-semibold">₹12,50,000 | ₹14,25,000</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="text-purple-800 font-bold">Tax + cess</span><span className="font-bold text-purple-700 text-base">₹1,56,000 | ₹1,96,365</span></div>
                </div>
                <p className="text-xs text-purple-700 mt-3 bg-purple-100 rounded p-2">
                  ✔ Old Regime wins by ₹40,365 here. But if deductions are less than ~₹3.75L at this income, New Regime wins. Use the calculator to compare your actual scenario.
                </p>
              </div>

            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Pro Tips on Income Tax — Save More, Pay Less</h2>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">1</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">₹12 Lakh is actually tax-free under new regime due to rebate u/s 87A</p>
                  <p className="text-slate-600 text-sm mt-1">You earn ₹12L, pay zero tax after standard deduction (₹75,000) and rebate (₹60,000). This is pure tax-free income. The rebate is automatically calculated by our calculator.</p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">2</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">NPS 80CCD(1B) saves extra ₹15,000 tax — works only under old regime</p>
                  <p className="text-slate-600 text-sm mt-1">Contribute ₹50,000 more to NPS Tier I above your regular 80C limit. At 30% slab = ₹15,000 free tax saving every year. This deduction is NOT available in the new regime.</p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">3</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Don't cross surcharge thresholds without planning — ₹50.1L costs way more than ₹50L</p>
                  <p className="text-slate-600 text-sm mt-1">Surcharge kicks in at ₹50L (10%), ₹1Cr (15%), ₹2Cr (25%). Marginal relief protects you, but deferring bonus timing or claiming more deductions to stay just below thresholds can save significant tax if amounts are close.</p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">4</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">₹75,000 standard deduction is automatic under new regime — no proof needed</p>
                  <p className="text-slate-600 text-sm mt-1">You don't need to maintain rent receipts, invest in 80C, or file any deduction claims. ₹75,000 is automatically deducted from your salary. This makes new regime attractive for simple salaried folks.</p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">5</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">HRA + home loan interest can ONLY be claimed under old regime</p>
                  <p className="text-slate-600 text-sm mt-1">Paying rent AND have a home loan? Old regime lets you claim both HRA (10(13A)) and home loan interest (24(b)). New regime gives you neither. This combination strongly favors old regime.</p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">6</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">New regime is better for income above ₹15L with no major deductions</p>
                  <p className="text-slate-600 text-sm mt-1">If you earn ₹20L+ with no HRA, no 80C investments, and no home loan — new regime almost always wins. Simple rule: use our calculator. It will tell you instantly which is better for your income.</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">FY 2026-27 Tax Regime Comparison</h2>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-3 text-left font-semibold">Feature</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-blue-700">New Regime</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-green-700">Old Regime</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Tax Rates</td>
                    <td className="border border-slate-200 p-3 text-center">0-30% (simplified)</td>
                    <td className="border border-slate-200 p-3 text-center">5-30% (with surcharge)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Standard Deduction</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">₹75,000</td>
                    <td className="border border-slate-200 p-3 text-center">₹50,000</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Section 80C Deductions</td>
                    <td className="border border-slate-200 p-3 text-center">Not available</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">Up to ₹1.5L</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">HRA Exemption</td>
                    <td className="border border-slate-200 p-3 text-center">Not available</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">Available</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Home Loan Interest</td>
                    <td className="border border-slate-200 p-3 text-center">Not available</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">Up to ₹2L/year</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">80CCD(1B) — NPS Extra</td>
                    <td className="border border-slate-200 p-3 text-center">Not available</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">+₹50,000</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Rebate (up to ₹12L)</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">Up to ₹60,000</td>
                    <td className="border border-slate-200 p-3 text-center">Not applicable</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Best For</td>
                    <td className="border border-slate-200 p-3 text-center">High income, minimal deductions</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold">Salaried with investments + HRA</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FAQs */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {incomeTaxFAQs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <FAQSchema faqs={incomeTaxFAQs} />
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
              Plan your complete tax strategy — combine income tax planning with HRA, NPS, and PF calculators.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/hra">
                <div className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">HRA Calculator</h3>
                  <p className="text-sm text-slate-600">Claim maximum HRA deduction under Section 10(13A)</p>
                </div>
              </Link>
              <Link href="/calculators/nps">
                <div className="p-4 bg-white rounded-lg border hover:border-indigo-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">NPS Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate 80CCD(1B) ₹50,000 extra deduction & retirement corpus</p>
                </div>
              </Link>
              <Link href="/calculators/pf">
                <div className="p-4 bg-white rounded-lg border hover:border-green-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">PF Calculator</h3>
                  <p className="text-sm text-slate-600">Section 80C deduction via EPF & PPF contributions</p>
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

        {/* CA Banner */}
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <FindCABanner context="filing your ITR" />
        </div>

        {/* Tax Download Lead Capture Modal */}
        <TaxDownloadModal
          open={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          summaryText={computationSummary}
          source="Income Tax Calculator"
        />

      </div>
    </>
  );
}

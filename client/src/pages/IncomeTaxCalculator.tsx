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
  },
  {
    question: "What is the Income Tax Act, 2025?",
    answer: "The Income Tax Act, 2025 is a new consolidated law that replaces the Income-tax Act, 1961. It was passed by Parliament and received Presidential assent on 21st August, 2025. The new Act comes into effect from 1st April, 2026 (FY 2026-27 / AY 2027-28). Key section changes: New regime is Section 202, Rebate is Section 156."
  },
  {
    question: "What is the Section 87A / Section 156 rebate for FY 2025-26 (AY 2026-27)?",
    answer: "Under the New Regime (Section 202), taxpayers with taxable income up to ₹12 lakh can claim a rebate of up to ₹60,000, making their effective tax zero. This is Section 156 under Income Tax Act, 2025 (was Section 87A under 1961 Act). Note: special rate incomes like LTCG and STCG are excluded from rebate eligibility even if total income is under ₹12L."
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

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Worked Examples: Marginal Relief Explained</h2>

            {/* Misconception Buster - prominent callout */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-900 mb-2 text-lg">
                    Common Misconception: "If my income is ₹12.1 lakh, I pay tax on the full ₹12.1 lakh"
                  </h3>
                  <p className="text-red-800 mb-3">
                    <strong>This is wrong.</strong> Thanks to <strong>marginal relief</strong>, at ₹12.1 lakh taxable income your tax is only
                    ₹10,000 + 4% cess = <strong>₹10,400</strong> — not ₹63,960 (what you'd pay without relief).
                    The law ensures that crossing the ₹12 lakh threshold never costs you more than the extra income you earned.
                  </p>
                  <p className="text-red-700 text-sm">
                    ✔ This calculator correctly applies marginal relief at all thresholds — ₹12L, ₹50L, ₹1Cr, ₹2Cr, ₹5Cr.
                  </p>
                </div>
              </div>
            </div>

            {/* Worked Examples Grid */}
            <div className="grid md:grid-cols-2 gap-6 not-prose mb-10">

              {/* Example 1: ₹12L Zero Tax */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">EXAMPLE 1</span>
                  <h3 className="font-bold text-slate-900">₹12 Lakh — Zero Tax</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">Salaried person, New Regime, FY 2025-26</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Gross Salary</span><span className="font-medium">₹12,75,000</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Less: Standard Deduction</span><span className="font-medium">−₹75,000</span></div>
                  <div className="flex justify-between border-t pt-1"><span className="text-slate-700 font-medium">Taxable Income</span><span className="font-bold">₹12,00,000</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Tax on ₹12L (new slabs)</span><span className="font-medium">₹60,000</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Less: Section 87A Rebate</span><span className="font-medium text-green-700">−₹60,000</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="text-green-800 font-bold">Total Tax Payable</span><span className="font-bold text-green-700 text-base">₹0</span></div>
                </div>
                <p className="text-xs text-green-700 mt-3 bg-green-100 rounded p-2">
                  ✔ Full rebate available. Net take-home from ₹12.75L gross salary = ₹12.75L (zero tax).
                </p>
              </div>

              {/* Example 2: ₹12.1L — Marginal Relief */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded">EXAMPLE 2</span>
                  <h3 className="font-bold text-slate-900">₹12.1 Lakh — Marginal Relief</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">Salaried person, New Regime, just over rebate limit</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Taxable Income</span><span className="font-medium">₹12,10,000</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Tax (no rebate above ₹12L)</span><span className="font-medium">₹61,500</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Without marginal relief + cess</span><span className="font-medium line-through text-red-500">₹63,960</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Extra income over ₹12L</span><span className="font-medium">₹10,000</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Marginal relief applied</span><span className="font-medium text-amber-700">Tax capped at ₹10,000</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="text-amber-800 font-bold">Total Tax Payable</span><span className="font-bold text-amber-700 text-base">₹10,400</span></div>
                </div>
                <p className="text-xs text-amber-700 mt-3 bg-amber-100 rounded p-2">
                  ✔ Tax = ₹10,000 + 4% cess = ₹10,400. NOT ₹63,960. Marginal relief saves ₹53,560.
                </p>
              </div>

              {/* Example 3: ₹50L Surcharge Cliff */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-blue-700 text-white text-xs font-bold px-2 py-1 rounded">EXAMPLE 3</span>
                  <h3 className="font-bold text-slate-900">₹50 Lakh Surcharge Cliff</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">New Regime — 10% surcharge kicks in above ₹50L</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600 text-xs font-medium mb-1"><span>At ₹50L taxable income</span><span>At ₹50.1L taxable income</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Income tax</span><span className="font-medium">₹10,80,000 vs ₹10,83,000</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Surcharge (10%)</span><span className="font-medium">Nil vs ₹1,08,300</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Without marginal relief</span><span className="font-medium line-through text-red-500">Extra ₹1,15,832</span></div>
                  <div className="flex justify-between"><span className="text-slate-600 font-medium">With marginal relief</span><span className="font-medium text-blue-700">Extra = only ₹10,400</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="text-blue-800 font-bold">Tax at ₹50.1L</span><span className="font-bold text-blue-700 text-base">≈₹11,33,600</span></div>
                </div>
                <p className="text-xs text-blue-700 mt-3 bg-blue-100 rounded p-2">
                  ✔ 10% surcharge (and 15% at ₹1Cr, 25% at ₹2Cr) all have marginal relief protection. Most tax calculators miss this.
                </p>
              </div>

              {/* Example 4: Old Regime Breakeven */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-purple-700 text-white text-xs font-bold px-2 py-1 rounded">EXAMPLE 4</span>
                  <h3 className="font-bold text-slate-900">Old vs New Regime Breakeven</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">When does Old Regime win? Income ₹15L, deductions matter</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between font-medium text-xs text-slate-500 mb-1"><span>OLD REGIME</span><span>NEW REGIME</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Gross Income</span><span className="font-medium">₹15,00,000 | ₹15,00,000</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Std deduction</span><span className="font-medium">₹50,000 | ₹75,000</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">80C + HRA deductions</span><span className="font-medium">₹2,00,000 | Nil</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Taxable income</span><span className="font-medium">₹12,50,000 | ₹14,25,000</span></div>
                  <div className="flex justify-between border-t pt-1"><span className="text-purple-800 font-bold">Tax + cess</span><span className="font-bold text-purple-700 text-base">₹1,56,000 | ₹1,96,365</span></div>
                </div>
                <p className="text-xs text-purple-700 mt-3 bg-purple-100 rounded p-2">
                  ✔ Old Regime saves ₹40,365 here. But if deductions are less than ~₹3.75L at this income, New Regime wins.
                </p>
              </div>
            </div>

            {/* CA Tips Section */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">CA Tips & Common Tax Mistakes to Avoid</h2>

            <div className="space-y-5 not-prose mb-8">
              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Don't panic about crossing ₹12 lakh — marginal relief protects you</h4>
                  <p className="text-slate-600 text-sm">
                    If your taxable income is ₹12.5L, your tax liability is approximately ₹52,000 (not ₹70,200).
                    The law ensures your effective tax increase never exceeds the extra income you earned over ₹12L.
                    Marginal relief applies until about ₹12.7L taxable income, after which normal rates fully kick in.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Surcharge thresholds are ₹50L, ₹1Cr, ₹2Cr and ₹5Cr — all with marginal relief</h4>
                  <p className="text-slate-600 text-sm">
                    Surcharge of 10% applies when income exceeds ₹50 lakh. At ₹1 crore, surcharge jumps to 15%.
                    At ₹2 crore it's 25%, and at ₹5 crore it's 37% (old regime) or 25% (new regime — capped).
                    Marginal relief at each threshold prevents your tax increase from exceeding your income increase.
                    Plan investments and bonus timing wisely around these thresholds.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Capital gains are taxed separately — not at your slab rate</h4>
                  <p className="text-slate-600 text-sm">
                    LTCG on equity (mutual funds, shares) is taxed at 12.5% above ₹1.25L. STCG on equity is taxed at 20%.
                    These amounts cannot claim the ₹12L rebate either — even if your total income is under ₹12L,
                    your LTCG/STCG is still taxable. Always enter your capital gains separately to get an accurate picture.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">New Regime standard deduction is ₹75,000 — not ₹50,000</h4>
                  <p className="text-slate-600 text-sm">
                    From FY 2024-25, the standard deduction for salaried employees in the new regime was raised
                    from ₹50,000 to ₹75,000. Many people still compute their tax using the old ₹50,000 figure
                    and end up overpaying advance tax. Our calculator uses the correct ₹75,000 for FY 2025-26.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">5</div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">HRA + Home Loan: you can claim both in the Old Regime</h4>
                  <p className="text-slate-600 text-sm">
                    A common myth is that you cannot claim HRA if you have a home loan. This is incorrect.
                    If you are paying rent and also repaying a home loan on a different property (or the same
                    city with valid reasons for not occupying), you can claim HRA exemption under Section 10(13A)
                    AND home loan interest under Section 24(b) simultaneously in the Old Regime.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-persian-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">6</div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Don't forget the 4% Health & Education Cess on your final tax</h4>
                  <p className="text-slate-600 text-sm">
                    Tax is not just the slab calculation. Your final liability = (Tax + Surcharge) × 1.04.
                    Many quick calculators omit cess, giving you a number that's 4% lower than your actual
                    obligation. AiTaxBot always includes cess in the final figure shown.
                  </p>
                </div>
              </div>
            </div>

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

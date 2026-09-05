import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import FindCABanner from '@/components/FindCABanner';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import {
  generateCalculatorSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema
} from '@/lib/structuredData';
import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';
import { ResponsiveAd, RectangleAd } from '@/components/AdBanner';
import CalcPageHeader from '@/components/CalcPageHeader';
import SWPCalculator from '@/components/calculators/SWPCalculator';

const swpFAQs = [
  {
    question: "What is SWP and how is it different from regular withdrawal?",
    answer: "Systematic Withdrawal Plan (SWP) allows you to withdraw a fixed amount from your mutual fund at regular intervals (monthly, quarterly, or annually). Unlike lump sum withdrawals, SWP keeps your remaining corpus invested and growing. This provides regular income while your money continues to earn returns, making it ideal for retirement. The key advantage: you get monthly cash flow plus ongoing capital appreciation — unlike lump sum where you withdraw everything upfront and lose growth potential."
  },
  {
    question: "Is SWP income taxable in India?",
    answer: "Only the capital gains portion of your SWP withdrawal is taxable — not the entire amount. For equity mutual funds held over 1 year, LTCG tax is 10% above ₹1 lakh exemption limit. For debt funds held over 3 years, LTCG applies with indexation benefit. This makes SWP far more tax-efficient than FD interest (which is fully taxable at your slab rate). For example: withdrawing ₹50,000 might be 70% capital (tax-free) + 30% gains (taxed at 10%), resulting in only ₹1,500 tax — versus FD interest of ₹50,000 taxed fully at 20-30%."
  },
  {
    question: "How long will my corpus last with SWP?",
    answer: "Your corpus longevity depends on: (1) Initial corpus size, (2) Monthly withdrawal amount, (3) Expected annual returns, and (4) Inflation assumptions. Generally, the 4% safe withdrawal rule works well: on a ₹1 crore corpus, ₹40,000/month (4.8% annually) can last 25+ years at 8-9% returns. Using our SWP Calculator, you can input your specific numbers and see exactly how long your corpus will last. Most retirees find that balanced funds returning 8-9% annually sustain withdrawals for 20-30+ years."
  },
  {
    question: "SWP vs FD interest — which gives better post-tax income?",
    answer: "SWP from equity funds is significantly more tax-efficient. Scenario: ₹1 crore corpus. FD at 7% gives ₹70,000/year interest — fully taxable at 30% slab = ₹49,000 net. SWP at 9% return gives ₹90,000/year, with 70% capital (₹63,000 tax-free) + 30% gains (₹27,000 at 10% LTCG tax) = ₹24,300 tax, leaving ₹65,700 net. SWP provides ₹16,700 more annual income after tax. Over 25 years, that's ₹4.2 lakh extra — just from tax efficiency."
  },
  {
    question: "What is the safe withdrawal rate for retirement?",
    answer: "The 4% rule is a golden standard: withdraw 4% of your initial corpus annually (approximately 0.33% monthly). On ₹1 crore, that's ₹40,000/month. This rule assumes 8-9% annual returns and inflation of 6-7%. However, India's higher inflation (6-7% vs US's 2-3%) means you should consider the 4-5% rule safer. Withdrawals above 8% annually risk depleting your corpus in 10-12 years, even with decent returns. Our calculator helps you test different withdrawal rates to find what works for your specific situation."
  },
  {
    question: "Can I increase my SWP amount over time for inflation?",
    answer: "Yes, absolutely. In fact, inflation-adjusting your SWP is essential for maintaining purchasing power. Most fund houses allow you to increase your SWP amount quarterly or annually. A common strategy: increase your SWP by 5-6% every year (matching inflation). Starting at ₹40,000/month, you'd increase to ₹42,400 next year, then ₹44,944, and so on. This ensures your withdrawals keep pace with rising living costs. Some retirees even implement a more aggressive review every 3 years rather than annually."
  }
];

export default function SWPCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/swp', 'SWP Calculator India FY 2026-27 | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "SWP Calculator - Systematic Withdrawal Plan",
    description: "Free SWP Calculator India FY 2026-27. Calculate how long your retirement corpus lasts with systematic monthly withdrawals. Plan tax-efficient retirement income through SWP.",
    url: "https://www.aitaxbot.co.in/calculators/swp",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.aitaxbot.co.in/" },
    { name: "Calculators", url: "https://www.aitaxbot.co.in/calculators" },
    { name: "SWP Calculator", url: "https://www.aitaxbot.co.in/calculators/swp" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>SWP Calculator India FY 2026-27 - Retirement Income Planning | AiTaxBot</title>
        <meta name="description" content="Free SWP Calculator India FY 2026-27. Calculate systematic withdrawals, corpus sustainability, and tax-efficient retirement income planning. See how long your corpus lasts with monthly SWP withdrawals." />
        <meta name="keywords" content="SWP calculator, systematic withdrawal plan, retirement income planning, mutual fund withdrawal, monthly pension calculator, corpus calculator, tax-efficient withdrawal, SWP LTCG tax, retirement planning India" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/calculators/swp" />
        <meta property="og:title" content="SWP Calculator India FY 2026-27 - Retirement Income Planning | AiTaxBot" />
        <meta property="og:description" content="Calculate systematic withdrawals and corpus longevity. Plan tax-efficient retirement income with SWP. See LTCG tax benefits vs FD interest." />
        <meta property="og:url" content="https://www.aitaxbot.co.in/calculators/swp" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="bg-card">

        <CalcPageHeader
          title="SWP Calculator — Systematic Withdrawal Planning"
          subtitle="Plan your monthly income from a mutual fund corpus. Find out how long your investment lasts and the minimum corpus for your target withdrawal."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Calculators", href: "/calculators" },
            { label: "SWP Calculator" }
          ]}
          badge="FY 2026-27 ✓"
        />

        {/* Calculator */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <SWPCalculator />
          </div>
        </section>

        {/* Misconception Buster */}
        <section className="py-6 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                ⚠️ Common SWP Misconception — Most Retirees Withdraw Too Much Too Fast
              </h3>
              <p className="text-red-700 mb-2">
                Most retirees withdraw too much too fast — the <strong>4% safe withdrawal rule (₹40,000/month on ₹1 Cr corpus)</strong>
                is a starting point but India's inflation of 6-7% means you need to plan corpus growth alongside withdrawal.
              </p>
              <p className="text-red-700">
                Withdrawing <strong>8%+ annually</strong> often depletes the corpus within 10-12 years, even with decent returns.
                Our SWP Calculator shows exactly how long your specific corpus will last — test different withdrawal rates and find
                the sustainable sweet spot that balances monthly income needs with long-term corpus longevity.
              </p>
            </div>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-12 px-6 bg-card">
          <div className="max-w-6xl mx-auto">

            <h2 className="text-2xl font-bold text-ink mb-6">Understanding SWP — Systematic Withdrawal Plan</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-ink mb-3">What is SWP?</h3>
                <p className="text-ink/65">
                  Systematic Withdrawal Plan (SWP) is a facility offered by mutual fund houses that allows you to withdraw a fixed
                  amount from your investment at regular intervals (monthly, quarterly, or annually). It's designed for retirees and
                  investors seeking regular income while keeping the majority of their corpus invested and growing. The remaining
                  investment continues to earn market returns, making SWP a powerful retirement income tool.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-ink mb-3">Who Should Use SWP?</h3>
                <p className="text-ink/65">
                  SWP is ideal for recent retirees needing monthly income, investors wanting to create cash flow from their corpus,
                  self-employed professionals with irregular income looking for steady withdrawals, and anyone seeking tax-efficient
                  retirement withdrawals. If you've invested a lump sum (from sale of property, inheritance, retirement corpus) and
                  need regular cash flow for 20+ years, SWP is perfect for you.
                </p>
              </div>
            </div>

            {/* How SWP Works */}
            <h2 className="text-2xl font-bold text-ink mb-4">How SWP Works</h2>
            <p className="text-ink/65 mb-4">
              SWP operates on a simple principle: invest a lump sum, set up automatic withdrawals, and let the remaining corpus grow.
              Here's the mechanics:
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-secondary border border-rule rounded-lg p-5">
                <h4 className="font-semibold text-ink mb-2">Step 1: Invest Corpus</h4>
                <p className="text-ink/65 text-sm">
                  Invest your lump sum (₹50L, ₹1Cr, etc.) in a mutual fund scheme. Choose balanced or equity funds for growth with
                  reasonable stability for retirement. The fund manager invests your money to generate returns.
                </p>
              </div>
              <div className="bg-secondary border border-rule rounded-lg p-5">
                <h4 className="font-semibold text-ink mb-2">Step 2: Set SWP Amount</h4>
                <p className="text-ink/65 text-sm">
                  Request fixed monthly/quarterly withdrawal (e.g., ₹40,000/month). The fund house automatically redeems units equal
                  to this amount and credits your bank account on a fixed date every month.
                </p>
              </div>
              <div className="bg-secondary border border-rule rounded-lg p-5">
                <h4 className="font-semibold text-ink mb-2">Step 3: Remaining Grows</h4>
                <p className="text-ink/65 text-sm">
                  Your remaining corpus (after withdrawal) stays invested and earns returns. If the fund returns 9% annually, your
                  remaining balance keeps growing despite monthly withdrawals, extending corpus longevity.
                </p>
              </div>
              <div className="bg-secondary border border-rule rounded-lg p-5">
                <h4 className="font-semibold text-ink mb-2">Step 4: Receive Withdrawals</h4>
                <p className="text-ink/65 text-sm">
                  Every month, you receive your fixed SWP amount. You can adjust it annually (increase by inflation, decrease if not
                  needed), pause it temporarily, or stop it anytime — full flexibility.
                </p>
              </div>
            </div>

            {/* SWP Tax Efficiency */}
            <h2 className="text-2xl font-bold text-ink mb-4">SWP Tax Efficiency — Why It Beats FD Interest</h2>
            <p className="text-ink/65 mb-4">
              SWP's biggest advantage is tax efficiency. Each withdrawal consists of two parts: cost basis (your original investment —
              tax-free) and capital gains (returns earned — taxed at favorable rates). This is far better than FD interest, which is
              fully taxable at your slab rate.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 border border-green-100 p-5 rounded-xl">
                <div className="text-2xl font-bold text-green-700 mb-1">FIFO Method</div>
                <div className="text-sm font-semibold text-ink/80 mb-2">Oldest units redeemed first</div>
                <p className="text-sm text-ink/65">Under FIFO (First In First Out), the oldest units held 1+ years are redeemed first, making them eligible for LTCG tax exemption (if held 1+ year). Early withdrawals are often LTCG-free.</p>
              </div>
              <div className="bg-secondary border border-rule p-5 rounded-xl">
                <div className="text-2xl font-bold text-ink mb-1">Equity SWP</div>
                <div className="text-sm font-semibold text-ink/80 mb-2">LTCG: 10% above ₹1L</div>
                <p className="text-sm text-ink/65">Equity funds held 1+ year: LTCG tax only 10% above ₹1L exemption limit. Example: ₹3L gains taxed only on ₹2L = ₹20,000 tax. Very tax-efficient.</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 p-5 rounded-xl">
                <div className="text-2xl font-bold text-orange-700 mb-1">vs FD Interest</div>
                <div className="text-sm font-semibold text-ink/80 mb-2">100% slab rate tax</div>
                <p className="text-sm text-ink/65">FD interest is fully taxable at your slab rate (20-30%). Same ₹3L interest taxed at 30% = ₹90,000 tax. SWP saves ₹70,000 in taxes!</p>
              </div>
            </div>

            {/* Worked Examples */}
            <h2 className="text-2xl font-bold text-ink mb-4">Worked Examples</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">

              <div className="bg-secondary border rounded-xl p-6">
                <h3 className="font-bold text-ink mb-3">Example 1 — ₹1 Cr Corpus, ₹40,000/Month SWP</h3>
                <div className="space-y-1 text-sm text-ink/80">
                  <div className="flex justify-between"><span>Initial Corpus:</span><span className="font-semibold">₹1,00,00,000</span></div>
                  <div className="flex justify-between"><span>Monthly Withdrawal:</span><span className="font-semibold">₹40,000</span></div>
                  <div className="flex justify-between"><span>Annual Withdrawal:</span><span className="font-semibold">₹4,80,000 (4.8%)</span></div>
                  <div className="flex justify-between"><span>Fund Type:</span><span className="font-semibold">Balanced Fund</span></div>
                  <div className="flex justify-between"><span>Expected Return:</span><span className="font-semibold">8% p.a.</span></div>
                  <div className="border-t border-rule my-2"></div>
                  <div className="flex justify-between"><span>Corpus Lasts:</span><span className="font-bold text-ink">~28 years</span></div>
                  <div className="flex justify-between"><span>Total Withdrawn:</span><span className="font-bold text-green-700">~₹1.34 Cr</span></div>
                  <div className="flex justify-between"><span>Tax on Gains:</span><span className="font-bold text-orange-700">~₹8-10 L only</span></div>
                  <div className="flex justify-between"><span>LTCG Tax Rate:</span><span className="font-bold text-ink">10% (equity, 1+ yr)</span></div>
                </div>
              </div>

              <div className="bg-secondary border rounded-xl p-6">
                <h3 className="font-bold text-ink mb-3">Example 2 — ₹50L Corpus, ₹25,000/Month SWP</h3>
                <div className="space-y-1 text-sm text-ink/80">
                  <div className="flex justify-between"><span>Initial Corpus:</span><span className="font-semibold">₹50,00,000</span></div>
                  <div className="flex justify-between"><span>Monthly Withdrawal:</span><span className="font-semibold">₹25,000</span></div>
                  <div className="flex justify-between"><span>Annual Withdrawal:</span><span className="font-semibold">₹3,00,000 (6%)</span></div>
                  <div className="flex justify-between"><span>Fund Type:</span><span className="font-semibold">Equity Fund (Conservative)</span></div>
                  <div className="flex justify-between"><span>Expected Return:</span><span className="font-semibold">9% p.a.</span></div>
                  <div className="border-t border-rule my-2"></div>
                  <div className="flex justify-between"><span>Corpus Lasts:</span><span className="font-bold text-ink">~27 years +</span></div>
                  <div className="flex justify-between"><span>Corpus Grows Till:</span><span className="font-bold text-green-700">~Year 20</span></div>
                  <div className="flex justify-between"><span>Peak Corpus Value:</span><span className="font-bold text-orange-700">~₹62 L (Year 20)</span></div>
                  <div className="flex justify-between"><span>Advantage:</span><span className="font-bold text-ink">Corpus grows initially!</span></div>
                </div>
              </div>

            </div>

            {/* Pro Tips */}
            <h2 className="text-2xl font-bold text-ink mb-4">Pro Tips on SWP — Make Your Retirement Last</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">1</span>
                <div>
                  <p className="font-semibold text-ink text-sm">Follow the 4% rule — don't withdraw more than 4-5% annually</p>
                  <p className="text-ink/65 text-sm mt-1">On ₹1 Cr corpus, limit withdrawals to ₹40,000-50,000/month. Withdrawing 8%+ depletes corpus in 10-12 years. Use our calculator to test sustainability before committing to SWP amount.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">2</span>
                <div>
                  <p className="font-semibold text-ink text-sm">Use equity funds for SWP, not debt — LTCG far lower than FD tax</p>
                  <p className="text-ink/65 text-sm mt-1">Equity SWP: LTCG 10% above ₹1L limit. Debt/FD interest: fully taxed at 20-30% slab. Equity SWP saves ₹60,000-80,000 annual tax on ₹50L corpus vs FD. Triple tax-efficient.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">3</span>
                <div>
                  <p className="font-semibold text-ink text-sm">Keep 2 years of expenses in liquid fund as buffer — don't touch equity SWP during crash</p>
                  <p className="text-ink/65 text-sm mt-1">During market downturns, SWP redeems more units to meet fixed withdrawal. Liquid buffer protects you from forced selling at market lows. Keep ₹4-5L liquid, take rest from SWP equity fund.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">4</span>
                <div>
                  <p className="font-semibold text-ink text-sm">Inflation-adjust your SWP every 3 years — increase withdrawal by 6-7%</p>
                  <p className="text-ink/65 text-sm mt-1">Start SWP at ₹40,000/month. In 3 years, increase to ₹47,600 (19% increase). Your purchasing power stays intact. Most fund houses allow online adjustments via portal or app.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">5</span>
                <div>
                  <p className="font-semibold text-ink text-sm">FIFO means older units redeemed first — most early redemptions are LTCG-exempt</p>
                  <p className="text-ink/65 text-sm mt-1">Under FIFO (fund house default), oldest units held 1+ year are redeemed. If you invested 3 years ago, first 3 years of SWP have zero tax! Capital comes out tax-free, only recent gains are taxed.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">6</span>
                <div>
                  <p className="font-semibold text-ink text-sm">Combine SWP + NPS pension + EPF for diversified retirement income streams</p>
                  <p className="text-ink/65 text-sm mt-1">Don't rely on SWP alone. Layer it: NPS annuity (₹15-20K/month) + SWP (₹40K/month) + EPF (₹25K/month) = ₹80K monthly income from multiple sources. Reduces concentration risk.</p>
                </div>
              </div>
            </div>

            {/* SWP vs FD vs Dividend Comparison */}
            <h2 className="text-2xl font-bold text-ink mb-4">SWP vs FD vs Dividend — Retirement Income Comparison</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary">
                    <th className="border border-rule p-3 text-left font-semibold">Factor</th>
                    <th className="border border-rule p-3 text-center font-semibold text-ink">SWP</th>
                    <th className="border border-rule p-3 text-center font-semibold text-orange-700">FD Interest</th>
                    <th className="border border-rule p-3 text-center font-semibold text-ink">Dividend</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-rule p-3 text-ink/80">Expected Return</td>
                    <td className="border border-rule p-3 text-center font-semibold">8-10% p.a.</td>
                    <td className="border border-rule p-3 text-center">6-7% p.a.</td>
                    <td className="border border-rule p-3 text-center">2-4% p.a.</td>
                  </tr>
                  <tr className="bg-secondary">
                    <td className="border border-rule p-3 text-ink/80">Tax Treatment</td>
                    <td className="border border-rule p-3 text-center">LTCG 10% (equity)</td>
                    <td className="border border-rule p-3 text-center">Slab rate (20-30%)</td>
                    <td className="border border-rule p-3 text-center">DDT / LTCG / Slab</td>
                  </tr>
                  <tr>
                    <td className="border border-rule p-3 text-ink/80">Post-Tax Income on ₹50L</td>
                    <td className="border border-rule p-3 text-center font-bold text-green-700">~₹36-38K/mo</td>
                    <td className="border border-rule p-3 text-center">~₹26-28K/mo</td>
                    <td className="border border-rule p-3 text-center">~₹8-12K/mo</td>
                  </tr>
                  <tr className="bg-secondary">
                    <td className="border border-rule p-3 text-ink/80">Predictability</td>
                    <td className="border border-rule p-3 text-center">High (fixed amount)</td>
                    <td className="border border-rule p-3 text-center">Very High</td>
                    <td className="border border-rule p-3 text-center">Low (uncertain)</td>
                  </tr>
                  <tr>
                    <td className="border border-rule p-3 text-ink/80">Remaining Corpus Growth</td>
                    <td className="border border-rule p-3 text-center font-semibold text-ink">Yes, keeps growing</td>
                    <td className="border border-rule p-3 text-center">Yes, modest</td>
                    <td className="border border-rule p-3 text-center">Yes, strong</td>
                  </tr>
                  <tr className="bg-secondary">
                    <td className="border border-rule p-3 text-ink/80">Flexibility</td>
                    <td className="border border-rule p-3 text-center font-semibold">Fully flexible</td>
                    <td className="border border-rule p-3 text-center">No early exit</td>
                    <td className="border border-rule p-3 text-center">Flexible</td>
                  </tr>
                  <tr>
                    <td className="border border-rule p-3 text-ink/80">Ideal For</td>
                    <td className="border border-rule p-3 text-center">Retirees, 20+ yrs</td>
                    <td className="border border-rule p-3 text-center">Safety-first, short-term</td>
                    <td className="border border-rule p-3 text-center">Growth + income mix</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SWP Sustainability Table */}
            <h2 className="text-2xl font-bold text-ink mb-2">SWP Sustainability Table — How Long Does Your Corpus Last? (at 9% p.a.)</h2>
            <p className="text-ink/65 mb-4">
              The most critical question in SWP planning: will my money outlast me? This table shows how many years a given corpus lasts
              at different monthly withdrawal amounts, assuming 9% annual return.
              "∞" means the corpus never depletes — the return keeps pace with withdrawals.
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ink text-white">
                    <th className="border border-ink p-3 text-left font-semibold">Corpus</th>
                    <th className="border border-ink p-3 text-center font-semibold">₹20K/mo</th>
                    <th className="border border-ink p-3 text-center font-semibold">₹30K/mo</th>
                    <th className="border border-ink p-3 text-center font-semibold">₹40K/mo</th>
                    <th className="border border-ink p-3 text-center font-semibold">₹50K/mo</th>
                    <th className="border border-ink p-3 text-center font-semibold">₹75K/mo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-rule p-3 font-semibold text-ink">₹30 Lakh</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-ink/80">16 yrs</td>
                    <td className="border border-rule p-3 text-center text-red-600">9 yrs</td>
                    <td className="border border-rule p-3 text-center text-red-600">7 yrs</td>
                    <td className="border border-rule p-3 text-center text-red-600">4 yrs</td>
                  </tr>
                  <tr className="bg-secondary">
                    <td className="border border-rule p-3 font-semibold text-ink">₹50 Lakh</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-ink font-semibold">31 yrs</td>
                    <td className="border border-rule p-3 text-center text-ink/80">16 yrs</td>
                    <td className="border border-rule p-3 text-center text-red-600">8 yrs</td>
                  </tr>
                  <tr>
                    <td className="border border-rule p-3 font-semibold text-ink">₹75 Lakh</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-ink font-semibold">16 yrs</td>
                  </tr>
                  <tr className="bg-secondary">
                    <td className="border border-rule p-3 font-semibold text-ink">₹1 Crore</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                  </tr>
                  <tr>
                    <td className="border border-rule p-3 font-semibold text-ink">₹1.5 Crore</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-bold">∞</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink/55 mb-8">*At 9% annual return. "∞" = corpus never depletes. Green = safe zone. Red = corpus depletes in retirement. Target: always aim for ∞ or 30+ years.</p>

            {/* How Much Corpus Do I Need */}
            <h2 className="text-2xl font-bold text-ink mb-2">How Much Corpus Do I Need for My Target Monthly Income?</h2>
            <p className="text-ink/65 mb-4">
              Planning your retirement SWP in reverse: if you know how much monthly income you need, here's the corpus required to sustain it for 30 years at 9% annual return.
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ink text-paper">
                    <th className="border border-rule p-3 text-left font-semibold">Monthly Income Target</th>
                    <th className="border border-rule p-3 text-center font-semibold">Corpus Needed (30 yrs)</th>
                    <th className="border border-rule p-3 text-center font-semibold">Monthly SIP to Build This</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-rule p-3 font-semibold text-ink">₹20,000/month</td>
                    <td className="border border-rule p-3 text-center text-ink/80">₹24.9 Lakh</td>
                    <td className="border border-rule p-3 text-center text-ink">₹2,500/mo for 25 years</td>
                  </tr>
                  <tr className="bg-secondary">
                    <td className="border border-rule p-3 font-semibold text-ink">₹30,000/month</td>
                    <td className="border border-rule p-3 text-center text-ink/80">₹37.3 Lakh</td>
                    <td className="border border-rule p-3 text-center text-ink">₹4,000/mo for 25 years</td>
                  </tr>
                  <tr>
                    <td className="border border-rule p-3 font-semibold text-ink">₹40,000/month</td>
                    <td className="border border-rule p-3 text-center text-ink/80">₹49.7 Lakh</td>
                    <td className="border border-rule p-3 text-center text-ink">₹5,300/mo for 25 years</td>
                  </tr>
                  <tr className="bg-secondary">
                    <td className="border border-rule p-3 font-semibold text-ink">₹50,000/month</td>
                    <td className="border border-rule p-3 text-center font-semibold text-ink/80">₹62.1 Lakh</td>
                    <td className="border border-rule p-3 text-center text-ink">₹6,600/mo for 25 years</td>
                  </tr>
                  <tr>
                    <td className="border border-rule p-3 font-semibold text-ink">₹75,000/month</td>
                    <td className="border border-rule p-3 text-center font-semibold text-ink/80">₹93.2 Lakh</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-semibold">₹9,900/mo for 25 years</td>
                  </tr>
                  <tr className="bg-secondary">
                    <td className="border border-rule p-3 font-semibold text-ink">₹1,00,000/month</td>
                    <td className="border border-rule p-3 text-center font-bold text-green-700">₹1.24 Crore</td>
                    <td className="border border-rule p-3 text-center text-green-700 font-semibold">₹13,200/mo for 25 years</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-paper border border-rule rounded-lg p-4 mb-8">
              <p className="text-sm text-ink">
                <strong>Planning tip:</strong> Start your SIP today, accumulate the corpus, then switch to SWP at retirement.
                A ₹5,000/month SIP for 25 years at 12% p.a. builds ₹94.88L — enough to fund ₹75,000/month SWP for retirement.
                Use our <Link href="/calculators/sip" className="underline font-medium">SIP Calculator</Link> to plan your accumulation phase.
              </p>
            </div>

            {/* FAQs */}
            <h2 className="text-2xl font-bold text-ink mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {swpFAQs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-ink mb-2">{faq.question}</h4>
                  <p className="text-ink/65">{faq.answer}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <FAQSchema faqs={swpFAQs} />
        <AuthorBox />

        {/* Ads */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <ResponsiveAd />
          <RectangleAd />
        </div>

        {/* Related Calculators */}
        <section className="py-12 px-6 bg-secondary">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-ink mb-2">Related Tax & Retirement Calculators</h2>
            <p className="text-ink/65 mb-6">
              Build your retirement corpus with SIP, then plan withdrawals with SWP. Layer NPS pension and EPF for complete retirement strategy.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/sip">
                <div className="p-4 bg-card rounded-lg border hover:border-credit hover:shadow transition-all">
                  <h3 className="font-semibold text-ink mb-1">SIP Calculator</h3>
                  <p className="text-sm text-ink/65">Build retirement corpus through systematic monthly investing</p>
                </div>
              </Link>
              <Link href="/calculators/nps">
                <div className="p-4 bg-card rounded-lg border hover:border-credit hover:shadow transition-all">
                  <h3 className="font-semibold text-ink mb-1">NPS Calculator</h3>
                  <p className="text-sm text-ink/65">Calculate NPS corpus and tax-free lump sum at retirement</p>
                </div>
              </Link>
              <Link href="/calculators/pf">
                <div className="p-4 bg-card rounded-lg border hover:border-green-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-ink mb-1">PF Calculator</h3>
                  <p className="text-sm text-ink/65">Add EPF + VPF growth to your retirement planning</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-paper rounded-lg border border-rule hover:shadow transition-all">
                  <h3 className="font-semibold text-ink mb-1">All Calculators</h3>
                  <p className="text-sm text-ink">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Lead Capture + CA Banner */}
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <LeadCaptureForm source="SWP Calculator" />
          <FindCABanner context="planning retirement income" />
        </div>
      </div>
    </>
  );
}

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
import SIPCalculator from '@/components/calculators/SIPCalculator';

const sipFAQs = [
  {
    question: "What is rupee cost averaging in SIP?",
    answer: "Rupee cost averaging is the strategy of investing a fixed amount regularly, regardless of market conditions. In SIP, you buy more mutual fund units when prices are low and fewer when prices are high, automatically averaging your purchase cost over time. This eliminates the need to time the market and reduces the impact of market volatility on your investment."
  },
  {
    question: "Do I have to pay LTCG tax on SIP mutual fund returns?",
    answer: "Yes, Long-Term Capital Gains (LTCG) tax applies to equity fund redemptions after 1 year. The tax is 10% on gains above ₹1.25 lakh per financial year. For debt funds held over 2 years, LTCG is taxed at your slab rate with indexation benefit. Plan your SIP redemptions across multiple financial years to keep gains below ₹1.25L and minimize tax liability."
  },
  {
    question: "What is step-up SIP and how does it work?",
    answer: "Step-up SIP allows you to increase your monthly SIP amount periodically (usually annually) by a fixed percentage, typically matching your salary hike. For example, a ₹5,000/month SIP with 10% annual step-up becomes ₹5,500 in year 2, ₹6,050 in year 3, and so on. This helps your wealth accumulate faster as your income grows, maximizing the power of compounding."
  },
  {
    question: "Are equity funds or debt funds better for SIP?",
    answer: "Equity fund SIPs historically return 12-15% annually over 10+ years, making them superior for long-term wealth creation. Debt funds return 7-9% but are more stable with lower volatility. For SIP, equity funds are better if you have a 10+ year horizon, as rupee cost averaging reduces the impact of market volatility. Younger investors should prefer equity SIPs; those near retirement can mix both."
  },
  {
    question: "Can I stop or pause my SIP anytime without penalty?",
    answer: "Yes, SIPs are completely flexible with zero lock-in period. You can pause, stop, or restart your SIP anytime without any penalties or charges. However, stopping too early reduces compounding benefits. It's recommended to stay invested for at least 5-7 years for equity funds to ride out market cycles and benefit from the rupee cost averaging advantage."
  },
  {
    question: "Is SIP better than lump sum investing? Which should I choose?",
    answer: "SIP is better if you don't have a large sum available upfront, want to reduce timing risk, or prefer disciplined investing. Lump sum investing is better if you have capital available and the market is near a low point. For most salaried employees, SIP is ideal because it builds the habit of regular investing and protects against investing at market peaks. Data shows SIP beats lump sum in 80% of scenarios over 10+ years due to rupee cost averaging."
  }
];

export default function SIPCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/sip', 'SIP Calculator India FY 2026-27 | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "SIP Calculator - Systematic Investment Plan",
    description: "Free SIP Calculator India FY 2026-27. Calculate Systematic Investment Plan mutual fund returns with compounding. Plan monthly SIP investments for wealth creation with tax planning.",
    url: "https://aitaxbot.co.in/calculators/sip",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.co.in/" },
    { name: "Calculators", url: "https://aitaxbot.co.in/calculators" },
    { name: "SIP Calculator", url: "https://aitaxbot.co.in/calculators/sip" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>SIP Calculator India FY 2026-27 - Mutual Fund Returns & Tax Planning | AiTaxBot</title>
        <meta name="description" content="Free SIP Calculator India FY 2026-27. Calculate Systematic Investment Plan mutual fund returns with LTCG tax planning. Rupee cost averaging, step-up SIP, and wealth creation calculator." />
        <meta name="keywords" content="SIP calculator, systematic investment plan, mutual fund calculator, SIP returns, rupee cost averaging, step-up SIP, LTCG tax on SIP, wealth creation, SIP vs lump sum, investment planning India" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators/sip" />
        <meta property="og:title" content="SIP Calculator India FY 2026-27 - Mutual Fund Returns & Tax Planning" />
        <meta property="og:description" content="Calculate your Systematic Investment Plan returns with LTCG tax planning, rupee cost averaging, and step-up SIP strategies. Free SIP calculator for FY 2026-27." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators/sip" />
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
              <Link href="/" className="hover:text-persian-blue-600">Home</Link>
              <span>/</span>
              <Link href="/calculators" className="hover:text-persian-blue-600">Calculators</Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">SIP Calculator</span>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              SIP Calculator India — Mutual Fund Returns FY 2026-27
            </h1>
            <p className="text-lg text-white/90 max-w-3xl">
              Calculate your Systematic Investment Plan (SIP) mutual fund returns with rupee cost averaging,
              LTCG tax planning, and step-up SIP strategies. See how small, regular investments compound into
              significant wealth. CA verified and updated for FY 2026-27.
            </p>
          </div>
        </section>

        {/* Calculator */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <SIPCalculator />
          </div>
        </section>

        {/* Misconception Buster */}
        <section className="py-6 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                ⚠️ Common SIP Misconception — Most Investors Don't Plan for LTCG Tax
              </h3>
              <p className="text-red-700 mb-2">
                Most SIP investors focus only on returns and ignore capital gains tax (LTCG). When equity funds
                are redeemed after 1 year, <strong>10% LTCG tax applies on gains above ₹1.25 lakh per financial year</strong>.
              </p>
              <p className="text-red-700">
                A ₹50 lakh SIP corpus with ₹30 lakh gains could mean ₹1.7+ lakh in tax if redeemed in one year.
                But by spreading redemptions across 2-3 financial years (₹10-15 lakh gains/year), you stay under
                ₹1.25L limit in each year and pay <strong>zero LTCG tax</strong>. Plan your exit strategy now, not at maturity.
              </p>
            </div>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Understanding SIP Investment</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What is SIP?</h3>
                <p className="text-slate-600">
                  Systematic Investment Plan (SIP) is a disciplined method of investing a fixed amount regularly
                  in mutual funds. Instead of trying to time the market with a lump sum, you invest small amounts
                  monthly, making wealth creation accessible to everyone and eliminating the stress of market timing.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Who Should Invest in SIP?</h3>
                <p className="text-slate-600">
                  SIP is ideal for salaried employees who want disciplined wealth creation, young professionals
                  with 10+ year investment horizon, self-employed professionals seeking market-linked returns,
                  and anyone who wants to avoid the stress of lump sum timing. SIP is perfect for anyone wanting
                  to build wealth without needing a large upfront investment.
                </p>
              </div>
            </div>

            {/* How SIP Compounding Works */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How SIP Compounding Works</h2>
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl mb-8">
              <div className="font-mono text-slate-900 font-semibold mb-3">
                FV = P × [((1 + r)^n - 1) / r] × (1 + r)
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <div><strong>Where:</strong></div>
                <div><strong>FV</strong> = Future Value (final corpus)</div>
                <div><strong>P</strong> = Monthly SIP amount</div>
                <div><strong>r</strong> = Monthly return rate (annual rate ÷ 12)</div>
                <div><strong>n</strong> = Total months (years × 12)</div>
              </div>
              <p className="text-sm text-slate-600 mt-4">
                Example: ₹5,000/month for 20 years at 12% annual return = ₹48+ lakh corpus.
                Your ₹12L investment grows nearly 4x through compounding!
              </p>
            </div>

            {/* Worked Examples */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">SIP Growth Examples</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">

              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 1 — Regular SIP for 20 Years</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Monthly SIP:</span><span className="font-semibold">₹5,000</span></div>
                  <div className="flex justify-between"><span>Investment Period:</span><span className="font-semibold">20 years</span></div>
                  <div className="flex justify-between"><span>Expected Return:</span><span className="font-semibold">12% p.a.</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>Total Invested:</span><span className="font-bold text-blue-700">₹12,00,000</span></div>
                  <div className="flex justify-between"><span>Capital Gains:</span><span className="font-bold text-green-700">₹36,00,000</span></div>
                  <div className="flex justify-between"><span>Final Corpus:</span><span className="font-bold text-purple-700">₹48,00,000</span></div>
                  <div className="flex justify-between"><span>LTCG Tax (if redeemed in 1 yr):</span><span className="font-bold text-orange-700">~₹2,10,000</span></div>
                  <div className="flex justify-between"><span className="text-xs">Tax with 3-year spread:</span><span className="font-bold text-green-700 text-xs">₹0 tax</span></div>
                </div>
              </div>

              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 2 — Step-up SIP (10% Annual Increase)</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Starting SIP:</span><span className="font-semibold">₹5,000/month</span></div>
                  <div className="flex justify-between"><span>Step-up (annual):</span><span className="font-semibold">+10%/year</span></div>
                  <div className="flex justify-between"><span>Investment Period:</span><span className="font-semibold">15 years</span></div>
                  <div className="flex justify-between"><span>Expected Return:</span><span className="font-semibold">12% p.a.</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>Total Invested:</span><span className="font-bold text-blue-700">₹12,34,000</span></div>
                  <div className="flex justify-between"><span>Capital Gains:</span><span className="font-bold text-green-700">₹25,66,000</span></div>
                  <div className="flex justify-between"><span>Final Corpus:</span><span className="font-bold text-purple-700">₹38,00,000</span></div>
                  <div className="flex justify-between"><span>Benefit vs Regular:</span><span className="font-bold text-orange-700">+₹2L growth</span></div>
                </div>
              </div>

            </div>

            {/* Pro Tips */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Pro Tips on SIP — Maximize Your Wealth</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">1</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Start SIP as early as possible</p>
                  <p className="text-slate-600 text-sm mt-1">₹500/month SIP started at age 25 grows to ₹1.5+ Cr by 60 at 12% returns. Start the same at 35 and you get only ₹38 lakh. Time is your biggest asset — even small amounts invested early beat large amounts invested late.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">2</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Never stop SIP during market downturns</p>
                  <p className="text-slate-600 text-sm mt-1">When market falls 20-30%, fund prices drop. Keep investing — you're buying units cheap! Market recoveries reward long-term investors. Those who stopped SIP in 2020 COVID crash missed 50%+ returns that followed.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">3</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Use step-up SIP with salary hikes</p>
                  <p className="text-slate-600 text-sm mt-1">Every time your salary increases, step-up your SIP by the same percentage. A ₹5,000 SIP stepped-up 10% annually becomes ₹12,900 by year 15 — without changing your lifestyle, you've multiplied your wealth creation speed.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">4</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Plan LTCG tax — spread redemptions across years</p>
                  <p className="text-slate-600 text-sm mt-1">Redeem ₹10-15 lakh per year to keep gains under ₹1.25L per financial year and pay zero LTCG tax. Redeem everything in one year and you could pay 10% tax on the full surplus. Tax planning can save ₹50,000-₹200,000+ on a mature corpus.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">5</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Use index funds for core portfolio</p>
                  <p className="text-slate-600 text-sm mt-1">Index funds (Nifty 50, Sensex) have expense ratios of 0.1-0.3% vs 1-2% for active funds. Over 20 years, this 1.5% difference adds up to 20%+ extra wealth. Use 70% index funds for core, 30% active for alpha.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">6</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Don't chase past returns — consistency beats timing</p>
                  <p className="text-slate-600 text-sm mt-1">A fund that returned 25% last year might return 5% next year. Instead of switching chasing returns, pick a good fund and stay invested. Consistent ₹5,000/month SIP beats trying to time entry with ₹50,000 lumps.</p>
                </div>
              </div>
            </div>

            {/* SIP vs Lump Sum Comparison */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">SIP vs Lump Sum — When to Choose What</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-3 text-left font-semibold">Factor</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-blue-700">SIP</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-green-700">Lump Sum</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Capital Required</td>
                    <td className="border border-slate-200 p-3 text-center">Small amounts (₹500+/month)</td>
                    <td className="border border-slate-200 p-3 text-center">Large corpus needed upfront</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Market Timing Risk</td>
                    <td className="border border-slate-200 p-3 text-center">None — rupee cost averaging eliminates timing</td>
                    <td className="border border-slate-200 p-3 text-center">High — invest peak = lower returns</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Returns (10-year bull market)</td>
                    <td className="border border-slate-200 p-3 text-center">8.5% annualized (reduced timing risk)</td>
                    <td className="border border-slate-200 p-3 text-center">12% annualized (invested from start)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Psychological Stress</td>
                    <td className="border border-slate-200 p-3 text-center">Low — regular investing is mechanical</td>
                    <td className="border border-slate-200 p-3 text-center">High — worry about entry price</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Discipline Required</td>
                    <td className="border border-slate-200 p-3 text-center">High — automate & stay invested</td>
                    <td className="border border-slate-200 p-3 text-center">Medium — one-time decision</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Best For</td>
                    <td className="border border-slate-200 p-3 text-center">Salaried, young investors, no lump sum</td>
                    <td className="border border-slate-200 p-3 text-center">Large inheritance, bonus, market at bottom</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Average Success Rate</td>
                    <td className="border border-slate-200 p-3 text-center">80% beat lump sum in 10+ years</td>
                    <td className="border border-slate-200 p-3 text-center">Depends on entry point timing</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SIP Returns Table */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">SIP Returns Table — How Much Will ₹1,000/Month Grow? (at 12% p.a.)</h2>
            <p className="text-slate-600 mb-4">
              One of the most searched questions in India: "If I invest ₹5,000/month in SIP for 10 years, how much will I get?" This table answers it instantly.
              All values assume 12% annual return (historical Nifty 50 average). Actual returns may vary.
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="border border-blue-600 p-3 text-left font-semibold">Monthly SIP</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">5 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">10 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">15 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">20 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">25 Years</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹1,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹82,486</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹2.32 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹5.05 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹9.99 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹18.98 L</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹2,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹1.65 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹4.65 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹10.10 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹19.98 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹37.95 L</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹5,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹4.12 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹11.62 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹25.23 L</td>
                    <td className="border border-slate-200 p-3 text-center text-blue-700 font-semibold">₹49.96 L</td>
                    <td className="border border-slate-200 p-3 text-center text-purple-700 font-semibold">₹94.88 L</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹10,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹8.25 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹23.23 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹50.46 L</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹1.00 Cr 🎯</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹1.90 Cr</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹20,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹16.49 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹46.47 L</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹1.01 Cr 🎯</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹1.99 Cr</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹3.79 Cr</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mb-8">*Assumes 12% annual return, compounded monthly. Past performance does not guarantee future returns. LTCG tax applicable on equity fund gains above ₹1.25L/year.</p>

            {/* How Much SIP to Reach ₹1 Crore */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">How Much SIP Do I Need to Reach ₹1 Crore?</h2>
            <p className="text-slate-600 mb-4">
              ₹1 crore is the most searched SIP goal in India. The answer depends entirely on <strong>how many years you have</strong>.
              The earlier you start, the smaller the monthly investment needed — this is the power of compounding in action.
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="border border-indigo-600 p-3 text-left font-semibold">Time Horizon</th>
                    <th className="border border-indigo-600 p-3 text-center font-semibold">Monthly SIP Needed</th>
                    <th className="border border-indigo-600 p-3 text-center font-semibold">Total Invested</th>
                    <th className="border border-indigo-600 p-3 text-center font-semibold">Total Gains</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">10 Years</td>
                    <td className="border border-slate-200 p-3 text-center text-red-700 font-bold">₹43,041/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹51.65 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹48.35 L</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">15 Years</td>
                    <td className="border border-slate-200 p-3 text-center text-orange-700 font-bold">₹19,819/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹35.67 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹64.33 L</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">20 Years</td>
                    <td className="border border-slate-200 p-3 text-center text-blue-700 font-bold">₹10,009/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹24.02 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹75.98 L</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">25 Years</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹5,270/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹15.81 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹84.19 L</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">30 Years</td>
                    <td className="border border-slate-200 p-3 text-center text-purple-700 font-bold">₹2,833/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹10.20 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹89.80 L</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-8">
              <p className="text-sm text-indigo-900">
                <strong>Key insight:</strong> Starting 10 years earlier reduces your required monthly SIP by 83% — from ₹43,041 to ₹5,270.
                In other words, time in the market is worth 4× more than the amount you invest. The best time to start a SIP was yesterday. The second best time is today.
              </p>
            </div>

            {/* FAQs */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {sipFAQs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <FAQSchema faqs={sipFAQs} />
        <AuthorBox />

        {/* Ads */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <ResponsiveAd />
          <RectangleAd />
        </div>

        {/* Related Calculators */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Related Investment & Retirement Calculators</h2>
            <p className="text-slate-600 mb-6">
              Plan your complete investment journey — combine SIP with NPS, EPF, SWP and smart tax planning for maximum wealth creation.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/swp">
                <div className="p-4 bg-white rounded-lg border hover:border-purple-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SWP Calculator</h3>
                  <p className="text-sm text-slate-600">Plan systematic withdrawals from your SIP corpus in retirement</p>
                </div>
              </Link>
              <Link href="/calculators/nps">
                <div className="p-4 bg-white rounded-lg border hover:border-indigo-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">NPS Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate NPS corpus, pension and ₹50,000 extra tax saving</p>
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
              © 2026 AiTaxBot. All rights reserved. | SIP Calculator — Systematic Investment Plan
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}

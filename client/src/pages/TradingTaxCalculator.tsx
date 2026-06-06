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
import TradingTaxCalculator from '@/components/calculators/TradingTaxCalculator';

const tradingFAQs = [
  {
    question: "Is profit from selling US stocks (via INDmoney or Vested) taxable in India?",
    answer: "Yes. As an Indian tax resident, you must declare and pay tax on all global income, including gains from US stocks traded on platforms like INDmoney, Vested, or Stockal. Short-term capital gains (held less than 24 months) are taxed at your applicable income tax slab rate. Long-term capital gains (held 24 months or more) are taxed at 12.5% without indexation under Section 112A / §128 of ITA 2025, introduced by the Finance Act 2024."
  },
  {
    question: "Which USD/INR exchange rate should I use for US stock capital gains calculation?",
    answer: "Use the RBI/FBIL reference rate on the date of purchase (buy) and the date of sale (sell). The cost in INR = quantity × buy price USD × RBI rate on buy date. The sale consideration in INR = quantity × sell price USD × RBI rate on sell date. Capital gain = INR sale proceeds minus INR cost of acquisition. This calculator auto-fetches historical rates from the ECB/Frankfurter API for convenience, but always cross-verify with official FBIL rates at fbil.org.in for final ITR filing."
  },
  {
    question: "What is the LTCG threshold for US stocks — 12 months or 24 months?",
    answer: "24 months. Unlike domestic listed equity shares (where LTCG applies after 12 months), US stocks are classified as foreign equity which are unlisted securities for Indian tax purposes. The long-term holding period for unlisted securities is 24 months (2 years). If you held US stocks for less than 24 months, the entire gain is Short-Term Capital Gain (STCG) taxable at your slab rate."
  },
  {
    question: "How is dividend from US stocks taxed in India?",
    answer: "US companies withhold 25% tax on dividends paid to Indian residents under the India-USA DTAA (Double Tax Avoidance Agreement). In India, this dividend is added to your total income and taxed at slab rates under 'Income from Other Sources'. However, you can claim a Foreign Tax Credit (FTC) for the 25% US withholding tax by filing Form 67 before submitting your ITR. This prevents double taxation — you pay the higher of the two tax rates, not both."
  },
  {
    question: "Is Indian F&O (Futures & Options) trading income treated as capital gains?",
    answer: "No. Indian F&O income is non-speculative business income under the proviso to Section 43(5) of the Income Tax Act, 1961. It is taxed at your applicable income tax slab rate. There is no flat rate; if your total income (including F&O profit) exceeds the basic exemption limit, you pay tax as per the applicable slab. Importantly, F&O losses can be set off against any business income (except salary) and carried forward for up to 8 years."
  },
  {
    question: "What is 'turnover' for F&O trading and when does the tax audit apply?",
    answer: "For F&O trading, turnover is the absolute sum of all profits and losses — not net P&L. Example: Trade 1 = +₹50,000, Trade 2 = −₹30,000, Trade 3 = +₹80,000. Turnover = ₹50,000 + ₹30,000 + ₹80,000 = ₹1,60,000 (not ₹1,00,000 net). A tax audit under Section 44AB is mandatory if your F&O turnover exceeds ₹10 crore (or ₹1 crore if profit is less than 6% of turnover). You need to maintain books of accounts and file ITR-3."
  },
  {
    question: "What is Schedule FA and do I need to disclose my US stocks there?",
    answer: "Schedule FA (Foreign Assets) must be disclosed in your ITR if you hold any foreign assets at any time during the year — even if you made no gains. You must report US stocks held on December 31 of the relevant tax year, including the cost of acquisition, peak value, and closing value. Non-disclosure of foreign assets is treated as a violation of the Black Money (Undisclosed Foreign Income and Assets) Act, 2015, with a penalty of ₹10 lakh per account. Always disclose, even if value is small."
  },
  {
    question: "Which ITR form should I use if I have US stock gains and Indian F&O income?",
    answer: "If you have US stock capital gains only, file ITR-2. If you have Indian F&O income (which is business income), file ITR-3 — this is mandatory even if F&O was your only income. If you have both US stocks AND F&O, file ITR-3. ITR-1 cannot be used if you have capital gains from foreign assets or business income. Also file Form 67 (for Foreign Tax Credit on US dividend withholding) before submitting the ITR."
  }
];

export default function TradingTaxCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/trading-tax', 'US Stock & F&O Trading Tax Calculator India FY 2025-26 | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "US Stock & F&O Trading Tax Calculator India",
    description: "Free trading tax calculator for Indian investors. Compute capital gains tax on US stocks (LTCG/STCG with FX conversion), F&O income tax, US dividend DTAA credit, and compliance checklist for ITR filing.",
    url: "https://www.aitaxbot.co.in/calculators/trading-tax",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.aitaxbot.co.in/" },
    { name: "Calculators", url: "https://www.aitaxbot.co.in/calculators" },
    { name: "Trading Tax Calculator", url: "https://www.aitaxbot.co.in/calculators/trading-tax" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>US Stock & F&O Trading Tax Calculator India FY 2025-26 | AiTaxBot</title>
        <meta name="description" content="Free trading tax calculator for Indian investors. Calculate capital gains tax on US stocks (INDmoney/Vested) with automatic USD/INR conversion, F&O business income tax, US dividend DTAA credit, and ITR form selector. CA verified." />
        <meta name="keywords" content="US stock tax India, trading tax calculator, F&O tax calculator, INDmoney tax, Vested tax India, LTCG US stocks, STCG US stocks, forex trading tax India, dividend DTAA India, Schedule FA, ITR-3 F&O, capital gains tax India 2025" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators/trading-tax" />
        <meta property="og:title" content="US Stock & F&O Trading Tax Calculator India FY 2025-26 | AiTaxBot" />
        <meta property="og:description" content="Calculate tax on US stocks, F&O, dividends & forex trading. Auto USD/INR rate fetch, DTAA credit, Schedule FA guide, ITR form selector. Free, CA verified." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators/trading-tax" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-slate-50">

        <CalcPageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Calculators", href: "/calculators" },
            { label: "Trading Tax Calculator" }
          ]}
          title="US Stock & F&O Trading Tax Calculator"
          subtitle="Calculate capital gains tax on US stocks, F&O income, dividends & forex trading for Indian residents. Auto-fetches historical USD/INR rates."
          badge="FY 2025-26 · AY 2026-27"
        />

        {/* SEO intro paragraph */}
        <section className="py-6 px-6 bg-white border-b border-slate-100">
          <div className="max-w-4xl mx-auto">
            <p className="text-slate-700 leading-relaxed">
              Indians investing in US markets through platforms like INDmoney, Vested, and Stockal face a
              complex tax calculation challenge at ITR filing time. Every trade requires USD-to-INR conversion
              using the RBI/FBIL reference rate on the exact buy and sell date, the holding period determines
              whether gains are short-term (slab rate) or long-term (12.5% flat after 24 months), and US
              dividend withholding tax must be claimed as Foreign Tax Credit via Form 67. This calculator
              handles all five categories of trading income — US Stocks &amp; ETFs, US Dividends, Indian
              F&amp;O, US F&amp;O/Options, and Forex — in one place, with automatic exchange rate fetching
              and a compliance checklist to ensure you file the right ITR form.
            </p>
          </div>
        </section>

        {/* Main calculator widget */}
        <section className="py-10 px-4 md:px-6">
          <div className="max-w-5xl mx-auto">
            <TradingTaxCalculator />
          </div>
        </section>

        {/* Ad unit */}
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-center">
          <ResponsiveAd />
        </div>

        {/* Tax reference table */}
        <section className="py-12 px-6 bg-white border-y border-slate-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Trading Income Tax Rates at a Glance — FY 2025-26</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border border-slate-200">Income Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border border-slate-200">Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border border-slate-200">Holding Period</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border border-slate-200">Tax Rate</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border border-slate-200">ITR Form</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">US Stocks &amp; ETFs (STCG)</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Capital Gains</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Less than 24 months</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Slab rate</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">ITR-2</td>
                  </tr>
                  <tr className="bg-slate-50 border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">US Stocks &amp; ETFs (LTCG)</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Capital Gains</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">24 months or more</td>
                    <td className="px-4 py-3 font-semibold text-blue-700 border border-slate-200">12.5% (no indexation)</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">ITR-2</td>
                  </tr>
                  <tr className="border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">US Dividends</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Other Sources</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">N/A</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Slab rate (DTAA credit for 25% US WHT)</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">ITR-2 + Form 67</td>
                  </tr>
                  <tr className="bg-slate-50 border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">Indian F&amp;O</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Business Income</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">N/A</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Slab rate (non-speculative business)</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">ITR-3</td>
                  </tr>
                  <tr className="border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">US F&amp;O / Options</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Business Income</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">N/A</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Slab rate</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">ITR-3</td>
                  </tr>
                  <tr className="bg-slate-50 border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">Forex (Exchange)</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Capital Gains</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Based on holding period</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">STCG: slab / LTCG: 20% + indexation</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">ITR-2</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              * Rates applicable for Indian tax residents under ITA 1961 for FY 2025-26. LTCG rate of 12.5% introduced by Finance Act 2024 (effective July 23, 2024 for listed assets, applicable to all foreign equity per Finance Act 2024 amendments). Surcharge and cess apply on final tax liability.
            </p>
          </div>
        </section>

        {/* FX conversion guide */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How USD/INR Conversion Works for US Stock Tax</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              The most confusing part of taxing US stock gains is the currency conversion. India's income tax law
              requires you to convert both the purchase price and sale price to Indian Rupees using the
              RBI/FBIL Telegraphic Transfer (TT) buying rate on the respective dates. Here is the step-by-step
              calculation:
            </p>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-600 bg-white px-5 py-4 rounded-r-lg">
                <p className="font-semibold text-slate-800 mb-1">Step 1: Convert cost of acquisition to INR</p>
                <p className="text-slate-600 text-sm">Cost (INR) = Quantity × Buy Price (USD) × RBI rate on buy date</p>
              </div>
              <div className="border-l-4 border-blue-600 bg-white px-5 py-4 rounded-r-lg">
                <p className="font-semibold text-slate-800 mb-1">Step 2: Convert sale proceeds to INR</p>
                <p className="text-slate-600 text-sm">Sale proceeds (INR) = Quantity × Sell Price (USD) × RBI rate on sell date</p>
              </div>
              <div className="border-l-4 border-blue-600 bg-white px-5 py-4 rounded-r-lg">
                <p className="font-semibold text-slate-800 mb-1">Step 3: Compute capital gain</p>
                <p className="text-slate-600 text-sm">Capital gain = Sale proceeds (INR) − Cost of acquisition (INR) − Transfer expenses</p>
              </div>
              <div className="border-l-4 border-blue-600 bg-white px-5 py-4 rounded-r-lg">
                <p className="font-semibold text-slate-800 mb-1">Step 4: Determine STCG vs LTCG</p>
                <p className="text-slate-600 text-sm">Held less than 24 months → STCG at slab rate. Held 24 months or more → LTCG at 12.5%.</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-5 border-l-4 border-slate-300 pl-4">
              Note: This calculator uses ECB/Frankfurter rates for convenience. For final ITR filing, use
              the official FBIL reference rate from <strong>fbil.org.in</strong> or the RBI website. Discrepancies
              between sources are typically minor but should be verified for large trades.
            </p>
          </div>
        </section>

        {/* Schedule FA section */}
        <section className="py-12 px-6 bg-white border-y border-slate-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Schedule FA — Mandatory Foreign Asset Disclosure</h2>
            <p className="text-slate-600 mb-5 leading-relaxed">
              Every Indian resident who holds foreign assets — including US stocks on INDmoney, Vested, Stockal,
              or any other platform — must disclose them in Schedule FA (Foreign Assets) of their ITR. This is
              separate from reporting capital gains. Even if you made no profit, or are below the basic exemption
              limit, you must disclose.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border border-slate-200">What to disclose</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 border border-slate-200">Details required</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">US stocks held on December 31</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Name of stock, ISIN, date of acquisition, cost in INR, peak value during year, closing value on Dec 31</td>
                  </tr>
                  <tr className="bg-slate-50 border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">US brokerage account</td>
                    <td className="px-4 py-3 text-slate-600 border border-slate-200">Account number, name of institution (INDmoney / Vested / Stockal), country (USA), peak and closing balance</td>
                  </tr>
                  <tr className="border border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 border border-slate-200">Penalty for non-disclosure</td>
                    <td className="px-4 py-3 text-red-600 font-semibold border border-slate-200">₹10,00,000 per account under Black Money Act, 2015</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Ad unit */}
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-center">
          <RectangleAd />
        </div>

        {/* FAQ */}
        <FAQSchema faqs={tradingFAQs} />

        {/* Author box */}
        <AuthorBox />

        {/* Related tools */}
        <section className="py-10 px-6 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-5">Related Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/calculators/income-tax">
                <div className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm rounded-lg p-4 transition-all cursor-pointer">
                  <p className="font-semibold text-slate-800 text-sm">Income Tax Calculator</p>
                  <p className="text-xs text-slate-500 mt-1">Add trading income to your salary and compute total tax liability</p>
                </div>
              </Link>
              <Link href="/nri/dtaa-calculator">
                <div className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm rounded-lg p-4 transition-all cursor-pointer">
                  <p className="font-semibold text-slate-800 text-sm">DTAA Calculator</p>
                  <p className="text-xs text-slate-500 mt-1">Compute Double Tax Avoidance Agreement relief on foreign income</p>
                </div>
              </Link>
              <Link href="/blog/capital-gains-itr-where-to-report">
                <div className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm rounded-lg p-4 transition-all cursor-pointer">
                  <p className="font-semibold text-slate-800 text-sm">Capital Gains in ITR — Where to Report</p>
                  <p className="text-xs text-slate-500 mt-1">Step-by-step guide to reporting CG in Schedule CG of your ITR</p>
                </div>
              </Link>
              <Link href="/blog/capital-gains-tax-stocks-mutual-funds">
                <div className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm rounded-lg p-4 transition-all cursor-pointer">
                  <p className="font-semibold text-slate-800 text-sm">Capital Gains Tax on Stocks & Mutual Funds</p>
                  <p className="text-xs text-slate-500 mt-1">Understand STCG vs LTCG rates, set-off rules, and exemptions</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="py-8 px-6 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Disclaimer:</strong> This calculator is for educational and informational purposes only. It uses
              approximate exchange rates from the ECB/Frankfurter API which may differ from official RBI/FBIL rates.
              Tax calculations are based on Indian tax law for FY 2025-26 (AY 2026-27). Surcharge and health &
              education cess are not included in per-income-type computations — apply them on the total tax
              liability. Consult a Chartered Accountant or tax professional for filing advice, especially for
              large trades, F&amp;O business income, or foreign asset disclosures. AiTaxBot is not liable for any
              tax or penalty arising from reliance on this tool.
            </p>
          </div>
        </section>

        {/* Lead Capture + CA Banner */}
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <LeadCaptureForm source="Trading Tax Calculator" />
          <FindCABanner context="filing taxes on your trades" />
        </div>
      </div>
    </>
  );
}

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
import NPSCalculator from '@/components/calculators/NPSCalculator';

const npsFAQs = [
  {
    question: "What is the NPS extra ₹50,000 deduction under Section 80CCD(1B)?",
    answer: "Section 80CCD(1B) allows an additional deduction of ₹50,000 per year for NPS contributions, over and above the ₹1.5 lakh 80C limit. This means a 30% taxpayer saves ₹15,000 extra in tax — purely from this clause. It's one of the best tax-saving tools available in India."
  },
  {
    question: "Is NPS corpus tax-free at maturity?",
    answer: "Partially. At age 60, you can withdraw up to 60% of the NPS corpus as a lump sum — this is completely tax-free. The remaining 40% must be used to purchase an annuity (monthly pension), and that pension income is taxable as per your slab at the time of withdrawal."
  },
  {
    question: "Can I withdraw from NPS before age 60?",
    answer: "Yes, but with restrictions. Partial withdrawal (up to 25% of your contributions) is allowed after 3 years for specific reasons: higher education, marriage of children, purchase/construction of house, or treatment of critical illness. Premature exit before 60 requires 80% of corpus to go into annuity, and only 20% can be withdrawn lump sum."
  },
  {
    question: "What is the difference between NPS Tier I and Tier II?",
    answer: "Tier I is the mandatory pension account with lock-in until age 60 and offers tax benefits under 80CCD. Tier II is a voluntary savings account with no lock-in and no withdrawal restrictions, but it offers NO tax deduction benefits (except for Central Government employees)."
  },
  {
    question: "Is NPS better than PPF for tax saving?",
    answer: "Both serve different purposes. PPF offers EEE status (exempt at all 3 stages) but has a ₹1.5L annual limit within 80C. NPS gives an extra ₹50,000 deduction under 80CCD(1B) on top of 80C, making it superior for high-income earners. However, the mandatory 40% annuity means part of your NPS corpus will be taxable as pension income."
  },
  {
    question: "What happens to NPS account if I change jobs?",
    answer: "NPS is completely portable. Your PRAN (Permanent Retirement Account Number) stays with you regardless of employer changes. Your new employer can start contributing to the same account. This makes NPS far more flexible than EPFO for job changers."
  }
];

export default function NPSCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/nps', 'NPS Calculator India FY 2026-27 | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "NPS Calculator - National Pension System",
    description: "Free NPS Calculator India FY 2026-27. Calculate NPS corpus, lump sum, monthly pension and tax savings under Section 80CCD(1), 80CCD(1B) and 80CCD(2).",
    url: "https://www.aitaxbot.co.in/calculators/nps",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.aitaxbot.co.in/" },
    { name: "Calculators", url: "https://www.aitaxbot.co.in/calculators" },
    { name: "NPS Calculator", url: "https://www.aitaxbot.co.in/calculators/nps" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>NPS Calculator India FY 2026-27 - Pension Corpus & Tax Saving | AiTaxBot</title>
        <meta name="description" content="Free NPS Calculator India. Calculate National Pension System corpus, monthly pension, lump sum and tax savings under 80CCD(1), 80CCD(1B) +₹50,000 extra deduction. CA verified." />
        <meta name="keywords" content="NPS calculator, National Pension System calculator, NPS tax benefit, 80CCD 1B, NPS corpus calculator, NPS pension calculator, NPS tax saving India, PRAN calculator" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/calculators/nps" />
        <meta property="og:title" content="NPS Calculator India FY 2026-27 - Corpus, Pension & ₹50,000 Extra Tax Saving" />
        <meta property="og:description" content="Calculate your NPS retirement corpus, monthly pension and extra ₹50,000 tax saving under Section 80CCD(1B). CA verified, updated for FY 2026-27." />
        <meta property="og:url" content="https://www.aitaxbot.co.in/calculators/nps" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="bg-white">

        <CalcPageHeader
          title="NPS Calculator — National Pension System Corpus"
          subtitle="Calculate your NPS retirement corpus and annual pension estimate. Includes Section 80CCD(1B) extra ₹50,000 deduction and employer contribution benefits."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Calculators", href: "/calculators" },
            { label: "NPS Calculator" }
          ]}
          badge="FY 2026-27 ✓"
        />

        {/* Calculator */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <NPSCalculator />
          </div>
        </section>

        {/* Misconception Buster */}
        <section className="py-6 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                ⚠️ Common NPS Misconception — Most People Miss ₹15,000 in Tax Savings
              </h3>
              <p className="text-red-700 mb-2">
                Most salaried employees only use NPS under Section 80CCD(1) — within the ₹1.5L 80C limit.
                They don't know about <strong>Section 80CCD(1B)</strong> which gives an <strong>extra ₹50,000 deduction
                completely outside the 80C limit</strong>.
              </p>
              <p className="text-red-700">
                At 30% tax slab: that's <strong>₹15,000 pure tax saving per year</strong> — ₹1.25 lakh over a decade —
                just by contributing ₹50,000 more to NPS. This is in addition to whatever you already invest under 80C.
              </p>
            </div>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Understanding NPS — National Pension System</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What is NPS?</h3>
                <p className="text-slate-600">
                  The National Pension System (NPS) is a government-regulated retirement savings scheme launched in 2004
                  for government employees and opened to all citizens in 2009. It combines market-linked returns with
                  significant tax benefits, making it one of India's most powerful retirement tools.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Who Should Use NPS?</h3>
                <p className="text-slate-600">
                  NPS is ideal for salaried employees in the 20–30% tax bracket looking for retirement savings
                  beyond EPF, self-employed professionals wanting structured pension income, and anyone who has
                  already exhausted the ₹1.5L Section 80C limit and wants additional tax deductions.
                </p>
              </div>
            </div>

            {/* Tax Benefits Explained */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">NPS Tax Benefits — All 3 Sections Explained</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
                <div className="text-2xl font-bold text-blue-700 mb-1">80CCD(1)</div>
                <div className="text-sm font-semibold text-slate-700 mb-2">Your own contribution</div>
                <p className="text-sm text-slate-600">Up to 10% of salary (basic+DA) or 20% of gross income for self-employed. This falls <em>within</em> the overall ₹1.5L Section 80C limit.</p>
              </div>
              <div className="bg-green-50 border border-green-100 p-5 rounded-xl">
                <div className="text-2xl font-bold text-green-700 mb-1">80CCD(1B)</div>
                <div className="text-sm font-semibold text-slate-700 mb-2">Extra ₹50,000 deduction</div>
                <p className="text-sm text-slate-600"><strong>Over and above the ₹1.5L 80C limit.</strong> Any Indian resident can claim this. At 30% slab = ₹15,000 tax saved every year. Don't miss this.</p>
              </div>
              <div className="bg-persian-blue-50 border border-persian-blue-100 p-5 rounded-xl">
                <div className="text-2xl font-bold text-persian-blue-800 mb-1">80CCD(2)</div>
                <div className="text-sm font-semibold text-slate-700 mb-2">Employer's contribution</div>
                <p className="text-sm text-slate-600">Up to 10% of salary for private sector (14% for govt). <strong>No upper limit in rupee terms.</strong> Fully deductible and not part of 80C.</p>
              </div>
            </div>

            {/* Worked Examples */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Worked Examples</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">

              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 1 — Salaried at 30% Slab</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Age at Start:</span><span className="font-semibold">30 years</span></div>
                  <div className="flex justify-between"><span>Monthly Contribution:</span><span className="font-semibold">₹5,000</span></div>
                  <div className="flex justify-between"><span>Employer Contribution:</span><span className="font-semibold">₹5,000/month</span></div>
                  <div className="flex justify-between"><span>Return Assumed:</span><span className="font-semibold">10% p.a.</span></div>
                  <div className="flex justify-between"><span>Investment Period:</span><span className="font-semibold">30 years</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>Total Corpus at 60:</span><span className="font-bold text-blue-700">~₹2.28 Cr</span></div>
                  <div className="flex justify-between"><span>Tax-Free Lump Sum (60%):</span><span className="font-bold text-green-700">~₹1.37 Cr</span></div>
                  <div className="flex justify-between"><span>Monthly Pension (est.):</span><span className="font-bold text-persian-blue-800">~₹45,600/mo</span></div>
                  <div className="flex justify-between"><span>Annual Tax Saving:</span><span className="font-bold text-orange-700">~₹60,000+</span></div>
                </div>
              </div>

              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 2 — Self-Employed CA at 30% Slab</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Age at Start:</span><span className="font-semibold">35 years</span></div>
                  <div className="flex justify-between"><span>Monthly Contribution:</span><span className="font-semibold">₹10,000</span></div>
                  <div className="flex justify-between"><span>Employer Contribution:</span><span className="font-semibold">₹0</span></div>
                  <div className="flex justify-between"><span>Return Assumed:</span><span className="font-semibold">10% p.a.</span></div>
                  <div className="flex justify-between"><span>Investment Period:</span><span className="font-semibold">25 years</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>Total Corpus at 60:</span><span className="font-bold text-blue-700">~₹1.33 Cr</span></div>
                  <div className="flex justify-between"><span>Tax-Free Lump Sum (60%):</span><span className="font-bold text-green-700">~₹80 L</span></div>
                  <div className="flex justify-between"><span>Monthly Pension (est.):</span><span className="font-bold text-persian-blue-800">~₹26,600/mo</span></div>
                  <div className="flex justify-between"><span>80CCD(1B) Saving alone:</span><span className="font-bold text-orange-700">₹15,000/yr</span></div>
                </div>
              </div>

            </div>

            {/* CA Tips */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">CA Tips on NPS — Things Your Employer Won't Tell You</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">1</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Always use 80CCD(1B) separately</p>
                  <p className="text-slate-600 text-sm mt-1">Even if you've maxed ₹1.5L under 80C, put ₹50,000 more in NPS Tier I. It's a standalone deduction. At 30% slab, that's ₹15,000 free tax saving every year.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">2</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Negotiate higher employer NPS contribution</p>
                  <p className="text-slate-600 text-sm mt-1">Ask HR to restructure CTC — move part of your salary to NPS employer contribution. It falls under 80CCD(2) with no upper cap and is fully exempt from tax.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">3</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Choose 'Active Choice' not 'Auto Choice'</p>
                  <p className="text-slate-600 text-sm mt-1">Under Active Choice, you can put up to 75% in equity (E fund). Young investors (under 40) should maximise equity allocation for higher long-term returns.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">4</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">NPS works under both tax regimes</p>
                  <p className="text-slate-600 text-sm mt-1">80CCD(1B) deduction is available under the old regime. Under the new regime, only 80CCD(2) (employer contribution) is deductible. Old regime wins for NPS deductions.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">5</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Annuity pension is fully taxable</p>
                  <p className="text-slate-600 text-sm mt-1">The monthly pension you receive post-retirement from the 40% annuity corpus is taxed as income. Plan your retirement income mix (EPF + NPS + other) to keep total income below taxable threshold.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">6</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Defer annuity up to age 75</p>
                  <p className="text-slate-600 text-sm mt-1">You don't have to buy annuity at 60. You can defer NPS maturity up to age 75, allowing the corpus to keep growing tax-deferred — a powerful strategy for those with other income sources post-60.</p>
                </div>
              </div>
            </div>

            {/* NPS vs PPF vs EPF Comparison */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">NPS vs PPF vs EPF — Quick Comparison</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-3 text-left font-semibold">Feature</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-persian-blue-800">NPS</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-green-700">PPF</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-blue-700">EPF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Annual Limit</td>
                    <td className="border border-slate-200 p-3 text-center">No limit</td>
                    <td className="border border-slate-200 p-3 text-center">₹1.5L</td>
                    <td className="border border-slate-200 p-3 text-center">12% of basic</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Tax on Returns</td>
                    <td className="border border-slate-200 p-3 text-center">Market-linked</td>
                    <td className="border border-slate-200 p-3 text-center">Tax-free (EEE)</td>
                    <td className="border border-slate-200 p-3 text-center">Tax-free (EEE)*</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Maturity Tax</td>
                    <td className="border border-slate-200 p-3 text-center">60% tax-free; 40% annuity taxable</td>
                    <td className="border border-slate-200 p-3 text-center">Fully tax-free</td>
                    <td className="border border-slate-200 p-3 text-center">Tax-free after 5 yrs</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Extra Deduction</td>
                    <td className="border border-slate-200 p-3 text-center font-semibold text-green-700">+₹50,000 (80CCD1B)</td>
                    <td className="border border-slate-200 p-3 text-center">Within ₹1.5L only</td>
                    <td className="border border-slate-200 p-3 text-center">Within ₹1.5L only</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Expected Returns</td>
                    <td className="border border-slate-200 p-3 text-center">9–12% (market-linked)</td>
                    <td className="border border-slate-200 p-3 text-center">7.1% (fixed)</td>
                    <td className="border border-slate-200 p-3 text-center">8.25% (FY25)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Lock-in</td>
                    <td className="border border-slate-200 p-3 text-center">Till age 60</td>
                    <td className="border border-slate-200 p-3 text-center">15 years</td>
                    <td className="border border-slate-200 p-3 text-center">Till retirement/exit</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">*EPF interest taxable if contribution exceeds ₹2.5L/year</p>
            </div>

            {/* NPS Corpus Projection Table */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">NPS Corpus Projection Table — How Much Will You Accumulate? (at 10% p.a.)</h2>
            <p className="text-slate-600 mb-4">
              NPS invests in a mix of equity (E), corporate bonds (C) and government securities (G). Active Choice with 75% equity has historically returned 10–12% p.a.
              The table below uses a conservative 10% assumption. Your actual returns may vary based on asset allocation.
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-persian-blue-800 text-white">
                    <th className="border border-persian-blue-700 p-3 text-left font-semibold">Monthly Contribution</th>
                    <th className="border border-persian-blue-700 p-3 text-center font-semibold">10 Years</th>
                    <th className="border border-persian-blue-700 p-3 text-center font-semibold">15 Years</th>
                    <th className="border border-persian-blue-700 p-3 text-center font-semibold">20 Years</th>
                    <th className="border border-persian-blue-700 p-3 text-center font-semibold">25 Years</th>
                    <th className="border border-persian-blue-700 p-3 text-center font-semibold">30 Years</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹2,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹4.13 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹8.36 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹15.31 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹26.76 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹45.59 L</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹5,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹10.33 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹20.90 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹38.28 L</td>
                    <td className="border border-slate-200 p-3 text-center text-blue-700 font-semibold">₹66.89 L</td>
                    <td className="border border-slate-200 p-3 text-center text-persian-blue-800 font-semibold">₹1.14 Cr</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹10,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹20.66 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹41.79 L</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹76.57 L</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹1.34 Cr</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹2.28 Cr</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 font-semibold text-slate-800">₹20,000/month</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹41.31 L</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">₹83.58 L</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹1.53 Cr</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹2.68 Cr</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-bold">₹4.56 Cr</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mb-8">*Assumes 10% annual return compounded monthly. Does not include employer's 80CCD(2) contribution — add your employer's share to significantly increase these numbers. Past returns are not guaranteed.</p>

            {/* Where to Open NPS */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Where to Open Your NPS Account</h2>
            <p className="text-slate-600 mb-4">
              NPS accounts can be opened online (paperless, Aadhaar-based KYC) or through any NPS Point of Presence (POP).
              eNPS is the fastest route — takes 15 minutes and is completely free.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
              <a href="https://enps.nsdl.com" target="_blank" rel="noopener noreferrer" className="block p-4 bg-white border border-slate-200 rounded-lg hover:border-persian-blue-400 hover:shadow-md transition-all group">
                <div className="font-bold text-slate-900 mb-1 group-hover:text-persian-blue-800">eNPS (NSDL)</div>
                <p className="text-xs text-slate-600 mb-3">Official government NPS portal. Directly under PFRDA. Aadhaar-based KYC. Zero charges. Best for self-employed & unorganised sector.</p>
                <span className="text-xs bg-persian-blue-100 text-persian-blue-800 px-2 py-1 rounded font-medium">Open Online →</span>
              </a>
              <a href="https://www.sbi.co.in/web/personal-banking/investments-and-insurance/nps" target="_blank" rel="noopener noreferrer" className="block p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all group">
                <div className="font-bold text-slate-900 mb-1 group-hover:text-blue-700">SBI NPS</div>
                <p className="text-xs text-slate-600 mb-3">Open via SBI branch or YONO app. Preferred for SBI account holders — contributions auto-debited from savings account.</p>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">Open via SBI →</span>
              </a>
              <a href="https://www.hdfcbank.com/personal/save/accounts/nps" target="_blank" rel="noopener noreferrer" className="block p-4 bg-white border border-slate-200 rounded-lg hover:border-red-400 hover:shadow-md transition-all group">
                <div className="font-bold text-slate-900 mb-1 group-hover:text-red-700">HDFC Bank NPS</div>
                <p className="text-xs text-slate-600 mb-3">Open via HDFC NetBanking. Good for HDFC account holders wanting auto-debit integration with their existing accounts.</p>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">Open via HDFC →</span>
              </a>
              <a href="https://zerodha.com/nps" target="_blank" rel="noopener noreferrer" className="block p-4 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:shadow-md transition-all group">
                <div className="font-bold text-slate-900 mb-1 group-hover:text-orange-700">Zerodha NPS</div>
                <p className="text-xs text-slate-600 mb-3">Fully digital via Zerodha Coin. Best if you already invest in mutual funds via Zerodha — single dashboard for NPS + SIP.</p>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">Open via Zerodha →</span>
              </a>
            </div>
            <p className="text-xs text-slate-500 mb-8">NPS is regulated by PFRDA (Pension Fund Regulatory and Development Authority). All platforms listed are official NPS Points of Presence (POPs). AiTaxBot does not provide investment advice.</p>

            {/* FAQs */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {npsFAQs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <FAQSchema faqs={npsFAQs} />
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
              Plan your complete retirement strategy — combine NPS with EPF, SIP and smart tax planning.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/pf">
                <div className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">PF Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate EPF + VPF corpus alongside your NPS</p>
                </div>
              </Link>
              <Link href="/calculators/income-tax">
                <div className="p-4 bg-white rounded-lg border hover:border-persian-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Income Tax Calculator</h3>
                  <p className="text-sm text-slate-600">See exact tax saving from NPS deductions</p>
                </div>
              </Link>
              <Link href="/calculators/sip">
                <div className="p-4 bg-white rounded-lg border hover:border-green-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SIP Calculator</h3>
                  <p className="text-sm text-slate-600">Build wealth outside NPS with mutual fund SIPs</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-persian-blue-50 rounded-lg border border-persian-blue-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-persian-blue-800 mb-1">All Calculators</h3>
                  <p className="text-sm text-persian-blue-700">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Lead Capture + CA Banner */}
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <LeadCaptureForm source="NPS Calculator" />
          <FindCABanner context="planning your NPS investment" />
        </div>
      </div>
    </>
  );
}

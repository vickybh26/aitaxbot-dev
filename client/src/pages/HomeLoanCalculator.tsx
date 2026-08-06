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
import HomeLoanCalculator from '@/components/calculators/HomeLoanCalculator';

const homeLoanFAQs = [
  {
    question: "How much home loan can I get on my salary?",
    answer: "Banks typically allow up to 50% of your net monthly income towards all EMIs combined (this is called FOIR — Fixed Obligation to Income Ratio). So on a ₹1 lakh monthly salary with no existing loans, you can afford an EMI of up to ₹50,000, which translates to roughly ₹55–60 lakh home loan at 8.75% for 20 years. Subtract any existing car loan or personal loan EMIs from this limit."
  },
  {
    question: "What is the tax benefit on home loan in FY 2026-27?",
    answer: "Under the Old Tax Regime: Section 24 (Section 22(2) under ITA 2025) allows deduction of up to ₹2 lakh per year on home loan interest for self-occupied property. Section 80C (Section 123 under ITA 2025) allows deduction on principal repayment (within the ₹1.5L overall 80C limit). Together, a 30% taxpayer can save ₹1.09 lakh per year. Note: these deductions are NOT available under the New Tax Regime (Section 202 of ITA 2025)."
  },
  {
    question: "What is LTV ratio and why does it matter?",
    answer: "LTV (Loan-to-Value) ratio is the loan amount as a percentage of property value. RBI mandates: LTV up to 80% for loans above ₹30L, and up to 90% for loans up to ₹30L. Most banks offer 80% LTV, meaning you need at least 20% as down payment. Higher down payment = lower EMI, less interest paid, and easier loan approval."
  },
  {
    question: "Is it better to choose shorter or longer tenure?",
    answer: "Shorter tenure = higher EMI but far less total interest paid. Example: ₹50L loan at 8.75%: 20-year tenure = EMI ₹44,100, total interest ₹56L. 10-year tenure = EMI ₹62,900, total interest ₹25.5L — saving ₹30.5L in interest. If your income can support it, shorter tenure is always better financially. Use our calculator to compare both scenarios."
  },
  {
    question: "Can I claim home loan tax benefits under the New Tax Regime?",
    answer: "No. Home loan interest deduction (Section 24 / Section 22(2) under ITA 2025) and principal repayment under Section 80C (Section 123 under ITA 2025) are not available under the New Tax Regime. This is one of the key reasons high-income salaried individuals with home loans often benefit more from the Old Tax Regime. Use our Income Tax Calculator to compare both regimes with and without home loan deductions."
  },
  {
    question: "What documents are needed for a home loan application?",
    answer: "KYC documents (Aadhaar, PAN), 3 months' salary slips, 6 months' bank statements, Form 16, ITR for last 2 years, property documents (sale agreement, title deed, approved plan), employer verification letter. Self-employed need ITR for 3 years and P&L statements. Having all documents ready speeds up approval from 2–3 weeks to 5–7 days."
  }
];

export default function HomeLoanCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/home-loan', 'Home Loan Calculator India FY 2026-27 | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "Home Loan Affordability Calculator India",
    description: "Free Home Loan Calculator India FY 2026-27. Check eligibility, calculate EMI, total interest and annual tax savings under Section 24 and Section 80C.",
    url: "https://www.aitaxbot.co.in/calculators/home-loan",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.aitaxbot.co.in/" },
    { name: "Calculators", url: "https://www.aitaxbot.co.in/calculators" },
    { name: "Home Loan Calculator", url: "https://www.aitaxbot.co.in/calculators/home-loan" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>Home Loan Calculator India FY 2026-27 — Eligibility, EMI & Tax Benefit | AiTaxBot</title>
        <meta name="description" content="Free Home Loan Affordability Calculator India. Check how much loan you can get on your salary, calculate EMI, total interest and Section 24 + 80C tax savings. CA verified." />
        <meta name="keywords" content="home loan calculator, home loan eligibility calculator, EMI calculator, housing loan calculator India, Section 24 tax benefit, home loan tax saving, affordability calculator" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/calculators/home-loan" />
        <meta property="og:title" content="Home Loan Calculator India — Eligibility, EMI & Tax Benefits FY 2026-27" />
        <meta property="og:description" content="Know exactly how much home loan you qualify for, your monthly EMI, total interest and annual tax savings under Section 24 and 80C." />
        <meta property="og:url" content="https://www.aitaxbot.co.in/calculators/home-loan" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="bg-white">

        <CalcPageHeader
          title="Home Loan EMI & Affordability Calculator"
          subtitle="Check how much loan you're eligible for based on income, calculate your EMI, and see your Section 24 + Section 80C tax benefits under the Old Regime."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Calculators", href: "/calculators" },
            { label: "Home Loan Calculator" }
          ]}
          badge="FY 2026-27 ✓"
        />

        {/* Calculator */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <HomeLoanCalculator />
          </div>
        </section>

        {/* Alert: New vs Old Regime */}
        <section className="py-4 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-bold text-amber-900 mb-2">⚠️ Home Loan Tax Benefits — Old Regime Only</h3>
              <p className="text-amber-800 text-sm">
                Section 24 (interest deduction up to ₹2L) and principal repayment under Section 80C are available
                <strong> only under the Old Tax Regime</strong>. If you're a salaried employee with a home loan,
                this is often the reason to stay on the Old Regime. Use our{' '}
                <Link href="/calculators/income-tax" className="underline font-semibold">Income Tax Calculator</Link>{' '}
                to compare Old vs New regime after factoring in your home loan deductions.
              </p>
            </div>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Understanding Home Loan Affordability in India</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">How Banks Calculate Your Eligibility</h3>
                <p className="text-slate-600">
                  Banks use FOIR (Fixed Obligation to Income Ratio) — typically 40–50% of gross monthly income.
                  This means all your EMIs combined (home loan + car loan + personal loan) cannot exceed 50% of
                  your monthly income. The higher your income and lower your existing obligations, the larger the
                  loan you qualify for.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What Affects Your Home Loan Rate?</h3>
                <p className="text-slate-600">
                  Home loan interest rates in India (FY 2026-27) range from 8.35% to 9.5% depending on:
                  CIBIL score (750+ gets best rates), loan amount, property type (ready possession vs under construction),
                  lender (PSU banks vs private), and whether you opt for MCLR or repo-linked rate. A 0.5% rate difference
                  on ₹50L over 20 years adds up to ₹7+ lakh extra interest.
                </p>
              </div>
            </div>

            {/* EMI Reference Table */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Home Loan EMI Reference Table — At 8.75% p.a.</h2>
            <p className="text-slate-600 mb-4">Quick reference for common loan amounts. Use the calculator above for your exact figures.</p>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="border border-blue-600 p-3 text-left font-semibold">Loan Amount</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">10 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">15 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">20 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">25 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">30 Years</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { loan: "₹20 Lakh", emis: ["₹24,934", "₹19,950", "₹17,640", "₹16,410", "₹15,729"] },
                    { loan: "₹30 Lakh", emis: ["₹37,401", "₹29,925", "₹26,460", "₹24,615", "₹23,594"] },
                    { loan: "₹50 Lakh", emis: ["₹62,335", "₹49,875", "₹44,100", "₹41,025", "₹39,323"] },
                    { loan: "₹75 Lakh", emis: ["₹93,502", "₹74,812", "₹66,150", "₹61,537", "₹58,985"] },
                    { loan: "₹1 Crore", emis: ["₹1,24,670", "₹99,750", "₹88,200", "₹82,049", "₹78,646"] },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                      <td className="border border-slate-200 p-3 font-semibold text-slate-800">{row.loan}</td>
                      {row.emis.map((emi, j) => (
                        <td key={j} className="border border-slate-200 p-3 text-center text-slate-700">{emi}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mb-8">*At 8.75% p.a. interest. Monthly EMI figures. Actual rates vary by lender and credit profile.</p>

            {/* Home Loan Tax Benefits Table */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Home Loan Tax Benefits — Section 24 & Section 80C (Old Regime)</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <div className="text-2xl font-bold text-blue-700 mb-1">Section 24</div>
                <div className="text-sm font-semibold text-slate-700 mb-2">(Section 22(2) under ITA 2025)</div>
                <p className="text-sm text-slate-600 mb-3">Deduction on home loan <strong>interest</strong> paid during the year.</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Self-occupied property:</span><span className="font-semibold">Up to ₹2,00,000/year</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Let-out property:</span><span className="font-semibold">Actual interest (no limit)</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Under construction:</span><span className="font-semibold">Deduction starts after possession</span></div>
                  <div className="border-t border-blue-200 pt-2 flex justify-between font-semibold text-blue-700">
                    <span>Tax saving at 30% slab:</span><span>₹62,400/year</span>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                <div className="text-2xl font-bold text-green-700 mb-1">Section 80C</div>
                <div className="text-sm font-semibold text-slate-700 mb-2">(Section 123 under ITA 2025)</div>
                <p className="text-sm text-slate-600 mb-3">Deduction on home loan <strong>principal</strong> repayment.</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Combined 80C limit:</span><span className="font-semibold">₹1,50,000/year</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Includes:</span><span className="font-semibold">EPF + ELSS + PPF + Principal</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Stamp duty & registration:</span><span className="font-semibold">Claimable in year of payment</span></div>
                  <div className="border-t border-green-200 pt-2 flex justify-between font-semibold text-green-700">
                    <span>Max saving at 30% slab:</span><span>₹46,800/year</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Home Loan Pro Tips — Save Lakhs in Interest</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                { n: 1, tip: "Make partial prepayments in early years", detail: "In the first 5 years, 80%+ of your EMI goes to interest, not principal. Even ₹50,000 prepayment in Year 2 can cut 18+ months from your loan and save ₹3–5L in interest. Most banks allow 1–2 free prepayments per year." },
                { n: 2, tip: "Compare repo-linked vs MCLR rate loans", detail: "Repo-linked loans (RLLR) reset every 3 months when RBI changes rates. MCLR resets annually. In a falling rate environment, RLLR benefits you faster. Check which your lender offers — the difference can be 0.25–0.5%." },
                { n: 3, tip: "Get CIBIL 750+ before applying — saves 0.5–1%", detail: "Spend 6 months clearing all credit card dues and old loans before applying for a home loan. A 750 vs 650 CIBIL score can mean 0.75% lower rate — on ₹50L that's ₹10L+ savings over 20 years." },
                { n: 4, tip: "Use Old Regime if home loan + HRA + 80C exceed ₹5L deductions", detail: "Calculate your total deductions: ₹2L (Section 24 interest) + ₹1.5L (80C including principal) + HRA. If this exceeds ₹5L, Old Regime almost always wins over New Regime for you." },
                { n: 5, tip: "Joint home loan doubles the Section 24 benefit", detail: "If both spouses are co-borrowers and co-owners, each can claim ₹2L interest deduction independently — ₹4L total per year between you. At 30% slab that's ₹1.25L annual tax saving for the household." },
                { n: 6, tip: "Balance transfer to save on interest rate", detail: "If interest rates fall and your existing rate is 0.5%+ higher than new rates, a balance transfer to another lender can save significantly. Factor in processing fees (0.5–1%) against interest savings to assess if it's worth it." },
              ].map(({ n, tip, detail }) => (
                <div key={n} className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                  <span className="text-amber-600 text-lg font-bold shrink-0">{n}</span>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{tip}</p>
                    <p className="text-slate-600 text-sm mt-1">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQs */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {homeLoanFAQs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <FAQSchema faqs={homeLoanFAQs} />
        <AuthorBox />

        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <ResponsiveAd />
          <RectangleAd />
        </div>

        {/* Related Calculators */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Related Calculators</h2>
            <p className="text-slate-600 mb-6">Plan your complete financial picture alongside your home loan.</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/income-tax">
                <div className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Income Tax Calculator</h3>
                  <p className="text-sm text-slate-600">Compare Old vs New regime with home loan deductions</p>
                </div>
              </Link>
              <Link href="/calculators/hra">
                <div className="p-4 bg-white rounded-lg border hover:border-green-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">HRA Calculator</h3>
                  <p className="text-sm text-slate-600">Claim HRA while paying home loan EMI on a different city</p>
                </div>
              </Link>
              <Link href="/calculators/vehicle-loan">
                <div className="p-4 bg-white rounded-lg border hover:border-orange-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Vehicle Loan Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate car or two-wheeler loan EMI alongside home loan</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-blue-700 mb-1">All Calculators</h3>
                  <p className="text-sm text-blue-600">View complete suite of free financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Lead Capture + CA Banner */}
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <LeadCaptureForm source="Home Loan Calculator" />
          <FindCABanner context="planning your home loan" />
        </div>
      </div>
    </>
  );
}

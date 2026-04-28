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
import CalcPageHeader from '@/components/CalcPageHeader';
import VehicleLoanCalculator from '@/components/calculators/VehicleLoanCalculator';

const vehicleFAQs = [
  {
    question: "What is the interest rate on two-wheeler loans in India in 2026?",
    answer: "Two-wheeler loan interest rates in India range from 10% to 16% p.a. in 2026. PSU banks like SBI and Bank of Baroda offer rates starting from 10.5%. Private banks and NBFCs like Bajaj Finance and HDFC Bank charge 12–16%. Your exact rate depends on CIBIL score (750+ gets best rates), loan tenure, and the bike's ex-showroom price. Always compare at least 3 lenders before finalizing."
  },
  {
    question: "What is the interest rate on car loans in India in 2026?",
    answer: "Car loan interest rates in India range from 8.35% to 12% p.a. in 2026. SBI offers from 8.65%, HDFC Bank from 9%, and Maruti Finance from 8.35% for Maruti vehicles. Rates are influenced by RBI's repo rate, your CIBIL score, car brand (some OEMs negotiate rates), and whether it's a new or used vehicle. Used car loans are typically 1.5–2% higher."
  },
  {
    question: "How much two-wheeler loan can I get?",
    answer: "Banks typically finance up to 85–90% of the on-road price for two-wheelers. So on a ₹1.2 lakh scooter, you could get ₹1,02,000–₹1,08,000 as a loan. The remaining 10–15% is your down payment. Minimum income eligibility is ₹10,000/month for salaried, ₹15,000/month for self-employed. No separate income proof is needed for many lenders for bikes under ₹1 lakh."
  },
  {
    question: "Should I choose a shorter or longer EMI tenure for a vehicle loan?",
    answer: "Shorter tenure = lower total interest but higher monthly EMI. Example: ₹5 lakh car loan at 9.25%: 3-year tenure = EMI ₹15,941, total interest ₹73,876. 7-year tenure = EMI ₹7,825, total interest ₹1,57,304. The 7-year option costs ₹83,000 extra in interest. Always choose the shortest tenure your income can comfortably support — vehicle loans don't have tax benefits so minimizing interest is the priority."
  },
  {
    question: "Is there any tax benefit on vehicle loan in India?",
    answer: "For personal vehicles (two-wheelers or four-wheelers for personal use), there is NO income tax benefit on EMI or interest. However, if you use the vehicle exclusively for business purposes and it's booked in the name of a business/firm, the interest paid can be claimed as a business expense under Section 37 of ITA 2025. Salaried employees get zero tax benefit on personal vehicle loans."
  },
  {
    question: "What documents are needed for a vehicle loan?",
    answer: "KYC (Aadhaar + PAN), 3 months' salary slips or 6 months' bank statements, Form 16 or ITR (for loans above ₹3 lakh), quotation or proforma invoice from the dealer, and passport-size photos. Self-employed need ITR for 2 years. Most banks now offer instant vehicle loans with digital verification in 2–4 hours for salaried applicants with 750+ CIBIL scores."
  },
  {
    question: "What is the difference between flat rate and reducing balance rate on a vehicle loan?",
    answer: "Flat rate (also called simple interest rate) charges interest on the original loan amount for the entire tenure, even as you repay each month. Reducing balance rate charges interest only on the outstanding principal — as you repay, interest reduces. At the same quoted rate, flat rate costs approximately 80–90% more total interest than reducing balance. For example, a ₹5 lakh loan at 9% for 5 years: reducing balance = ₹1.22 lakh total interest; flat rate = ₹2.25 lakh total interest. Always ask your lender: 'Is this a flat rate or reducing balance rate?' Most scheduled banks use reducing balance. Some dealer-finance schemes and NBFCs quote flat rates which look lower but cost significantly more."
  }
];

export default function VehicleLoanCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/vehicle-loan', 'Vehicle Loan EMI Calculator India 2026 | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "Vehicle Loan EMI Calculator — Two-Wheeler & Car Loan",
    description: "Free vehicle loan EMI calculator for India. Calculate two-wheeler and four-wheeler loan EMI, total interest and on-road cost. Compare tenures instantly.",
    url: "https://aitaxbot.co.in/calculators/vehicle-loan",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.co.in/" },
    { name: "Calculators", url: "https://aitaxbot.co.in/calculators" },
    { name: "Vehicle Loan Calculator", url: "https://aitaxbot.co.in/calculators/vehicle-loan" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>Vehicle Loan EMI Calculator India 2026 — Two-Wheeler & Car Loan | AiTaxBot</title>
        <meta name="description" content="Free vehicle loan EMI calculator for India. Compare flat rate vs reducing balance interest — see the hidden cost difference. Calculate two-wheeler and car loan EMI, total interest and cost breakdown." />
        <meta name="keywords" content="vehicle loan calculator, car loan EMI calculator, two wheeler loan EMI calculator, bike loan calculator India, flat rate vs reducing balance, vehicle loan interest rate, auto loan calculator, car loan interest calculator 2026" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators/vehicle-loan" />
        <meta property="og:title" content="Vehicle Loan EMI Calculator India — Two-Wheeler & Car Loan 2026" />
        <meta property="og:description" content="Calculate your two-wheeler or car loan EMI, total interest and cost breakdown. Switch between bike and car with pre-filled defaults." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators/vehicle-loan" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-slate-50">

        <CalcPageHeader
          title="Vehicle Loan EMI Calculator — Two-Wheeler & Car Loan"
          subtitle="Calculate EMI for two-wheeler or car loans. Compare flat rate vs reducing balance to see the real cost difference before you sign."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Calculators", href: "/calculators" },
            { label: "Vehicle Loan Calculator" }
          ]}
          badge="FY 2026-27 ✓"
        />

        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <VehicleLoanCalculator />
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Vehicle Loan EMI Reference Tables</h2>

            {/* Two-Wheeler Table */}
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Two-Wheeler Loan EMI Table (at 12.5% p.a.)</h3>
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-orange-500 text-white">
                    <th className="border border-orange-400 p-3 text-left font-semibold">Loan Amount</th>
                    <th className="border border-orange-400 p-3 text-center font-semibold">1 Year</th>
                    <th className="border border-orange-400 p-3 text-center font-semibold">2 Years</th>
                    <th className="border border-orange-400 p-3 text-center font-semibold">3 Years</th>
                    <th className="border border-orange-400 p-3 text-center font-semibold">5 Years</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { loan: "₹50,000", emis: ["₹4,453", "₹2,362", "₹1,672", "₹1,135"] },
                    { loan: "₹80,000", emis: ["₹7,124", "₹3,779", "₹2,675", "₹1,816"] },
                    { loan: "₹1,00,000", emis: ["₹8,905", "₹4,724", "₹3,344", "₹2,270"] },
                    { loan: "₹1,50,000", emis: ["₹13,358", "₹7,085", "₹5,016", "₹3,405"] },
                    { loan: "₹2,00,000", emis: ["₹17,810", "₹9,447", "₹6,688", "₹4,540"] },
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
            <p className="text-xs text-slate-500 mb-6">*At 12.5% p.a. Actual rates vary by lender and credit profile.</p>

            {/* Car Loan Table */}
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Car Loan EMI Table (at 9.25% p.a.)</h3>
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="border border-blue-600 p-3 text-left font-semibold">Loan Amount</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">3 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">5 Years</th>
                    <th className="border border-blue-600 p-3 text-center font-semibold">7 Years</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { loan: "₹3 Lakh", emis: ["₹9,560", "₹6,248", "₹4,798"] },
                    { loan: "₹5 Lakh", emis: ["₹15,933", "₹10,413", "₹7,997"] },
                    { loan: "₹8 Lakh", emis: ["₹25,493", "₹16,661", "₹12,794"] },
                    { loan: "₹12 Lakh", emis: ["₹38,239", "₹24,991", "₹19,192"] },
                    { loan: "₹20 Lakh", emis: ["₹63,731", "₹41,652", "₹31,987"] },
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
            <p className="text-xs text-slate-500 mb-8">*At 9.25% p.a. Actual rates vary by lender and credit profile.</p>

            {/* Flat vs Reducing explainer */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Flat Rate vs Reducing Balance — The Hidden Cost</h2>
            <p className="text-slate-600 mb-4 text-sm">
              Many dealers and some lenders quote an interest rate without clarifying whether it's a <strong>flat (simple) rate</strong> or a
              <strong> reducing balance rate</strong>. At the same quoted percentage, flat rate costs you nearly double the interest.
              Always ask before you sign.
            </p>

            {/* What each means */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-bold text-green-800 mb-2">Reducing Balance Rate</h3>
                <p className="text-green-900 text-sm mb-2">
                  Interest is charged only on the <strong>outstanding principal</strong> each month. As you repay, the
                  principal shrinks — so your interest charge reduces every month. The EMI stays the same, but the
                  interest component keeps falling and the principal repayment component keeps rising.
                </p>
                <p className="text-xs text-green-800 font-medium">Used by: All scheduled banks (SBI, HDFC, ICICI, Axis), most NBFCs</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="font-bold text-red-700 mb-2">Flat Rate (Simple Interest on Full Principal)</h3>
                <p className="text-red-900 text-sm mb-2">
                  Interest is calculated on the <strong>original loan amount for the entire tenure</strong> — even though you're
                  repaying monthly. You pay interest on money you've already returned to the lender.
                  This makes the effective cost significantly higher.
                </p>
                <p className="text-xs text-red-800 font-medium">Watch out for: Dealer finance schemes, some two-wheeler NBFCs, "0% schemes" with hidden processing fees</p>
              </div>
            </div>

            {/* Example table */}
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Example: ₹5 Lakh Car Loan at 9% — Flat vs Reducing</h3>
            <div className="overflow-x-auto mb-2">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border border-slate-700 p-3 text-left">Tenure</th>
                    <th className="border border-slate-700 p-3 text-center text-green-300">Reducing Balance EMI</th>
                    <th className="border border-slate-700 p-3 text-center text-green-300">Reducing Total Interest</th>
                    <th className="border border-slate-700 p-3 text-center text-red-300">Flat Rate EMI</th>
                    <th className="border border-slate-700 p-3 text-center text-red-300">Flat Total Interest</th>
                    <th className="border border-slate-700 p-3 text-center text-yellow-300">Extra Cost (Flat)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tenure: "3 Years", redEmi: "₹15,896", redInt: "₹72,240", flatEmi: "₹17,361", flatInt: "₹1,25,000", extra: "+₹52,760" },
                    { tenure: "5 Years", redEmi: "₹10,373", redInt: "₹1,22,380", flatEmi: "₹13,194", flatInt: "₹2,25,000", extra: "+₹1,02,620" },
                    { tenure: "7 Years", redEmi: "₹7,952", redInt: "₹1,67,970", flatEmi: "₹11,310", flatInt: "₹3,15,000", extra: "+₹1,47,030" },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                      <td className="border border-slate-200 p-3 font-semibold text-slate-800">{row.tenure}</td>
                      <td className="border border-slate-200 p-3 text-center text-green-700 font-semibold">{row.redEmi}</td>
                      <td className="border border-slate-200 p-3 text-center text-green-700">{row.redInt}</td>
                      <td className="border border-slate-200 p-3 text-center text-red-600 font-semibold">{row.flatEmi}</td>
                      <td className="border border-slate-200 p-3 text-center text-red-600">{row.flatInt}</td>
                      <td className="border border-slate-200 p-3 text-center font-bold text-orange-700">{row.extra}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mb-4">*₹5 lakh loan at 9% p.a. Flat rate example shows ~80–90% higher total interest than reducing balance at the identical quoted rate.</p>

            {/* Convert tip */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm">
              <p className="font-bold text-blue-900 mb-1">🔄 Quick Rule: How to Convert Flat Rate to Reducing Equivalent</p>
              <p className="text-blue-800">
                Multiply the flat rate by approximately <strong>1.8 to 1.9</strong> to get the equivalent reducing balance rate.
                So a "9% flat rate" is actually equivalent to paying ~16–17% on reducing balance terms.
                Always ask your lender: <em>"Is this rate on reducing balance or flat/simple interest basis?"</em>
              </p>
            </div>

            {/* Tips */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Vehicle Loan Tips — Save on Interest</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                { n: 1, tip: "Check manufacturer financing — often lowest rates", detail: "Maruti Suzuki Finance, Hyundai Finance and Honda often offer rates 0.5–1% lower than regular banks as a sales tool. Always get a quote from the OEM's financing arm before your bank." },
                { n: 2, tip: "Negotiate ex-showroom price first, then financing", detail: "Dealers often make margin on loans. Negotiate the car price down first, then separately compare loan rates. Don't let the dealer bundle a bad loan rate into an attractive overall offer." },
                { n: 3, tip: "Avoid zero down payment — always pay 15–20%", detail: "Zero-down deals from dealers often embed fees in a higher interest rate. Paying 20% down reduces loan amount and total interest, and usually gets you a better rate from the bank." },
                { n: 4, tip: "No tax benefit on personal vehicle EMI — minimize tenure", detail: "Unlike home loans, vehicle loans give zero tax deduction for personal use. So there's no benefit in stretching the loan. Choose the shortest tenure you can afford to minimize total interest cost." },
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
              {vehicleFAQs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <FAQSchema faqs={vehicleFAQs} />
        <AuthorBox />

        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <ResponsiveAd />
          <RectangleAd />
        </div>

        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Related Calculators</h2>
            <p className="text-slate-600 mb-6">Plan your complete financial commitments alongside your vehicle loan.</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/home-loan">
                <div className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Home Loan Calculator</h3>
                  <p className="text-sm text-slate-600">Check if you can afford both vehicle and home loan EMIs together</p>
                </div>
              </Link>
              <Link href="/calculators/income-tax">
                <div className="p-4 bg-white rounded-lg border hover:border-green-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Income Tax Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate your take-home income after tax to plan EMIs</p>
                </div>
              </Link>
              <Link href="/calculators/sip">
                <div className="p-4 bg-white rounded-lg border hover:border-purple-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">SIP Calculator</h3>
                  <p className="text-sm text-slate-600">Invest the money you save with a shorter loan tenure</p>
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

        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              © 2026 AiTaxBot. All rights reserved. | Vehicle Loan EMI Calculator — Two-Wheeler & Car Loan India
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}

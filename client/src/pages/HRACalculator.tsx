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
import HRACalculator from '@/components/calculators/HRACalculator';

const hraFAQs = [
  {
    question: "What are the 4 metro cities for HRA calculation in India?",
    answer: "Under Section 10(13A) (Schedule II, Table Sl. No. 2 under ITA 2025), only four cities qualify as metro cities for HRA purposes: Mumbai, Delhi (NCT), Kolkata, and Chennai. Metro city employees can claim up to 50% of basic salary as HRA exemption cap. All other cities (including Bangalore, Hyderabad, Pune, Ahmedabad) are classified as non-metro with a 40% cap. This distinction is critical — claiming the wrong percentage is one of the most common HRA mistakes."
  },
  {
    question: "Can I claim HRA and home loan interest deduction together?",
    answer: "Yes — this is one of the biggest myths in Indian taxation. You can claim both HRA exemption (Section 10(13A) / Schedule II, Table Sl. No. 2 under ITA 2025) and home loan interest deduction (Section 24(b) / Section 22(2) under ITA 2025) simultaneously. This works when you are living in rented accommodation in your city of employment and own a property in a different city, or if you haven't yet moved into your purchased flat. Both claims must be genuine and supported by proper documentation (rent agreement, rent receipts, home loan documents)."
  },
  {
    question: "How is HRA exemption calculated — what is the three-part formula?",
    answer: "HRA exemption is the minimum of three amounts: (1) Actual HRA received from your employer, (2) Rent paid minus 10% of basic salary, and (3) 50% of basic salary for metro cities OR 40% of basic salary for non-metro cities. The lowest of these three is your HRA exemption. Most commonly, component 2 (Rent − 10% of basic) acts as the binding constraint."
  },
  {
    question: "Can I pay rent to my parents and claim HRA exemption?",
    answer: "Yes, paying rent to parents and claiming HRA exemption is legally valid, provided: (1) A genuine rent agreement exists between you and your parents, (2) Rent is paid via bank transfer (not cash), (3) You maintain stamped rent receipts, and (4) Your parents declare this rental income in their own ITR. Your parents' taxable income may be lower (especially if they are senior citizens with ₹3L basic exemption), making this a legitimate tax planning strategy that benefits both you and your parents."
  },
  {
    question: "Is PAN of landlord mandatory for claiming HRA?",
    answer: "PAN of your landlord is mandatory only if the annual rent paid exceeds ₹1,00,000 (i.e., more than ₹8,333 per month). Your employer requires the landlord's PAN to process HRA exemption for TDS purposes. If the landlord does not have a PAN, they must provide a self-declaration under Form 60 signed by them."
  },
  {
    question: "Can self-employed people claim HRA exemption?",
    answer: "No, HRA exemption under Section 10(13A) (Schedule II, Table Sl. No. 2 under ITA 2025) is available only to salaried employees who receive HRA as part of their salary structure. Self-employed individuals, professionals, and business owners cannot claim HRA exemption, even if they pay rent for their residence. However, they can claim rent paid as a business expense or use it under other provisions depending on their business structure."
  }
];

export default function HRACalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/hra', 'HRA Calculator India FY 2026-27 - House Rent Allowance Exemption | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "HRA Calculator - House Rent Allowance",
    description: "Free HRA Calculator to compute House Rent Allowance tax exemption under Section 10(13A) for metro and non-metro cities in India FY 2026-27.",
    url: "https://www.aitaxbot.co.in/calculators/hra",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.aitaxbot.co.in/" },
    { name: "Calculators", url: "https://www.aitaxbot.co.in/calculators" },
    { name: "HRA Calculator", url: "https://www.aitaxbot.co.in/calculators/hra" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>HRA Calculator India FY 2026-27 - House Rent Allowance Exemption | AiTaxBot</title>
        <meta name="description" content="Free HRA Calculator for FY 2026-27. Calculate House Rent Allowance exemption under Section 10(13A) for metro & non-metro cities. Compute 3-part formula: actual HRA, rent minus 10% basic, 50%/40% basic. CA verified." />
        <meta name="keywords" content="HRA calculator, house rent allowance, section 10 13a, HRA exemption, HRA deduction, metro HRA, non-metro HRA, rent calculator India, Section 10(13A)" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators/hra" />
        <meta property="og:title" content="HRA Calculator India FY 2026-27 - House Rent Allowance Exemption | AiTaxBot" />
        <meta property="og:description" content="Free HRA Calculator FY 2026-27. Compute House Rent Allowance exemption under Section 10(13A) for metro & non-metro cities using the 3-part minimum formula." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators/hra" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-slate-50">

        <CalcPageHeader
          title="HRA Exemption Calculator FY 2026-27"
          subtitle="Calculate your exact HRA exemption under 8 metro cities rule (IT Rules 2026). Includes Old Regime only — HRA is not available under New Regime."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Calculators", href: "/calculators" },
            { label: "HRA Calculator" }
          ]}
          badge="FY 2026-27 ✓"
        />

        {/* Calculator */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <HRACalculator />
          </div>
        </section>

        {/* Misconception Buster */}
        <section className="py-6 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                ⚠️ Common HRA Misconception — Metro vs Non-Metro Cities
              </h3>
              <p className="text-red-700 mb-2">
                Many employees believe <strong>Hyderabad and Bangalore are metro cities for HRA calculation</strong>.
                They are not. Under the Income Tax Act Section 10(13A), <strong>only four cities are classified as metro:
                Mumbai, Delhi (NCT), Kolkata, and Chennai</strong>.
              </p>
              <p className="text-red-700">
                Bangalore, Hyderabad, Pune, and all other cities are <strong>non-metro</strong> — capped at
                <strong> 40% of basic salary</strong>, not 50%. Claiming 50% for these cities is an error that commonly
                triggers ITR assessments and tax notices. Double-check your city classification in our calculator.
              </p>
            </div>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Understanding HRA Exemption — Section 10(13A)</h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">What is HRA?</h3>
                <p className="text-slate-600">
                  House Rent Allowance (HRA) is a component of your salary provided by employers to offset
                  accommodation expenses. It is partially or fully exempt from income tax under Section 10(13A)
                  based on a formula involving your basic salary, rent paid, and city of residence.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Who Can Claim HRA?</h3>
                <p className="text-slate-600">
                  Salaried individuals living in rented accommodation can claim HRA exemption. You must receive HRA
                  as an explicit component of your salary structure and actually pay rent to a landlord (or parents,
                  with proper documentation). Self-employed and business owners cannot claim HRA.
                </p>
              </div>
            </div>

            {/* HRA Exemption Formula */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">The HRA Exemption Formula — 3-Part Minimum Rule</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
              <p className="text-slate-700 font-semibold mb-4">
                HRA exemption is <strong>the minimum of these three amounts</strong>:
              </p>
              <div className="space-y-3 mb-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">①</div>
                  <div>
                    <p className="font-semibold text-slate-900">Actual HRA Received</p>
                    <p className="text-sm text-slate-600">The HRA component paid by your employer in the financial year.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">②</div>
                  <div>
                    <p className="font-semibold text-slate-900">Rent Paid − 10% of Basic Salary</p>
                    <p className="text-sm text-slate-600">Total annual rent paid to landlord, minus 10% of your basic salary (both annual figures).</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">③</div>
                  <div>
                    <p className="font-semibold text-slate-900">50% (Metro) or 40% (Non-Metro) of Basic Salary</p>
                    <p className="text-sm text-slate-600">
                      50% of basic salary for metro cities (Mumbai, Delhi, Kolkata, Chennai),
                      or 40% for all other non-metro cities.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-blue-700 font-semibold bg-blue-100 rounded p-3">
                💡 The lowest of these three values is your HRA exemption. Most often, component ② (Rent − 10% of basic) is the binding constraint.
              </p>
            </div>

            {/* Metro vs Non-Metro */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Metro vs Non-Metro Cities — Updated for FY 2026-27</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-900 font-semibold">
                🆕 Rule Change from FY 2026-27 (IT Rules 2026, Rule 280): The list of metro cities for HRA has expanded from 4 to 8.
                Bengaluru, Hyderabad, Pune and Ahmedabad are now metro cities — qualifying for 50% HRA cap instead of 40%.
                This change applies to FY 2026-27 onwards. For FY 2025-26 and earlier, only the original 4 cities applied.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-green-800 mb-3">8 Metro Cities (50% cap) — FY 2026-27 onwards</h3>
                <div className="grid grid-cols-2 gap-2">
                  {["Mumbai", "Delhi (NCT)", "Kolkata", "Chennai", "Bengaluru", "Hyderabad", "Pune", "Ahmedabad"].map(city => (
                    <div key={city} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>{city}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-700 mt-3 bg-green-100 rounded p-2">
                  Source: IT Rules 2026, Rule 280 — effective April 1, 2026. HRA exemption cap = 50% of basic salary for these 8 cities.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-amber-800 mb-3">All Other Cities (40% cap)</h3>
                <p className="text-sm text-slate-700 mb-3">
                  Every city not in the 8-metro list qualifies for 40% of basic salary:
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-amber-600 font-bold">→</span>
                    <span>Chandigarh, Jaipur, Lucknow, Surat</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600 font-bold">→</span>
                    <span>Bhopal, Nagpur, Kochi, Coimbatore</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600 font-bold">→</span>
                    <span>All Tier 2 and Tier 3 cities</span>
                  </li>
                </ul>
                <p className="text-xs text-amber-700 mt-3 bg-amber-100 rounded p-2">
                  If your city is not in the 8-metro list above, select Non-Metro in the calculator (40% cap applies).
                </p>
              </div>
            </div>

            {/* Worked Examples */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Worked Examples</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">

              {/* Example 1: Mumbai Metro */}
              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 1 — Mumbai Metro Employee</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Basic Salary (annual):</span><span className="font-semibold">₹6,00,000</span></div>
                  <div className="flex justify-between"><span>HRA received (annual):</span><span className="font-semibold">₹3,00,000</span></div>
                  <div className="flex justify-between"><span>Rent paid (annual):</span><span className="font-semibold">₹2,40,000</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>① Actual HRA:</span><span className="font-semibold">₹3,00,000</span></div>
                  <div className="flex justify-between"><span>② Rent − 10% basic:</span><span className="font-semibold">₹1,80,000</span></div>
                  <div className="flex justify-between"><span>③ 50% of basic (metro):</span><span className="font-semibold">₹3,00,000</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span className="font-bold text-green-700">HRA Exempt (min):</span><span className="font-bold text-green-700">₹1,80,000</span></div>
                </div>
              </div>

              {/* Example 2: Hyderabad now Metro FY 2026-27 */}
              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 2 — Hyderabad (Now Metro from FY 2026-27!)</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Basic Salary (annual):</span><span className="font-semibold">₹10,00,000</span></div>
                  <div className="flex justify-between"><span>HRA received (annual):</span><span className="font-semibold">₹5,00,000</span></div>
                  <div className="flex justify-between"><span>Rent paid (annual):</span><span className="font-semibold">₹4,80,000</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>① Actual HRA:</span><span className="font-semibold">₹5,00,000</span></div>
                  <div className="flex justify-between"><span>② Rent − 10% basic:</span><span className="font-semibold">₹3,80,000</span></div>
                  <div className="flex justify-between text-green-700"><span>③ 50% of basic (METRO now!):</span><span className="font-semibold">₹5,00,000</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span className="font-bold text-green-700">HRA Exempt (min):</span><span className="font-bold text-green-700">₹3,80,000</span></div>
                  <div className="text-xs text-blue-700 mt-2">📌 Under old rules (FY 2025-26), ③ would have been 40% = ₹4,00,000. Same result here, but at higher incomes the 50% cap gives more exemption.</div>
                </div>
              </div>

              {/* Example 3: Rent to Parents */}
              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 3 — Rent to Parents Strategy</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Rent paid to parents (annual):</span><span className="font-semibold">₹1,80,000</span></div>
                  <div className="flex justify-between"><span>Child's HRA exemption (formula):</span><span className="font-semibold text-blue-700">₹1,20,000–₹1,80,000</span></div>
                  <div className="flex justify-between"><span>Tax saved (child, 30% slab):</span><span className="font-semibold text-blue-700">~₹37,000–₹56,000</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span>Parents declare rental income:</span><span className="font-semibold">₹1,80,000</span></div>
                  <div className="flex justify-between"><span>Parents' tax (senior, 0% up to ₹3L):</span><span className="font-semibold text-blue-700">₹0</span></div>
                </div>
              </div>

              {/* Example 4: HRA + Home Loan */}
              <div className="bg-slate-50 border rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Example 4 — HRA + Home Loan Together</h3>
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between"><span>Lives in: Bangalore (rented)</span><span className="font-semibold">Claims HRA</span></div>
                  <div className="flex justify-between"><span>Owns flat in: Pune (rented out)</span><span className="font-semibold">Section 24(b)</span></div>
                  <div className="flex justify-between"><span>Home loan interest:</span><span className="font-semibold">₹2,00,000</span></div>
                  <div className="border-t border-slate-300 my-2"></div>
                  <div className="flex justify-between"><span className="font-bold text-purple-700">HRA exemption:</span><span className="font-bold text-purple-700">₹X (formula)</span></div>
                  <div className="flex justify-between"><span className="font-bold text-purple-700">Home loan deduction:</span><span className="font-bold text-purple-700">₹2,00,000</span></div>
                </div>
              </div>

            </div>

            {/* Pro Tips */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Pro Tips on HRA — Maximize Your Exemption</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-blue-600 text-lg font-bold shrink-0">1</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Bengaluru/Hyderabad/Pune/Ahmedabad are NOW metro from FY 2026-27 — use 50%</p>
                  <p className="text-slate-600 text-sm mt-1">IT Rules 2026 (Rule 280) expanded the metro list from 4 to 8 cities. If you're in Bengaluru, Hyderabad, Pune or Ahmedabad, you now qualify for the 50% HRA cap from FY 2026-27 — a meaningful boost to your exemption. Make sure your employer has updated their payroll system.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">2</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Increase your rent agreement to maximize exemption — it's legal</p>
                  <p className="text-slate-600 text-sm mt-1">Component ② (Rent − 10% basic) is often the binding constraint. Paying higher genuine rent directly increases your HRA exemption. If you're under-renting relatives, adjust to market rate (with proper documentation).</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">3</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">PAN mandatory for landlord if annual rent exceeds ₹1 lakh</p>
                  <p className="text-slate-600 text-sm mt-1">If annual rent is more than ₹1,00,000, your employer requires landlord's PAN to process HRA exemption. Without it, TDS cannot be waived. Landlord can provide Form 60 self-declaration if no PAN.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">4</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">You CAN claim both HRA and home loan deduction together</p>
                  <p className="text-slate-600 text-sm mt-1">This is valid if you rent where you work and own a property in a different city. Both claims must be genuine and documented. Use our Income Tax Calculator to verify savings across both regimes.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">5</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Rent to parents is legitimate — get a proper rent agreement</p>
                  <p className="text-slate-600 text-sm mt-1">You can claim HRA for rent paid to parents. Ensure a written rent agreement exists, pay via bank, maintain receipts, and parents declare this income in their ITR. Parents' lower tax bracket = family saves more tax.</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-amber-600 text-lg font-bold shrink-0">6</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">HRA only available under OLD tax regime — new regime gives nothing</p>
                  <p className="text-slate-600 text-sm mt-1">Section 10(13A) HRA exemption applies only under the Old Tax Regime. Under the New Regime (default from FY 2023-24), your entire HRA is taxable. Always compare both regimes using our Income Tax Calculator.</p>
                </div>
              </div>
            </div>

            {/* HRA vs Standard Deduction / Regime Comparison */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">HRA vs Standard Deduction — New vs Old Regime Impact</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-3 text-left font-semibold">Feature</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-green-700">Old Regime (with HRA)</th>
                    <th className="border border-slate-200 p-3 text-center font-semibold text-slate-700">New Regime (no HRA)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">HRA Exemption</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-semibold">Available (formula-based)</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">NOT available — HRA fully taxable</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Home Loan Interest (Section 24(b))</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-semibold">Available (₹2L limit)</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">NOT available</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Section 80C Deductions (PPF, LIC, ELSS)</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-semibold">Available (₹1.5L limit)</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-700">NOT available</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Standard Deduction</td>
                    <td className="border border-slate-200 p-3 text-center">₹50,000 (FY 2026-27)</td>
                    <td className="border border-slate-200 p-3 text-center text-green-700 font-semibold">₹75,000 (FY 2026-27)</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Best For</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-600">High income, high deductions (HRA + Home Loan)</td>
                    <td className="border border-slate-200 p-3 text-center text-slate-600">Low income, few deductions</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FAQs */}
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {hraFAQs.map((faq, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <FAQSchema faqs={hraFAQs} />
        <AuthorBox />

        {/* Ads */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <ResponsiveAd />
          <RectangleAd />
        </div>

        {/* Related Calculators */}
        <section className="py-12 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Related Tax & Deduction Calculators</h2>
            <p className="text-slate-600 mb-6">
              HRA is a key deduction under the Old Tax Regime. Use these calculators to plan your complete tax strategy.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/income-tax">
                <div className="p-4 bg-white rounded-lg border hover:border-persian-blue-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">Income Tax Calculator</h3>
                  <p className="text-sm text-slate-600">Compare Old vs New regime with all deductions including HRA</p>
                </div>
              </Link>
              <Link href="/calculators/nps">
                <div className="p-4 bg-white rounded-lg border hover:border-indigo-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">NPS Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate retirement corpus with ₹50,000 extra deduction</p>
                </div>
              </Link>
              <Link href="/calculators/pf">
                <div className="p-4 bg-white rounded-lg border hover:border-green-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-slate-900 mb-1">PF Calculator</h3>
                  <p className="text-sm text-slate-600">Calculate EPF + VPF with 80C deduction impact</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow transition-all">
                  <h3 className="font-semibold text-green-700 mb-1">All Calculators</h3>
                  <p className="text-sm text-green-600">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              © 2026 AiTaxBot. All rights reserved. | HRA Calculator — House Rent Allowance Exemption
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}

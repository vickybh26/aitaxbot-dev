import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Globe, ChevronRight, AlertCircle, Calculator, TrendingUp, BookOpen, Users } from "lucide-react";
import AuthorBox from "@/components/AuthorBox";
import AdBanner, { ResponsiveAd, RectangleAd } from "@/components/AdBanner";
import Footer from "@/components/Footer";

// TDS rate mapping by income type
const tdsPratesByType = {
  "salary": 10,
  "business": 10,
  "interest-nro": 30,
  "dividend": 20,
  "capital-gains-equity": 15,
  "capital-gains-property": 20,
  "royalty": 30,
};

const countryData = {
  usa: { name: "USA", treatySince: 1990, hasDTAA: true, hasIncomeTax: true },
  uk: { name: "UK", treatySince: 1993, hasDTAA: true, hasIncomeTax: true },
  uae: { name: "UAE", treatySince: 0, hasDTAA: false, hasIncomeTax: false },
  canada: { name: "Canada", treatySince: 1996, hasDTAA: true, hasIncomeTax: true },
  australia: { name: "Australia", treatySince: 1991, hasDTAA: true, hasIncomeTax: true },
  singapore: { name: "Singapore", treatySince: 1994, hasDTAA: true, hasIncomeTax: true },
  germany: { name: "Germany", treatySince: 1996, hasDTAA: true, hasIncomeTax: true },
  netherlands: { name: "Netherlands", treatySince: 1988, hasDTAA: true, hasIncomeTax: true },
  france: { name: "France", treatySince: 1989, hasDTAA: true, hasIncomeTax: true },
  japan: { name: "Japan", treatySince: 1988, hasDTAA: true, hasIncomeTax: true },
};

export default function DTAACalculator() {
  const [country, setCountry] = useState("usa");
  const [incomeType, setIncomeType] = useState("interest-nro");
  const [annualIncome, setAnnualIncome] = useState(500000);
  const [tdsPercentage, setTdsPercentage] = useState(tdsPratesByType["interest-nro"]);
  const [foreignTaxRate, setForeignTaxRate] = useState(22);

  // Calculate values
  const tdsDeducted = (annualIncome * tdsPercentage) / 100;
  const foreignTaxLiability = (annualIncome * foreignTaxRate) / 100;
  const dtaaRelief = Math.min(tdsDeducted, foreignTaxLiability);
  const netForeignTax = Math.max(0, foreignTaxLiability - dtaaRelief);
  const totalTax = tdsDeducted + netForeignTax;
  const taxSavedViaDTAA = foreignTaxLiability - netForeignTax;

  const handleIncomeTypeChange = (type) => {
    setIncomeType(type);
    setTdsPercentage(tdsPratesByType[type] || 10);
  };

  const countryInfo = countryData[country];
  const isUAE = country === "uae";

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>DTAA Calculator — Avoid Double Taxation | NRI Tax Relief India | AiTaxBot</title>
        <meta name="description" content="Calculate your DTAA tax relief as an NRI. See how much tax you save under India's Double Taxation Avoidance Agreements with USA, UK, UAE, Canada and 90+ countries." />
        <meta name="keywords" content="DTAA calculator, double taxation India NRI, foreign tax credit India, NRI tax relief, Form 10F, TRC certificate" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is Form 10F and why do I need it?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Form 10F is a Certificate for Lower/Nil Deduction of TDS. As an NRI, you need it to claim reduced DTAA rates of TDS instead of the default 30%. Submit it to Indian payers (banks, employers, etc.) along with your Tax Residency Certificate."
                }
              },
              {
                "@type": "Question",
                "name": "Can I get a refund if excess TDS was deducted in India?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. If TDS deducted exceeds your tax liability, you can file Form 10F in advance to claim lower rates, or file an income tax return to claim refunds for excess TDS. Keep Form 16A/26AS as proof."
                }
              },
              {
                "@type": "Question",
                "name": "Does DTAA apply to NRE account interest?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "NRE account interest is exempt under Section 10(4) of the Income Tax Act. No TDS is deducted and no DTAA relief is needed. However, NRO interest is taxable and DTAA applies."
                }
              },
              {
                "@type": "Question",
                "name": "What if my country doesn't have a DTAA with India?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "If your country lacks a DTAA with India, you cannot claim foreign tax credit under a treaty. However, some countries allow unilateral credits under their domestic law. Consult a tax advisor in your country."
                }
              },
              {
                "@type": "Question",
                "name": "Is DTAA benefit automatic or do I need to apply?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "DTAA benefits are NOT automatic. You must proactively submit Form 10F and Tax Residency Certificate to claim reduced TDS rates in India, and file your foreign tax return to claim Foreign Tax Credit."
                }
              },
              {
                "@type": "Question",
                "name": "Do I need to report Indian income in my foreign country?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. Most countries tax their residents on worldwide income. You must report your Indian income in your country's tax return and claim Foreign Tax Credit for taxes paid in India to avoid double taxation."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-600 to-orange-700 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-orange-100 text-sm mb-6">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <ChevronRight size={16} />
            <Link href="/nri" className="hover:text-white transition">NRI Corner</Link>
            <ChevronRight size={16} />
            <span>DTAA Calculator</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">DTAA Calculator</h1>
          <p className="text-xl text-orange-100 max-w-2xl">
            Avoid double taxation on your income. Calculate your tax relief under India's Double Taxation Avoidance Agreements with 90+ countries.
          </p>
        </div>
      </section>

      {/* Misconception Buster */}
      <section className="py-12 md:py-16 border-t border-gray-200">
        <div className="container mx-auto px-4 md:px-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-red-700 mb-4">
              Most NRIs Pay Double Tax — And Don't Even Know It
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Many NRIs pay full tax in their country of residence AND full TDS on Indian income, without claiming the DTAA relief they're entitled to. The DTAA between India and most countries means you pay tax only once — or get a credit. This can save ₹50,000 to ₹5,00,000+ annually depending on your income.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Calculator */}
      <section className="py-12 md:py-16 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-2">Calculate Your DTAA Relief</h2>
          <p className="text-gray-600 mb-8">Enter your details to see how much tax you can save under DTAA</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                {/* Country Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country of Residence
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="usa">USA</option>
                    <option value="uk">UK</option>
                    <option value="uae">UAE (No income tax)</option>
                    <option value="canada">Canada</option>
                    <option value="australia">Australia</option>
                    <option value="singapore">Singapore</option>
                    <option value="germany">Germany</option>
                    <option value="netherlands">Netherlands</option>
                    <option value="france">France</option>
                    <option value="japan">Japan</option>
                  </select>
                </div>

                {/* Income Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type of Income
                  </label>
                  <select
                    value={incomeType}
                    onChange={(e) => handleIncomeTypeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="salary">Salary/Business Income</option>
                    <option value="interest-nro">Interest Income (NRO)</option>
                    <option value="dividend">Dividend Income</option>
                    <option value="capital-gains-equity">Capital Gains (Equity)</option>
                    <option value="capital-gains-property">Capital Gains (Property)</option>
                    <option value="royalty">Royalty/FTS</option>
                  </select>
                </div>

                {/* Annual Income */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Annual Income from India (₹)
                  </label>
                  <input
                    type="number"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">₹{annualIncome.toLocaleString("en-IN")}</p>
                </div>

                {/* TDS Percentage */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    TDS Deducted in India (%)
                  </label>
                  <input
                    type="number"
                    value={tdsPercentage}
                    onChange={(e) => setTdsPercentage(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: {tdsPratesByType[incomeType]}% for {incomeType.replace("-", " ")}</p>
                </div>

                {/* Foreign Tax Rate */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tax Rate in {countryInfo.name} (%)
                  </label>
                  <input
                    type="number"
                    value={foreignTaxRate}
                    onChange={(e) => setForeignTaxRate(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Marginal tax rate in your country</p>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {/* UAE Special Note */}
                {isUAE && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>UAE has no personal income tax.</strong> Your Indian TDS is your final tax cost. No additional tax is payable in UAE.
                    </p>
                  </div>
                )}

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <p className="text-gray-600 text-sm mb-2">TDS Deducted in India</p>
                    <p className="text-3xl font-bold text-gray-900">₹{tdsDeducted.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <p className="text-gray-600 text-sm mb-2">Tax Liability in {countryInfo.name}</p>
                    <p className="text-3xl font-bold text-gray-900">₹{foreignTaxLiability.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <p className="text-gray-600 text-sm mb-2">DTAA Relief Available (FTC)</p>
                    <p className="text-3xl font-bold text-blue-600">₹{dtaaRelief.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <p className="text-gray-600 text-sm mb-2">Net Tax in {countryInfo.name}</p>
                    <p className="text-3xl font-bold text-gray-900">₹{netForeignTax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <p className="text-gray-600 text-sm mb-2">Total Effective Tax</p>
                    <p className="text-3xl font-bold text-gray-900">₹{totalTax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg shadow-md p-6 border border-green-200">
                    <p className="text-gray-600 text-sm mb-2">Tax Saved via DTAA</p>
                    <p className="text-3xl font-bold text-green-600">₹{taxSavedViaDTAA.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-green-700 mt-2">You save this by claiming DTAA relief</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is DTAA / Who Should Use */}
      <section className="py-12 md:py-16 border-t border-gray-200">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-8">DTAA Essentials</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What is DTAA */}
            <div className="bg-blue-50 rounded-lg p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-blue-900 mb-4">What is DTAA?</h3>
              <p className="text-gray-700 leading-relaxed">
                India has Double Taxation Avoidance Agreements (DTAAs) with 90+ countries. These treaties specify which country has the right to tax certain income, and where both countries tax the same income, they provide a tax credit (foreign tax credit method) or exemption method to avoid you paying tax twice on the same income.
              </p>
            </div>

            {/* Who Should Use */}
            <div className="bg-green-50 rounded-lg p-8 border border-green-100">
              <h3 className="text-xl font-bold text-green-900 mb-4">Who Should Use DTAA?</h3>
              <p className="text-gray-700 leading-relaxed">
                Any NRI earning income from India — rental income from property, interest on NRO accounts, dividends from Indian companies, capital gains from selling Indian assets, salary from Indian employers, or freelance and consultancy fees paid by Indian companies. If you earn ANY income in India and pay tax, you may qualify for DTAA relief.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key DTAA Methods */}
      <section className="py-12 md:py-16 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-8">Key DTAA Methods</h2>

          <div className="bg-blue-50 rounded-lg border border-blue-100 p-8">
            <p className="text-gray-700 mb-6">DTAAs use two main methods to eliminate double taxation:</p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">1. Exemption Method</h3>
                <p className="text-gray-700">
                  Income is taxed only in one country and is completely exempt in the other. Common for government salaries, pensions, and certain dividends. Example: Many DTAAs exempt Indian government pensions from foreign tax.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">2. Tax Credit Method (Most Common)</h3>
                <p className="text-gray-700">
                  Income is taxed in both countries, but you get a credit for tax paid in India when filing your return abroad. Most DTAAs use this method. Example: You pay 30% TDS in India and 22% tax in the US; you claim credit for the 30% in your US return.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DTAA Table */}
      <section className="py-12 md:py-16 border-t border-gray-200">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-8">Country-wise DTAA Highlights</h2>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Country</th>
                  <th className="px-6 py-4 text-left font-semibold">Treaty Since</th>
                  <th className="px-6 py-4 text-left font-semibold">Key Benefit</th>
                  <th className="px-6 py-4 text-left font-semibold">TDS (Interest)</th>
                  <th className="px-6 py-4 text-left font-semibold">TDS (Royalty)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">USA</td>
                  <td className="px-6 py-4 text-gray-700">1990</td>
                  <td className="px-6 py-4 text-gray-700">FTC on all income</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">UK</td>
                  <td className="px-6 py-4 text-gray-700">1993</td>
                  <td className="px-6 py-4 text-gray-700">FTC + reduced rates</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-gray-50 bg-yellow-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">UAE</td>
                  <td className="px-6 py-4 text-gray-700">No DTAA</td>
                  <td className="px-6 py-4 text-gray-700">TDS is final cost</td>
                  <td className="px-6 py-4 text-gray-700">12.5%</td>
                  <td className="px-6 py-4 text-gray-700">N/A</td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Canada</td>
                  <td className="px-6 py-4 text-gray-700">1996</td>
                  <td className="px-6 py-4 text-gray-700">FTC on all income</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Australia</td>
                  <td className="px-6 py-4 text-gray-700">1991</td>
                  <td className="px-6 py-4 text-gray-700">FTC on all income</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                </tr>
                <tr className="border-b border-gray-300 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Singapore</td>
                  <td className="px-6 py-4 text-gray-700">1994</td>
                  <td className="px-6 py-4 text-gray-700">Reduced rates</td>
                  <td className="px-6 py-4 text-gray-700">15%</td>
                  <td className="px-6 py-4 text-gray-700">10%</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Germany</td>
                  <td className="px-6 py-4 text-gray-700">1996</td>
                  <td className="px-6 py-4 text-gray-700">FTC + exemptions</td>
                  <td className="px-6 py-4 text-gray-700">10%</td>
                  <td className="px-6 py-4 text-gray-700">10%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Worked Examples */}
      <section className="py-12 md:py-16 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-8">Worked Examples</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Example 1 */}
            <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-orange-500">
              <h3 className="text-xl font-bold mb-6 text-gray-900">Example 1: US-Based NRI with NRO Interest</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">NRO FD Interest</span>
                  <span className="font-semibold text-gray-900">₹5,00,000</span>
                </div>
                <div className="flex justify-between bg-blue-50 p-2 rounded">
                  <span className="text-gray-700">TDS in India at 30%</span>
                  <span className="font-semibold text-gray-900">₹1,50,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">US Tax Rate</span>
                  <span className="font-semibold text-gray-900">22%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">US Tax on Same Income</span>
                  <span className="font-semibold text-gray-900">₹1,10,000</span>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-gray-700 mb-3"><strong>DTAA Calculation (FTC Method):</strong></p>
                  <div className="space-y-2 bg-green-50 p-3 rounded">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Credit Available (Min of India TDS &amp; US tax)</span>
                      <span className="font-semibold text-green-700">₹1,10,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Additional US Tax</span>
                      <span className="font-semibold text-green-700">₹0</span>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2 mt-2">
                      <span className="text-gray-900 font-bold">Total Tax Paid</span>
                      <span className="font-bold text-green-700">₹1,50,000</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 mt-3">India TDS &gt; US tax, so no additional US tax needed. DTAA saves you ₹1,10,000!</p>
                </div>
              </div>
            </div>

            {/* Example 2 */}
            <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-orange-500">
              <h3 className="text-xl font-bold mb-6 text-gray-900">Example 2: UK-Based NRI with Rental Income</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Indian Rental Income</span>
                  <span className="font-semibold text-gray-900">₹8,00,000</span>
                </div>
                <div className="flex justify-between bg-blue-50 p-2 rounded">
                  <span className="text-gray-700">TDS in India at 30%</span>
                  <span className="font-semibold text-gray-900">₹2,40,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">UK Tax Rate</span>
                  <span className="font-semibold text-gray-900">40%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">UK Tax Liability</span>
                  <span className="font-semibold text-gray-900">₹3,20,000</span>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-gray-700 mb-3"><strong>DTAA Calculation (FTC Method):</strong></p>
                  <div className="space-y-2 bg-green-50 p-3 rounded">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Credit for India TDS</span>
                      <span className="font-semibold text-green-700">₹2,40,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Net UK Tax Payable</span>
                      <span className="font-semibold text-green-700">₹80,000</span>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2 mt-2">
                      <span className="text-gray-900 font-bold">Total Tax Paid</span>
                      <span className="font-bold text-green-700">₹3,20,000</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 mt-3">Without DTAA you'd pay ₹5,60,000 (₹2,40,000 + ₹3,20,000). DTAA saves ₹2,40,000!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Tips */}
      <section className="py-12 md:py-16 border-t border-gray-200">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-8">6 Pro Tips for DTAA Success</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tip 1 */}
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-start gap-3">
                <span className="bg-amber-200 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">1</span>
                <span>Always File Form 10F</span>
              </h3>
              <p className="text-gray-700 text-sm">
                Submit Form 10F and Tax Residency Certificate (TRC) from your country to the Indian payer to avail lower DTAA TDS rates — otherwise default 30% applies on most income types.
              </p>
            </div>

            {/* Tip 2 */}
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-start gap-3">
                <span className="bg-amber-200 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">2</span>
                <span>UAE NRIs Pay Only Indian TDS</span>
              </h3>
              <p className="text-gray-700 text-sm">
                Since UAE has no income tax, your TDS deducted in India is your total cost. No Foreign Tax Credit is possible, but also no additional foreign tax to worry about.
              </p>
            </div>

            {/* Tip 3 */}
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-start gap-3">
                <span className="bg-amber-200 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">3</span>
                <span>NRO Interest TDS Can Be Reduced</span>
              </h3>
              <p className="text-gray-700 text-sm">
                Standard TDS on NRO interest is 30% + surcharge. Under DTAA, US/UK NRIs can get it reduced to 15% by submitting TRC + Form 10F to the bank.
              </p>
            </div>

            {/* Tip 4 */}
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-start gap-3">
                <span className="bg-amber-200 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">4</span>
                <span>Capital Gains Have Special Rules</span>
              </h3>
              <p className="text-gray-700 text-sm">
                Under most treaties, capital gains on Indian property are taxed only in India. But gains on Indian mutual funds by US NRIs may also be reportable in the US.
              </p>
            </div>

            {/* Tip 5 */}
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-start gap-3">
                <span className="bg-amber-200 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">5</span>
                <span>Choose What's More Beneficial</span>
              </h3>
              <p className="text-gray-700 text-sm">
                DTAA doesn't override domestic law if domestic law is beneficial. You can always choose whichever is more beneficial — domestic Indian tax law or DTAA provisions.
              </p>
            </div>

            {/* Tip 6 */}
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-start gap-3">
                <span className="bg-amber-200 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">6</span>
                <span>Claim FTC in Your Foreign Return</span>
              </h3>
              <p className="text-gray-700 text-sm">
                Keep your Indian TDS certificates (Form 16A, Form 26AS) safely — you'll need them to claim Foreign Tax Credit when filing your US/UK/Australia return.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-16 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {/* FAQ 1 */}
            <details className="bg-white rounded-lg border border-gray-200 p-6 group">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                <span>What is Form 10F and why do I need it?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronRight size={20} />
                </span>
              </summary>
              <p className="mt-4 text-gray-700">
                Form 10F is a Certificate for Lower/Nil Deduction of TDS. As an NRI, you need it to claim reduced DTAA rates of TDS instead of the default 30%. Submit it to Indian payers (banks, employers, etc.) along with your Tax Residency Certificate.
              </p>
            </details>

            {/* FAQ 2 */}
            <details className="bg-white rounded-lg border border-gray-200 p-6 group">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                <span>Can I get a refund if excess TDS was deducted in India?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronRight size={20} />
                </span>
              </summary>
              <p className="mt-4 text-gray-700">
                Yes. If TDS deducted exceeds your tax liability, you can file Form 10F in advance to claim lower rates, or file an income tax return to claim refunds for excess TDS. Keep Form 16A/26AS as proof.
              </p>
            </details>

            {/* FAQ 3 */}
            <details className="bg-white rounded-lg border border-gray-200 p-6 group">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                <span>Does DTAA apply to NRE account interest?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronRight size={20} />
                </span>
              </summary>
              <p className="mt-4 text-gray-700">
                NRE account interest is exempt under Section 10(4) of the Income Tax Act. No TDS is deducted and no DTAA relief is needed. However, NRO interest is taxable and DTAA applies.
              </p>
            </details>

            {/* FAQ 4 */}
            <details className="bg-white rounded-lg border border-gray-200 p-6 group">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                <span>What if my country doesn't have a DTAA with India?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronRight size={20} />
                </span>
              </summary>
              <p className="mt-4 text-gray-700">
                If your country lacks a DTAA with India, you cannot claim foreign tax credit under a treaty. However, some countries allow unilateral credits under their domestic law. Consult a tax advisor in your country.
              </p>
            </details>

            {/* FAQ 5 */}
            <details className="bg-white rounded-lg border border-gray-200 p-6 group">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                <span>Is DTAA benefit automatic or do I need to apply?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronRight size={20} />
                </span>
              </summary>
              <p className="mt-4 text-gray-700">
                DTAA benefits are NOT automatic. You must proactively submit Form 10F and Tax Residency Certificate to claim reduced TDS rates in India, and file your foreign tax return to claim Foreign Tax Credit.
              </p>
            </details>

            {/* FAQ 6 */}
            <details className="bg-white rounded-lg border border-gray-200 p-6 group">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                <span>Do I need to report Indian income in my foreign country?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronRight size={20} />
                </span>
              </summary>
              <p className="mt-4 text-gray-700">
                Yes. Most countries tax their residents on worldwide income. You must report your Indian income in your country's tax return and claim Foreign Tax Credit for taxes paid in India to avoid double taxation.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Author Box */}
      <section className="py-12 md:py-16 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <AuthorBox />
        </div>
      </section>

      {/* Ad Banner */}
      <section className="py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 md:px-8">
          <ResponsiveAd />
        </div>
      </section>

      {/* Related Tools */}
      <section className="py-12 md:py-16 border-t border-gray-200">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold mb-8">Related NRI Tools</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <Link href="/nri/nro-nre-comparison">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer border border-gray-200">
                <Globe size={32} className="text-orange-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">NRO vs NRE Comparison</h3>
                <p className="text-sm text-gray-600">Understand the difference between NRO and NRE accounts and choose the right one.</p>
              </div>
            </Link>

            {/* Card 2 */}
            <Link href="/nri/income-tax-calculator">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer border border-gray-200">
                <Calculator size={32} className="text-orange-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">NRI Income Tax Calculator</h3>
                <p className="text-sm text-gray-600">Calculate your income tax liability as an NRI on various income sources.</p>
              </div>
            </Link>

            {/* Card 3 */}
            <Link href="/nri/repatriation-planner">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer border border-gray-200">
                <TrendingUp size={32} className="text-orange-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Repatriation Planner</h3>
                <p className="text-sm text-gray-600">Plan your fund remittance strategy with tax-efficient repatriation options.</p>
              </div>
            </Link>

            {/* Card 4 */}
            <Link href="/calculators/income-tax">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer border border-gray-200">
                <BookOpen size={32} className="text-orange-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">Income Tax Calculator</h3>
                <p className="text-sm text-gray-600">Calculate your tax liability under the old and new tax regimes.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Rectangle Ad */}
      <section className="py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 md:px-8">
          <RectangleAd />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

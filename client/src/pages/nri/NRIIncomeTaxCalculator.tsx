import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Globe, ChevronRight, AlertCircle, Calculator, TrendingUp } from "lucide-react";
import AuthorBox from "@/components/AuthorBox";
import { AdBanner, ResponsiveAd, RectangleAd } from "@/components/AdBanner";
import {
  getTaxSlabs,
  calculateTaxForSlab,
  computeSurcharge,
  LTCG_EQUITY_EXEMPTION,
} from "@shared/taxLiability";

export default function NRIIncomeTaxCalculator() {
  // State for calculator inputs
  const [ageGroup, setAgeGroup] = useState<"below60" | "60to80" | "above80">("below60");
  const [salary, setSalary] = useState(0);
  const [rentalIncome, setRentalIncome] = useState(0);
  const [nroInterest, setNroInterest] = useState(0);
  const [dividendIncome, setDividendIncome] = useState(0);
  const [stcgEquity, setStcgEquity] = useState(0);
  const [ltcgEquity, setLtcgEquity] = useState(0);
  const [ltcgProperty, setLtcgProperty] = useState(0);
  const [dtaaEnabled, setDtaaEnabled] = useState(false);
  const [tdsPaid, setTdsPaid] = useState(0);
  const [dtaaRate, setDtaaRate] = useState(15);
  const [section80c, setSection80c] = useState(0);
  const [section80d, setSection80d] = useState(0);
  const [homeLoamInterest, setHomeLoamInterest] = useState(0);
  const [regime, setRegime] = useState<"new" | "old">("new");

  // Toggle states for income sources
  const [incomeToggles, setIncomeToggles] = useState({
    salary: false,
    rental: false,
    nroInterest: false,
    dividend: false,
    stcgEquity: false,
    ltcgEquity: false,
    ltcgProperty: false,
  });

  const toggleIncome = (key: keyof typeof incomeToggles) => {
    setIncomeToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // The page is titled "FY 2026-27"; pin the slab lookup to the same year
  // rather than letting it drift from the heading.
  const FINANCIAL_YEAR = "2026-27";

  // Slab tax on salary + rental.
  //
  // This used to be a hand-rolled ladder that matched no statutory year: the
  // FY 2024-25 lower bands (₹3L exempt, 5% to ₹7L) grafted onto FY 2025-26
  // upper bands, with a 10% band from ₹7L–₹12L that exists in neither Act, and
  // no 20% or 25% band at all — so it jumped straight from 15% to 30% at ₹15L.
  // At ₹20,00,000 it overstated tax by ₹65,000, at ₹25,00,000 by ₹85,000.
  //
  // Now delegated to the shared engine, which carries the real s.202 ladder for
  // the year and is covered by scripts/test-tax-calculations.ts.
  //
  // Note NRIs are not eligible for the s.87A / s.156 rebate, so we take the
  // pre-rebate slab figure rather than the engine's post-rebate total.
  const calculateTaxOnSalaryAndRental = (income: number): number => {
    const slabs = getTaxSlabs(regime === "old" ? "old" : "new", FINANCIAL_YEAR, "below60");
    return calculateTaxForSlab(Math.max(0, income), slabs).totalTax;
  };

  const totalSalaryAndRental = (incomeToggles.salary ? salary : 0) + (incomeToggles.rental ? rentalIncome : 0);

  // NRO Interest - 30% TDS (no threshold)
  const nroInterestTax = incomeToggles.nroInterest ? nroInterest * 0.3 : 0;

  // Dividend - 20% TDS
  const dividendTax = incomeToggles.dividend ? dividendIncome * 0.2 : 0;

  // STCG Equity — s.111A, 20% flat
  const stcgEquityTax = incomeToggles.stcgEquity ? stcgEquity * 0.2 : 0;

  // LTCG Equity — s.112A: the first ₹1,25,000 of listed-equity LTCG is exempt
  // each year, and only the balance is charged at 12.5%. The allowance was
  // missing entirely, overstating tax by ₹15,625 plus cess for any NRI with
  // equity gains.
  const ltcgEquityTaxable = incomeToggles.ltcgEquity
    ? Math.max(0, ltcgEquity - LTCG_EQUITY_EXEMPTION)
    : 0;
  const ltcgEquityTax = ltcgEquityTaxable * 0.125;

  // LTCG Property - 20% with indexation or 12.5% without
  const ltcgPropertyTax = incomeToggles.ltcgProperty ? ltcgProperty * 0.125 : 0;

  // Total income before deductions
  const totalIncome =
    totalSalaryAndRental +
    (incomeToggles.nroInterest ? nroInterest : 0) +
    (incomeToggles.dividend ? dividendIncome : 0) +
    (incomeToggles.stcgEquity ? stcgEquity : 0) +
    (incomeToggles.ltcgEquity ? ltcgEquity : 0) +
    (incomeToggles.ltcgProperty ? ltcgProperty : 0);

  // Deductions (old regime only). Chapter VI-A is allowable against slab income
  // — salary and rental here — and NOT against the special-rate heads below.
  //
  // These were previously computed, displayed as "Taxable Income", and then
  // never used: the slab tax was taken on the GROSS salary+rental figure, so
  // entering ₹1,50,000 of 80C moved the number on screen and changed the tax by
  // exactly ₹0. Every old-regime NRI who claimed a deduction was overcharged.
  const totalDeductions =
    regime === "old"
      ? Math.min(section80c, 150000) + Math.min(section80d, 50000) + Math.min(homeLoamInterest, 200000)
      : 0;

  const slabIncomeAfterDeductions = Math.max(0, totalSalaryAndRental - totalDeductions);
  const taxOnSalaryAndRental = calculateTaxOnSalaryAndRental(slabIncomeAfterDeductions);
  const taxableIncome = Math.max(totalIncome - totalDeductions, 0);

  // Total tax before surcharge and cess
  const totalTaxBeforeSurcharge =
    taxOnSalaryAndRental +
    nroInterestTax +
    dividendTax +
    stcgEquityTax +
    ltcgEquityTax +
    ltcgPropertyTax;

  // Tax charged at the special rates — s.111A STCG, s.112A LTCG, s.112 property
  // gains — carries a surcharge capped at 15% however high the band rate on the
  // rest of the income. Passed separately so computeSurcharge can apply that
  // ceiling; folding it into the base charged it at 25% or 37%.
  const specialRateTaxNRI = stcgEquityTax + ltcgEquityTax + ltcgPropertyTax;
  const slabOnlyTaxForSurcharge = totalTaxBeforeSurcharge;

  // Surcharge — 10% above ₹50L, 15% above ₹1Cr, 25% above ₹2Cr, 37% above ₹5Cr
  // in the old regime, with marginal relief at each threshold. Was a flat 25%
  // above ₹1Cr and nil below it, which missed the 10% band entirely
  // (understating ₹50L–₹1Cr) and charged 25% where 15% applies (₹1Cr–₹2Cr).
  // The regime must come from the user's selection, not a literal. Hardcoding
  // "new" capped an old-regime NRI at the 25% band when the old regime reaches
  // 37%, understating by ₹22,23,000 at ₹6Cr — and understatement is the
  // direction that earns a notice. The taxAtThreshold closure two lines down
  // already derived the regime correctly; this call did not.
  const surchargeResult = computeSurcharge(
    totalIncome,
    slabOnlyTaxForSurcharge,
    regime === "old" ? "old" : "new",
    (threshold) => {
      const slabs = getTaxSlabs(regime === "old" ? "old" : "new", FINANCIAL_YEAR, "below60");
      return calculateTaxForSlab(threshold, slabs).totalTax;
    },
    specialRateTaxNRI
  );
  const surcharge = surchargeResult.surcharge;

  // Health and Education Cess (4%)
  const cess = (totalTaxBeforeSurcharge + surcharge) * 0.04;

  // Total tax liability
  const totalTaxLiability = totalTaxBeforeSurcharge + surcharge + cess;

  // TDS already deducted
  const totalTdsDeducted = dtaaEnabled
    ? Math.min(tdsPaid, totalTaxLiability * (dtaaRate / 100))
    : nroInterestTax + dividendTax;

  // Balance payable or refund
  const balancePayable = Math.max(totalTaxLiability - totalTdsDeducted, 0);
  const refundDue = Math.max(totalTdsDeducted - totalTaxLiability, 0);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const faqs = [
    {
      q: "Which ITR form should NRIs file?",
      a: "NRIs should file ITR-2 if they have income from house property, capital gains, or other income sources. File ITR-1 if you have only salary income.",
    },
    {
      q: "Is NRE account interest taxable when I return to India?",
      a: "No, NRE account interest remains exempt even after you become a resident. However, any repatriation of principal on a foreign trip becomes taxable if you return to India and this is interpreted as breaking your NRE status.",
    },
    {
      q: "Can NRIs invest in PPF?",
      a: "No, NRIs cannot invest in or open new PPF accounts. They can only continue existing PPF accounts opened when they were residents.",
    },
    {
      q: "What is the last date for NRI ITR filing?",
      a: "The ITR filing deadline is 31st July for the previous financial year. Filing before 31st December allows you to avoid certain penalties.",
    },
    {
      q: "Do NRIs need to pay advance tax?",
      a: "Yes, if the total tax liability exceeds ₹10,000, NRIs must pay advance tax in four quarterly installments.",
    },
    {
      q: "Can NRI claim HRA deduction?",
      a: "No, NRIs cannot claim HRA deduction. HRA is only applicable to resident individuals.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>NRI Income Tax Calculator FY 2026-27 — No 87A Rebate | AiTaxBot</title>
        <meta
          name="description"
          content="Calculate your Indian income tax as an NRI for FY 2026-27. NRIs cannot claim Section 87A rebate. Includes NRO TDS, DTAA benefits, and capital gains calculation."
        />
        <meta name="keywords" content="NRI, income tax calculator, India, DTAA, NRO interest, capital gains" />
        <meta property="og:title" content="NRI Income Tax Calculator FY 2026-27 | AiTaxBot" />
        <meta
          property="og:description"
          content="Calculate your Indian income tax as an NRI with NRO TDS, DTAA benefits, and capital gains calculation."
        />
        <meta property="og:type" content="website" />

        {/* JSON-LD FAQ Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-rose-600 to-rose-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-2 text-sm mb-4 text-rose-100">
            <Link href="/" className="hover:text-white transition">
              Home
            </Link>
            <ChevronRight size={16} />
            <Link href="/nri-corner" className="hover:text-white transition">
              NRI Corner
            </Link>
            <ChevronRight size={16} />
            <span>NRI Income Tax Calculator</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">NRI Income Tax Calculator</h1>
          <p className="text-lg text-rose-100 max-w-2xl">
            Calculate your Indian income tax as an NRI for FY 2026-27. Different rules apply — no Section 87A rebate, special TDS rates, DTAA benefits.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Misconception Buster */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-12 rounded">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
            <div>
              <h2 className="text-xl font-bold text-red-900 mb-3">
                NRIs Cannot Claim the ₹60,000 Tax Rebate That Residents Get
              </h2>
              <p className="text-red-800 leading-relaxed mb-3">
                Under Section 87A, resident Indians with income up to ₹12 lakh pay zero tax. NRIs are NOT eligible for this rebate. An NRI earning ₹12 lakh from India pays ₹1,17,000 in tax — a difference of ₹1,17,000 compared to a resident. Additionally, NRIs pay 30% TDS on NRO interest automatically, with no benefit of basic exemption limit on certain incomes.
              </p>
            </div>
          </div>
        </div>

        {/* Calculator Section */}
        <div className="bg-card rounded-lg shadow-lg p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="text-rose-600" size={28} />
            <h2 className="text-2xl font-bold text-ink">Interactive NRI Income Tax Calculator</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              {/* Residential Status (Read-only) */}
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-2">Residential Status</label>
                <div className="px-4 py-3 bg-secondary rounded-lg text-ink/80 font-medium">
                  NRI (Non-Resident Indian)
                </div>
              </div>

              {/* Age Group */}
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-3">Age Group</label>
                <div className="space-y-2">
                  {[
                    { value: "below60", label: "Below 60 years" },
                    { value: "60to80", label: "60-80 years" },
                    { value: "above80", label: "Above 80 years" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="ageGroup"
                        value={option.value}
                        checked={ageGroup === option.value}
                        onChange={(e) => setAgeGroup(e.target.value as typeof ageGroup)}
                        className="w-4 h-4 text-rose-600"
                      />
                      <span className="text-ink/80">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Income Sources */}
              <div>
                <h3 className="text-sm font-semibold text-ink/80 mb-3">Income Sources</h3>
                <div className="space-y-4">
                  {/* Salary */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={incomeToggles.salary}
                      onChange={() => toggleIncome("salary")}
                      className="w-4 h-4 text-rose-600 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-ink/80 font-medium">Salary from Indian employer</span>
                      {incomeToggles.salary && (
                        <input
                          type="number"
                          value={salary}
                          onChange={(e) => setSalary(Number(e.target.value))}
                          placeholder="₹0"
                          className="w-full mt-2 px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      )}
                    </div>
                  </label>

                  {/* Rental Income */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={incomeToggles.rental}
                      onChange={() => toggleIncome("rental")}
                      className="w-4 h-4 text-rose-600 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-ink/80 font-medium">Rental income from Indian property</span>
                      {incomeToggles.rental && (
                        <input
                          type="number"
                          value={rentalIncome}
                          onChange={(e) => setRentalIncome(Number(e.target.value))}
                          placeholder="₹0"
                          className="w-full mt-2 px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      )}
                    </div>
                  </label>

                  {/* NRO Interest */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={incomeToggles.nroInterest}
                      onChange={() => toggleIncome("nroInterest")}
                      className="w-4 h-4 text-rose-600 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-ink/80 font-medium">NRO account interest (₹) — auto-applies 30% TDS</span>
                      {incomeToggles.nroInterest && (
                        <input
                          type="number"
                          value={nroInterest}
                          onChange={(e) => setNroInterest(Number(e.target.value))}
                          placeholder="₹0"
                          className="w-full mt-2 px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      )}
                    </div>
                  </label>

                  {/* Dividend Income */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={incomeToggles.dividend}
                      onChange={() => toggleIncome("dividend")}
                      className="w-4 h-4 text-rose-600 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-ink/80 font-medium">Dividend income (₹) — auto-applies 20% TDS</span>
                      {incomeToggles.dividend && (
                        <input
                          type="number"
                          value={dividendIncome}
                          onChange={(e) => setDividendIncome(Number(e.target.value))}
                          placeholder="₹0"
                          className="w-full mt-2 px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      )}
                    </div>
                  </label>

                  {/* STCG Equity */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={incomeToggles.stcgEquity}
                      onChange={() => toggleIncome("stcgEquity")}
                      className="w-4 h-4 text-rose-600 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-ink/80 font-medium">Short-term capital gains - equity (₹) — 20% flat (post budget 2024)</span>
                      {incomeToggles.stcgEquity && (
                        <input
                          type="number"
                          value={stcgEquity}
                          onChange={(e) => setStcgEquity(Number(e.target.value))}
                          placeholder="₹0"
                          className="w-full mt-2 px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      )}
                    </div>
                  </label>

                  {/* LTCG Equity */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={incomeToggles.ltcgEquity}
                      onChange={() => toggleIncome("ltcgEquity")}
                      className="w-4 h-4 text-rose-600 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-ink/80 font-medium">Long-term capital gains - equity (₹) — 12.5% flat above ₹1.25L (post budget 2024)</span>
                      {incomeToggles.ltcgEquity && (
                        <input
                          type="number"
                          value={ltcgEquity}
                          onChange={(e) => setLtcgEquity(Number(e.target.value))}
                          placeholder="₹0"
                          className="w-full mt-2 px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      )}
                    </div>
                  </label>

                  {/* LTCG Property */}
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={incomeToggles.ltcgProperty}
                      onChange={() => toggleIncome("ltcgProperty")}
                      className="w-4 h-4 text-rose-600 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-ink/80 font-medium">Long-term capital gains - property (₹)</span>
                      {incomeToggles.ltcgProperty && (
                        <input
                          type="number"
                          value={ltcgProperty}
                          onChange={(e) => setLtcgProperty(Number(e.target.value))}
                          placeholder="₹0"
                          className="w-full mt-2 px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* DTAA Benefit */}
              <div>
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={dtaaEnabled}
                    onChange={(e) => setDtaaEnabled(e.target.checked)}
                    className="w-4 h-4 text-rose-600"
                  />
                  <span className="text-ink/80 font-medium">Enable DTAA Benefit</span>
                </label>
                {dtaaEnabled && (
                  <div className="space-y-3 ml-7">
                    <div>
                      <label className="block text-sm text-ink/65 mb-1">TDS already paid (₹)</label>
                      <input
                        type="number"
                        value={tdsPaid}
                        onChange={(e) => setTdsPaid(Number(e.target.value))}
                        placeholder="₹0"
                        className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-ink/65 mb-1">DTAA relief rate (%)</label>
                      <input
                        type="number"
                        value={dtaaRate}
                        onChange={(e) => setDtaaRate(Number(e.target.value))}
                        placeholder="15"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Deductions */}
              <div>
                <h3 className="text-sm font-semibold text-ink/80 mb-3">Deductions (Only in Old Regime)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-ink/65 mb-1">Section 80C (Max ₹1.5L)</label>
                    <input
                      type="number"
                      value={section80c}
                      onChange={(e) => setSection80c(Number(e.target.value))}
                      placeholder="₹0"
                      disabled={regime === "new"}
                      className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink/65 mb-1">Section 80D health insurance (Max ₹25K/50K)</label>
                    <input
                      type="number"
                      value={section80d}
                      onChange={(e) => setSection80d(Number(e.target.value))}
                      placeholder="₹0"
                      disabled={regime === "new"}
                      className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink/65 mb-1">Home loan interest 80EEA (₹)</label>
                    <input
                      type="number"
                      value={homeLoamInterest}
                      onChange={(e) => setHomeLoamInterest(Number(e.target.value))}
                      placeholder="₹0"
                      disabled={regime === "new"}
                      className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Regime Selection */}
              <div>
                <label className="block text-sm font-semibold text-ink/80 mb-3">Tax Regime</label>
                <div className="space-y-2">
                  {[
                    { value: "new", label: "New Regime (Recommended)" },
                    { value: "old", label: "Old Regime" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="regime"
                        value={option.value}
                        checked={regime === option.value}
                        onChange={(e) => setRegime(e.target.value as typeof regime)}
                        className="w-4 h-4 text-rose-600"
                      />
                      <span className="text-ink/80">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-lg p-6 space-y-4 h-fit">
              <h3 className="text-lg font-bold text-ink mb-6">Tax Calculation Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-ink/80">Total Indian Income</span>
                  <span className="font-semibold text-ink">{formatCurrency(totalIncome)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-ink/80">Total Deductions</span>
                  <span className="font-semibold text-ink">{formatCurrency(totalDeductions)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-ink/80">Taxable Income</span>
                  <span className="font-semibold text-ink">{formatCurrency(taxableIncome)}</span>
                </div>

                <div className="pt-2 mt-4 space-y-2 bg-card bg-opacity-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-ink/65">Tax on Salary &amp; Rental</span>
                    <span className="font-medium text-ink">{formatCurrency(taxOnSalaryAndRental)}</span>
                  </div>

                  {incomeToggles.nroInterest && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-ink/65">Tax on NRO Interest (30%)</span>
                      <span className="font-medium text-ink">{formatCurrency(nroInterestTax)}</span>
                    </div>
                  )}

                  {incomeToggles.dividend && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-ink/65">Tax on Dividend (20%)</span>
                      <span className="font-medium text-ink">{formatCurrency(dividendTax)}</span>
                    </div>
                  )}

                  {incomeToggles.stcgEquity && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-ink/65">Tax on STCG Equity (20%)</span>
                      <span className="font-medium text-ink">{formatCurrency(stcgEquityTax)}</span>
                    </div>
                  )}

                  {incomeToggles.ltcgEquity && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-ink/65">Tax on LTCG Equity (12.5%)</span>
                      <span className="font-medium text-ink">{formatCurrency(ltcgEquityTax)}</span>
                    </div>
                  )}

                  {incomeToggles.ltcgProperty && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-ink/65">Tax on LTCG Property (12.5%)</span>
                      <span className="font-medium text-ink">{formatCurrency(ltcgPropertyTax)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-ink/80">Subtotal (before surcharge &amp; cess)</span>
                  <span className="font-semibold text-ink">{formatCurrency(totalTaxBeforeSurcharge)}</span>
                </div>

                {surcharge > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-rose-200">
                    <span className="text-ink/80">Surcharge (25%)</span>
                    <span className="font-semibold text-ink">{formatCurrency(surcharge)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-ink/80">Health &amp; Education Cess (4%)</span>
                  <span className="font-semibold text-ink">{formatCurrency(cess)}</span>
                </div>

                <div className="flex justify-between items-center py-3 bg-card bg-opacity-70 px-3 rounded-lg border-2 border-rose-300">
                  <span className="text-ink font-bold">Total Tax Liability</span>
                  <span className="font-bold text-rose-700 text-lg">{formatCurrency(totalTaxLiability)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-rose-200">
                  <span className="text-ink/80">TDS Already Deducted</span>
                  <span className="font-semibold text-ink">{formatCurrency(totalTdsDeducted)}</span>
                </div>

                {balancePayable > 0 && (
                  <div className="flex justify-between items-center py-3 bg-red-100 px-3 rounded-lg border-2 border-red-400">
                    <span className="text-red-900 font-bold">Balance Tax Payable</span>
                    <span className="font-bold text-red-700 text-lg">{formatCurrency(balancePayable)}</span>
                  </div>
                )}

                {refundDue > 0 && (
                  <div className="flex justify-between items-center py-3 bg-green-100 px-3 rounded-lg border-2 border-green-400">
                    <span className="text-green-900 font-bold">Refund Due</span>
                    <span className="font-bold text-green-700 text-lg">{formatCurrency(refundDue)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ad Banner */}
        <div className="mb-12">
          <ResponsiveAd />
        </div>

        {/* NRI vs Resident Comparison Table */}
        <div className="bg-card rounded-lg shadow-lg p-8 mb-12 overflow-x-auto">
          <h2 className="text-2xl font-bold text-ink mb-6">NRI vs Resident Tax Comparison</h2>
          <table className="w-full">
            <thead>
              <tr className="bg-secondary border-b-2 border-rule">
                <th className="px-4 py-3 text-left font-semibold text-ink">Feature</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Resident Indian</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">NRI</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-rule hover:bg-secondary">
                <td className="px-4 py-3 text-ink/80">Section 87A Rebate (up to ₹12L)</td>
                <td className="px-4 py-3">
                  <span className="text-green-600 font-semibold">✓ Yes — zero tax</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-red-600 font-semibold">✗ Not available</span>
                </td>
              </tr>
              <tr className="border-b border-rule hover:bg-secondary">
                <td className="px-4 py-3 text-ink/80">Basic Exemption Limit</td>
                <td className="px-4 py-3">₹3,00,000</td>
                <td className="px-4 py-3">₹3,00,000</td>
              </tr>
              <tr className="border-b border-rule hover:bg-secondary">
                <td className="px-4 py-3 text-ink/80">NRO Interest TDS</td>
                <td className="px-4 py-3">N/A</td>
                <td className="px-4 py-3">30% (flat, no threshold)</td>
              </tr>
              <tr className="border-b border-rule hover:bg-secondary">
                <td className="px-4 py-3 text-ink/80">LTCG on Equity</td>
                <td className="px-4 py-3">12.5% above ₹1.25L</td>
                <td className="px-4 py-3">12.5% (no ₹1.25L exemption for NRIs in some cases)</td>
              </tr>
              <tr className="border-b border-rule hover:bg-secondary">
                <td className="px-4 py-3 text-ink/80">Old Regime Deductions (80C, 80D)</td>
                <td className="px-4 py-3">
                  <span className="text-green-600 font-semibold">✓ Available</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-green-600 font-semibold">✓ Available</span>
                </td>
              </tr>
              <tr className="border-b border-rule hover:bg-secondary">
                <td className="px-4 py-3 text-ink/80">NPS 80CCD(1B) deduction</td>
                <td className="px-4 py-3">
                  <span className="text-green-600 font-semibold">✓ Available</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-red-600 font-semibold">✗ NRIs cannot open new NPS Tier 1</span>
                </td>
              </tr>
              <tr className="border-b border-rule hover:bg-secondary">
                <td className="px-4 py-3 text-ink/80">DTAA Benefits</td>
                <td className="px-4 py-3">
                  <span className="text-red-600 font-semibold">✗ N/A</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-green-600 font-semibold">✓ Available</span>
                </td>
              </tr>
              <tr className="border-b border-rule hover:bg-secondary">
                <td className="px-4 py-3 text-ink/80">Advance Tax</td>
                <td className="px-4 py-3">Required if &gt;₹10K liability</td>
                <td className="px-4 py-3">Required if &gt;₹10K liability</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Worked Examples */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Example 1 */}
          <div className="bg-secondary rounded-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-xl font-bold text-ink mb-4">Example 1: US-based NRI with Rental + NRO Interest</h3>
            <div className="space-y-2 text-ink mb-4">
              <p>
                <strong>Income:</strong>
              </p>
              <ul className="ml-4 space-y-1">
                <li>• Rental income: ₹6,00,000</li>
                <li>• NRO Interest: ₹2,00,000</li>
              </ul>
            </div>
            <div className="space-y-2 text-ink mb-4">
              <p>
                <strong>Calculation:</strong>
              </p>
              <ul className="ml-4 space-y-1">
                <li>• Tax on ₹6L (salary slab): ₹15,000 (3-7L at 5%)</li>
                <li>• NRO Interest taxed at 30% flat: ₹60,000 (TDS already deducted by bank)</li>
                <li>• Total tax: ₹75,000, TDS paid: ₹60,000</li>
              </ul>
            </div>
            <div className="bg-card p-3 rounded">
              <p className="text-ink font-semibold">Balance payable: ₹15,000</p>
              <p className="text-sm text-ink mt-1">NO 87A rebate applies</p>
            </div>
          </div>

          {/* Example 2 */}
          <div className="bg-paper rounded-lg p-6 border-l-4 border-ink">
            <h3 className="text-xl font-bold text-ink mb-4">Example 2: UK-based NRI with Property Sale</h3>
            <div className="space-y-2 text-ink mb-4">
              <p>
                <strong>Property Sale:</strong>
              </p>
              <ul className="ml-4 space-y-1">
                <li>• Purchase 2018: ₹40L</li>
                <li>• Sale 2024: ₹80L</li>
                <li>• LTCG: ₹40L (indexed)</li>
              </ul>
            </div>
            <div className="space-y-2 text-ink mb-4">
              <p>
                <strong>Tax &amp; TDS:</strong>
              </p>
              <ul className="ml-4 space-y-1">
                <li>• Tax at 20% with indexation or 12.5% without</li>
                <li>• TDS by buyer at 20%: ₹8,00,000</li>
                <li>• Can claim DTAA credit in UK return</li>
              </ul>
            </div>
            <div className="bg-card p-3 rounded">
              <p className="text-ink font-semibold">File ITR to claim refund of excess TDS</p>
            </div>
          </div>
        </div>

        {/* Ad Banner */}
        <div className="mb-12">
          <RectangleAd />
        </div>

        {/* Pro Tips */}
        <div className="bg-amber-50 rounded-lg p-8 mb-12 border-l-4 border-amber-500">
          <h2 className="text-2xl font-bold text-amber-900 mb-6">6 Pro Tips for NRI Tax Planning</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white font-bold">1</div>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">File ITR even if all tax is paid via TDS</h3>
                <p className="text-amber-800 text-sm">
                  Filing ITR allows you to claim refund of excess TDS, carry forward capital losses, and maintain a clean tax record for visa/loan applications.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white font-bold">2</div>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">NRIs can choose between old and new regime</h3>
                <p className="text-amber-800 text-sm">
                  Just like residents, NRIs can choose whichever regime results in lower tax. If you have large deductions (80C, home loan), old regime may be better.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white font-bold">3</div>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Property sale TDS is 20% regardless of gain</h3>
                <p className="text-amber-800 text-sm">
                  The buyer must deduct 20% TDS on the entire sale value (not just the gain). File ITR to claim refund of excess TDS after computing actual capital gains.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white font-bold">4</div>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Convert to resident if returning to India</h3>
                <p className="text-amber-800 text-sm">
                  Your tax status changes based on number of days in India. If you return permanently, your status changes to Resident — recalculate all tax implications including NRE interest (which becomes taxable).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white font-bold">5</div>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Submit Form 15CA/15CB for large remittances</h3>
                <p className="text-amber-800 text-sm">
                  For repatriating property sale proceeds or large amounts abroad, obtain CA-certified Form 15CB and file Form 15CA online before making the remittance.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white font-bold">6</div>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">DTAA election in Indian ITR</h3>
                <p className="text-amber-800 text-sm">
                  If you're claiming DTAA benefit to reduce withholding rates, mention it in Schedule DTAA of ITR-2 and attach your Tax Residency Certificate (TRC) as proof.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-card rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-ink mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <details key={index} className="group border border-rule rounded-lg">
                <summary className="flex items-center justify-between cursor-pointer p-4 bg-secondary hover:bg-secondary transition">
                  <h3 className="font-semibold text-ink">{faq.q}</h3>
                  <ChevronRight size={20} className="text-ink/65 group-open:rotate-90 transition" />
                </summary>
                <div className="px-4 py-3 text-ink/80 border-t border-rule">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Related Tools */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-ink mb-6">Related Tools &amp; Calculators</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: "📊",
                title: "DTAA Calculator",
                description: "Calculate tax relief under Double Taxation Avoidance Agreement",
                link: "/calculators/dtaa",
              },
              {
                icon: "🏦",
                title: "NRO vs NRE Comparison",
                description: "Compare NRO and NRE accounts for tax planning",
                link: "/nri-corner/nro-vs-nre",
              },
              {
                icon: "💰",
                title: "Repatriation Planner",
                description: "Plan your international fund transfers efficiently",
                link: "/nri-corner/repatriation-planner",
              },
              {
                icon: "🧮",
                title: "Income Tax Calculator",
                description: "Calculate tax for resident Indians",
                link: "/calculators/income-tax",
              },
            ].map((tool, index) => (
              <Link key={index} href={tool.link}>
                <div className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg hover:scale-105 transition cursor-pointer">
                  <div className="text-4xl mb-3">{tool.icon}</div>
                  <h3 className="font-semibold text-ink mb-2">{tool.title}</h3>
                  <p className="text-sm text-ink/65">{tool.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Author Box */}
        <AuthorBox />
      </div>


    </>
  );
}

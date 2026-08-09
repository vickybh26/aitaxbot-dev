import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Globe, ChevronRight, AlertCircle, Send, TrendingUp, BookOpen, CheckCircle } from "lucide-react";
import AuthorBox from "@/components/AuthorBox";
import { AdBanner, ResponsiveAd, RectangleAd } from "@/components/AdBanner";

interface CalculatorState {
  sourceAccount: "nro" | "nre" | "fcnr";
  amountInr: number;
  amountUsd: number;
  currencyMode: "inr" | "usd";
  sourceOfFunds: string;
  taxCleared: boolean;
  caCertificateObtained: boolean;
}

export default function RepatriationPlanner() {
  const [calculator, setCalculator] = useState<CalculatorState>({
    sourceAccount: "nro",
    amountInr: 2500000,
    amountUsd: 30000,
    currencyMode: "inr",
    sourceOfFunds: "property-sale",
    taxCleared: false,
    caCertificateObtained: false,
  });

  const exchangeRate = 83;
  const nroLimit = 1000000;

  const convertAmount = (value: number, from: "inr" | "usd"): { inr: number; usd: number } => {
    if (from === "inr") {
      return { inr: value, usd: Math.round(value / exchangeRate) };
    } else {
      return { inr: value * exchangeRate, usd: value };
    }
  };

  const handleAmountChange = (value: number) => {
    const converted = convertAmount(value, calculator.currencyMode);
    setCalculator((prev) => ({
      ...prev,
      amountInr: converted.inr,
      amountUsd: converted.usd,
    }));
  };

  const toggleCurrency = () => {
    const newMode = calculator.currencyMode === "inr" ? "usd" : "inr";
    setCalculator((prev) => ({
      ...prev,
      currencyMode: newMode,
    }));
  };

  const isNreOrFcnr = calculator.sourceAccount === "nre" || calculator.sourceAccount === "fcnr";
  const exceedsNroLimit = calculator.sourceAccount === "nro" && calculator.amountUsd > nroLimit;
  const canRepatriate = isNreOrFcnr || (calculator.taxCleared && calculator.caCertificateObtained);

  const getRequiredSteps = () => {
    const steps = [];
    if (calculator.sourceAccount === "nro") {
      steps.push("Ensure taxes are paid");
      steps.push("Obtain Form 15CB from CA");
      steps.push("File Form 15CA online");
      steps.push("Submit documents to bank");
      steps.push("Bank processing (3-7 days)");
    } else {
      steps.push("Initiate wire transfer");
      steps.push("Bank processing (3-7 days)");
    }
    return steps;
  };

  const caFeeRange = [5000, 15000];

  return (
    <>
      <Helmet>
        <title>NRI Repatriation Planner — Transfer Money from India Abroad | AiTaxBot</title>
        <meta name="description" content="Step-by-step guide and calculator for NRI money repatriation. Understand FEMA limits, Form 15CA/15CB requirements, and how to transfer NRO account funds abroad legally." />
        <meta property="og:title" content="NRI Repatriation Planner — Transfer Money from India Abroad | AiTaxBot" />
        <meta property="og:description" content="Step-by-step guide and calculator for NRI money repatriation. Understand FEMA limits, Form 15CA/15CB requirements, and how to transfer NRO account funds abroad legally." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-amber-600 to-amber-700 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6 opacity-90">
            <Link href="/">
              <a className="hover:opacity-80">Home</a>
            </Link>
            <ChevronRight size={16} />
            <Link href="/nri">
              <a className="hover:opacity-80">NRI Corner</a>
            </Link>
            <ChevronRight size={16} />
            <span>Repatriation Planner</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">NRI Repatriation Planner</h1>
          <p className="text-lg md:text-xl opacity-95">
            Plan how to transfer your Indian money abroad legally and tax-efficiently. Understand FEMA limits, Form 15CA/15CB requirements, and step-by-step process.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Misconception Buster */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-12">
          <div className="flex gap-4">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-red-900 mb-3">
                You Can't Just Wire Money Abroad From Your NRO Account
              </h2>
              <p className="text-slate-800 leading-relaxed">
                Many NRIs try to directly transfer large amounts from their NRO account abroad and get blocked by their bank. Under FEMA, NRO repatriation requires a CA-certified Form 15CB and online Form 15CA filing before the remittance. NRE account funds are freely repatriable with no paperwork. Missing this step causes transfers to be reversed and can attract scrutiny.
              </p>
            </div>
          </div>
        </div>

        {/* Responsive Ad */}
        <div className="mb-12">
          <ResponsiveAd />
        </div>

        {/* Interactive Calculator Section */}
        <section className="bg-white border border-slate-200 rounded-lg p-8 mb-12 shadow-sm">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <Globe className="text-amber-600" size={32} />
            Interactive Repatriation Calculator
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-6 text-slate-900">Step 1: Enter Your Details</h3>

              {/* Source Account */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Source Account Type</label>
                <div className="space-y-2">
                  {["nro", "nre", "fcnr"].map((account) => (
                    <label key={account} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="account"
                        value={account}
                        checked={calculator.sourceAccount === account}
                        onChange={(e) => setCalculator((prev) => ({ ...prev, sourceAccount: e.target.value as any }))}
                        className="w-4 h-4 text-amber-600"
                      />
                      <span className="text-slate-700 font-medium">
                        {account === "nro" && "NRO Account (Non-Resident Ordinary)"}
                        {account === "nre" && "NRE Account (Non-Resident External)"}
                        {account === "fcnr" && "FCNR Account (Foreign Currency Non-Resident)"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-slate-700">Amount to Repatriate</label>
                  <button
                    onClick={toggleCurrency}
                    className="text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded hover:bg-amber-200 transition-colors"
                  >
                    Switch to {calculator.currencyMode === "inr" ? "USD" : "INR"}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-600 font-semibold">
                    {calculator.currencyMode === "inr" ? "₹" : "$"}
                  </span>
                  <input
                    type="number"
                    value={calculator.currencyMode === "inr" ? calculator.amountInr : calculator.amountUsd}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Equivalent to: {calculator.currencyMode === "inr" ? `$${calculator.amountUsd.toLocaleString()}` : `₹${calculator.amountInr.toLocaleString()}`} (at {exchangeRate}/)
                </p>
              </div>

              {/* Source of Funds */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Source of Funds</label>
                <select
                  value={calculator.sourceOfFunds}
                  onChange={(e) => setCalculator((prev) => ({ ...prev, sourceOfFunds: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="property-sale">Sale of property</option>
                  <option value="fd-maturity">NRO FD maturity</option>
                  <option value="rental-income">Rental income accumulated</option>
                  <option value="investment-redemption">Investment redemption</option>
                  <option value="inherited-money">Inherited money</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Tax Status */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={calculator.taxCleared}
                    onChange={(e) => setCalculator((prev) => ({ ...prev, taxCleared: e.target.checked }))}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-slate-700 font-medium">Taxes paid and cleared</span>
                </label>
              </div>

              {/* CA Certificate Status */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calculator.caCertificateObtained}
                    onChange={(e) => setCalculator((prev) => ({ ...prev, caCertificateObtained: e.target.checked }))}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-slate-700 font-medium">CA certificate (Form 15CB) obtained</span>
                </label>
              </div>
            </div>

            {/* Output Results */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-6 text-slate-900">Step 2: View Results</h3>

              {/* Account Type Info */}
              <div className={`p-6 rounded-lg border-2 ${isNreOrFcnr ? "bg-green-50 border-green-300" : "bg-blue-50 border-blue-300"}`}>
                {isNreOrFcnr ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="text-green-600" size={24} />
                      <h4 className="text-lg font-bold text-green-900">Freely Repatriable</h4>
                    </div>
                    <p className="text-green-800 font-semibold">
                      {calculator.sourceAccount === "nre"
                        ? "✓ NRE account funds can be transferred abroad with no limit and no paperwork required."
                        : "✓ FCNR account funds can be repatriated seamlessly with no forms or CA certificate needed."}
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-lg font-bold text-blue-900 mb-4">NRO Account Repatriation Rules</h4>
                    <div className="space-y-3 text-blue-800">
                      <div>
                        <p className="text-sm font-semibold">Annual Limit</p>
                        <p className="text-lg font-bold text-blue-900">${nroLimit.toLocaleString()} (≈ ₹{(nroLimit * exchangeRate).toLocaleString()})</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Remaining This FY</p>
                        <p className="text-lg font-bold text-blue-900">${(nroLimit - calculator.amountUsd).toLocaleString()}</p>
                      </div>
                      {exceedsNroLimit && (
                        <div className="bg-red-50 border border-red-300 p-3 rounded mt-3">
                          <p className="text-red-800 font-semibold">⚠ Amount exceeds annual NRO limit. Consider splitting across financial years.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Forms Required */}
              {calculator.sourceAccount === "nro" && (
                <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                  <h4 className="font-bold text-amber-900 mb-3">Forms Required</h4>
                  <ul className="space-y-2 text-amber-800">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Form 15CB (CA certificate) + Form 15CA (online filing)</span>
                    </li>
                  </ul>
                  <p className="text-amber-700 font-semibold mt-4">Estimated CA Fee: ₹{caFeeRange[0].toLocaleString()}–{caFeeRange[1].toLocaleString()}</p>
                </div>
              )}

              {/* Exchange Rate Info */}
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3">Exchange Rate Impact</h4>
                <p className="text-slate-700 mb-2">Current rate: ₹{exchangeRate} per USD</p>
                <p className="text-slate-700">
                  <strong>Your amount in USD:</strong> ${calculator.amountUsd.toLocaleString()}
                </p>
              </div>

              {/* Timeline */}
              <div className="bg-persian-blue-50 p-6 rounded-lg border border-persian-blue-200">
                <h4 className="font-bold text-persian-blue-900 mb-3">Estimated Timeline</h4>
                <p className="text-persian-blue-800">
                  {calculator.sourceAccount === "nro"
                    ? "3–7 working days after forms are submitted to bank"
                    : "3–7 working days for SWIFT transfer"}
                </p>
              </div>

              {/* Readiness Status */}
              <div className={`p-6 rounded-lg border-2 ${canRepatriate ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                <h4 className={`font-bold mb-3 ${canRepatriate ? "text-green-900" : "text-red-900"}`}>
                  {canRepatriate ? "✓ Ready to Repatriate" : "✗ Action Required"}
                </h4>
                {!canRepatriate && calculator.sourceAccount === "nro" && (
                  <ul className="space-y-2 text-red-800 text-sm">
                    {!calculator.taxCleared && <li>• Ensure all taxes are paid and cleared</li>}
                    {!calculator.caCertificateObtained && <li>• Obtain Form 15CB from a Chartered Accountant</li>}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="mt-10 pt-10 border-t border-slate-200">
            <h3 className="text-xl font-bold mb-6 text-slate-900">Required Steps</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {getRequiredSteps().map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <span className="text-slate-800 font-medium pt-1">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Account-wise Rules */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8">Account-wise Repatriation Rules</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* NRE Account */}
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-green-900 mb-4">NRE Account</h3>
              <p className="text-sm font-semibold text-green-700 mb-6">Freely Repatriable</p>
              <ul className="space-y-3 text-slate-800">
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>No limit on amount</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>No FEMA permission required</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>No CA certificate needed</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>No forms to file</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Funds + interest can go abroad at any time</span>
                </li>
              </ul>
              <p className="text-sm text-green-900 font-semibold mt-6 pt-6 border-t border-green-200">
                Best choice for NRIs planning to bring money back.
              </p>
            </div>

            {/* NRO Account */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">NRO Account</h3>
              <p className="text-sm font-semibold text-blue-700 mb-6">Up to USD 1 Million/Year</p>
              <ul className="space-y-3 text-slate-800">
                <li className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Combined limit: USD 1M per financial year (current + capital account)</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Requires Form 15CB (CA certificate)</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Form 15CA (online) must be filed</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Tax must be paid/cleared before remittance</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Forms required for each transaction</span>
                </li>
              </ul>
            </div>

            {/* FCNR Account */}
            <div className="bg-persian-blue-50 border-2 border-persian-blue-300 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-persian-blue-900 mb-4">FCNR Account</h3>
              <p className="text-sm font-semibold text-persian-blue-800 mb-6">Freely Repatriable</p>
              <ul className="space-y-3 text-slate-800">
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-persian-blue-700 flex-shrink-0 mt-0.5" />
                  <span>Funds in foreign currency — seamless repatriation</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-persian-blue-700 flex-shrink-0 mt-0.5" />
                  <span>Principal and interest freely transferable</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-persian-blue-700 flex-shrink-0 mt-0.5" />
                  <span>No forms, no CA required</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-persian-blue-700 flex-shrink-0 mt-0.5" />
                  <span>Repatriate on maturity or anytime</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-persian-blue-700 flex-shrink-0 mt-0.5" />
                  <span>No exchange rate risk (already in foreign currency)</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Step-by-Step Guide */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8">Step-by-Step NRO Repatriation Guide</h2>
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-8">
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: "Ensure taxes are paid",
                  description: "All Indian taxes on the income must be paid. Get Form 26AS to confirm TDS deductions.",
                },
                {
                  step: 2,
                  title: "Obtain Form 15CB from a CA",
                  description: "Chartered Accountant certifies that taxes have been paid. CA charges ₹5,000–15,000. Valid for a specific transaction.",
                },
                {
                  step: 3,
                  title: "File Form 15CA online",
                  description: "File on the Income Tax e-filing portal (incometax.gov.in) using your PAN. Form 15CA references Form 15CB.",
                },
                {
                  step: 4,
                  title: "Submit to bank",
                  description: "Provide Form 15CA acknowledgment + Form 15CB to your bank along with remittance request.",
                },
                {
                  step: 5,
                  title: "Bank processing",
                  description: "Bank verifies documents and initiates SWIFT transfer. Takes 3–7 working days.",
                },
                {
                  step: 6,
                  title: "Receive in foreign account",
                  description: "Funds arrive in your foreign bank account in 3–7 days.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-600 text-white font-bold text-lg">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h4>
                    <p className="text-slate-700">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-slate-300">
              <p className="text-sm text-slate-700">
                <strong>Note:</strong> Remittances below ₹5 lakh (approximate) may not require Form 15CB — only Form 15CA. Confirm with your CA.
              </p>
            </div>
          </div>
        </section>

        {/* Worked Examples */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8">Worked Examples</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Example 1 */}
            <div className="bg-white border-2 border-amber-300 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-2">
                <Send size={24} />
                Example 1: Selling Indian Property
              </h3>
              <div className="space-y-4 text-slate-800">
                <div>
                  <p className="font-semibold text-slate-900">Property sale proceeds</p>
                  <p className="text-lg">₹80 lakh</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">TDS deducted by buyer @ 20%</p>
                  <p className="text-lg">₹16 lakh (deposited to govt)</p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="font-semibold text-slate-900 mb-2">Steps:</p>
                  <ul className="space-y-2 text-sm">
                    <li>• NRI files ITR, calculates actual LTCG tax</li>
                    <li>• Get refund of excess TDS (if any)</li>
                    <li>• After tax clearance: obtain CA Form 15CB</li>
                    <li>• File Form 15CA online</li>
                    <li>• Submit to bank: ₹64 lakh + any refund sent abroad</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-slate-200 bg-amber-50 p-4 rounded">
                  <p className="text-sm text-amber-900">
                    <strong>Note:</strong> Counted towards USD 1M annual NRO repatriation limit.
                  </p>
                </div>
              </div>
            </div>

            {/* Example 2 */}
            <div className="bg-white border-2 border-blue-300 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                <TrendingUp size={24} />
                Example 2: NRO FD Maturity
              </h3>
              <div className="space-y-4 text-slate-800">
                <div>
                  <p className="font-semibold text-slate-900">NRO FD maturity amount</p>
                  <p className="text-lg">₹20 lakh</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">TDS on interest @ 30%</p>
                  <p className="text-lg">₹1.2 lakh (on ₹4L interest)</p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="font-semibold text-slate-900 mb-2">Steps:</p>
                  <ul className="space-y-2 text-sm">
                    <li>• Principal was own money (no additional tax)</li>
                    <li>• Form 15CB required (exceeds ₹5L threshold)</li>
                    <li>• File Form 15CA online</li>
                    <li>• Submit both forms to bank</li>
                    <li>• Transfer ₹20 lakh abroad</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-slate-200 bg-blue-50 p-4 rounded">
                  <p className="text-sm text-blue-900">
                    <strong>Limit Status:</strong> Well within USD 1M annual limit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pro Tips */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8">6 Pro Tips for Smart Repatriation</h2>
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-8">
            <div className="space-y-6">
              {[
                {
                  title: "Plan repatriation across financial years",
                  description:
                    "If your amount exceeds USD 1 million, split the remittance across two financial years (before and after April 1) to use the limit twice.",
                },
                {
                  title: "NRE is better for future accumulation",
                  description:
                    "If you're earning abroad and investing in India, always use NRE accounts for new investments — making future repatriation effortless.",
                },
                {
                  title: "Inherited money has special rules",
                  description:
                    "Money inherited from a resident Indian relative can be repatriated from NRO account, but limited to USD 1 million/year and requires additional documentation (death certificate, legal heirship).",
                },
                {
                  title: "Keep all tax documents",
                  description:
                    "Retain Form 26AS, TDS certificates (Form 16A), ITR acknowledgments, and property sale documents. Banks and foreign tax authorities may ask for these.",
                },
                {
                  title: "Engage a Chartered Accountant early for property sales",
                  description:
                    "Engage a CA before the property sale, not after. CA can help structure the deal to minimize TDS, obtain lower TDS certificate (Form 13), and ensure smooth repatriation.",
                },
                {
                  title: "Currency timing matters",
                  description:
                    "You bear the INR/USD exchange rate risk. Consider transferring when INR is weaker (more USD per rupee) to maximize the repatriated amount.",
                },
              ].map((tip, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 pt-1">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-600 text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-amber-900">{tip.title}</h4>
                    <p className="text-slate-800 mt-2">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "What is the maximum amount an NRI can repatriate per year?",
                a: "USD 1 million per financial year (April to March) from NRO accounts. NRE and FCNR accounts have no limit. The limit applies to both current account income (rent, pension, dividends) and capital account (property sale proceeds) combined.",
              },
              {
                q: "Is Form 15CA required for all NRO remittances?",
                a: "Form 15CA is required for all NRO remittances. However, Form 15CB (CA certificate) may not be required for remittances below approximately ₹5 lakh. Confirm with your Chartered Accountant based on the specific transaction.",
              },
              {
                q: "Can I repatriate money if I have outstanding Indian taxes?",
                a: "No. All Indian taxes on the source income must be paid and cleared before you can obtain Form 15CB from a CA. Outstanding tax liability will prevent the CA from certifying Form 15CB, blocking the entire remittance.",
              },
              {
                q: "How long does NRO to foreign account transfer take?",
                a: "After submitting Form 15CA and Form 15CB to your bank, the transfer typically takes 3–7 working days for the bank to verify documents and initiate a SWIFT transfer. The foreign bank receives the funds within the same window.",
              },
              {
                q: "Can I repatriate money from sale of agricultural land?",
                a: "Agricultural land located in India is not always freely repatriable. If you sold agricultural land as an NRI resident of another country, repatriation may require special FEMA approval. Consult a Chartered Accountant and your RBI-registered money changer for guidance.",
              },
              {
                q: "What happens if I repatriate without Form 15CA?",
                a: "The bank will refuse to process the remittance. If you somehow bypass the bank, the foreign recipient's bank may flag the transfer as non-compliant with Indian tax regulations, leading to financial penalties, account freezes, or legal scrutiny from Indian tax authorities.",
              },
            ].map((faq, idx) => (
              <details key={idx} className="bg-white border border-slate-200 rounded-lg p-6 group cursor-pointer hover:shadow-md transition-shadow">
                <summary className="font-semibold text-slate-900 flex items-start justify-between">
                  <span>{faq.q}</span>
                  <ChevronRight size={20} className="text-slate-500 group-open:rotate-90 transition-transform flex-shrink-0 mt-1 ml-2" />
                </summary>
                <p className="text-slate-700 mt-4">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Rectangle Ad */}
        <div className="mb-12">
          <RectangleAd />
        </div>

        {/* Related Tools */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8">Explore Related Tools</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                title: "DTAA Calculator",
                description: "Calculate tax savings under India-US, India-UK, and other tax treaties.",
                link: "/tools/dtaa-calculator",
              },
              {
                title: "NRO vs NRE Comparison",
                description: "Understand the tax and repatriation differences between NRO and NRE accounts.",
                link: "/tools/nro-nre-comparison",
              },
              {
                title: "NRI Income Tax Calculator",
                description: "Calculate your exact income tax liability as an NRI in India.",
                link: "/nri/income-tax-calculator",
              },
              {
                title: "Income Tax Calculator",
                description: "Quick calculator for residents and non-residents filing ITR.",
                link: "/tools/income-tax-calculator",
              },
            ].map((tool, idx) => (
              <Link key={idx} href={tool.link}>
                <a className="block bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg hover:border-amber-400 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <BookOpen className="text-amber-600 flex-shrink-0 mt-1" size={24} />
                    <h3 className="text-lg font-bold text-slate-900">{tool.title}</h3>
                  </div>
                  <p className="text-slate-700 text-sm">{tool.description}</p>
                </a>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Author Box */}
      <AuthorBox />


      {/* FAQ Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is the maximum amount an NRI can repatriate per year?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "USD 1 million per financial year (April to March) from NRO accounts. NRE and FCNR accounts have no limit. The limit applies to both current account income (rent, pension, dividends) and capital account (property sale proceeds) combined.",
              },
            },
            {
              "@type": "Question",
              name: "Is Form 15CA required for all NRO remittances?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Form 15CA is required for all NRO remittances. However, Form 15CB (CA certificate) may not be required for remittances below approximately ₹5 lakh. Confirm with your Chartered Accountant based on the specific transaction.",
              },
            },
            {
              "@type": "Question",
              name: "Can I repatriate money if I have outstanding Indian taxes?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. All Indian taxes on the source income must be paid and cleared before you can obtain Form 15CB from a CA. Outstanding tax liability will prevent the CA from certifying Form 15CB, blocking the entire remittance.",
              },
            },
            {
              "@type": "Question",
              name: "How long does NRO to foreign account transfer take?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "After submitting Form 15CA and Form 15CB to your bank, the transfer typically takes 3–7 working days for the bank to verify documents and initiate a SWIFT transfer. The foreign bank receives the funds within the same window.",
              },
            },
            {
              "@type": "Question",
              name: "Can I repatriate money from sale of agricultural land?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Agricultural land located in India is not always freely repatriable. If you sold agricultural land as an NRI resident of another country, repatriation may require special FEMA approval. Consult a Chartered Accountant and your RBI-registered money changer for guidance.",
              },
            },
            {
              "@type": "Question",
              name: "What happens if I repatriate without Form 15CA?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "The bank will refuse to process the remittance. If you somehow bypass the bank, the foreign recipient's bank may flag the transfer as non-compliant with Indian tax regulations, leading to financial penalties, account freezes, or legal scrutiny from Indian tax authorities.",
              },
            },
          ],
        })}
      </script>
    </>
  );
}

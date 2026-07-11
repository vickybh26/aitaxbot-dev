import { useState } from "react";
import { useTrackToolUse } from '@/hooks/useTrackToolUse';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import ResultAuthGate from "@/components/ResultAuthGate";

interface HomeLoanResult {
  maxLoanEligible: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  loanAmount: number;
  ltv: number;
  // Tax benefits (Old Regime)
  annualInterestYear1: number;
  section24Deduction: number;
  section80CDeduction: number;
  annualTaxSaving30: number;
  annualTaxSaving20: number;
}

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function HomeLoanCalculator() {
  const { user } = useAuth();
  const trackTool = useTrackToolUse();
  const [monthlyIncome, setMonthlyIncome] = useState<number>(100000);
  const [existingEMI, setExistingEMI] = useState<number>(0);
  const [propertyPrice, setPropertyPrice] = useState<number>(7500000);
  const [downPayment, setDownPayment] = useState<number>(1500000);
  const [tenure, setTenure] = useState<number>(20);
  const [rate, setRate] = useState<number>(8.75);
  const [result, setResult] = useState<HomeLoanResult | null>(null);

  const calculate = () => {
    // Loan amount
    const loanAmount = Math.max(0, propertyPrice - downPayment);
    const ltv = (loanAmount / propertyPrice) * 100;

    // EMI calculation
    const r = rate / 12 / 100;
    const n = tenure * 12;
    const emi = r > 0
      ? (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      : loanAmount / n;

    const totalPayment = emi * n;
    const totalInterest = totalPayment - loanAmount;

    // Max eligibility: FOIR 50% of net income (after existing EMIs)
    const availableForEMI = monthlyIncome * 0.5 - existingEMI;
    const maxLoanEligible = availableForEMI > 0 && r > 0
      ? availableForEMI * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n))
      : 0;

    // Tax benefits (Year 1 estimate)
    // Interest in year 1 ≈ loanAmount * rate / 100
    const annualInterestYear1 = loanAmount * (rate / 100);
    const section24Deduction = Math.min(annualInterestYear1, 200000); // ₹2L cap for self-occupied
    const annualPrincipalYear1 = emi * 12 - annualInterestYear1;
    const section80CDeduction = Math.min(annualPrincipalYear1, 150000); // within 80C ₹1.5L cap

    const totalDeductionBenefit = section24Deduction + section80CDeduction;
    const annualTaxSaving30 = totalDeductionBenefit * 0.312; // 30% + 4% cess
    const annualTaxSaving20 = totalDeductionBenefit * 0.208; // 20% + 4% cess

    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});

    setResult({
      maxLoanEligible,
      emi,
      totalInterest,
      totalPayment,
      loanAmount,
      ltv,
      annualInterestYear1,
      section24Deduction,
      section80CDeduction,
      annualTaxSaving30,
      annualTaxSaving20,
    });
    trackTool("Home Loan Calculator", `EMI: ₹${Math.round(emi).toLocaleString('en-IN')}`);
  };

  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const downPaymentPct = propertyPrice > 0 ? ((downPayment / propertyPrice) * 100).toFixed(1) : "0";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <h2 className="text-xl font-bold text-white">Home Loan Affordability Calculator</h2>
        <p className="text-blue-100 text-sm mt-1">Know your eligibility, EMI and tax benefits — before you visit the bank</p>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Inputs */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Your Income & Obligations</h3>
            <div>
              <Label className="text-sm font-medium text-slate-700">Monthly Gross Income (₹)</Label>
              <Input
                type="number"
                value={monthlyIncome}
                onChange={e => setMonthlyIncome(Number(e.target.value))}
                className="mt-1"
                placeholder="100000"
              />
              <p className="text-xs text-slate-500 mt-1">Bank typically allows 50% of income towards all EMIs</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Existing Monthly EMIs (₹)</Label>
              <Input
                type="number"
                value={existingEMI}
                onChange={e => setExistingEMI(Number(e.target.value))}
                className="mt-1"
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1">Car loan, personal loan, education loan etc.</p>
            </div>

            <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide pt-2">Property & Loan Details</h3>
            <div>
              <Label className="text-sm font-medium text-slate-700">Property Price (₹)</Label>
              <Input
                type="number"
                value={propertyPrice}
                onChange={e => setPropertyPrice(Number(e.target.value))}
                className="mt-1"
                placeholder="7500000"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Down Payment (₹) <span className="text-slate-400 font-normal">— {downPaymentPct}% of price</span>
              </Label>
              <Input
                type="number"
                value={downPayment}
                onChange={e => setDownPayment(Number(e.target.value))}
                className="mt-1"
                placeholder="1500000"
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 20% down payment (LTV 80%) required by most banks</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Tenure (Years)</Label>
                <Input
                  type="number"
                  value={tenure}
                  onChange={e => setTenure(Number(e.target.value))}
                  className="mt-1"
                  min={1} max={30}
                  placeholder="20"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Interest Rate (% p.a.)</Label>
                <Input
                  type="number"
                  value={rate}
                  onChange={e => setRate(Number(e.target.value))}
                  className="mt-1"
                  step={0.05}
                  placeholder="8.75"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Loan Amount:</span><span className="font-semibold text-slate-900">{formatINR(loanAmount)}</span></div>
            </div>

            <Button onClick={calculate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3">
              Calculate Affordability & EMI
            </Button>
          </div>

          {/* Results */}
          <div>
            {result && !user ? (
              <ResultAuthGate toolName="Home Loan Calculator" />
            ) : result ? (
              <div className="space-y-4">

                {/* Eligibility check */}
                <div className={`rounded-xl p-4 border-2 ${loanAmount <= result.maxLoanEligible ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{loanAmount <= result.maxLoanEligible ? '✅' : '⚠️'}</span>
                    <span className="font-bold text-slate-900">
                      {loanAmount <= result.maxLoanEligible ? 'You are eligible for this loan' : 'Loan may exceed your eligibility'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Max loan you qualify for:</span>
                    <span className="font-bold text-slate-900">{formatINR(result.maxLoanEligible)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Loan amount requested:</span>
                    <span className={`font-bold ${loanAmount <= result.maxLoanEligible ? 'text-green-700' : 'text-red-700'}`}>{formatINR(result.loanAmount)}</span>
                  </div>
                </div>

                {/* EMI breakdown */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-bold text-slate-900 mb-3">EMI & Loan Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Monthly EMI:</span>
                      <span className="font-bold text-blue-700 text-lg">{formatINR(result.emi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Loan Amount:</span>
                      <span className="font-semibold">{formatINR(result.loanAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Interest:</span>
                      <span className="font-semibold text-orange-600">{formatINR(result.totalInterest)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-2">
                      <span className="text-slate-700 font-medium">Total Amount Payable:</span>
                      <span className="font-bold">{formatINR(result.totalPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">LTV Ratio:</span>
                      <span className={`font-semibold ${result.ltv <= 80 ? 'text-green-700' : 'text-red-600'}`}>{result.ltv.toFixed(1)}% {result.ltv > 80 ? '(exceeds 80% max)' : '✓'}</span>
                    </div>
                  </div>
                </div>

                {/* Tax benefits */}
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-bold text-slate-900 mb-1">Tax Benefits (Old Regime Only)</h4>
                  <p className="text-xs text-slate-500 mb-3">Applicable in the financial year you pay interest/principal. Not available under New Regime.</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Interest paid (Year 1 est.):</span>
                      <span className="font-semibold">{formatINR(result.annualInterestYear1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Section 24 deduction (interest, max ₹2L):</span>
                      <span className="font-semibold text-green-700">{formatINR(result.section24Deduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Section 80C deduction (principal, within ₹1.5L):</span>
                      <span className="font-semibold text-green-700">{formatINR(result.section80CDeduction)}</span>
                    </div>
                    <div className="border-t border-green-200 pt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-700 font-medium">Annual tax saving @ 30% slab:</span>
                        <span className="font-bold text-green-700">{formatINR(result.annualTaxSaving30)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-700 font-medium">Annual tax saving @ 20% slab:</span>
                        <span className="font-bold text-green-700">{formatINR(result.annualTaxSaving20)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <div className="text-center text-slate-400">
                  <div className="text-4xl mb-3">🏠</div>
                  <p className="font-medium text-slate-500">Enter your details and click Calculate</p>
                  <p className="text-sm mt-1">Get your eligibility, EMI and tax benefits instantly</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

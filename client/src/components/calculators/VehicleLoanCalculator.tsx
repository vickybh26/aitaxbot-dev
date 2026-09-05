import { useState } from "react";
import { useTrackToolUse } from '@/hooks/useTrackToolUse';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import ResultAuthGate from "@/components/ResultAuthGate";

type VehicleType = "two-wheeler" | "four-wheeler";
type RateType = "reducing" | "flat";

interface VehicleLoanResult {
  loanAmount: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  downPaymentPct: number;
  rateType: RateType;
  // For comparison: always compute both
  reducingEmi: number;
  reducingInterest: number;
  reducingTotal: number;
  flatEmi: number;
  flatInterest: number;
  flatTotal: number;
}

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const DEFAULTS = {
  "two-wheeler": {
    onRoadPrice: 120000,
    downPayment: 20000,
    tenure: 3,
    rate: 12.5,
    label: "Two-Wheeler",
    emoji: "🛵",
    color: "from-orange-500 to-amber-500",
    accent: "orange",
    typical: "Typical range: ₹70,000 – ₹3,00,000 (scooters to premium bikes)",
    rateNote: "Two-wheeler loan rates: 10–16% p.a. depending on lender and CIBIL score",
  },
  "four-wheeler": {
    onRoadPrice: 900000,
    downPayment: 180000,
    tenure: 5,
    rate: 9.25,
    label: "Four-Wheeler",
    emoji: "🚗",
    color: "from-ink to-credit",
    accent: "blue",
    typical: "Typical range: ₹5,00,000 – ₹40,00,000 (hatchback to SUV)",
    rateNote: "Car loan rates: 8.5–12% p.a. Top PSU banks start at 8.35%",
  },
};

function computeReducing(principal: number, annualRate: number, tenureYears: number) {
  const r = annualRate / 12 / 100;
  const n = tenureYears * 12;
  const emi = r > 0
    ? (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : principal / n;
  const total = emi * n;
  const interest = total - principal;
  return { emi, total, interest };
}

function computeFlat(principal: number, annualRate: number, tenureYears: number) {
  const n = tenureYears * 12;
  const totalInterest = principal * (annualRate / 100) * tenureYears;
  const emi = (principal + totalInterest) / n;
  const total = principal + totalInterest;
  return { emi, total, interest: totalInterest };
}

export default function VehicleLoanCalculator() {
  const { user } = useAuth();
  const trackTool = useTrackToolUse();
  const [vehicleType, setVehicleType] = useState<VehicleType>("four-wheeler");
  const [onRoadPrice, setOnRoadPrice] = useState<number>(DEFAULTS["four-wheeler"].onRoadPrice);
  const [downPayment, setDownPayment] = useState<number>(DEFAULTS["four-wheeler"].downPayment);
  const [tenure, setTenure] = useState<number>(DEFAULTS["four-wheeler"].tenure);
  const [rate, setRate] = useState<number>(DEFAULTS["four-wheeler"].rate);
  const [rateType, setRateType] = useState<RateType>("reducing");
  const [result, setResult] = useState<VehicleLoanResult | null>(null);

  const switchVehicle = (type: VehicleType) => {
    setVehicleType(type);
    const d = DEFAULTS[type];
    setOnRoadPrice(d.onRoadPrice);
    setDownPayment(d.downPayment);
    setTenure(d.tenure);
    setRate(d.rate);
    setResult(null);
  };

  const calculate = () => {
    const loanAmount = Math.max(0, onRoadPrice - downPayment);
    const downPaymentPct = onRoadPrice > 0 ? (downPayment / onRoadPrice) * 100 : 0;

    const red = computeReducing(loanAmount, rate, tenure);
    const flat = computeFlat(loanAmount, rate, tenure);

    const active = rateType === "reducing" ? red : flat;

    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});

    setResult({
      loanAmount,
      emi: active.emi,
      totalInterest: active.interest,
      totalPayment: active.total,
      downPaymentPct,
      rateType,
      reducingEmi: red.emi,
      reducingInterest: red.interest,
      reducingTotal: red.total,
      flatEmi: flat.emi,
      flatInterest: flat.interest,
      flatTotal: flat.total,
    });
    const rsVl = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    trackTool("Vehicle Loan Calculator", `EMI: ${rsVl(active.emi)}`, {
      toolKey: "vehicle-loan",
      route: "/calculators/vehicle-loan",
      kind: "calculator",
      headline: { label: "Monthly EMI", value: rsVl(active.emi) },
      details: [
        { label: "Total interest", value: rsVl(active.interest) },
        { label: "Total payment", value: rsVl(active.total) },
      ],
    });
  };

  const d = DEFAULTS[vehicleType];
  const loanAmount = Math.max(0, onRoadPrice - downPayment);
  const downPct = onRoadPrice > 0 ? ((downPayment / onRoadPrice) * 100).toFixed(1) : "0";
  const accentBtn = vehicleType === "four-wheeler" ? "bg-ink hover:bg-credit" : "bg-orange-500 hover:bg-orange-600";
  const accentBg = vehicleType === "four-wheeler" ? "bg-secondary border-rule text-ink" : "bg-orange-50 border-orange-200 text-orange-600";

  return (
    <div className="bg-card rounded-xl shadow-sm border border-rule overflow-hidden">
      {/* Vehicle type toggle */}
      <div className={`bg-gradient-to-r ${d.color} p-6`}>
        <div className="flex gap-3 mb-4">
          {(["two-wheeler", "four-wheeler"] as VehicleType[]).map(type => (
            <button
              key={type}
              onClick={() => switchVehicle(type)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                vehicleType === type
                  ? "bg-card text-ink shadow-md"
                  : "bg-card/20 text-white hover:bg-card/30"
              }`}
            >
              <span>{DEFAULTS[type].emoji}</span>
              {DEFAULTS[type].label}
            </button>
          ))}
        </div>
        <h2 className="text-xl font-bold text-white">{d.emoji} {d.label} Loan EMI Calculator</h2>
        <p className="text-white/80 text-sm mt-1">{d.typical}</p>
      </div>

      {/* Rate Type Caution Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <div className="flex gap-2 items-start mb-3">
          <span className="text-amber-600 text-lg shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-amber-900 text-sm">Always ask your bank: Is this a Flat Rate or Reducing Balance Rate?</p>
            <p className="text-amber-800 text-xs mt-0.5">
              Dealers and some lenders quote <strong>flat rates</strong> which look lower but cost significantly more interest.
              A 10% flat rate is equivalent to ~18–19% reducing balance rate. Always compare on the same basis.
            </p>
          </div>
        </div>

        {/* Rate Type Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink/80">Interest Rate Type:</span>
          <div className="flex bg-card border border-rule rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => { setRateType("reducing"); setResult(null); }}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                rateType === "reducing"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-ink/65 hover:text-ink"
              }`}
            >
              Reducing Balance
            </button>
            <button
              onClick={() => { setRateType("flat"); setResult(null); }}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                rateType === "flat"
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-ink/65 hover:text-ink"
              }`}
            >
              Flat Rate
            </button>
          </div>
        </div>

        {/* Explanation of selected type */}
        <div className="mt-3 text-xs">
          {rateType === "reducing" ? (
            <div className="flex gap-2 bg-green-50 border border-green-200 rounded-lg p-2.5">
              <span className="text-green-600 shrink-0">✅</span>
              <div className="text-green-900">
                <strong>Reducing Balance (Diminishing Balance):</strong> Interest is charged only on the outstanding
                principal each month. As you repay, the principal reduces — so the interest component of your EMI
                keeps decreasing. <strong>This is the standard method used by banks and NBFCs for most loans.</strong> It is
                cheaper than flat rate.
              </div>
            </div>
          ) : (
            <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
              <span className="text-red-600 shrink-0">🚨</span>
              <div className="text-red-900">
                <strong>Flat Rate (Simple Interest on Full Principal):</strong> Interest is calculated on the
                <strong> original loan amount for the entire tenure</strong>, even though you are repaying monthly.
                This means you pay interest on money you've already repaid. Common in dealer-finance schemes and
                some two-wheeler loans. <strong>At the same quoted %, flat rate costs ~80–90% more interest than reducing balance.</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-ink/80">On-Road Price (₹)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={onRoadPrice}
                onChange={e => setOnRoadPrice(Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-ink/55 mt-1">Include ex-showroom + RTO + insurance + accessories</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-ink/80">
                Down Payment (₹) <span className="text-ink/55 font-normal">— {downPct}% of price</span>
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                value={downPayment}
                onChange={e => setDownPayment(Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-ink/55 mt-1">
                {vehicleType === "two-wheeler"
                  ? "Banks offer up to 90% financing on two-wheelers"
                  : "Banks offer up to 85–90% financing on cars"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-ink/80">Tenure (Years)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={tenure}
                  onChange={e => setTenure(Number(e.target.value))}
                  className="mt-1"
                  min={1}
                  max={vehicleType === "two-wheeler" ? 5 : 7}
                />
                <p className="text-xs text-ink/55 mt-1">Max {vehicleType === "two-wheeler" ? "5" : "7"} years</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-ink/80">
                  Interest Rate (% p.a.)
                  <span className={`ml-1 text-xs font-normal px-1.5 py-0.5 rounded ${rateType === "reducing" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {rateType === "reducing" ? "Reducing" : "Flat"}
                  </span>
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={rate}
                  onChange={e => setRate(Number(e.target.value))}
                  className="mt-1"
                  step={0.05}
                />
              </div>
            </div>
            <p className="text-xs text-ink/55">{d.rateNote}</p>

            <div className="bg-secondary rounded-lg p-3 text-sm">
              <div className="flex justify-between text-ink/65">
                <span>Loan Amount:</span>
                <span className="font-semibold text-ink">{formatINR(loanAmount)}</span>
              </div>
            </div>

            <Button
              onClick={calculate}
              className={`w-full font-semibold py-3 text-white ${accentBtn}`}
            >
              Calculate EMI
            </Button>
          </div>

          {/* Results */}
          <div>
            {result && !user ? (
              <ResultAuthGate toolName="Vehicle Loan Calculator" />
            ) : result ? (
              <div className="space-y-4">
                {/* EMI highlight */}
                <div className={`rounded-xl p-5 text-center border ${accentBg}`}>
                  <p className="text-sm text-ink/65 mb-1">
                    Your Monthly EMI
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-semibold ${result.rateType === "reducing" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {result.rateType === "reducing" ? "Reducing Balance" : "Flat Rate"}
                    </span>
                  </p>
                  <p className={`text-4xl font-bold mb-1 ${vehicleType === "four-wheeler" ? "text-ink" : "text-orange-600"}`}>
                    {formatINR(result.emi)}
                  </p>
                  <p className="text-xs text-ink/55">for {tenure} years at {rate}% p.a. ({result.rateType === "reducing" ? "reducing balance" : "flat rate"})</p>
                </div>

                {/* Breakdown */}
                <div className="bg-secondary rounded-xl p-4 space-y-2 text-sm">
                  <h4 className="font-bold text-ink mb-3">Loan Breakdown</h4>
                  <div className="flex justify-between">
                    <span className="text-ink/65">On-Road Price:</span>
                    <span className="font-semibold">{formatINR(onRoadPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/65">Down Payment ({result.downPaymentPct.toFixed(1)}%):</span>
                    <span className="font-semibold text-green-700">− {formatINR(downPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/65">Loan Amount:</span>
                    <span className="font-semibold">{formatINR(result.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/65">Total Interest:</span>
                    <span className="font-semibold text-orange-600">{formatINR(result.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between border-t border-rule pt-2">
                    <span className="text-ink/80 font-medium">Total Amount Payable:</span>
                    <span className="font-bold">{formatINR(result.totalPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/65">Interest as % of loan:</span>
                    <span className="font-semibold text-ink/80">{((result.totalInterest / result.loanAmount) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Side-by-side comparison */}
                <div className="rounded-xl border border-rule overflow-hidden">
                  <div className="bg-ink text-white text-xs font-bold px-4 py-2">
                    📊 Same {rate}% Rate — Reducing vs Flat Comparison
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-rule">
                    <div className={`p-3 text-xs ${result.rateType === "reducing" ? "bg-green-50" : "bg-card"}`}>
                      <p className="font-bold text-green-700 mb-2 flex items-center gap-1">
                        ✅ Reducing Balance
                        {result.rateType === "reducing" && <span className="bg-green-600 text-white px-1.5 rounded text-[10px]">Selected</span>}
                      </p>
                      <div className="space-y-1 text-ink/80">
                        <div className="flex justify-between"><span>EMI:</span><span className="font-bold">{formatINR(result.reducingEmi)}</span></div>
                        <div className="flex justify-between"><span>Total Interest:</span><span className="font-bold text-green-700">{formatINR(result.reducingInterest)}</span></div>
                        <div className="flex justify-between"><span>Total Payable:</span><span className="font-bold">{formatINR(result.reducingTotal)}</span></div>
                      </div>
                    </div>
                    <div className={`p-3 text-xs ${result.rateType === "flat" ? "bg-red-50" : "bg-card"}`}>
                      <p className="font-bold text-red-600 mb-2 flex items-center gap-1">
                        🚨 Flat Rate
                        {result.rateType === "flat" && <span className="bg-red-500 text-white px-1.5 rounded text-[10px]">Selected</span>}
                      </p>
                      <div className="space-y-1 text-ink/80">
                        <div className="flex justify-between"><span>EMI:</span><span className="font-bold">{formatINR(result.flatEmi)}</span></div>
                        <div className="flex justify-between"><span>Total Interest:</span><span className="font-bold text-red-600">{formatINR(result.flatInterest)}</span></div>
                        <div className="flex justify-between"><span>Total Payable:</span><span className="font-bold">{formatINR(result.flatTotal)}</span></div>
                      </div>
                    </div>
                  </div>
                  {/* Extra interest from flat rate */}
                  <div className="bg-secondary px-4 py-2.5 text-xs text-ink text-center border-t border-rule">
                    <strong>Flat rate costs you {formatINR(result.flatInterest - result.reducingInterest)} more in interest</strong> than reducing balance at the same quoted rate.
                    {result.flatInterest > result.reducingInterest && (
                      <span className="ml-1">({(((result.flatInterest - result.reducingInterest) / result.reducingInterest) * 100).toFixed(0)}% extra)</span>
                    )}
                  </div>
                </div>

                {/* Down payment tip */}
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">
                  <strong>💡 Save on interest:</strong> Every ₹10,000 increase in down payment reduces total interest by approximately ₹{Math.round((result.totalInterest / result.loanAmount) * 10000).toLocaleString("en-IN")} over the loan tenure.
                  Maximize your down payment where possible.
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[260px] bg-secondary rounded-xl border border-dashed border-rule">
                <div className="text-center text-ink/55">
                  <div className="text-5xl mb-3">{d.emoji}</div>
                  <p className="font-medium text-ink/55">Enter details and click Calculate</p>
                  <p className="text-sm mt-1">Compare Reducing vs Flat rate impact</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

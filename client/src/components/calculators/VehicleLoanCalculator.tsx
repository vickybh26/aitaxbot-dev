import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VehicleType = "two-wheeler" | "four-wheeler";

interface VehicleLoanResult {
  loanAmount: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  downPaymentPct: number;
  effectiveRate: number;
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
    color: "from-blue-600 to-indigo-600",
    accent: "blue",
    typical: "Typical range: ₹5,00,000 – ₹40,00,000 (hatchback to SUV)",
    rateNote: "Car loan rates: 8.5–12% p.a. Top PSU banks start at 8.35%",
  },
};

export default function VehicleLoanCalculator() {
  const [vehicleType, setVehicleType] = useState<VehicleType>("four-wheeler");
  const [onRoadPrice, setOnRoadPrice] = useState<number>(DEFAULTS["four-wheeler"].onRoadPrice);
  const [downPayment, setDownPayment] = useState<number>(DEFAULTS["four-wheeler"].downPayment);
  const [tenure, setTenure] = useState<number>(DEFAULTS["four-wheeler"].tenure);
  const [rate, setRate] = useState<number>(DEFAULTS["four-wheeler"].rate);
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
    const r = rate / 12 / 100;
    const n = tenure * 12;
    const emi = r > 0
      ? (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      : loanAmount / n;
    const totalPayment = emi * n;
    const totalInterest = totalPayment - loanAmount;
    const downPaymentPct = onRoadPrice > 0 ? (downPayment / onRoadPrice) * 100 : 0;
    const effectiveRate = loanAmount > 0 ? (totalInterest / loanAmount / tenure) * 100 : 0;

    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});

    setResult({ loanAmount, emi, totalInterest, totalPayment, downPaymentPct, effectiveRate });
  };

  const d = DEFAULTS[vehicleType];
  const loanAmount = Math.max(0, onRoadPrice - downPayment);
  const downPct = onRoadPrice > 0 ? ((downPayment / onRoadPrice) * 100).toFixed(1) : "0";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Vehicle type toggle */}
      <div className={`bg-gradient-to-r ${d.color} p-6`}>
        <div className="flex gap-3 mb-4">
          {(["two-wheeler", "four-wheeler"] as VehicleType[]).map(type => (
            <button
              key={type}
              onClick={() => switchVehicle(type)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                vehicleType === type
                  ? "bg-white text-slate-900 shadow-md"
                  : "bg-white/20 text-white hover:bg-white/30"
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

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">On-Road Price (₹)</Label>
              <Input
                type="number"
                value={onRoadPrice}
                onChange={e => setOnRoadPrice(Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Include ex-showroom + RTO + insurance + accessories</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Down Payment (₹) <span className="text-slate-400 font-normal">— {downPct}% of price</span>
              </Label>
              <Input
                type="number"
                value={downPayment}
                onChange={e => setDownPayment(Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                {vehicleType === "two-wheeler"
                  ? "Banks offer up to 90% financing on two-wheelers"
                  : "Banks offer up to 85–90% financing on cars"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Tenure (Years)</Label>
                <Input
                  type="number"
                  value={tenure}
                  onChange={e => setTenure(Number(e.target.value))}
                  className="mt-1"
                  min={1}
                  max={vehicleType === "two-wheeler" ? 5 : 7}
                />
                <p className="text-xs text-slate-500 mt-1">Max {vehicleType === "two-wheeler" ? "5" : "7"} years</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Interest Rate (% p.a.)</Label>
                <Input
                  type="number"
                  value={rate}
                  onChange={e => setRate(Number(e.target.value))}
                  className="mt-1"
                  step={0.05}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">{d.rateNote}</p>

            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Loan Amount:</span>
                <span className="font-semibold text-slate-900">{formatINR(loanAmount)}</span>
              </div>
            </div>

            <Button
              onClick={calculate}
              className={`w-full font-semibold py-3 text-white ${
                vehicleType === "four-wheeler" ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              Calculate EMI
            </Button>
          </div>

          {/* Results */}
          <div>
            {result ? (
              <div className="space-y-4">
                {/* EMI highlight */}
                <div className={`rounded-xl p-5 text-center ${vehicleType === "four-wheeler" ? "bg-blue-50 border border-blue-200" : "bg-orange-50 border border-orange-200"}`}>
                  <p className="text-sm text-slate-600 mb-1">Your Monthly EMI</p>
                  <p className={`text-4xl font-bold mb-1 ${vehicleType === "four-wheeler" ? "text-blue-700" : "text-orange-600"}`}>
                    {formatINR(result.emi)}
                  </p>
                  <p className="text-xs text-slate-500">for {tenure} years at {rate}% p.a.</p>
                </div>

                {/* Breakdown */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                  <h4 className="font-bold text-slate-900 mb-3">Loan Breakdown</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-600">On-Road Price:</span>
                    <span className="font-semibold">{formatINR(onRoadPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Down Payment ({result.downPaymentPct.toFixed(1)}%):</span>
                    <span className="font-semibold text-green-700">− {formatINR(downPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Loan Amount:</span>
                    <span className="font-semibold">{formatINR(result.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Interest:</span>
                    <span className="font-semibold text-orange-600">{formatINR(result.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-700 font-medium">Total Amount Payable:</span>
                    <span className="font-bold">{formatINR(result.totalPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Interest as % of loan:</span>
                    <span className="font-semibold text-slate-700">{((result.totalInterest / result.loanAmount) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Interest tip */}
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">
                  <strong>💡 Save on interest:</strong> Every ₹10,000 increase in down payment reduces total interest by approximately ₹{Math.round((result.totalInterest / result.loanAmount) * 10000).toLocaleString("en-IN")} over the loan tenure.
                  Maximize your down payment where possible.
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[260px] bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <div className="text-center text-slate-400">
                  <div className="text-5xl mb-3">{d.emoji}</div>
                  <p className="font-medium text-slate-500">Enter details and click Calculate</p>
                  <p className="text-sm mt-1">Get your EMI and total cost instantly</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

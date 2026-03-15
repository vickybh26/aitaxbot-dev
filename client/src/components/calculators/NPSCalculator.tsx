import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface NPSResult {
  totalCorpus: number;
  totalContributed: number;
  totalReturns: number;
  lumpSum: number;           // 60% tax-free withdrawal
  annuityCorpus: number;    // 40% used for annuity
  monthlyPension: number;   // estimated monthly pension
  taxSaving80CCD1: number;
  taxSaving80CCD1B: number;
  taxSaving80CCD2: number;
  totalTaxSaving: number;
}

export default function NPSCalculator() {
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [retirementAge, setRetirementAge] = useState<number>(60);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(5000);
  const [employerContribution, setEmployerContribution] = useState<number>(0);
  const [expectedReturn, setExpectedReturn] = useState<number>(10);
  const [annuityRate, setAnnuityRate] = useState<number>(6);
  const [taxRate, setTaxRate] = useState<number>(30);
  const [result, setResult] = useState<NPSResult | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const calculateNPS = () => {
    const years = retirementAge - currentAge;
    if (years <= 0) return;

    const months = years * 12;
    const monthlyRate = expectedReturn / 12 / 100;
    const totalMonthly = monthlyContribution + employerContribution;

    // Future value of monthly contributions (annuity formula)
    let totalCorpus = 0;
    if (monthlyRate > 0) {
      totalCorpus = totalMonthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    } else {
      totalCorpus = totalMonthly * months;
    }

    const totalContributed = totalMonthly * months;
    const totalReturns = totalCorpus - totalContributed;

    // At retirement: max 60% lump sum (tax-free), min 40% annuity
    const lumpSum = totalCorpus * 0.6;
    const annuityCorpus = totalCorpus * 0.4;

    // Monthly pension from annuity corpus
    const monthlyPension = (annuityCorpus * (annuityRate / 100)) / 12;

    // Tax savings (approximate, based on 30% slab as default)
    const annualContrib = monthlyContribution * 12;
    const tax80CCD1 = Math.min(annualContrib, 150000) * (taxRate / 100);  // within 80C limit
    const tax80CCD1B = 50000 * (taxRate / 100);  // additional ₹50K deduction
    const tax80CCD2 = employerContribution * 12 * (taxRate / 100);  // employer contrib fully deductible

    setResult({
      totalCorpus,
      totalContributed,
      totalReturns,
      lumpSum,
      annuityCorpus,
      monthlyPension,
      taxSaving80CCD1: tax80CCD1,
      taxSaving80CCD1B: tax80CCD1B,
      taxSaving80CCD2: tax80CCD2,
      totalTaxSaving: tax80CCD1 + tax80CCD1B + tax80CCD2
    });
    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});
  };

  useEffect(() => {
    if (!result || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const Chart = (window as any).Chart;
    if (!Chart) return;

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Your Contributions', 'Returns Earned', ],
        datasets: [{
          data: [
            Math.round(result.totalContributed),
            Math.round(result.totalReturns),
          ],
          backgroundColor: ['#3b82f6', '#10b981'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const value = context.parsed;
                return ` ${formatCurrency(value)}`;
              }
            }
          }
        }
      }
    });
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card className="p-6 shadow-soft">
        <h2 className="text-xl font-bold text-slate-900 mb-6">NPS Calculator Inputs</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          <div>
            <Label htmlFor="currentAge" className="text-sm font-medium text-slate-700 mb-1 block">
              Current Age (years)
            </Label>
            <Input
              id="currentAge"
              type="number"
              min={18} max={59}
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Min 18, Max 59</p>
          </div>

          <div>
            <Label htmlFor="retirementAge" className="text-sm font-medium text-slate-700 mb-1 block">
              Retirement Age (years)
            </Label>
            <Input
              id="retirementAge"
              type="number"
              min={60} max={75}
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">NPS matures at 60, extendable to 75</p>
          </div>

          <div>
            <Label htmlFor="monthlyContribution" className="text-sm font-medium text-slate-700 mb-1 block">
              Your Monthly Contribution (₹)
            </Label>
            <Input
              id="monthlyContribution"
              type="number"
              min={500}
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum ₹500/month for Tier I</p>
          </div>

          <div>
            <Label htmlFor="employerContribution" className="text-sm font-medium text-slate-700 mb-1 block">
              Employer Monthly Contribution (₹)
            </Label>
            <Input
              id="employerContribution"
              type="number"
              min={0}
              value={employerContribution}
              onChange={(e) => setEmployerContribution(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Leave 0 if self-employed</p>
          </div>

          <div>
            <Label htmlFor="expectedReturn" className="text-sm font-medium text-slate-700 mb-1 block">
              Expected Annual Return (%)
            </Label>
            <Input
              id="expectedReturn"
              type="number"
              min={4} max={15} step={0.5}
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Historical NPS equity: 10–12%</p>
          </div>

          <div>
            <Label htmlFor="annuityRate" className="text-sm font-medium text-slate-700 mb-1 block">
              Expected Annuity Rate (%)
            </Label>
            <Input
              id="annuityRate"
              type="number"
              min={4} max={10} step={0.5}
              value={annuityRate}
              onChange={(e) => setAnnuityRate(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Current annuity rates: 5–7%</p>
          </div>

          <div>
            <Label htmlFor="taxRate" className="text-sm font-medium text-slate-700 mb-1 block">
              Your Tax Slab (%)
            </Label>
            <select
              id="taxRate"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={5}>5% slab (₹3L–₹7L)</option>
              <option value={10}>10% slab (₹7L–₹10L)</option>
              <option value={15}>15% slab (₹10L–₹12L)</option>
              <option value={20}>20% slab (₹12L–₹15L)</option>
              <option value={30}>30% slab (above ₹15L)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">For tax saving calculation</p>
          </div>

        </div>

        <Button
          onClick={calculateNPS}
          className="mt-6 gradient-blue text-white px-8 py-3 rounded-lg hover:shadow-colored transition-all"
        >
          Calculate NPS Corpus
        </Button>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">

          {/* Main Result Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <p className="text-xs text-blue-100 mb-1">Total Corpus at {retirementAge}</p>
              <p className="text-xl font-bold">{formatCurrency(result.totalCorpus)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <p className="text-xs text-green-100 mb-1">Lump Sum (60%, Tax-Free)</p>
              <p className="text-xl font-bold">{formatCurrency(result.lumpSum)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <p className="text-xs text-purple-100 mb-1">Monthly Pension (Est.)</p>
              <p className="text-xl font-bold">{formatCurrency(result.monthlyPension)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <p className="text-xs text-orange-100 mb-1">Annual Tax Saving</p>
              <p className="text-xl font-bold">{formatCurrency(result.totalTaxSaving)}</p>
            </Card>
          </div>

          {/* Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Corpus Breakdown */}
            <Card className="p-6 shadow-soft">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Corpus Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Total Contributed</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(result.totalContributed)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Returns Earned</span>
                  <span className="font-semibold text-green-600">{formatCurrency(result.totalReturns)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 font-bold">
                  <span className="text-slate-900">Total Corpus</span>
                  <span className="text-blue-600">{formatCurrency(result.totalCorpus)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Lump Sum (60%) — Tax-Free</span>
                  <span className="font-semibold text-green-600">{formatCurrency(result.lumpSum)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">Annuity Corpus (40%)</span>
                  <span className="font-semibold text-purple-600">{formatCurrency(result.annuityCorpus)}</span>
                </div>
              </div>
            </Card>

            {/* Chart */}
            <Card className="p-6 shadow-soft">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Investment vs Returns</h3>
              <div className="h-52">
                <canvas ref={chartRef}></canvas>
              </div>
            </Card>

          </div>

          {/* Tax Saving Breakdown */}
          <Card className="p-6 shadow-soft border-l-4 border-l-green-500">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Annual Tax Savings Breakdown</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">80CCD(1) — Your NPS contribution</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(result.taxSaving80CCD1)}</p>
                <p className="text-xs text-slate-500 mt-1">Up to 10% of salary, within ₹1.5L 80C limit</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">80CCD(1B) — Extra NPS deduction</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(result.taxSaving80CCD1B)}</p>
                <p className="text-xs text-slate-500 mt-1">Additional ₹50,000 over & above 80C</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">80CCD(2) — Employer contribution</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(result.taxSaving80CCD2)}</p>
                <p className="text-xs text-slate-500 mt-1">Up to 10% of salary — no upper limit!</p>
              </div>
            </div>
            <div className="mt-4 bg-slate-50 p-4 rounded-lg flex justify-between items-center">
              <span className="font-semibold text-slate-900">Total Annual Tax Saving</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(result.totalTaxSaving)}</span>
            </div>
          </Card>

          {/* Investment Duration */}
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Investment Duration:</strong> {retirementAge - currentAge} years &nbsp;|&nbsp;
              <strong>Total Months:</strong> {(retirementAge - currentAge) * 12} &nbsp;|&nbsp;
              <strong>Wealth Multiplier:</strong> {(result.totalCorpus / result.totalContributed).toFixed(1)}x
            </p>
          </Card>

        </div>
      )}
    </div>
  );
}

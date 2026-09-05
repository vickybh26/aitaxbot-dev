import { useState, useRef, useEffect } from "react";
import { useTrackToolUse } from '@/hooks/useTrackToolUse';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import ResultAuthGate from "@/components/ResultAuthGate";
import { INTERACTIVE, SUCCESS, WHITE } from '@/lib/chartColors';

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
  const { user } = useAuth();
  const trackTool = useTrackToolUse();
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [retirementAge, setRetirementAge] = useState<number>(60);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(5000);
  const [employerContribution, setEmployerContribution] = useState<number>(0);
  const [expectedReturn, setExpectedReturn] = useState<number>(10);
  const [annuityRate, setAnnuityRate] = useState<number>(6);
  // Annual salary (basic + DA) — needed for the statutory percentage caps:
  // 80CCD(1) is limited to 10% of salary and 80CCD(2) to 14%. Without it the
  // deductions could only be capped by their absolute ceilings.
  const [annualSalary, setAnnualSalary] = useState<number>(1200000);
  const [taxRate, setTaxRate] = useState<number>(30);
  const [regime, setRegime] = useState<'new' | 'old'>('new');
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

    // Tax savings — regime-aware
    // New Regime: 80CCD(1) and 80CCD(1B) are NOT available (self-contribution deductions removed).
    // Only 80CCD(2) employer contribution remains deductible under new regime.
    // Old Regime: All three deductions available.
    const annualContrib = monthlyContribution * 12;
    const annualEmployerContrib = employerContribution * 12;

    // Deductions must be capped at what was ACTUALLY contributed, and at the
    // statutory percentage limits. Previously:
    //   • 80CCD(1B) credited a flat ₹50,000 regardless of contribution, so a
    //     ₹2,000/month investor was shown more than triple the real benefit and
    //     every figure carried a fixed ₹15,000 of phantom saving at 30%.
    //   • 80CCD(1) had no 10%-of-salary cap, and combined with the flat (1B)
    //     could deduct ₹2,00,000 on a ₹1,50,000 contribution.
    //   • 80CCD(2) had no 14%-of-salary cap.
    //
    // s.80CCD(1B) is an ADDITIONAL ₹50,000 out of contributions not already
    // claimed under (1), which is why it is computed from the remainder.
    const under80CCD1 = Math.min(annualContrib, 150000, annualSalary * 0.10);
    const under80CCD1B = Math.min(Math.max(0, annualContrib - under80CCD1), 50000);
    const under80CCD2 = Math.min(annualEmployerContrib, annualSalary * 0.14);

    // Cess is due on the tax saved, so the effective rate is rate × 1.04.
    // HomeLoanCalculator uses 0.312 for the same concept; this used a bare 0.30.
    const effectiveRate = (taxRate / 100) * 1.04;

    const tax80CCD1 = regime === 'old' ? under80CCD1 * effectiveRate : 0;
    const tax80CCD1B = regime === 'old' ? under80CCD1B * effectiveRate : 0;
    const tax80CCD2 = under80CCD2 * effectiveRate;  // available in both regimes

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
    const rsNps = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    trackTool("NPS Calculator", `Corpus: ${rsNps(totalCorpus)}`, {
      toolKey: "nps",
      route: "/calculators/nps",
      kind: "calculator",
      headline: { label: "Corpus at retirement", value: rsNps(totalCorpus) },
      details: [
        { label: "Monthly pension", value: rsNps(monthlyPension) },
        { label: "Tax saved", value: rsNps(tax80CCD1 + tax80CCD1B + tax80CCD2) },
      ],
    });
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
          backgroundColor: [INTERACTIVE, SUCCESS],
          borderWidth: 2,
          borderColor: WHITE
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
        <h2 className="text-xl font-bold text-ink mb-6">NPS Calculator Inputs</h2>

        {/* Regime Selector */}
        <div className="mb-6 p-4 rounded-lg border border-rule bg-secondary">
          <p className="text-sm font-medium text-ink/80 mb-2">Tax Regime</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setRegime('new'); setResult(null); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${regime === 'new' ? 'bg-ink text-white' : 'bg-card border border-rule text-ink/80 hover:bg-secondary'}`}
            >
              New Regime (Default)
            </button>
            <button
              onClick={() => { setRegime('old'); setResult(null); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${regime === 'old' ? 'bg-ink text-white' : 'bg-card border border-rule text-ink/80 hover:bg-secondary'}`}
            >
              Old Regime
            </button>
          </div>
          {regime === 'new' && (
            <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ Under New Regime, 80CCD(1) and 80CCD(1B) deductions for your own NPS contributions are <strong>not available</strong>. Only employer NPS contribution remains deductible — up to <strong>14% of salary for all employers</strong> (S.80CCD(2), ITA 1961 up to FY 2025-26 · S.124(2), ITA 2025 from FY 2026-27).
            </p>
          )}
          {regime === 'old' && (
            <p className="text-xs text-green-700 mt-2 bg-green-50 border border-green-200 rounded p-2">
              ✅ Under Old Regime, all three NPS deductions are available: 80CCD(1) / S.124(1), 80CCD(1B) / S.124(3) (extra ₹50,000), and 80CCD(2) / S.124(1) employer contribution (ITA 1961 / ITA 2025 section numbers respectively).
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          <div>
            <Label htmlFor="currentAge" className="text-sm font-medium text-ink/80 mb-1 block">
              Current Age (years)
            </Label>
            <Input
              id="currentAge"
              type="number"
              inputMode="numeric"
              min={18} max={59}
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-ink/55 mt-1">Min 18, Max 59</p>
          </div>

          <div>
            <Label htmlFor="retirementAge" className="text-sm font-medium text-ink/80 mb-1 block">
              Retirement Age (years)
            </Label>
            <Input
              id="retirementAge"
              type="number"
              inputMode="numeric"
              min={60} max={75}
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-ink/55 mt-1">NPS matures at 60, extendable to 75</p>
          </div>

          <div>
            <Label htmlFor="monthlyContribution" className="text-sm font-medium text-ink/80 mb-1 block">
              Your Monthly Contribution (₹)
            </Label>
            <Input
              id="monthlyContribution"
              type="number"
              inputMode="numeric"
              min={500}
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-ink/55 mt-1">Minimum ₹500/month for Tier I</p>
          </div>

          <div>
            <Label htmlFor="employerContribution" className="text-sm font-medium text-ink/80 mb-1 block">
              Employer Monthly Contribution (₹)
            </Label>
            <Input
              id="employerContribution"
              type="number"
              inputMode="numeric"
              min={0}
              value={employerContribution}
              onChange={(e) => setEmployerContribution(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-ink/55 mt-1">
              Leave 0 if self-employed.{" "}
              {regime === 'new'
                ? <span className="text-green-700 font-medium">New Regime: deductible up to 14% of salary for all employers (ITA 2025, S.124(2)).</span>
                : <span>Old Regime: up to 14% for Govt employees; up to 10% for private employers (ITA 2025, S.124(1)).</span>
              }
            </p>
          </div>

          <div>
            <Label htmlFor="expectedReturn" className="text-sm font-medium text-ink/80 mb-1 block">
              Expected Annual Return (%)
            </Label>
            <Input
              id="expectedReturn"
              type="number"
              inputMode="decimal"
              min={4} max={15} step={0.5}
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-ink/55 mt-1">Historical NPS equity: 10–12%</p>
          </div>

          <div>
            <Label htmlFor="annuityRate" className="text-sm font-medium text-ink/80 mb-1 block">
              Expected Annuity Rate (%)
            </Label>
            <Input
              id="annuityRate"
              type="number"
              inputMode="decimal"
              min={4} max={10} step={0.5}
              value={annuityRate}
              onChange={(e) => setAnnuityRate(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-ink/55 mt-1">Current annuity rates: 5–7%</p>
          </div>

          {/* Salary drives the percentage caps: 80CCD(1) is limited to 10% of
              salary and 80CCD(2) to 14%. Without it the tool could only apply
              the absolute ceilings, which overstated the benefit. */}
          <div>
            <Label htmlFor="annualSalary" className="text-sm font-medium text-ink/80 mb-1 block">
              Annual Salary (Basic + DA)
            </Label>
            <Input
              id="annualSalary"
              type="number"
              inputMode="numeric"
              value={annualSalary || ""}
              onChange={(e) => { setAnnualSalary(Number(e.target.value)); setResult(null); }}
              className="w-full"
            />
            <p className="text-xs text-ink/55 mt-1">
              80CCD(1) is capped at 10% of this figure, and employer 80CCD(2) at 14%.
            </p>
          </div>

          <div>
            <Label htmlFor="taxRate" className="text-sm font-medium text-ink/80 mb-1 block">
              Your Marginal Tax Slab (%)
            </Label>
            <select
              id="taxRate"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {regime === 'new' ? (
                <>
                  <option value={5}>5% (₹4L–₹8L)</option>
                  <option value={10}>10% (₹8L–₹12L)</option>
                  <option value={15}>15% (₹12L–₹16L)</option>
                  <option value={20}>20% (₹16L–₹20L)</option>
                  <option value={25}>25% (₹20L–₹24L)</option>
                  <option value={30}>30% (above ₹24L)</option>
                </>
              ) : (
                <>
                  <option value={5}>5% (₹2.5L–₹5L)</option>
                  <option value={20}>20% (₹5L–₹10L)</option>
                  <option value={30}>30% (above ₹10L)</option>
                </>
              )}
            </select>
            <p className="text-xs text-ink/55 mt-1">Your top slab rate — used to estimate tax savings</p>
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
      {result && !user ? (
        <ResultAuthGate toolName="NPS Calculator" />
      ) : result && (
        <div className="space-y-6">

          {/* Main Result Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-ink to-credit text-white">
              <p className="text-xs text-blue-100 mb-1">Total Corpus at {retirementAge}</p>
              <p className="text-xl font-bold">{formatCurrency(result.totalCorpus)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <p className="text-xs text-green-100 mb-1">Lump Sum (60%, Tax-Free)</p>
              <p className="text-xl font-bold">{formatCurrency(result.lumpSum)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-ink to-credit text-white">
              <p className="text-xs text-paper/80 mb-1">Monthly Pension (Est.)</p>
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
              <h3 className="text-lg font-bold text-ink mb-4">Corpus Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-rule">
                  <span className="text-ink/65">Total Contributed</span>
                  <span className="font-semibold text-ink">{formatCurrency(result.totalContributed)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-rule">
                  <span className="text-ink/65">Returns Earned</span>
                  <span className="font-semibold text-green-600">{formatCurrency(result.totalReturns)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-rule font-bold">
                  <span className="text-ink">Total Corpus</span>
                  <span className="text-credit">{formatCurrency(result.totalCorpus)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-rule">
                  <span className="text-ink/65">Lump Sum (60%) — Tax-Free</span>
                  <span className="font-semibold text-green-600">{formatCurrency(result.lumpSum)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-ink/65">Annuity Corpus (40%)</span>
                  <span className="font-semibold text-ink">{formatCurrency(result.annuityCorpus)}</span>
                </div>
              </div>
            </Card>

            {/* Chart */}
            <Card className="p-6 shadow-soft">
              <h3 className="text-lg font-bold text-ink mb-4">Investment vs Returns</h3>
              <div className="h-52">
                <canvas ref={chartRef}></canvas>
              </div>
            </Card>

          </div>

          {/* Tax Saving Breakdown */}
          <Card className="p-6 shadow-soft border-l-4 border-l-green-500">
            <h3 className="text-lg font-bold text-ink mb-4">Annual Tax Savings Breakdown</h3>
            <div className={`grid gap-4 ${regime === 'new' ? 'md:grid-cols-1' : 'md:grid-cols-3'}`}>
              {regime === 'old' && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-ink/55 mb-1">80CCD(1) — Your NPS contribution</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(result.taxSaving80CCD1)}</p>
                  <p className="text-xs text-ink/55 mt-1">Up to 10% of salary, within ₹1.5L 80C limit</p>
                </div>
              )}
              {regime === 'old' && (
                <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-xs text-ink/55 mb-1">80CCD(1B) — Extra NPS deduction</p>
                  <p className="text-xl font-bold text-ink">{formatCurrency(result.taxSaving80CCD1B)}</p>
                  <p className="text-xs text-ink/55 mt-1">Additional ₹50,000 over & above 80C</p>
                </div>
              )}
              <div className="bg-paper p-4 rounded-lg">
                <p className="text-xs text-ink/55 mb-1">80CCD(2) — Employer contribution</p>
                <p className="text-xl font-bold text-ink">{formatCurrency(result.taxSaving80CCD2)}</p>
                <p className="text-xs text-ink/55 mt-1">
                  {regime === 'new'
                    ? 'Available in New Regime — up to 14% of salary for ALL employers (S.124(2), ITA 2025)'
                    : 'Old Regime: up to 14% for Govt employees; 10% for private employers (S.124(1))'}
                </p>
              </div>
            </div>
            {regime === 'new' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                80CCD(1) and 80CCD(1B) deductions on your own NPS contributions are <strong>not available under the New Regime</strong>. Switch to Old Regime to unlock up to ₹{formatCurrency(
                  (Math.min(monthlyContribution * 12, 150000, annualSalary * 0.10) +
                   Math.min(Math.max(0, monthlyContribution * 12 - Math.min(monthlyContribution * 12, 150000, annualSalary * 0.10)), 50000)
                  ) * (taxRate / 100) * 1.04)} more in tax savings.
              </div>
            )}
            <div className="mt-4 bg-secondary p-4 rounded-lg flex justify-between items-center">
              <span className="font-semibold text-ink">Total Annual Tax Saving</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(result.totalTaxSaving)}</span>
            </div>
          </Card>

          {/* Investment Duration */}
          <Card className="p-4 bg-secondary border border-rule">
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

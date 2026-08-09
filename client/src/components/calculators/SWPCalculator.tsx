import { useState, useEffect } from "react";
import { PiggyBank, Info } from "lucide-react";
import { useTrackToolUse } from '@/hooks/useTrackToolUse';
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import ResultAuthGate from "@/components/ResultAuthGate";

interface SWPCalculatorProps {
  onClose?: () => void;
}

interface YearlySnapshot {
  year: number;
  withdrawal: number;
  corpus: number;
}

interface SWPResult {
  totalCorpus: number;
  startingMonthlyWithdrawal: number;
  finalMonthlyWithdrawal: number;
  totalWithdrawals: number;
  remainingCorpus: number;
  durationYears: number;
  durationMonths: number;
  inflationAdjusted: boolean;
  yearlySnapshots: YearlySnapshot[];
}

export default function SWPCalculator({ onClose }: SWPCalculatorProps = {}) {
  const trackTool = useTrackToolUse();
  const { user } = useAuth();
  const [initialCorpus, setInitialCorpus] = useState<number>(5000000);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState<number>(50000);
  const [annualReturn, setAnnualReturn] = useState<number>(8);
  const [inflationRate, setInflationRate] = useState<number>(6);
  const [enableInflation, setEnableInflation] = useState<boolean>(false);
  const [result, setResult] = useState<SWPResult | null>(null);

  const calculateSWP = () => {
    const monthlyReturn = annualReturn / 12 / 100;
    const annualInflation = inflationRate / 100;
    let corpus = initialCorpus;
    let totalWithdrawals = 0;
    let months = 0;
    let currentMonthlyWithdrawal = monthlyWithdrawal;
    const yearlySnapshots: YearlySnapshot[] = [];

    // Max 50 years = 600 months
    while (corpus > currentMonthlyWithdrawal && months < 600) {
      // At the start of each year (except year 0), increase withdrawal by inflation
      if (enableInflation && months > 0 && months % 12 === 0) {
        currentMonthlyWithdrawal = currentMonthlyWithdrawal * (1 + annualInflation);
        yearlySnapshots.push({
          year: months / 12,
          withdrawal: Math.round(currentMonthlyWithdrawal),
          corpus: Math.round(corpus),
        });
      }

      corpus = corpus * (1 + monthlyReturn) - currentMonthlyWithdrawal;
      totalWithdrawals += currentMonthlyWithdrawal;
      months++;
    }

    // Capture year 0 snapshot
    if (yearlySnapshots.length === 0 || yearlySnapshots[0].year !== 0) {
      yearlySnapshots.unshift({ year: 0, withdrawal: monthlyWithdrawal, corpus: initialCorpus });
    }

    const durationYears = Math.floor(months / 12);
    const durationMonths = months % 12;

    setResult({
      totalCorpus: initialCorpus,
      startingMonthlyWithdrawal: monthlyWithdrawal,
      finalMonthlyWithdrawal: Math.round(currentMonthlyWithdrawal),
      totalWithdrawals: Math.round(totalWithdrawals),
      remainingCorpus: Math.max(0, Math.round(corpus)),
      durationYears,
      durationMonths,
      inflationAdjusted: enableInflation,
      yearlySnapshots: yearlySnapshots.slice(0, 10), // Show first 10 years
    });
    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});
    const rsSwp = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    trackTool("SWP Calculator", `Monthly withdrawal: ${rsSwp(monthlyWithdrawal)}`, {
      toolKey: "swp",
      route: "/calculators/swp",
      kind: "calculator",
      headline: {
        label: "Monthly withdrawal",
        value: rsSwp(monthlyWithdrawal),
        hint: `Corpus lasts ${durationYears}y ${durationMonths}m`,
      },
      details: [
        { label: "Total withdrawn", value: rsSwp(totalWithdrawals) },
        { label: "Corpus left", value: rsSwp(Math.max(0, corpus)) },
      ],
    });
  };

  useEffect(() => {
    calculateSWP();
  }, [initialCorpus, monthlyWithdrawal, annualReturn, inflationRate, enableInflation]);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const durationText = result
    ? result.durationYears > 0
      ? `${result.durationYears}y ${result.durationMonths > 0 ? result.durationMonths + 'm' : ''}`
      : `${result.durationMonths} months`
    : '—';

  const calculatorContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Form */}
      <div className="space-y-5">
        <div>
          <Label htmlFor="initial-corpus">Initial Corpus (₹)</Label>
          <Input
            id="initial-corpus"
            type="number"
            value={initialCorpus}
            onChange={(e) => setInitialCorpus(Number(e.target.value))}
            placeholder="5000000"
            data-testid="input-initial-corpus"
          />
        </div>

        <div>
          <Label htmlFor="monthly-withdrawal">Monthly Withdrawal (₹)</Label>
          <Input
            id="monthly-withdrawal"
            type="number"
            value={monthlyWithdrawal}
            onChange={(e) => setMonthlyWithdrawal(Number(e.target.value))}
            placeholder="50000"
            data-testid="input-monthly-withdrawal"
          />
        </div>

        <div>
          <Label htmlFor="annual-return">Expected Annual Return (%)</Label>
          <Input
            id="annual-return"
            type="number"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(Number(e.target.value))}
            placeholder="8"
            step="0.5"
            data-testid="input-expected-return"
          />
        </div>

        {/* Inflation Toggle */}
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-blue-800 font-medium">Inflation Adjustment</Label>
            <button
              type="button"
              onClick={() => setEnableInflation(!enableInflation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                enableInflation ? 'bg-persian-blue-600' : 'bg-slate-300'
              }`}
              data-testid="toggle-inflation"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enableInflation ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-blue-700">
            Increase monthly withdrawal each year to maintain purchasing power
          </p>
          {enableInflation && (
            <div>
              <Label htmlFor="inflation-rate" className="text-blue-800">Annual Inflation Rate (%)</Label>
              <Input
                id="inflation-rate"
                type="number"
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                placeholder="6"
                step="0.5"
                className="mt-1"
                data-testid="input-inflation-rate"
              />
            </div>
          )}
        </div>

        <Button
          onClick={calculateSWP}
          className="w-full h-12 bg-persian-blue-600 hover:bg-persian-blue-700 text-white font-medium"
          data-testid="button-calculate-swp"
        >
          <PiggyBank className="mr-2 h-4 w-4" />Calculate SWP
        </Button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <Card className="bg-slate-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Withdrawal Plan Summary</h3>
            {result?.inflationAdjusted && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">Inflation-Adjusted</Badge>
            )}
          </div>
          {result && !user ? (
            <ResultAuthGate toolName="SWP Calculator" />
          ) : result && (
            <div className="space-y-3">
              <Card className="bg-white p-4">
                <div className="text-sm text-slate-600">Initial Corpus</div>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-initial-corpus">
                  {formatCurrency(result.totalCorpus)}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white p-4">
                  <div className="text-xs text-slate-500">Starting Withdrawal/mo</div>
                  <div className="text-lg font-bold text-persian-blue-700" data-testid="text-monthly-withdrawal">
                    {formatCurrency(result.startingMonthlyWithdrawal)}
                  </div>
                </Card>
                {result.inflationAdjusted && (
                  <Card className="bg-white p-4">
                    <div className="text-xs text-slate-500">Final Withdrawal/mo</div>
                    <div className="text-lg font-bold text-orange-500">
                      {formatCurrency(result.finalMonthlyWithdrawal)}
                    </div>
                  </Card>
                )}
              </div>

              <Card className="bg-white p-4">
                <div className="text-sm text-slate-600">Corpus Duration</div>
                <div className="text-2xl font-bold text-green-600" data-testid="text-corpus-duration">
                  {durationText}
                  {result.durationYears >= 50 && (
                    <span className="text-sm font-normal text-green-500 ml-2">(50+ years)</span>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white p-4">
                  <div className="text-xs text-slate-500">Total Withdrawals</div>
                  <div className="text-base font-bold text-orange-600" data-testid="text-total-withdrawals">
                    {formatCurrency(result.totalWithdrawals)}
                  </div>
                </Card>
                <Card className="bg-white p-4">
                  <div className="text-xs text-slate-500">Remaining Corpus</div>
                  <div className="text-base font-bold text-slate-600" data-testid="text-remaining-corpus">
                    {formatCurrency(result.remainingCorpus)}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Card>

        {/* Year-by-year breakdown when inflation is enabled */}
        {result?.inflationAdjusted && result.yearlySnapshots.length > 1 && (
          <Card className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Year-by-Year Withdrawal (Inflation @ {inflationRate}%)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs">
                    <th className="pb-2">Year</th>
                    <th className="pb-2 text-right">Monthly</th>
                    <th className="pb-2 text-right">Corpus</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {result.yearlySnapshots.map((snap) => (
                    <tr key={snap.year} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">Yr {snap.year}</td>
                      <td className="py-1.5 text-right font-medium text-persian-blue-800">
                        {formatCurrency(snap.withdrawal)}
                      </td>
                      <td className="py-1.5 text-right text-slate-600">
                        {formatCurrency(snap.corpus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <span className="text-sm text-yellow-800">
              {result?.inflationAdjusted
                ? `Withdrawals increase by ${inflationRate}% annually to account for inflation.`
                : 'Toggle inflation adjustment above to model real purchasing-power withdrawals.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return onClose ? (
    <Modal isOpen={true} onClose={onClose} title="SWP Calculator" size="4xl">
      {calculatorContent}
    </Modal>
  ) : (
    calculatorContent
  );
}

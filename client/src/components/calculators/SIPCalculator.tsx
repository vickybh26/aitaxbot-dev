import { useState, useEffect, useRef } from "react";
import { TrendingUp } from "lucide-react";
import { useTrackToolUse } from '@/hooks/useTrackToolUse';
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import ResultAuthGate from "@/components/ResultAuthGate";

interface SIPCalculatorProps {
  onClose?: () => void;
}

interface SIPResult {
  totalInvestment: number;
  totalReturns: number;
  maturityValue: number;
  wealthGain: number;
}

export default function SIPCalculator({ onClose }: SIPCalculatorProps = {}) {
  const trackTool = useTrackToolUse();
  const { user } = useAuth();
  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(5000);
  const [annualReturn, setAnnualReturn] = useState<number>(12);
  const [years, setYears] = useState<number>(10);
  const [stepUp, setStepUp] = useState<number>(0);
  const [result, setResult] = useState<SIPResult | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const calculateSIP = () => {
    const months = years * 12;
    const monthlyReturn = annualReturn / 12 / 100;

    let totalInvestment = 0;
    let maturityValue = 0;
    let currentMonthlyAmount = monthlyInvestment;

    // Year-end series for the chart. Built from this same simulation rather
    // than interpolated afterwards: the chart previously plotted
    // (maturity / years) * year, a straight line that showed no compounding at
    // all — the visual contradicted the headline number it sat next to. The
    // invested line was also monthlyInvestment * 12 * year, which ignored
    // step-up entirely and understated contributions whenever step-up was set.
    const yearlyInvested: number[] = [];
    const yearlyValue: number[] = [];
    // Running balance: (balance + contribution) × (1 + r) each month. This is
    // algebraically identical to the monthsRemaining compounding below, so the
    // final chart point always lands on the stated maturity value.
    let runningBalance = 0;

    // Calculate SIP with step-up
    for (let year = 1; year <= years; year++) {
      for (let month = 1; month <= 12; month++) {
        const monthsRemaining = (years - year) * 12 + (12 - month) + 1;
        totalInvestment += currentMonthlyAmount;

        if (monthlyReturn > 0) {
          maturityValue += currentMonthlyAmount * Math.pow(1 + monthlyReturn, monthsRemaining);
          runningBalance = (runningBalance + currentMonthlyAmount) * (1 + monthlyReturn);
        } else {
          maturityValue += currentMonthlyAmount;
          runningBalance += currentMonthlyAmount;
        }
      }
      yearlyInvested.push(totalInvestment);
      yearlyValue.push(runningBalance);
      // Apply step-up at year end
      currentMonthlyAmount = currentMonthlyAmount * (1 + stepUp / 100);
    }

    const totalReturns = maturityValue - totalInvestment;
    const wealthGain = totalInvestment > 0 ? maturityValue / totalInvestment : 0;

    setResult({
      totalInvestment,
      totalReturns,
      maturityValue,
      wealthGain
    });
    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});
    trackTool("SIP Calculator", `Maturity: ₹${Math.round(maturityValue).toLocaleString('en-IN')}`);

    // Update chart
    updateChart(yearlyInvested, yearlyValue);
  };

  const updateChart = (yearlyInvested: number[], yearlyValue: number[]) => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart using Chart.js (loaded via CDN)
    if (typeof window !== 'undefined' && (window as any).Chart) {
      const Chart = (window as any).Chart;
      
      const labels = [];
      const investmentData = [];
      const valueData = [];

      for (let year = 1; year <= years; year++) {
        labels.push(`Year ${year}`);
        // Actual year-end figures from the SIP simulation — including step-up
        // and compounding. Do not substitute a linear interpolation here.
        investmentData.push(Math.round(yearlyInvested[year - 1] ?? 0));
        valueData.push(Math.round(yearlyValue[year - 1] ?? 0));
      }

      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total Investment',
            data: investmentData,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: false
          }, {
            label: 'Expected Value',
            data: valueData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: false
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value: any) {
                  return '₹' + (value / 100000).toFixed(1) + 'L';
                }
              }
            }
          }
        }
      });
    }
  };

  useEffect(() => {
    calculateSIP();
  }, [monthlyInvestment, annualReturn, years, stepUp]);

  useEffect(() => {
    // Load Chart.js if not already loaded
    if (typeof window !== 'undefined' && !(window as any).Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => calculateSIP();
      document.head.appendChild(script);
    }
  }, []);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const calculatorContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          <div>
            <Label htmlFor="sip-amount">Monthly Investment (₹)</Label>
            <Input
              id="sip-amount"
              type="number"
              value={monthlyInvestment}
              onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
              placeholder="5000"
              data-testid="input-monthly-investment"
            />
          </div>
          
          <div>
            <Label htmlFor="sip-return">Expected Annual Return (%)</Label>
            <Input
              id="sip-return"
              type="number"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))}
              placeholder="12"
              step="0.5"
              data-testid="input-annual-return"
            />
          </div>
          
          <div>
            <Label htmlFor="sip-years">Investment Period (Years)</Label>
            <Input
              id="sip-years"
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              placeholder="10"
              data-testid="input-investment-years"
            />
          </div>
          
          <div>
            <Label htmlFor="sip-stepup">Step-up % (Annual)</Label>
            <Input
              id="sip-stepup"
              type="number"
              value={stepUp}
              onChange={(e) => setStepUp(Number(e.target.value))}
              placeholder="0"
              step="1"
              data-testid="input-stepup-percent"
            />
          </div>
          
          <Button 
            onClick={calculateSIP} 
            className="w-full h-12 bg-persian-blue-600 hover:bg-persian-blue-700 text-white font-medium"
            data-testid="button-calculate-sip"
          >
            <TrendingUp className="mr-2 h-4 w-4" />Calculate SIP
          </Button>
        </div>
        
        {/* Results */}
        <Card className="bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Investment Summary</h3>
          {result && !user ? (
            <ResultAuthGate toolName="SIP Calculator" />
          ) : result && (
            <div className="space-y-4">
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Total Investment</div>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-total-investment">
                  {formatCurrency(result.totalInvestment)}
                </div>
              </Card>
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Expected Returns</div>
                <div className="text-2xl font-bold text-green-600" data-testid="text-expected-returns">
                  {formatCurrency(result.totalReturns)}
                </div>
              </Card>
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Maturity Value</div>
                <div className="text-2xl font-bold text-persian-blue-600" data-testid="text-maturity-value">
                  {formatCurrency(result.maturityValue)}
                </div>
              </Card>
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Wealth Gain</div>
                <div className="text-lg font-bold text-persian-blue-700" data-testid="text-wealth-gain">
                  {result.wealthGain.toFixed(1)}x
                </div>
              </Card>
            </div>
          )}
        </Card>
        
        {/* Chart */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Growth Projection</h3>
          <Card className="bg-white p-4 border">
            <canvas ref={chartRef} width="400" height="300"></canvas>
          </Card>
        </div>
      </div>
  );

  return onClose ? (
    <Modal isOpen={true} onClose={onClose} title="SIP Calculator" size="6xl">
      {calculatorContent}
    </Modal>
  ) : (
    calculatorContent
  );
}

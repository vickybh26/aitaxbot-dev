import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, PieChart, IndianRupee, Info } from "lucide-react";

interface PFResult {
  monthlyBasicDA: number;
  employeeContributionMonthly: number;
  employerEPFMonthly: number;
  employerEPSMonthly: number;
  totalMonthlyDeposit: number;
  employeeContributionYearly: number;
  employerEPFYearly: number;
  employerEPSYearly: number;
  totalYearlyDeposit: number;
  vpfMonthly: number;
  vpfYearly: number;
  yearlyGrowth: YearlyBreakdown[];
  totalCorpus: number;
  totalEmployeeContribution: number;
  totalEmployerContribution: number;
  totalInterestEarned: number;
  totalVPF: number;
}

interface YearlyBreakdown {
  year: number;
  openingBalance: number;
  employeeContribution: number;
  employerContribution: number;
  vpfContribution: number;
  interest: number;
  closingBalance: number;
}

export default function PFCalculator() {
  const [monthlyBasicDA, setMonthlyBasicDA] = useState<number>(50000);
  const [annualIncrement, setAnnualIncrement] = useState<number>(5);
  const [interestRate, setInterestRate] = useState<number>(8.25);
  const [years, setYears] = useState<number>(20);
  const [vpfPercent, setVpfPercent] = useState<number>(0);
  const [existingBalance, setExistingBalance] = useState<number>(0);
  const [pfType, setPfType] = useState<string>("epf");
  const [ppfYearlyAmount, setPpfYearlyAmount] = useState<number>(150000);
  const [result, setResult] = useState<PFResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("calculator");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const calculatePF = () => {
    if (pfType === "ppf" && (ppfYearlyAmount < 500 || ppfYearlyAmount > 150000)) return;
    if (pfType === "ppf" && years < 15) return;

    const yearlyGrowth: YearlyBreakdown[] = [];
    let currentBasicDA = monthlyBasicDA;
    let openingBalance = existingBalance;
    let totalEmployeeContrib = 0;
    let totalEmployerContrib = 0;
    let totalInterest = 0;
    let totalVPF = 0;
    const monthlyRate = interestRate / 12 / 100;

    for (let yr = 1; yr <= years; yr++) {
      let yearlyEmployeeContrib = 0;
      let yearlyEmployerContrib = 0;
      let yearlyVPF = 0;
      let accumulatedInterest = 0;
      let runningBalance = openingBalance;

      if (pfType === "ppf") {
        const monthlyPPF = ppfYearlyAmount / 12;
        for (let month = 1; month <= 12; month++) {
          runningBalance += monthlyPPF;
          accumulatedInterest += runningBalance * monthlyRate;
          yearlyEmployeeContrib += monthlyPPF;
        }
      } else {
        for (let month = 1; month <= 12; month++) {
          const employeeShare = currentBasicDA * 0.12;
          const employerEPS = Math.min(currentBasicDA * 0.0833, 1250);
          const employerEPF = (currentBasicDA * 0.12) - employerEPS;
          const vpfAmount = currentBasicDA * (vpfPercent / 100);

          yearlyEmployeeContrib += employeeShare;
          yearlyEmployerContrib += employerEPF;
          yearlyVPF += vpfAmount;

          runningBalance += employeeShare + employerEPF + vpfAmount;
          accumulatedInterest += runningBalance * monthlyRate;
        }
      }

      totalEmployeeContrib += yearlyEmployeeContrib;
      totalEmployerContrib += yearlyEmployerContrib;
      totalInterest += accumulatedInterest;
      totalVPF += yearlyVPF;

      const closingBalance = runningBalance + accumulatedInterest;

      yearlyGrowth.push({
        year: yr,
        openingBalance,
        employeeContribution: yearlyEmployeeContrib,
        employerContribution: yearlyEmployerContrib,
        vpfContribution: yearlyVPF,
        interest: accumulatedInterest,
        closingBalance
      });

      openingBalance = closingBalance;
      if (pfType === "epf") {
        currentBasicDA = currentBasicDA * (1 + annualIncrement / 100);
      }
    }

    let employeeContribMonthly: number;
    let employerEPSMonthly: number;
    let employerEPFMonthly: number;
    let vpfMonthly: number;

    if (pfType === "ppf") {
      employeeContribMonthly = ppfYearlyAmount / 12;
      employerEPSMonthly = 0;
      employerEPFMonthly = 0;
      vpfMonthly = 0;
    } else {
      employeeContribMonthly = monthlyBasicDA * 0.12;
      employerEPSMonthly = Math.min(monthlyBasicDA * 0.0833, 1250);
      employerEPFMonthly = (monthlyBasicDA * 0.12) - employerEPSMonthly;
      vpfMonthly = monthlyBasicDA * (vpfPercent / 100);
    }

    setResult({
      monthlyBasicDA,
      employeeContributionMonthly: employeeContribMonthly,
      employerEPFMonthly,
      employerEPSMonthly,
      totalMonthlyDeposit: employeeContribMonthly + employerEPFMonthly + vpfMonthly,
      employeeContributionYearly: employeeContribMonthly * 12,
      employerEPFYearly: employerEPFMonthly * 12,
      employerEPSYearly: employerEPSMonthly * 12,
      totalYearlyDeposit: (employeeContribMonthly + employerEPFMonthly + vpfMonthly) * 12,
      vpfMonthly,
      vpfYearly: vpfMonthly * 12,
      yearlyGrowth,
      totalCorpus: yearlyGrowth[yearlyGrowth.length - 1]?.closingBalance || 0,
      totalEmployeeContribution: totalEmployeeContrib,
      totalEmployerContribution: totalEmployerContrib,
      totalInterestEarned: totalInterest,
      totalVPF
    });
    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});

    setActiveTab("results");
    updateChart(yearlyGrowth);
  };

  const updateChart = (data: YearlyBreakdown[]) => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (typeof window !== 'undefined' && (window as any).Chart) {
      const Chart = (window as any).Chart;
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.map(d => `Year ${d.year}`),
          datasets: [
            {
              label: 'Employee Contribution',
              data: data.map(d => d.employeeContribution),
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              stack: 'contributions'
            },
            {
              label: 'Employer Contribution',
              data: data.map(d => d.employerContribution),
              backgroundColor: 'rgba(16, 185, 129, 0.7)',
              stack: 'contributions'
            },
            {
              label: 'VPF',
              data: data.map(d => d.vpfContribution),
              backgroundColor: 'rgba(139, 92, 246, 0.7)',
              stack: 'contributions'
            },
            {
              label: 'Interest',
              data: data.map(d => d.interest),
              backgroundColor: 'rgba(245, 158, 11, 0.7)',
              stack: 'contributions'
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' as const }
          },
          scales: {
            x: { stacked: true },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: {
                callback: function(value: any) {
                  if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                  if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                  return '₹' + (value / 1000).toFixed(0) + 'K';
                }
              }
            }
          }
        }
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => {};
      document.head.appendChild(script);
    }
  }, []);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatCurrencyFull = (amount: number) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="calculator" className="text-xs md:text-sm" data-testid="tab-pf-calculator">
            <Calculator className="w-4 h-4 mr-1" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs md:text-sm" data-testid="tab-pf-results">
            <IndianRupee className="w-4 h-4 mr-1" />
            Results
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="text-xs md:text-sm" data-testid="tab-pf-breakdown">
            <PieChart className="w-4 h-4 mr-1" />
            Year-wise
          </TabsTrigger>
          <TabsTrigger value="growth" className="text-xs md:text-sm" data-testid="tab-pf-growth">
            <TrendingUp className="w-4 h-4 mr-1" />
            Growth Chart
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-persian-blue-600" />
                PF Contribution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">PF Type</Label>
                <Select value={pfType} onValueChange={(val) => {
                  setPfType(val);
                  if (val === "ppf") {
                    setInterestRate(7.1);
                    if (years < 15) setYears(15);
                  } else {
                    setInterestRate(8.25);
                  }
                  setResult(null);
                }}>
                  <SelectTrigger className="h-12" data-testid="select-pf-type">
                    <SelectValue placeholder="Select PF type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="epf">EPF (Employee Provident Fund)</SelectItem>
                    <SelectItem value="ppf">PPF (Public Provident Fund)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pfType === "epf" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyBasicDA" className="text-sm font-medium">
                      Monthly Basic + DA (₹)
                    </Label>
                    <Input
                      id="monthlyBasicDA"
                      type="number"
                      value={monthlyBasicDA}
                      onChange={(e) => setMonthlyBasicDA(Number(e.target.value))}
                      placeholder="50000"
                      className="h-12"
                      data-testid="input-monthly-basic-da"
                    />
                    <p className="text-xs text-slate-500">Base for EPF contribution calculation</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="annualIncrement" className="text-sm font-medium">
                      Expected Annual Increment (%)
                    </Label>
                    <Input
                      id="annualIncrement"
                      type="number"
                      value={annualIncrement}
                      onChange={(e) => setAnnualIncrement(Number(e.target.value))}
                      placeholder="5"
                      step="0.5"
                      className="h-12"
                      data-testid="input-annual-increment"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interestRate" className="text-sm font-medium">
                      EPF Interest Rate (% p.a.)
                    </Label>
                    <Input
                      id="interestRate"
                      type="number"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      placeholder="8.25"
                      step="0.01"
                      className="h-12"
                      data-testid="input-interest-rate"
                    />
                    <p className="text-xs text-slate-500">FY 2026-27 EPF rate: 8.25% (declared by EPFO · governed by EPF &amp; MP Act, 1952)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="years" className="text-sm font-medium">
                      Investment Period (Years)
                    </Label>
                    <Input
                      id="years"
                      type="number"
                      value={years}
                      onChange={(e) => setYears(Number(e.target.value))}
                      placeholder="20"
                      className="h-12"
                      data-testid="input-pf-years"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vpfPercent" className="text-sm font-medium">
                      VPF Contribution (% of Basic + DA)
                    </Label>
                    <Input
                      id="vpfPercent"
                      type="number"
                      value={vpfPercent}
                      onChange={(e) => setVpfPercent(Number(e.target.value))}
                      placeholder="0"
                      step="1"
                      className="h-12"
                      data-testid="input-vpf-percent"
                    />
                    <p className="text-xs text-slate-500">Optional: Extra voluntary contribution at same interest rate</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="existingBalance" className="text-sm font-medium">
                      Existing PF Balance (₹)
                    </Label>
                    <Input
                      id="existingBalance"
                      type="number"
                      value={existingBalance}
                      onChange={(e) => setExistingBalance(Number(e.target.value))}
                      placeholder="0"
                      className="h-12"
                      data-testid="input-existing-balance"
                    />
                    <p className="text-xs text-slate-500">Current accumulated PF balance, if any</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="ppfYearlyAmount" className="text-sm font-medium">
                      Yearly PPF Deposit (₹)
                    </Label>
                    <Input
                      id="ppfYearlyAmount"
                      type="number"
                      value={ppfYearlyAmount}
                      onChange={(e) => setPpfYearlyAmount(Math.max(500, Math.min(Number(e.target.value), 150000)))}
                      placeholder="150000"
                      className="h-12"
                      data-testid="input-ppf-yearly"
                    />
                    <p className="text-xs text-slate-500">Min ₹500, Max ₹1,50,000 per year</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interestRate" className="text-sm font-medium">
                      PPF Interest Rate (% p.a.)
                    </Label>
                    <Input
                      id="interestRate"
                      type="number"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      placeholder="7.1"
                      step="0.01"
                      className="h-12"
                      data-testid="input-interest-rate"
                    />
                    <p className="text-xs text-slate-500">Current PPF rate: 7.1% (Q1 FY 2026-27 · governed by PPF Scheme, 2019 under PFMS Act)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="years" className="text-sm font-medium">
                      Investment Period (Years)
                    </Label>
                    <Input
                      id="years"
                      type="number"
                      value={years}
                      onChange={(e) => setYears(Math.max(Number(e.target.value), 15))}
                      placeholder="15"
                      className="h-12"
                      data-testid="input-pf-years"
                    />
                    <p className="text-xs text-slate-500">Minimum 15 years, extendable in blocks of 5</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="existingBalance" className="text-sm font-medium">
                      Existing PPF Balance (₹)
                    </Label>
                    <Input
                      id="existingBalance"
                      type="number"
                      value={existingBalance}
                      onChange={(e) => setExistingBalance(Number(e.target.value))}
                      placeholder="0"
                      className="h-12"
                      data-testid="input-existing-balance"
                    />
                    <p className="text-xs text-slate-500">Current PPF balance, if any</p>
                  </div>
                </div>
              )}

              {pfType === "epf" && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">EPF Contribution Split:</p>
                      <ul className="space-y-1 text-xs">
                        <li>Employee: 12% of Basic + DA (goes to EPF)</li>
                        <li>Employer: 12% split as - 3.67% to EPF + 8.33% to EPS (capped at ₹1,250/month)</li>
                        <li>Employer also pays 0.50% for EDLI insurance (not included in your PF balance)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {pfType === "ppf" && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">PPF Key Features:</p>
                      <ul className="space-y-1 text-xs">
                        <li>Available to any Indian resident (salaried or self-employed)</li>
                        <li>15-year lock-in, extendable in blocks of 5 years</li>
                        <li>Full EEE tax status - contribution, interest, and maturity all tax-free</li>
                        <li>Maximum deposit: ₹1,50,000 per year | Minimum: ₹500 per year</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={calculatePF}
                className="w-full h-12 bg-persian-blue-600 hover:bg-persian-blue-700 text-white font-medium"
                data-testid="button-calculate-pf"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate PF Corpus
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {result ? (
            <>
              <Card className="border-persian-blue-200 bg-gradient-to-br from-persian-blue-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-persian-blue-700">Estimated PF Corpus at Retirement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-persian-blue-700" data-testid="text-total-corpus">
                      {formatCurrency(result.totalCorpus)}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{`After ${years} years at ${interestRate}% interest`}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-lg font-bold text-blue-600">{formatCurrency(result.totalEmployeeContribution)}</div>
                      <div className="text-xs text-slate-600">Your Contribution</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-lg font-bold text-green-600">{formatCurrency(result.totalEmployerContribution)}</div>
                      <div className="text-xs text-slate-600">Employer EPF</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-lg font-bold text-purple-600">{formatCurrency(result.totalVPF)}</div>
                      <div className="text-xs text-slate-600">VPF Amount</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <div className="text-lg font-bold text-amber-600">{formatCurrency(result.totalInterestEarned)}</div>
                      <div className="text-xs text-slate-600">Interest Earned</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Breakdown (Current)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Basic + DA:</span>
                      <span className="font-medium">{formatCurrencyFull(result.monthlyBasicDA)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm">Employee (12%):</span>
                      <span className="font-medium text-blue-600">{formatCurrencyFull(result.employeeContributionMonthly)}</span>
                    </div>
                    {pfType === "epf" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm">Employer EPF (3.67%):</span>
                          <span className="font-medium text-green-600">{formatCurrencyFull(result.employerEPFMonthly)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Employer EPS (8.33%):</span>
                          <span className="font-medium text-slate-500">{formatCurrencyFull(result.employerEPSMonthly)}</span>
                        </div>
                        <p className="text-xs text-slate-400">EPS goes to pension fund, not your PF balance</p>
                      </>
                    )}
                    {vpfPercent > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm">{`VPF (${vpfPercent}%):`}</span>
                        <span className="font-medium text-purple-600">{formatCurrencyFull(result.vpfMonthly)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total to PF Account:</span>
                      <span className="text-persian-blue-600">{formatCurrencyFull(result.totalMonthlyDeposit)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tax Benefits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm font-medium text-green-800">Section 80C — Old Regime Only</div>
                      <div className="text-xs text-green-700 mt-1">
                        Employee PF contribution qualifies for deduction up to ₹1.5 Lakh under Section 80C. <strong>Not available under the New Tax Regime.</strong>
                      </div>
                      <div className="text-lg font-bold text-green-700 mt-2">
                        {formatCurrencyFull(Math.min(result.employeeContributionYearly, 150000))}
                      </div>
                      <div className="text-xs text-green-600">Eligible for 80C deduction (Old Regime)</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="text-sm font-medium text-amber-800">Interest Taxation</div>
                      <div className="text-xs text-amber-700 mt-1">
                        Interest on employee contribution exceeding ₹2.5 Lakh/year is taxable (from FY 2021-22)
                      </div>
                      {result.employeeContributionYearly + result.vpfYearly > 250000 && (
                        <div className="mt-2">
                          <Badge variant="destructive" className="text-xs">
                            Above ₹2.5L limit - partial interest taxable
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm font-medium text-blue-800">EEE Tax Status</div>
                      <div className="text-xs text-blue-700 mt-1">
                        EPF enjoys Exempt-Exempt-Exempt status: contribution exempt, growth exempt, withdrawal exempt (after 5 years of continuous service)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Calculator className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Enter your details and click "Calculate PF Corpus" to see results</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          {result ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Year-wise PF Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-yearly-breakdown">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 font-medium">Year</th>
                        <th className="text-right p-3 font-medium">Opening</th>
                        <th className="text-right p-3 font-medium">Employee</th>
                        <th className="text-right p-3 font-medium">Employer</th>
                        {vpfPercent > 0 && <th className="text-right p-3 font-medium">VPF</th>}
                        <th className="text-right p-3 font-medium">Interest</th>
                        <th className="text-right p-3 font-medium text-persian-blue-700">Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.yearlyGrowth.map((row) => (
                        <tr key={row.year} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-medium">{row.year}</td>
                          <td className="p-3 text-right text-slate-600">{formatCurrency(row.openingBalance)}</td>
                          <td className="p-3 text-right text-blue-600">{formatCurrency(row.employeeContribution)}</td>
                          <td className="p-3 text-right text-green-600">{formatCurrency(row.employerContribution)}</td>
                          {vpfPercent > 0 && <td className="p-3 text-right text-purple-600">{formatCurrency(row.vpfContribution)}</td>}
                          <td className="p-3 text-right text-amber-600">{formatCurrency(row.interest)}</td>
                          <td className="p-3 text-right font-bold text-persian-blue-700">{formatCurrency(row.closingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-persian-blue-50 font-bold">
                        <td className="p-3">Total</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right text-blue-700">{formatCurrency(result.totalEmployeeContribution)}</td>
                        <td className="p-3 text-right text-green-700">{formatCurrency(result.totalEmployerContribution)}</td>
                        {vpfPercent > 0 && <td className="p-3 text-right text-purple-700">{formatCurrency(result.totalVPF)}</td>}
                        <td className="p-3 text-right text-amber-700">{formatCurrency(result.totalInterestEarned)}</td>
                        <td className="p-3 text-right text-persian-blue-800">{formatCurrency(result.totalCorpus)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <PieChart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Calculate PF to see year-wise breakdown</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          {result ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PF Corpus Growth Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas ref={chartRef} width="600" height="350" data-testid="canvas-pf-chart"></canvas>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Calculate PF to see growth chart</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
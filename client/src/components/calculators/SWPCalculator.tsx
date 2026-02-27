import { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface SWPCalculatorProps {
  onClose?: () => void;
}

interface SWPResult {
  totalCorpus: number;
  monthlyWithdrawal: number;
  totalWithdrawals: number;
  remainingCorpus: number;
  years: number;
}

export default function SWPCalculator({ onClose }: SWPCalculatorProps = {}) {
  const [initialCorpus, setInitialCorpus] = useState<number>(5000000);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState<number>(50000);
  const [annualReturn, setAnnualReturn] = useState<number>(8);
  const [result, setResult] = useState<SWPResult | null>(null);

  const calculateSWP = () => {
    const monthlyReturn = annualReturn / 12 / 100;
    let corpus = initialCorpus;
    let totalWithdrawals = 0;
    let months = 0;

    // Calculate how long the corpus will last
    while (corpus > monthlyWithdrawal && months < 600) { // Max 50 years
      corpus = corpus * (1 + monthlyReturn) - monthlyWithdrawal;
      totalWithdrawals += monthlyWithdrawal;
      months++;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    setResult({
      totalCorpus: initialCorpus,
      monthlyWithdrawal,
      totalWithdrawals,
      remainingCorpus: Math.max(0, corpus),
      years: years + (remainingMonths > 0 ? remainingMonths / 12 : 0)
    });
  };

  useEffect(() => {
    calculateSWP();
  }, [initialCorpus, monthlyWithdrawal, annualReturn]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const calculatorContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
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
          
          <Button 
            onClick={calculateSWP} 
            className="w-full h-12 bg-persian-blue-600 hover:bg-persian-blue-700 text-white font-medium"
            data-testid="button-calculate-swp"
          >
            <i className="fas fa-piggy-bank mr-2"></i>Calculate SWP
          </Button>
        </div>
        
        {/* Results */}
        <Card className="bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Withdrawal Plan Summary</h3>
          {result && (
            <div className="space-y-4">
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Initial Corpus</div>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-initial-corpus">
                  {formatCurrency(result.totalCorpus)}
                </div>
              </Card>
              
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Monthly Withdrawal</div>
                <div className="text-2xl font-bold text-purple-600" data-testid="text-monthly-withdrawal">
                  {formatCurrency(result.monthlyWithdrawal)}
                </div>
              </Card>
              
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Corpus Duration</div>
                <div className="text-2xl font-bold text-green-600" data-testid="text-corpus-duration">
                  {result.years.toFixed(1)} years
                </div>
              </Card>
              
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Total Withdrawals</div>
                <div className="text-lg font-bold text-orange-600" data-testid="text-total-withdrawals">
                  {formatCurrency(result.totalWithdrawals)}
                </div>
              </Card>
              
              <Card className="bg-white p-4">
                <div className="text-sm text-gray-600">Remaining Corpus</div>
                <div className="text-lg font-bold text-gray-600" data-testid="text-remaining-corpus">
                  {formatCurrency(result.remainingCorpus)}
                </div>
              </Card>
            </div>
          )}
          
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="fas fa-info-circle text-yellow-600 mr-2"></i>
              <span className="text-sm text-yellow-800">
                This calculator assumes a constant withdrawal amount and return rate.
              </span>
            </div>
          </div>
        </Card>
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

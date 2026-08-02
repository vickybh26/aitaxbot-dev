import { useState } from 'react';
import { useTrackToolUse } from '@/hooks/useTrackToolUse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Calculator, FileText, Lightbulb, Save, X } from 'lucide-react';
import LoadingState from '@/components/ui/loading-state';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ResultAuthGate from '@/components/ResultAuthGate';

interface HRACalculatorProps {
  onClose?: () => void;
  onApplyHRA?: (hraAmount: number) => void;
}

interface HRAResult {
  basicSalary: number;
  hraReceived: number;
  actualRentPaid: number;
  cityType: string;
  hraExemption: number;
  taxableHRA: number;
  exemptionPercentage: number;
  calculationBreakdown: {
    rule1: number;
    rule2: number;
    rule3: number;
    minimumOf: number;
  };
}

interface AIRecommendation {
  type: 'optimization' | 'investment' | 'warning' | 'tip';
  title: string;
  description: string;
  potentialSaving?: number;
}

export default function HRACalculator({ onClose, onApplyHRA }: HRACalculatorProps = {}) {
  const { user, getIdToken } = useAuth();
  const trackTool = useTrackToolUse();
  const { toast } = useToast();
  const [basicSalary, setBasicSalary] = useState<number>(600000);
  const [hraReceived, setHraReceived] = useState<number>(240000);
  const [actualRentPaid, setActualRentPaid] = useState<number>(300000);
  const [cityType, setCityType] = useState<string>("metro");
  const [inputMode, setInputMode] = useState<'annual' | 'monthly'>('annual');
  const [result, setResult] = useState<HRAResult | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<string>("calculator");
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isModal = !!onClose;

  // ── Unit handling ──────────────────────────────────────────────────────────
  // basicSalary / hraReceived / actualRentPaid are ALWAYS stored as ANNUAL
  // figures. Monthly is a display concern only.
  //
  // This previously mixed two incompatible conventions: handleInputModeChange
  // converted the stored state into the new unit, while getDisplayValues
  // converted again on the way out. Switching to monthly therefore showed
  // annual ÷ 144, and typing a monthly figure wrote it straight to the annual
  // state while the field re-rendered it ÷ 12 — so entering 50,000 displayed
  // 4,167 and the input appeared not to accept anything.
  //
  // One conversion, in one direction, at the display boundary. Do not
  // reintroduce a conversion in the mode toggle.

  const toAnnual = (displayValue: number) =>
    inputMode === 'monthly' ? Math.round(displayValue * 12) : displayValue;

  const handleInputModeChange = (newMode: 'annual' | 'monthly') => {
    if (newMode === inputMode) return;
    // State is canonical annual — only the presentation unit changes.
    setInputMode(newMode);
  };

  const getDisplayValues = () => {
    if (inputMode === 'monthly') {
      return {
        displayBasic: Math.round(basicSalary / 12),
        displayHra: Math.round(hraReceived / 12),
        displayRent: Math.round(actualRentPaid / 12),
      };
    }
    return {
      displayBasic: basicSalary,
      displayHra: hraReceived,
      displayRent: actualRentPaid,
    };
  };

  const getAnnualValues = () => ({
    annualBasic: basicSalary,
    annualHra: hraReceived,
    annualRent: actualRentPaid,
  });

  const calculateHRA = () => {
    setIsCalculating(true);

    const { annualBasic, annualHra, annualRent } = getAnnualValues();

    // HRA exemption calculation as per Schedule II (Table: Sl. No. 2) of Income Tax Act, 2025
    // (formerly Section 10(13A) of the Income Tax Act, 1961)
    const rule1 = annualHra;
    const rule2 = Math.max(0, annualRent - (annualBasic * 0.10));
    const rule3 = cityType === "metro" ? annualBasic * 0.50 : annualBasic * 0.40;

    const hraExemption = Math.min(rule1, rule2, rule3);
    const taxableHRA = Math.max(0, annualHra - hraExemption);
    const exemptionPercentage = annualHra > 0 ? (hraExemption / annualHra) * 100 : 0;

    const calculationBreakdown = { rule1, rule2, rule3, minimumOf: hraExemption };

    const hraResult: HRAResult = {
      basicSalary: annualBasic,
      hraReceived: annualHra,
      actualRentPaid: annualRent,
      cityType,
      hraExemption,
      taxableHRA,
      exemptionPercentage,
      calculationBreakdown
    };

    setResult(hraResult);
    generateRecommendations(hraResult);
    setActiveTab("results");
    setIsCalculating(false);
    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});
    const rsHra = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    trackTool("HRA Calculator", `HRA exempt: ${rsHra(hraResult.hraExemption)}`, {
      toolKey: "hra",
      route: "/calculators/hra",
      kind: "calculator",
      headline: {
        label: "HRA exempt from tax",
        value: rsHra(hraResult.hraExemption),
        hint: `${cityType === 'metro' ? 'Metro' : 'Non-metro'} city`,
      },
      details: [
        { label: "Taxable HRA", value: rsHra(hraResult.taxableHRA) },
        { label: "Exempt share", value: `${Math.round(hraResult.exemptionPercentage)}%` },
      ],
      inputs: { cityType },
    });
  };

  const generateRecommendations = (hraResult: HRAResult) => {
    const recommendations: AIRecommendation[] = [];
    if (hraResult.exemptionPercentage < 90) {
      const potentialSaving = (hraResult.taxableHRA * 0.30);
      recommendations.push({
        type: 'optimization',
        title: 'Optimize Your HRA Exemption',
        description: `You're only getting ${hraResult.exemptionPercentage.toFixed(1)}% HRA exemption. Consider increasing rent or restructuring salary to maximize tax savings.`,
        potentialSaving
      });
    }
    if (hraResult.actualRentPaid < hraResult.basicSalary * 0.10) {
      recommendations.push({
        type: 'warning',
        title: 'Low Rent Payment Alert',
        description: 'Your rent is less than 10% of basic salary. You might not be utilizing HRA exemption optimally.'
      });
    }
    if (hraResult.cityType === "non-metro" && hraResult.hraReceived > hraResult.basicSalary * 0.40) {
      recommendations.push({
        type: 'tip',
        title: 'Consider Metro City Benefits',
        description: 'Metro cities allow 50% HRA exemption vs 40% in non-metro. If relocating, factor in higher HRA benefits.'
      });
    }
    if (hraResult.hraReceived < hraResult.basicSalary * 0.40) {
      recommendations.push({
        type: 'investment',
        title: 'Restructure Salary Components',
        description: 'Consider negotiating a higher HRA component in your salary structure to maximize tax exemptions.'
      });
    }
    if (hraResult.taxableHRA > 100000) {
      recommendations.push({
        type: 'warning',
        title: 'High Taxable HRA',
        description: `₹${hraResult.taxableHRA.toLocaleString()} of your HRA is taxable. Review your rent and salary structure for optimization.`
      });
    }
    setRecommendations(recommendations);
  };

  const resetCalculator = () => {
    setBasicSalary(600000);
    setHraReceived(240000);
    setActualRentPaid(300000);
    setCityType("metro");
    setInputMode('annual');
    setResult(null);
    setRecommendations([]);
    setActiveTab("calculator");
  };

  const saveCalculation = async () => {
    if (!result || !user) {
      toast({ title: "Please log in to save calculations", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("No token");
      const response = await fetch('/api/tax-calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          calculationType: 'hra',
          assessmentYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
          inputData: { basicSalary: result.basicSalary, hraReceived: result.hraReceived, actualRentPaid: result.actualRentPaid, cityType },
          oldRegimeResult: {
            hraExemption: result.hraExemption,
            taxableHRA: result.taxableHRA,
            exemptionPercentage: result.exemptionPercentage,
            breakdown: result.calculationBreakdown,
          },
        }),
      });
      if (!response.ok) throw new Error('Save failed');
      toast({ title: "HRA calculation saved!", description: "Your calculation has been saved to your account." });
    } catch {
      toast({ title: "Failed to save calculation", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const { displayBasic, displayHra, displayRent } = getDisplayValues();

  const outerClassName = isModal
    ? "fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4"
    : "w-full";

  const cardClassName = isModal
    ? "w-full max-w-4xl max-h-[95vh] overflow-hidden"
    : "w-full shadow-lg rounded-2xl";

  const contentClassName = isModal
    ? "overflow-y-auto max-h-[calc(95vh-120px)]"
    : "";

  return (
    <div className={outerClassName}>
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">HRA Calculator</CardTitle>
              <CardDescription>Calculate your House Rent Allowance exemption under Section 10(13A)</CardDescription>
            </div>
            {isModal && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className={contentClassName}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="calculator" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Calculator</span>
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!result} className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Results</span>
              </TabsTrigger>
              <TabsTrigger value="breakdown" disabled={!result} className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Breakdown</span>
              </TabsTrigger>
              <TabsTrigger value="tips" disabled={!result} className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">Tax Tips</span>
              </TabsTrigger>
            </TabsList>

            {/* Calculator Tab */}
            <TabsContent value="calculator" className="space-y-6">

              {/* Regime Warning */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Old Tax Regime Only</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    HRA exemption is available <strong>only if you opt for the Old Tax Regime</strong>. Under the New Regime (default from FY 2023-24), your entire HRA received is added to taxable salary with no exemption.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    <span className="font-medium">Applicable section:</span> Section 10(13A) read with Rule 2A — Income Tax Act, 1961 (FY up to 2025-26) · Schedule II, Table Sl. No. 2 — Income Tax Act, 2025 (FY 2026-27 onward)
                  </p>
                </div>
              </div>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-lg">Input Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant={inputMode === 'monthly' ? 'default' : 'outline'}
                      onClick={() => handleInputModeChange('monthly')}
                      className="flex-1"
                    >
                      Monthly
                    </Button>
                    <Button
                      variant={inputMode === 'annual' ? 'default' : 'outline'}
                      onClick={() => handleInputModeChange('annual')}
                      className="flex-1"
                    >
                      Annual
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Salary Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="basicSalary">
                        Basic Salary {inputMode === 'monthly' ? '(Monthly)' : '(Annual)'}
                      </Label>
                      <Input
                        id="basicSalary"
                        type="number"
                        min={0}
                        value={displayBasic}
                        onChange={(e) => {
                          const typed = Math.max(0, parseFloat(e.target.value) || 0);
                          setBasicSalary(toAnnual(typed));
                        }}
                        placeholder="Enter basic salary"
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hraReceived">
                        HRA Received {inputMode === 'monthly' ? '(Monthly)' : '(Annual)'}
                      </Label>
                      <Input
                        id="hraReceived"
                        type="number"
                        min={0}
                        value={displayHra}
                        onChange={(e) => {
                          const typed = Math.max(0, parseFloat(e.target.value) || 0);
                          setHraReceived(toAnnual(typed));
                        }}
                        placeholder="Enter HRA received"
                        className="text-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rentPaid">
                      Actual Rent Paid {inputMode === 'monthly' ? '(Monthly)' : '(Annual)'}
                    </Label>
                    <Input
                      id="rentPaid"
                      type="number"
                      min={0}
                      value={displayRent}
                      onChange={(e) => {
                        const typed = Math.max(0, parseFloat(e.target.value) || 0);
                        setActualRentPaid(toAnnual(typed));
                      }}
                      placeholder="Enter actual rent paid"
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cityType">City Type</Label>
                    <Select value={cityType} onValueChange={setCityType}>
                      <SelectTrigger id="cityType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metro">Metro City (50%)</SelectItem>
                        <SelectItem value="non-metro">Non-Metro City (40%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-semibold">Metro cities (50%) from FY 2026-27:</span>{" "}
                      Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad, Pune, Ahmedabad.{" "}
                      All other cities are Non-Metro (40%).{" "}
                      <span className="text-amber-600 font-medium">Updated under Income Tax Rules 2026.</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={calculateHRA}
                  disabled={isCalculating}
                  className="flex-1 md:flex-none"
                >
                  {isCalculating ? 'Calculating...' : 'Calculate HRA'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetCalculator}
                  className="flex-1 md:flex-none"
                >
                  Reset
                </Button>
              </div>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-6">
              {isCalculating ? (
                <LoadingState message="Calculating HRA exemption..." />
              ) : result && !user ? (
                <ResultAuthGate toolName="HRA Calculator" />
              ) : result ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-600">HRA Exemption</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          ₹{result.hraExemption.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {result.exemptionPercentage.toFixed(1)}% of your HRA is exempt
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-600">Taxable HRA</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                          ₹{result.taxableHRA.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {(100 - result.exemptionPercentage).toFixed(1)}% of your HRA is taxable
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tax Impact</CardTitle>
                      <CardDescription>Tax savings across different tax brackets</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">5% Bracket</p>
                            <p className="text-xs text-gray-500">Savings</p>
                          </div>
                          <p className="font-semibold">₹{(result.hraExemption * 0.05).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">20% Bracket</p>
                            <p className="text-xs text-gray-500">Savings</p>
                          </div>
                          <p className="font-semibold">₹{(result.hraExemption * 0.20).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">30% Bracket</p>
                            <p className="text-xs text-gray-500">Savings</p>
                          </div>
                          <p className="font-semibold">₹{(result.hraExemption * 0.30).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>This exemption of ₹{result.hraExemption.toLocaleString()} applies <strong>only under the Old Tax Regime</strong>. If you are on the New Regime, your taxable HRA = ₹{result.hraReceived.toLocaleString()} (full amount received).</span>
                  </div>

                  <div className="flex gap-3">
                    {user && (
                      <Button
                        onClick={saveCalculation}
                        disabled={isSaving}
                        variant="outline"
                        className="flex-1 md:flex-none"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Calculation'}
                      </Button>
                    )}
                    {onApplyHRA && (
                      <Button
                        onClick={() => onApplyHRA(result.hraExemption)}
                        className="flex-1 md:flex-none"
                      >
                        Apply to Tax Calculator (Old Regime)
                      </Button>
                    )}
                  </div>
                </>
              ) : null}
            </TabsContent>

            {/* Breakdown Tab */}
            <TabsContent value="breakdown" className="space-y-6">
              {result && !user ? (
                <ResultAuthGate toolName="HRA Calculator" />
              ) : result && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>HRA Exemption Calculation Rules</CardTitle>
                      <CardDescription>Section 10(13A) of Income Tax Act</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Rule 1: HRA Received</p>
                          <p className="text-2xl font-bold text-blue-600">₹{result.calculationBreakdown.rule1.toLocaleString()}</p>
                        </div>

                        <div className="p-4 bg-persian-blue-50 rounded-lg border border-persian-blue-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Rule 2: Rent - 10% of Basic Salary</p>
                          <p className="text-sm text-gray-600 mb-2">
                            ₹{result.actualRentPaid.toLocaleString()} - ₹{(result.basicSalary * 0.10).toLocaleString()}
                          </p>
                          <p className="text-2xl font-bold text-persian-blue-700">₹{result.calculationBreakdown.rule2.toLocaleString()}</p>
                        </div>

                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Rule 3: {result.cityType === 'metro' ? '50%' : '40%'} of Basic Salary
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {result.cityType === 'metro' ? '50%' : '40%'} × ₹{result.basicSalary.toLocaleString()}
                          </p>
                          <p className="text-2xl font-bold text-orange-600">₹{result.calculationBreakdown.rule3.toLocaleString()}</p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">HRA Exemption = Minimum of the above 3 rules</p>
                        <p className="text-3xl font-bold text-green-600">₹{result.calculationBreakdown.minimumOf.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Calculation Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 border-b">
                        <span className="text-gray-600">Annual Basic Salary</span>
                        <span className="font-semibold">₹{result.basicSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border-b">
                        <span className="text-gray-600">Annual HRA Received</span>
                        <span className="font-semibold">₹{result.hraReceived.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border-b">
                        <span className="text-gray-600">Annual Rent Paid</span>
                        <span className="font-semibold">₹{result.actualRentPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-gray-600">HRA Exemption</span>
                        <span className="font-bold text-green-600">₹{result.hraExemption.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <span className="text-gray-600">Taxable HRA</span>
                        <span className="font-bold text-red-600">₹{result.taxableHRA.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tax Tips Tab */}
            <TabsContent value="tips" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personalised Tax Tips</CardTitle>
                  <CardDescription>Recommendations to optimize your tax savings</CardDescription>
                </CardHeader>
                <CardContent>
                  {recommendations.length > 0 ? (
                    <div className="space-y-4">
                      {recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border-l-4 ${
                            rec.type === 'optimization'
                              ? 'border-l-blue-500 bg-blue-50'
                              : rec.type === 'warning'
                              ? 'border-l-red-500 bg-red-50'
                              : rec.type === 'investment'
                              ? 'border-l-persian-blue-600 bg-persian-blue-50'
                              : 'border-l-green-500 bg-green-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                              <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                              {rec.potentialSaving && (
                                <div className="mt-2 inline-block">
                                  <Badge variant="secondary">
                                    Potential Saving: ₹{rec.potentialSaving.toLocaleString()}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No recommendations at this time.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

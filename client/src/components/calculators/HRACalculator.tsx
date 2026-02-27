import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Calculator, FileText, Lightbulb, X } from 'lucide-react';
import LoadingState from '@/components/ui/loading-state';

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
    rule1: number; // Actual HRA received
    rule2: number; // Actual rent paid minus 10% of basic salary
    rule3: number; // 50% or 40% of basic salary
    minimumOf: number; // Minimum of above three
  };
}

interface AIRecommendation {
  type: 'optimization' | 'investment' | 'warning' | 'tip';
  title: string;
  description: string;
  potentialSaving?: number;
}

export default function HRACalculator({ onClose, onApplyHRA }: HRACalculatorProps = {}) {
  const [basicSalary, setBasicSalary] = useState<number>(600000);
  const [hraReceived, setHraReceived] = useState<number>(240000);
  const [actualRentPaid, setActualRentPaid] = useState<number>(300000);
  const [cityType, setCityType] = useState<string>("metro");
  const [result, setResult] = useState<HRAResult | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<string>("calculator");
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const calculateHRA = async () => {
    setIsCalculating(true);
    
    // Add artificial delay to show loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // HRA exemption calculation as per Section 10(13A) of Income Tax Act
    const rule1 = hraReceived; // Actual HRA received
    const rule2 = Math.max(0, actualRentPaid - (basicSalary * 0.10)); // Actual rent paid minus 10% of basic salary
    const rule3 = cityType === "metro" ? basicSalary * 0.50 : basicSalary * 0.40; // 50% for metro, 40% for non-metro
    
    const hraExemption = Math.min(rule1, rule2, rule3);
    const taxableHRA = Math.max(0, hraReceived - hraExemption);
    const exemptionPercentage = hraReceived > 0 ? (hraExemption / hraReceived) * 100 : 0;

    const calculationBreakdown = {
      rule1,
      rule2,
      rule3,
      minimumOf: hraExemption
    };

    const hraResult: HRAResult = {
      basicSalary,
      hraReceived,
      actualRentPaid,
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
  };

  const generateRecommendations = (hraResult: HRAResult) => {
    const recommendations: AIRecommendation[] = [];

    // HRA optimization recommendations
    if (hraResult.exemptionPercentage < 90) {
      const potentialSaving = (hraResult.taxableHRA * 0.30); // Assuming 30% tax bracket
      recommendations.push({
        type: 'optimization',
        title: 'Optimize Your HRA Exemption',
        description: `You're only getting ${hraResult.exemptionPercentage.toFixed(1)}% HRA exemption. Consider increasing rent or restructuring salary to maximize tax savings.`,
        potentialSaving
      });
    }

    // Rent vs HRA analysis
    if (hraResult.actualRentPaid < hraResult.basicSalary * 0.10) {
      recommendations.push({
        type: 'warning',
        title: 'Low Rent Payment Alert',
        description: 'Your rent is less than 10% of basic salary. You might not be utilizing HRA exemption optimally.'
      });
    }

    // City type optimization
    if (hraResult.cityType === "non-metro" && hraResult.hraReceived > hraResult.basicSalary * 0.40) {
      recommendations.push({
        type: 'tip',
        title: 'Consider Metro City Benefits',
        description: 'Metro cities allow 50% HRA exemption vs 40% in non-metro. If relocating, factor in higher HRA benefits.'
      });
    }

    // Salary structure recommendation
    if (hraResult.hraReceived < hraResult.basicSalary * 0.40) {
      recommendations.push({
        type: 'investment',
        title: 'Restructure Salary Components',
        description: 'Consider negotiating a higher HRA component in your salary structure to maximize tax exemptions.'
      });
    }

    // High taxable HRA warning
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
    setResult(null);
    setRecommendations([]);
    setActiveTab("calculator");
  };

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl md:text-2xl font-bold text-persian-blue-600">
              HRA Calculator
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              Calculate House Rent Allowance exemption as per Section 10(13A) of Income Tax Act
            </CardDescription>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-persian-blue-50"
              data-testid="button-close-hra-calculator"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(95vh-120px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="calculator" className="text-xs md:text-sm">
                <Calculator className="w-4 h-4 mr-1" />
                Calculator
              </TabsTrigger>
              <TabsTrigger value="results" className="text-xs md:text-sm">
                <FileText className="w-4 h-4 mr-1" />
                Results
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="text-xs md:text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Breakdown
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs md:text-sm">
                <Lightbulb className="w-4 h-4 mr-1" />
                AI Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calculator" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="basicSalary" className="text-sm font-medium">
                      Basic Salary (Annual)
                    </Label>
                    <Input
                      id="basicSalary"
                      type="number"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(Number(e.target.value))}
                      placeholder="Enter basic salary"
                      className="h-12"
                      data-testid="input-basic-salary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hraReceived" className="text-sm font-medium">
                      HRA Received (Annual)
                    </Label>
                    <Input
                      id="hraReceived"
                      type="number"
                      value={hraReceived}
                      onChange={(e) => setHraReceived(Number(e.target.value))}
                      placeholder="Enter HRA received"
                      className="h-12"
                      data-testid="input-hra-received"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="actualRentPaid" className="text-sm font-medium">
                      Actual Rent Paid (Annual)
                    </Label>
                    <Input
                      id="actualRentPaid"
                      type="number"
                      value={actualRentPaid}
                      onChange={(e) => setActualRentPaid(Number(e.target.value))}
                      placeholder="Enter actual rent paid"
                      className="h-12"
                      data-testid="input-rent-paid"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cityType" className="text-sm font-medium">
                      City Type
                    </Label>
                    <Select value={cityType} onValueChange={setCityType}>
                      <SelectTrigger className="h-12" data-testid="select-city-type">
                        <SelectValue placeholder="Select city type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metro">Metro City (50% exemption)</SelectItem>
                        <SelectItem value="non-metro">Non-Metro City (40% exemption)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={calculateHRA}
                  disabled={isCalculating}
                  className="flex-1 h-12 bg-persian-blue-600 hover:bg-persian-blue-700 text-white font-medium border border-persian-blue-600 hover:border-persian-blue-700"
                  data-testid="button-calculate-hra"
                >
                  {isCalculating ? (
                    <LoadingState message="Calculating HRA exemption..." />
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate HRA Exemption
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetCalculator}
                  className="h-12"
                  data-testid="button-reset-hra"
                >
                  Reset
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {result ? (
                <div className="space-y-6">
                  {/* Quick Overview */}
                  <Card className="border-persian-blue-200 bg-persian-blue-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-persian-blue-700">HRA Exemption Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-green-600">
                            ₹{result.hraExemption.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">HRA Exemption</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-red-600">
                            ₹{result.taxableHRA.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Taxable HRA</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-persian-blue-600">
                            {`${result.exemptionPercentage.toFixed(1)}%`}
                          </div>
                          <div className="text-sm text-gray-600">Exemption Rate</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Exemption Progress</span>
                          <span>{`${result.exemptionPercentage.toFixed(1)}%`}</span>
                        </div>
                        <Progress value={result.exemptionPercentage} className="h-2" />
                      </div>
                      
                      {onApplyHRA && (
                        <div className="mt-4">
                          <Button
                            onClick={() => onApplyHRA(result.hraExemption)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                            data-testid="button-apply-hra-to-tax-calculator"
                          >
                            Apply HRA Exemption to Tax Calculator
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Detailed Results */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Input Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Basic Salary:</span>
                          <span className="font-medium">₹{result.basicSalary.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>HRA Received:</span>
                          <span className="font-medium">₹{result.hraReceived.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rent Paid:</span>
                          <span className="font-medium">₹{result.actualRentPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>City Type:</span>
                          <Badge variant={result.cityType === 'metro' ? 'default' : 'secondary'}>
                            {result.cityType === 'metro' ? 'Metro' : 'Non-Metro'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Tax Impact</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>HRA Exemption:</span>
                          <span className="font-medium text-green-600">₹{result.hraExemption.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxable HRA:</span>
                          <span className="font-medium text-red-600">₹{result.taxableHRA.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Tax Saved (30% bracket):</span>
                          <span className="font-medium text-green-600">
                            ₹{(result.hraExemption * 0.30).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Calculate HRA exemption to see results
                </div>
              )}
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-6">
              {result ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">HRA Calculation Breakdown</CardTitle>
                    <CardDescription>
                      As per Section 10(13A) - Minimum of the following three amounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Rule 1: Actual HRA Received</div>
                          <div className="text-sm text-gray-600">HRA component in salary</div>
                        </div>
                        <div className="text-lg font-bold">₹{result.calculationBreakdown.rule1.toLocaleString()}</div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Rule 2: Rent Paid - 10% of Basic</div>
                          <div className="text-sm text-gray-600">
                            ₹{result.actualRentPaid.toLocaleString()} - ₹{(result.basicSalary * 0.10).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-lg font-bold">₹{result.calculationBreakdown.rule2.toLocaleString()}</div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">
                            Rule 3: {result.cityType === 'metro' ? '50%' : '40%'} of Basic Salary
                          </div>
                          <div className="text-sm text-gray-600">
                            Based on {result.cityType === 'metro' ? 'metro' : 'non-metro'} city classification
                          </div>
                        </div>
                        <div className="text-lg font-bold">₹{result.calculationBreakdown.rule3.toLocaleString()}</div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center p-4 bg-persian-blue-50 rounded-lg">
                        <div>
                          <div className="font-bold text-persian-blue-700">HRA Exemption (Minimum)</div>
                          <div className="text-sm text-persian-blue-600">Least of above three amounts</div>
                        </div>
                        <div className="text-xl font-bold text-persian-blue-700">
                          ₹{result.calculationBreakdown.minimumOf.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Calculate HRA exemption to see breakdown
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-persian-blue-700">AI-Powered Recommendations</h3>
                  {recommendations.map((rec, index) => (
                    <Card key={index} className={`border-l-4 ${
                      rec.type === 'optimization' ? 'border-l-green-500 bg-green-50' :
                      rec.type === 'warning' ? 'border-l-red-500 bg-red-50' :
                      rec.type === 'investment' ? 'border-l-blue-500 bg-blue-50' :
                      'border-l-yellow-500 bg-yellow-50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Badge variant={rec.type === 'optimization' ? 'default' : 
                                        rec.type === 'warning' ? 'destructive' :
                                        rec.type === 'investment' ? 'secondary' : 'outline'}>
                            {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                          </Badge>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{rec.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                            {rec.potentialSaving && (
                              <p className="text-sm font-medium text-green-600 mt-2">
                                Potential Tax Saving: ₹{rec.potentialSaving.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Calculate HRA exemption to get AI-powered insights
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
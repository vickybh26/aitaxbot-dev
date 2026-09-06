import React, { useState } from 'react';
import { Calculator, PieChart, ClipboardList, User, Coins, Percent, RotateCcw } from 'lucide-react';
import { SegmentedToggle } from '@/components/ui/segmented-toggle';
import { Callout } from '@/components/ui/callout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import HRACalculatorModal from '@/components/calculators/HRACalculator';
import { getClientTaxAdvice } from '@/lib/geminiAIService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LoadingState } from '@/components/ui/loading-state';
import Modal from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { LastUpdated } from '@/components/ui/last-updated';
import { Download, Save, Loader2, Sparkles, TrendingDown, AlertTriangle, Info, Shield, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTrackToolUse } from '@/hooks/useTrackToolUse';
import { recommendITRForm, type ITRFormResult } from '@shared/itrFormSelector';
import { computeTaxLiability, type AgeGroup } from '@shared/taxLiability';
import ResultAuthGate from '@/components/ResultAuthGate';
import { SUCCESS, INTERACTIVE, AXIS } from '@/lib/chartColors';

interface AiTip {
  title: string;
  detail: string;
  potentialSaving?: number;
  section?: string;
  priority: 'high' | 'medium' | 'low';
}
interface AiAdvice {
  tips: AiTip[];
  savingsScore: number;
  maxPossibleSaving: number;
  summary: string;
}

// Types for tax calculation
interface TaxBreakdown {
  slab: string;
  income: number;
  rate: number;
  tax: number;
}

interface TaxResult {
  grossIncome: number;
  standardDeduction: number;
  totalDeductions: number;
  taxableIncome: number;
  incomeTax: number;
  cess: number;
  rebate87A: number;
  marginalRelief: number;
  /** HRA exemption under Rule 2A, computed on basic + DA. */
  hraExemption: number;
  /** Surcharge after its own marginal relief. 0 below ₹50,00,000. */
  surcharge: number;
  surchargeRate: number;
  /** Tax on s.112A / s.111A gains — charged outside the slab ladder. */
  specialRateTax: number;
  ltcgEquity: number;
  stcgEquity: number;
  totalTax: number;
  takeHome: number;
  effectiveRate: number;
  marginalRate: number;
  taxBreakdown: TaxBreakdown[];
  marginalReliefApplied: boolean;
}

interface BothRegimesResult {
  oldRegime: TaxResult;
  newRegime: TaxResult;
  savings: number;
  recommendedRegime: 'old' | 'new';
}

interface TaxCalculatorProps {
  onClose?: () => void;
  onCalculated?: (summaryText: string) => void;
  /** Called when Download PDF is clicked and user is NOT logged in */
  onGuestDownload?: () => void;
}

// ── Regime comparison bar chart ───────────────────────────────────────────────
function RegimeChart({
  oldTax,
  newTax,
  recommended,
}: {
  oldTax: number;
  newTax: number;
  recommended: 'old' | 'new';
}) {
  const fmt = (v: number) =>
    '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v);

  const data = [
    { name: 'Old Regime', tax: oldTax, winner: recommended === 'old' },
    { name: 'New Regime', tax: newTax, winner: recommended === 'new' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const { name, tax } = payload[0].payload;
      return (
        <div className="bg-card border border-rule rounded-lg px-3 py-2 text-xs shadow-md">
          <p className="font-semibold text-ink/80">{name}</p>
          <p className="text-ink font-bold">{fmt(tax)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AXIS.grid} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS.label }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="tax" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.winner ? SUCCESS : INTERACTIVE}
              opacity={entry.winner ? 1 : 0.65}
            />
          ))}
          <LabelList
            dataKey="tax"
            position="top"
            formatter={fmt}
            style={{ fontSize: 11, fontWeight: 600, fill: AXIS.emphasis }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function TaxCalculator({ onClose, onCalculated, onGuestDownload }: TaxCalculatorProps = {}) {
  const [activeTab, setActiveTab] = useState('calculator');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHRAModal, setShowHRAModal] = useState(false);
  const [hraFromCalculator, setHraFromCalculator] = useState(false);
  const [result, setResult] = useState<BothRegimesResult | null>(null);
  const [aiAdvice, setAiAdvice] = useState<AiAdvice | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { user, userProfile, getIdToken } = useAuth();
  const { toast } = useToast();
  const trackTool = useTrackToolUse();
  
  // Form state
  const [formData, setFormData] = useState({
    salaryIncome: '',
    basicSalary: '',
    housePropertyIncome: '',
    businessIncome: '',
    capitalGainsIncome: '',
    ltcgEquity: '',
    stcgEquity: '',
    otherIncome: '',
    section80C: '',
    section80D: '',
    section80E: '',
    section80TTA: '',
    section80CCD1B: '',
    section80G: '',
    homeLoanInterest: '',
    lta: '',
    hraReceived: '',
    rentPaid: '',
    isMetroCity: false,
    otherDeductions: '',
    ageGroup: 'below60' as 'below60' | '60to80' | 'above80',
    financialYear: '2026-27' as '2024-25' | '2025-26' | '2026-27',
    // ── ITR form recommendation inputs (classification only — don't affect tax) ──
    hasMultipleHouseProperties: false,
    hasCryptoIncome: false,
    isPresumptiveScheme: false,
    isDirector: false,
    isNonResident: false,
    hasForeignAssets: false,
    agriculturalIncome: ''
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Tax slab definitions
  const getTaxSlabs = (regime: 'old' | 'new', year: string, ageGroup?: string) => {
    if (regime === 'new') {
      if (year === '2025-26' || year === '2026-27') {
        // New Regime FY 2025-26 & FY 2026-27 (Income Tax Act, 2025 - Section 202)
        // Same slabs for all ages under new regime
        return [
          { min: 0, max: 400000, rate: 0 },
          { min: 400000, max: 800000, rate: 5 },
          { min: 800000, max: 1200000, rate: 10 },
          { min: 1200000, max: 1600000, rate: 15 },
          { min: 1600000, max: 2000000, rate: 20 },
          { min: 2000000, max: 2400000, rate: 25 },
          { min: 2400000, max: Infinity, rate: 30 }
        ];
      } else {
        return [
          { min: 0, max: 300000, rate: 0 },
          { min: 300000, max: 600000, rate: 5 },
          { min: 600000, max: 900000, rate: 10 },
          { min: 900000, max: 1200000, rate: 15 },
          { min: 1200000, max: 1500000, rate: 20 },
          { min: 1500000, max: Infinity, rate: 30 }
        ];
      }
    } else {
      // Old Regime - Age-based slabs
      if (ageGroup === 'below60') {
        return [
          { min: 0, max: 250000, rate: 0 },
          { min: 250000, max: 500000, rate: 5 },
          { min: 500000, max: 1000000, rate: 20 },
          { min: 1000000, max: Infinity, rate: 30 }
        ];
      } else if (ageGroup === '60to80') {
        return [
          { min: 0, max: 300000, rate: 0 },
          { min: 300000, max: 500000, rate: 5 },
          { min: 500000, max: 1000000, rate: 20 },
          { min: 1000000, max: Infinity, rate: 30 }
        ];
      } else { // above80
        return [
          { min: 0, max: 500000, rate: 0 },
          { min: 500000, max: 1000000, rate: 20 },
          { min: 1000000, max: Infinity, rate: 30 }
        ];
      }
    }
  };

  const calculateTaxForSlab = (income: number, slabs: any[]) => {
    let totalTax = 0;
    let breakdown: TaxBreakdown[] = [];

    for (const slab of slabs) {
      if (income > slab.min) {
        const taxableInThisSlab = Math.min(income, slab.max) - slab.min;
        const taxForThisSlab = (taxableInThisSlab * slab.rate) / 100;
        totalTax += taxForThisSlab;

        if (taxableInThisSlab > 0) {
          breakdown.push({
            slab: slab.max === Infinity 
              ? `Above ₹${(slab.min).toLocaleString('en-IN')}`
              : `₹${(slab.min).toLocaleString('en-IN')} - ₹${(slab.max).toLocaleString('en-IN')}`,
            income: taxableInThisSlab,
            rate: slab.rate,
            tax: taxForThisSlab
          });
        }
      }
    }

    return { totalTax, breakdown };
  };

  const calculateSingleRegime = (regime: 'old' | 'new'): TaxResult => {
    // Listed-equity gains are charged at their own statutory rates (s.112A at
    // 12.5% above a ₹1,25,000 annual allowance; s.111A at 20%) and must NOT be
    // pooled into the slab ladder. They are passed to the engine separately
    // below. Pooling them previously did two things at once: it taxed gains at
    // slab rates, and it let the s.87A/156 rebate absorb the tax on them, which
    // could report "zero tax" on a return that in fact had a liability.
    const ltcgEquityIncome = parseFloat(formData.ltcgEquity) || 0;
    const stcgEquityIncome = parseFloat(formData.stcgEquity) || 0;

    // `capitalGainsIncome` remains the slab-taxed bucket — debt-fund gains,
    // unlisted shares, short-term gains outside s.111A — which genuinely are
    // charged at the ordinary rates.
    const slabTaxedIncome = [
      parseFloat(formData.salaryIncome) || 0,
      parseFloat(formData.housePropertyIncome) || 0,
      parseFloat(formData.businessIncome) || 0,
      parseFloat(formData.capitalGainsIncome) || 0,
      parseFloat(formData.otherIncome) || 0
    ].reduce((sum, val) => sum + val, 0);

    // Gross total income for display and effective-rate purposes includes the
    // special-rate gains, even though they bypass the slab computation.
    const totalIncome = slabTaxedIncome + ltcgEquityIncome + stcgEquityIncome;

    // Standard deduction — allowed ONLY against income under the head
    // "Salaries" (s.16(ia) of ITA 1961 / the equivalent under ITA 2025).
    //
    // This previously keyed off totalIncome, so anyone with no salary at all
    // still received it: a freelancer with ₹10L of business income, or a
    // trader with only capital gains, got ₹75,000 of deduction they are not
    // entitled to and an understated tax liability. It is also capped at the
    // salary figure itself, so a ₹30,000 salary gives ₹30,000 of deduction,
    // not ₹75,000.
    const salaryForStandardDeduction = parseFloat(formData.salaryIncome) || 0;
    let standardDeductionAmount = 0;
    if (salaryForStandardDeduction > 0) {
      if (regime === 'old') {
        standardDeductionAmount = 50000;
      } else {
        standardDeductionAmount = 75000;
      }
    }
    const standardDeduction = Math.min(standardDeductionAmount, salaryForStandardDeduction);

    // Calculate HRA exemption
    const hraReceived = parseFloat(formData.hraReceived) || 0;
    const rentPaid = parseFloat(formData.rentPaid) || 0;
    const salaryIncome = parseFloat(formData.salaryIncome) || 0;
    let hraExemption = 0;

    // Rule 2A defines "salary" for HRA purposes as BASIC + DA, not gross salary.
    // This previously passed salaryIncome (the gross figure) as the basic, which
    // over-exempted heavily on allowance-heavy packages — basic ₹2L inside a
    // ₹10L gross gave a ₹5,00,000 exemption where the statute allows ₹1,00,000 —
    // and under-exempted on basic-heavy ones. The standalone HRACalculator has
    // always taken a proper basic input; only this embedded copy was wrong.
    //
    // If the user leaves basic blank we fall back to the gross figure and say so
    // in the UI, because silently assuming a percentage would be inventing data.
    const basicPlusDA = parseFloat(formData.basicSalary) || 0;
    const hraSalaryBase = basicPlusDA > 0 ? basicPlusDA : salaryIncome;

    if (hraReceived > 0 && rentPaid > 0 && hraSalaryBase > 0) {
      // Least of: (i) actual HRA received, (ii) rent paid − 10% of salary,
      // (iii) 50% of salary in the 8 notified metros, else 40%.
      const rentExcess = Math.max(0, rentPaid - (hraSalaryBase * 0.1));
      const hraPercentage = formData.isMetroCity ? 0.5 : 0.4;
      hraExemption = Math.min(hraReceived, rentExcess, hraSalaryBase * hraPercentage);
    }

    // Total deductions
    let totalDeductions = 0;
    const isSenior = formData.ageGroup === '60to80' || formData.ageGroup === 'above80';

    const section80C = Math.min(parseFloat(formData.section80C) || 0, 150000);
    // 80D: ₹25,000 self/family (₹50,000 if senior) + ₹25,000 parents (₹50,000 if
    // the parents are senior). ₹1,00,000 is the absolute statutory ceiling and is
    // only reachable when both the assessee and the parents are 60+. Without a
    // separate "parents' age" input we take the assessee's age as the proxy,
    // which is the conservative reading. Previously uncapped entirely.
    const section80DCap = isSenior ? 100000 : 50000;
    const section80D = Math.min(parseFloat(formData.section80D) || 0, section80DCap);
    const section80E = parseFloat(formData.section80E) || 0;  // No upper cap — correct, 80E is uncapped
    // 80TTA is ₹10,000 on savings interest for under-60s. A senior citizen
    // claims 80TTB instead at ₹50,000, which covers ALL deposit interest.
    // The senior branch was missing, capping 60+ users at ₹10,000.
    const savingsInterestCap = isSenior ? 50000 : 10000; // 80TTB : 80TTA
    const section80TTA = Math.min(parseFloat(formData.section80TTA) || 0, savingsInterestCap);
    const section80CCD1B = Math.min(parseFloat(formData.section80CCD1B) || 0, 50000); // NPS extra cap ₹50k
    // 80G: most donees carry a qualifying limit of 10% of adjusted gross total
    // income, and many attract a 50% deduction rate rather than 100%. Modelling
    // the full donee taxonomy needs an input this form does not have, so we
    // apply the qualifying limit only — the part that is universal — and leave
    // the 50%/100% split to the user's own figure. Previously uncapped, which
    // let a donation of any size be deducted in full.
    const adjustedGTI = Math.max(0, totalIncome - standardDeduction);
    const section80G = Math.min(parseFloat(formData.section80G) || 0, adjustedGTI * 0.10);
    const homeLoanInterest = Math.min(parseFloat(formData.homeLoanInterest) || 0, 200000); // Sec 24(b) cap ₹2L
    const lta = parseFloat(formData.lta) || 0;  // LTA exemption under old regime
    // "Other deductions" is a free-text catch-all. Left uncapped it allowed any
    // user to drive taxable income to zero. Bounded to the remaining Chapter
    // VI-A headroom — Chapter VI-A can reduce gross total income to nil but
    // never below it, and cannot create or enlarge a loss.
    const namedChapterVIA = section80C + section80D + section80E + section80TTA +
      section80CCD1B + section80G;
    const otherDeductions = Math.min(
      parseFloat(formData.otherDeductions) || 0,
      Math.max(0, totalIncome - namedChapterVIA)
    );

    if (regime === 'old') {
      totalDeductions = section80C + section80D + section80E + section80TTA +
        section80CCD1B + section80G + homeLoanInterest + lta +
        hraExemption + otherDeductions + standardDeduction;
    } else {
      // New regime: only standard deduction (₹75,000) applies
      totalDeductions = standardDeduction;
    }

    // Deductions are set against SLAB income only. Chapter VI-A deductions are
    // not allowable against income charged at the special rates in s.111A /
    // s.112A, so the gains must be excluded from the base the deductions reduce
    // — otherwise a large 80C claim would erode tax on capital gains.
    const taxableIncome = Math.max(0, slabTaxedIncome - totalDeductions);

    // For both regimes, taxable amount is the taxable income
    // (exemption limits are built into the tax slabs themselves)
    const taxableAmount = taxableIncome;

    // Calculate tax using slabs
    const slabs = getTaxSlabs(regime, formData.financialYear, formData.ageGroup);
    const { totalTax: incomeTax, breakdown: taxBreakdown } = calculateTaxForSlab(taxableAmount, slabs);

    // Correct order per Income Tax Act, 2025 (ITA 2025):
    // Step 1: Compute slab-wise income tax (Section 202 — new regime; Schedule I — old regime)
    // Step 2: Apply Section 156 rebate BEFORE cess (formerly Section 87A of ITA 1961)
    // Step 3: Apply marginal relief if applicable (New Regime FY 2025-26+)
    // Step 4: Compute 4% Health & Education Cess on the NET tax (after rebate & relief)

    // ── Rebate / marginal relief / surcharge / cess ────────────────────────
    //
    // This block used to re-implement the whole ladder inline — a second tax
    // engine sitting alongside shared/taxLiability.ts, kept in step only by a
    // comment asking that they "stay in sync". They had already diverged in the
    // way that mattered most: neither computed surcharge, but only this copy is
    // what ~84% of traffic actually hits.
    //
    // It now delegates to the shared engine, so there is one implementation of
    // the statutory sequence (rebate before cess, marginal relief at each
    // threshold, surcharge with its own relief, cess on tax + surcharge) and the
    // drift guard in scripts/test-tax-calculations.ts has something real to
    // guard.
    //
    // Capital gains are passed as special-rate income rather than pooled into
    // the slab ladder: s.112A charges listed-equity LTCG at 12.5% above a
    // ₹1,25,000 annual allowance and s.111A charges STCG at 20%, and the
    // s.87A/156 rebate is not available against either.
    const liability = computeTaxLiability(
      taxableAmount,
      regime,
      formData.financialYear,
      formData.ageGroup as AgeGroup,
      { ltcgEquity: ltcgEquityIncome, stcgEquity: stcgEquityIncome }
    );

    const rebate87A = liability.rebate;
    const marginalRelief = liability.marginalRelief;
    const marginalReliefApplied = liability.marginalReliefApplied;
    const cessAmount = liability.cess;
    const surchargeAmount = liability.surcharge;
    const surchargeRate = liability.surchargeRate;
    const specialRateTax = liability.specialRateTax;
    const finalTax = liability.totalTax;

    const totalTax = Math.max(0, finalTax);
    const takeHome = totalIncome - totalTax;
    const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;
    
    // Calculate marginal tax rate
    let marginalRate = 0;
    for (const slab of slabs) {
      if (taxableAmount > slab.min) {
        marginalRate = slab.rate;
      }
    }

    return {
      grossIncome: totalIncome,
      standardDeduction,
      totalDeductions,
      taxableIncome,
      incomeTax,
      cess: cessAmount,
      rebate87A,
      marginalRelief,
      hraExemption,
      surcharge: surchargeAmount,
      surchargeRate,
      specialRateTax,
      ltcgEquity: ltcgEquityIncome,
      stcgEquity: stcgEquityIncome,
      totalTax,
      takeHome,
      effectiveRate,
      marginalRate,
      taxBreakdown,
      marginalReliefApplied
    };
  };

  const calculateTax = async () => {
    setIsCalculating(true);
    
    // Add artificial delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const oldRegimeResult = calculateSingleRegime('old');
    const newRegimeResult = calculateSingleRegime('new');
    
    const savings = Math.abs(oldRegimeResult.totalTax - newRegimeResult.totalTax);
    const recommendedRegime = oldRegimeResult.totalTax < newRegimeResult.totalTax ? 'old' : 'new';
    
    const bothRegimesResult: BothRegimesResult = {
      oldRegime: oldRegimeResult,
      newRegime: newRegimeResult,
      savings,
      recommendedRegime
    };
    
    setResult(bothRegimesResult);
    setActiveTab('results');
    setIsCalculating(false);

    // Fire onCalculated callback for lead-capture modal
    if (onCalculated) {
      const fmt = (n: number) =>
        '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
      const rec = recommendedRegime === 'new' ? 'New Regime' : 'Old Regime';
      const recTax = recommendedRegime === 'new' ? newRegimeResult.totalTax : oldRegimeResult.totalTax;
      const summaryText = `${rec}: ${fmt(recTax)} tax | Income: ${fmt(oldRegimeResult.grossIncome)} | Saves ${fmt(savings)} vs ${recommendedRegime === 'new' ? 'Old' : 'New'} Regime`;
      onCalculated(summaryText);
    }

    // Track calculation count (fire-and-forget)
    fetch('/api/stats/track-calculation', { method: 'POST' }).catch(() => {});
    const recLabel = recommendedRegime === 'new' ? 'New Regime' : 'Old Regime';
    const recTaxAmt = recommendedRegime === 'new' ? newRegimeResult.totalTax : oldRegimeResult.totalTax;
    const rs = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    // Third argument persists a "last result" card on the dashboard. Inputs are
    // stored alongside the figures so reopening the calculator restores what
    // the person typed rather than making them enter it all again next year.
    trackTool(
      "Income Tax Calculator",
      `${recLabel}: ${rs(recTaxAmt)} tax`,
      {
        toolKey: "income-tax",
        route: "/calculators/income-tax",
        kind: "calculator",
        headline: {
          label: `Your tax · ${recLabel}`,
          value: rs(recTaxAmt),
          hint: savings > 0
            ? `${rs(savings)} less than the ${recommendedRegime === 'new' ? 'Old' : 'New'} Regime`
            : undefined,
        },
        details: [
          { label: "Gross income", value: rs(oldRegimeResult.grossIncome) },
          { label: "Old Regime tax", value: rs(oldRegimeResult.totalTax) },
          { label: "New Regime tax", value: rs(newRegimeResult.totalTax) },
        ],
        inputs: {
          ageGroup: formData.ageGroup,
          // Saved so the dashboard can label the figure with the year it was
          // actually computed for. Without it the panel would have to assume
          // the FY in progress, which silently mislabels a calculation run
          // for a previous year — the same failure mode as the hardcoded
          // "2025-26" strings the reconciliation parsers had to be freed of.
          financialYear: formData.financialYear,
          salaryIncome: formData.salaryIncome,
          housePropertyIncome: formData.housePropertyIncome,
          businessIncome: formData.businessIncome,
          capitalGainsIncome: formData.capitalGainsIncome,
          otherIncome: formData.otherIncome,
          // Deduction figures are stored alongside the income ones so the
          // dashboard's "Still left to claim" cards can show the real gap
          // between what this person actually claimed and the statutory
          // ceiling, instead of quoting the ceiling at everybody. They are
          // Old-Regime-only deductions, and the dashboard gates on that.
          section80C: formData.section80C,
          section80D: formData.section80D,
          section80CCD1B: formData.section80CCD1B,
          homeLoanInterest: formData.homeLoanInterest,
        },
      }
    );

    // Get AI advice via Firebase AI Logic (client-side Gemini) with server fallback
    setAiAdvice(null);
    setAiLoading(true);
    getClientTaxAdvice({
      occupation: userProfile?.occupation || '',
      ageGroup: formData.ageGroup,
      salaryIncome: parseFloat(formData.salaryIncome) || 0,
      housePropertyIncome: parseFloat(formData.housePropertyIncome) || 0,
      businessIncome: parseFloat(formData.businessIncome) || 0,
      capitalGainsIncome: parseFloat(formData.capitalGainsIncome) || 0,
      otherIncome: parseFloat(formData.otherIncome) || 0,
      totalIncome: oldRegimeResult.grossIncome,
      section80C: parseFloat(formData.section80C) || 0,
      section80D: parseFloat(formData.section80D) || 0,
      section80E: parseFloat(formData.section80E) || 0,
      section80TTA: parseFloat(formData.section80TTA) || 0,
      section80CCD1B: parseFloat(formData.section80CCD1B) || 0,
      section80G: parseFloat(formData.section80G) || 0,
      homeLoanInterest: parseFloat(formData.homeLoanInterest) || 0,
      lta: parseFloat(formData.lta) || 0,
      hraReceived: parseFloat(formData.hraReceived) || 0,
      rentPaid: parseFloat(formData.rentPaid) || 0,
      isMetroCity: formData.isMetroCity,
      otherDeductions: parseFloat(formData.otherDeductions) || 0,
      oldRegimeTax: oldRegimeResult.totalTax,
      newRegimeTax: newRegimeResult.totalTax,
      recommendedRegime,
      taxSavings: savings,
      financialYear: formData.financialYear,
    })
      .then(data => setAiAdvice(data))
      .catch(() => setAiAdvice(null))
      .finally(() => setAiLoading(false));
  };

  const resetCalculator = () => {
    setResult(null);
    setFormData({
      salaryIncome: '',
      basicSalary: '',
      housePropertyIncome: '',
      businessIncome: '',
      capitalGainsIncome: '',
      ltcgEquity: '',
      stcgEquity: '',
      otherIncome: '',
      section80C: '',
      section80D: '',
      section80E: '',
      section80TTA: '',
      section80CCD1B: '',
      section80G: '',
      homeLoanInterest: '',
      lta: '',
      hraReceived: '',
      rentPaid: '',
      isMetroCity: false,
      otherDeductions: '',
      ageGroup: 'below60',
      financialYear: '2026-27',
      hasMultipleHouseProperties: false,
      hasCryptoIncome: false,
      isPresumptiveScheme: false,
      isDirector: false,
      isNonResident: false,
      hasForeignAssets: false,
      agriculturalIncome: ''
    });
    setActiveTab('calculator');
  };

  const saveCalculation = async () => {
    if (!result || !user) return;
    
    setIsSaving(true);
    try {
      const token = await getIdToken();
      if (!token) {
        toast({
          title: "Error",
          description: "Please log in to save calculations",
          variant: "destructive"
        });
        return;
      }

      const fyToAY: Record<string, string> = {
        '2024-25': '2025-26',
        '2025-26': '2026-27',
        '2026-27': '2027-28'
      };

      const calculationData = {
        financialYear: formData.financialYear,
        assessmentYear: fyToAY[formData.financialYear] || '2026-27',
        ageGroup: formData.ageGroup,
        inputData: formData,
        oldRegimeResult: result.oldRegime,
        newRegimeResult: result.newRegime,
        recommendedRegime: result.recommendedRegime,
        savings: result.savings.toString(),
        grossIncome: result.oldRegime.grossIncome.toString(),
        taxableIncomeOld: result.oldRegime.taxableIncome.toString(),
        taxableIncomeNew: result.newRegime.taxableIncome.toString(),
        totalTaxOld: result.oldRegime.totalTax.toString(),
        totalTaxNew: result.newRegime.totalTax.toString(),
      };

      const response = await fetch('/api/tax-calculations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(calculationData)
      });

      if (!response.ok) {
        throw new Error('Failed to save calculation');
      }

      toast({
        title: "Saved!",
        description: "Your tax calculation has been saved. View it in your Dashboard.",
      });
    } catch (error) {
      console.error('Error saving calculation:', error);
      toast({
        title: "Error",
        description: "Failed to save calculation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const generatePDF = async () => {
    if (!result) return;

    setIsGeneratingPDF(true);
    try {
      const fyToAY: Record<string, string> = {
        '2024-25': '2025-26',
        '2025-26': '2026-27',
        '2026-27': '2027-28'
      };

      const assessmentYear = fyToAY[formData.financialYear] || '2026-27';

      // ── Re-derive inputs needed for PDF ───────────────────────────────────
      const salaryIncome   = parseFloat(formData.salaryIncome)        || 0;
      const hraReceived    = parseFloat(formData.hraReceived)         || 0;
      const rentPaid       = parseFloat(formData.rentPaid)            || 0;
      const rentalIncome   = parseFloat(formData.housePropertyIncome) || 0;
      const capitalGains   = parseFloat(formData.capitalGainsIncome)  || 0;
      const businessInc    = parseFloat(formData.businessIncome)      || 0;
      const otherInc       = parseFloat(formData.otherIncome)         || 0;

      // Deductions (capped exactly as in calculateSingleRegime)
      const sec80C         = Math.min(parseFloat(formData.section80C)      || 0, 150000);
      const sec80D         = parseFloat(formData.section80D)               || 0;
      const sec80E         = parseFloat(formData.section80E)               || 0;
      const sec80TTA       = Math.min(parseFloat(formData.section80TTA)    || 0, 10000);
      const sec80CCD1B     = Math.min(parseFloat(formData.section80CCD1B)  || 0, 50000);
      const sec80G         = parseFloat(formData.section80G)               || 0;
      const homeLoanInt    = Math.min(parseFloat(formData.homeLoanInterest) || 0, 200000);
      const lta            = parseFloat(formData.lta)                      || 0;

      // HRA exemption — read from the engine, never recomputed here.
      //
      // This used to be a second copy of the formula, labelled "same formula as
      // calculateSingleRegime". It stopped being the same formula the moment the
      // on-screen path was corrected to use basic + DA: the screen exempted
      // ₹1,00,000 and the PDF ₹5,00,000 on the same inputs. Worse, netSalary and
      // grossTotalIncome below are derived from this figure while taxableIncome
      // and totalTax come from the engine — so the generated computation sheet
      // did not add up, on a document a taxpayer may hand to their CA.
      const hraExemption = result.oldRegime.hraExemption;

      const totalChapterVIA = sec80C + sec80D + sec80E + sec80TTA + sec80CCD1B + sec80G + homeLoanInt;

      // ── Build OLD regime RegimePDFData ─────────────────────────────────────
      const oldSD       = result.oldRegime.standardDeduction;   // ₹50,000
      const oldNetSal   = salaryIncome - hraExemption - lta - oldSD;
      const oldOtherInc = rentalIncome + capitalGains + businessInc + otherInc;
      const oldGTI      = Math.max(0, oldNetSal) + oldOtherInc;
      const oldTaxAfterRebate = Math.max(0, result.oldRegime.incomeTax - result.oldRegime.rebate87A);

      const oldRegimeData = {
        grossSalary:      salaryIncome,
        hraReceived:      hraReceived  || undefined,
        hraExemption:     hraExemption || undefined,
        ltaReceived:      lta          || undefined,
        ltaExemption:     lta          || undefined,
        standardDeduction: oldSD,
        netSalary:        Math.max(0, oldNetSal),
        rentalIncome:     rentalIncome  || undefined,
        capitalGainsLTCG: capitalGains  || undefined,
        otherIncome:      (businessInc + otherInc) || undefined,
        grossTotalIncome: oldGTI,
        sec80C:           sec80C        || undefined,
        sec80D:           sec80D        || undefined,
        sec80E:           sec80E        || undefined,
        sec80TTA:         sec80TTA      || undefined,
        sec80CCD1B:       sec80CCD1B    || undefined,
        sec80G:           sec80G        || undefined,
        homeLoanInterest: homeLoanInt   || undefined,
        totalChapterVIA,
        taxableIncome:    result.oldRegime.taxableIncome,
        incomeTax:        result.oldRegime.incomeTax,
        rebate87A:        result.oldRegime.rebate87A,
        taxAfterRebate:   oldTaxAfterRebate,
        surcharge:        result.oldRegime.surcharge,
        cess:             result.oldRegime.cess,
        totalTax:         result.oldRegime.totalTax,
        monthlyTDS:       Math.round(result.oldRegime.totalTax / 12),
      };

      // ── Build NEW regime RegimePDFData ─────────────────────────────────────
      const newSD       = result.newRegime.standardDeduction;   // ₹75,000
      const newNetSal   = salaryIncome - newSD;
      const newOtherInc = rentalIncome + capitalGains + businessInc + otherInc;
      const newGTI      = Math.max(0, newNetSal) + newOtherInc;
      const newTaxAfterRebate = Math.max(0, result.newRegime.incomeTax - result.newRegime.rebate87A);

      const newRegimeData = {
        grossSalary:      salaryIncome,
        standardDeduction: newSD,
        netSalary:        Math.max(0, newNetSal),
        rentalIncome:     rentalIncome  || undefined,
        capitalGainsLTCG: capitalGains  || undefined,
        otherIncome:      (businessInc + otherInc) || undefined,
        grossTotalIncome: newGTI,
        totalChapterVIA:  0,
        taxableIncome:    result.newRegime.taxableIncome,
        incomeTax:        result.newRegime.incomeTax,
        rebate87A:        result.newRegime.rebate87A,
        taxAfterRebate:   newTaxAfterRebate,
        surcharge:        result.newRegime.surcharge,
        cess:             result.newRegime.cess,
        totalTax:         result.newRegime.totalTax,
        monthlyTDS:       Math.round(result.newRegime.totalTax / 12),
      };

      // ── Build full computationData payload ────────────────────────────────
      const computationData = {
        personalInfo: {
          name: user?.displayName || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Taxpayer',
          pan: '',
          status: 'Individual',
          ageGroup: formData.ageGroup,
          residencyStatus: 'Resident',
        },
        assessmentYear,
        financialYear: formData.financialYear,
        // New detailed both-regime data (triggers ITR-style PDF)
        oldRegimeData,
        newRegimeData,
        recommendedRegime: result.recommendedRegime,
        savings: result.savings,
        // Legacy fallback fields (used by generateLegacyPDF)
        regime: result.recommendedRegime,
        taxBreakdown: {
          taxableIncome: result.oldRegime.taxableIncome,
          taxOnIncome:   result.oldRegime.incomeTax,
          surcharge:     result.oldRegime.surcharge,
          cess:          result.oldRegime.cess,
          totalTax:      result.oldRegime.totalTax,
        },
      };

      const response = await fetch('/api/tax-computation/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(computationData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tax_Computation_AY${assessmentYear}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'PDF Downloaded',
        description: 'Detailed ITR-style tax comparison downloaded successfully!',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  const generatePDFLegacy = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const formatAmount = (amount: number) => {
      return '₹' + amount.toLocaleString('en-IN');
    };

    const fyToAY: Record<string, string> = {
      '2024-25': 'AY 2025-26',
      '2025-26': 'AY 2026-27',
      '2026-27': 'Tax Year 2026-27 / AY 2027-28'
    };
    const assessmentYear = fyToAY[formData.financialYear] || `AY ${parseInt(formData.financialYear.split('-')[0]) + 1}-${parseInt(formData.financialYear.split('-')[1]) + 1}`;
    const rebateSection = formData.financialYear === "2026-27" ? "Section 156" : "Section 87A";

    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text('AiTaxBot', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('Income Tax Calculation Report', pageWidth / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(10);
    doc.text(`Financial Year: ${formData.financialYear} (${assessmentYear})`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('RECOMMENDATION', 20, y);
    y += 6;

    doc.setFontSize(11);
    doc.setTextColor(0);
    const regimeName = result.recommendedRegime === 'old' ? 'Old Tax Regime' : 'New Tax Regime';
    doc.text(`Best Option: ${regimeName}`, 20, y);
    y += 5;
    doc.text(`Potential Savings: ${formatAmount(result.savings)}`, 20, y);
    y += 12;

    const drawRegimeSection = (regime: TaxResult, title: string, isRecommended: boolean, startY: number) => {
      let currentY = startY;

      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text(title + (isRecommended ? ' (Recommended)' : ''), 20, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      const rows = [
        ['Gross Income', formatAmount(regime.grossIncome)],
        ['Total Deductions', '-' + formatAmount(regime.totalDeductions)],
        ['Taxable Income', formatAmount(regime.taxableIncome)],
        ['Income Tax', formatAmount(regime.incomeTax)],
      ];

      if (regime.rebate87A > 0) {
        rows.push([`Rebate u/s ${rebateSection}`, '-' + formatAmount(regime.rebate87A)]);
      }

      if (regime.marginalRelief > 0) {
        rows.push(['Marginal Relief', '-' + formatAmount(regime.marginalRelief)]);
      }

      rows.push(['Health & Education Cess (4%)', formatAmount(regime.cess)]);

      rows.push(['Total Tax Payable', formatAmount(regime.totalTax)]);
      rows.push(['Take Home (Annual)', formatAmount(regime.takeHome)]);
      rows.push(['Effective Tax Rate', regime.effectiveRate.toFixed(1) + '%']);

      rows.forEach(([label, value]) => {
        doc.setTextColor(80, 80, 80);
        doc.text(label, 25, currentY);
        doc.setTextColor(0);
        doc.text(value, pageWidth - 60, currentY, { align: 'right' });
        currentY += 5;
      });

      return currentY;
    };

    y = drawRegimeSection(result.oldRegime, 'OLD TAX REGIME', result.recommendedRegime === 'old', y);
    y += 8;

    y = drawRegimeSection(result.newRegime, 'NEW TAX REGIME', result.recommendedRegime === 'new', y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text('TAX SLAB BREAKDOWN', 20, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('New Regime Slabs:', 25, y);
    y += 5;

    result.newRegime.taxBreakdown.forEach((slab) => {
      doc.text(`${slab.slab}: ${slab.rate}% = ${formatAmount(slab.tax)}`, 30, y);
      y += 4;
    });

    y += 10;
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Generated by AiTaxBot (https://www.aitaxbot.co.in)', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('Disclaimer: This is an indicative calculation. Please consult a tax professional for filing.', pageWidth / 2, y, { align: 'center' });

    const fileName = `TaxCalculation_FY${formData.financialYear}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const calculatorContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Trust badges strip */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
            <CheckCircle className="h-3 w-3" /> CA-Reviewed Calculations
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink bg-secondary border border-rule rounded-full px-2.5 py-0.5">
            <CheckCircle className="h-3 w-3" /> Updated for Finance Act 2025
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/65 bg-secondary border border-rule rounded-full px-2.5 py-0.5">
            <Shield className="h-3 w-3" /> Nothing saved unless you sign in
          </span>
        </div>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="calculator" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Calculator</span>
          </TabsTrigger>
          {/* Results and Breakdown are disabled until a calculation exists.
              Tabs imply peer views you can browse in any order, but this is a
              strict sequence — you cannot have a result before you calculate.
              Both were clickable from first paint and led to empty panels. */}
          <TabsTrigger value="results" disabled={!result} className="flex items-center space-x-2" title={!result ? "Run a calculation first" : undefined}>
            <PieChart className="h-4 w-4" />
            <span>Results</span>
          </TabsTrigger>
          <TabsTrigger value="breakdown" disabled={!result} className="flex items-center space-x-2" title={!result ? "Run a calculation first" : undefined}>
            <ClipboardList className="h-4 w-4" />
            <span>Tax Breakdown</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="space-y-6">
              <Card className="p-6 premium-glass-card premium-glass-card-hover transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-readable flex items-center">
                    <User className="mr-2 h-4 w-4 text-primary" />
                    Basic Information
                  </h3>
                  <LastUpdated
                    date="2026-02-04"
                    type="rates"
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mb-4 w-fit">
                  <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    Calculations run in your browser. Signed in, your latest result is saved to your
                    dashboard — you can delete it any time.
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="financial-year">Financial Year</Label>
                    <Select value={formData.financialYear} onValueChange={(value) => updateFormData('financialYear', value)}>
                      <SelectTrigger data-testid="select-financial-year">
                        <SelectValue placeholder="Select Financial Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-25">FY 2024-25 / AY 2025-26</SelectItem>
                        <SelectItem value="2025-26">FY 2025-26 / AY 2026-27</SelectItem>
                        <SelectItem value="2026-27">FY 2026-27 (AY 2027-28) — Income Tax Act, 2025</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Dynamic Section Reference Panel.
                        Collapsed by default via <details>: measured on a real
                        375px mobile viewport, this block alone was 488px tall
                        (more than half the screen) sitting between the page
                        header and the very first input field, and was the
                        single largest contributor to a 1,362px scroll before
                        any calculator input was reachable. <details> keeps the
                        content in the DOM (still crawlable for AdSense/SEO —
                        Google indexes collapsed accordion content) without
                        forcing every visitor to scroll past it first. */}
                    {formData.financialYear === '2026-27' ? (
                      <details className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-900">
                        <summary className="font-semibold mb-1.5 cursor-pointer select-none">📗 Income Tax Act, 2025 — effective Tax Year 2026-27 (1 Apr 2026)</summary>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5">
                          <span><span className="font-medium">New Regime:</span> Section 202</span>
                          <span><span className="font-medium">Rebate (≤ ₹12L):</span> Section 156</span>
                          <span><span className="font-medium">Std. Deduction:</span> Section 19</span>
                          <span><span className="font-medium">HRA Exemption:</span> Sch. II, Tbl. 2</span>
                          <span><span className="font-medium">Home Loan Interest:</span> Section 25</span>
                          <span><span className="font-medium">Employer NPS (14%):</span> Section 124(2)</span>
                          <span><span className="font-medium">80C equivalent:</span> S.123 + Sch. XV</span>
                          <span><span className="font-medium">Health Insurance:</span> Section 126</span>
                          <span className="col-span-2 mt-0.5"><span className="font-medium">Metro cities (8, HRA 50%):</span> Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad, Pune, Ahmedabad</span>
                        </div>
                      </details>
                    ) : formData.financialYear === '2025-26' ? (
                      <details className="mt-2 rounded-lg border border-rule bg-secondary p-3 text-xs text-ink">
                        <summary className="font-semibold mb-1.5 cursor-pointer select-none">📘 Income Tax Act, 2025 — FY 2026-27 (Budget 2026 slabs)</summary>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5">
                          <span><span className="font-medium">New Regime:</span> Section 115BAC</span>
                          <span><span className="font-medium">Rebate (≤ ₹12L):</span> Section 87A</span>
                          <span><span className="font-medium">Std. Deduction:</span> Section 16(ia)</span>
                          <span><span className="font-medium">HRA Exemption:</span> Section 10(13A)</span>
                          <span><span className="font-medium">Home Loan Interest:</span> Section 24(b)</span>
                          <span><span className="font-medium">Employer NPS:</span> Section 80CCD(2)</span>
                          <span><span className="font-medium">Investments (80C):</span> Section 80C</span>
                          <span><span className="font-medium">Health Insurance:</span> Section 80D</span>
                          <span className="col-span-2 mt-0.5"><span className="font-medium">Metro cities (4, HRA 50%):</span> Delhi, Mumbai, Kolkata, Chennai</span>
                        </div>
                      </details>
                    ) : (
                      <details className="mt-2 rounded-lg border border-rule bg-secondary p-3 text-xs text-ink/80">
                        <summary className="font-semibold mb-1.5 cursor-pointer select-none">📙 Income Tax Act, 1961 — FY 2024-25 (Budget 2024 slabs)</summary>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5">
                          <span><span className="font-medium">New Regime:</span> Section 115BAC</span>
                          <span><span className="font-medium">Rebate (≤ ₹7L):</span> Section 87A</span>
                          <span><span className="font-medium">Std. Deduction:</span> Section 16(ia)</span>
                          <span><span className="font-medium">HRA Exemption:</span> Section 10(13A)</span>
                          <span><span className="font-medium">Home Loan Interest:</span> Section 24(b)</span>
                          <span><span className="font-medium">Employer NPS:</span> Section 80CCD(2)</span>
                          <span><span className="font-medium">Investments (80C):</span> Section 80C</span>
                          <span><span className="font-medium">Health Insurance:</span> Section 80D</span>
                          <span className="col-span-2 mt-0.5"><span className="font-medium">Metro cities (4, HRA 50%):</span> Delhi, Mumbai, Kolkata, Chennai</span>
                        </div>
                      </details>
                    )}
                  </div>

                  <div>
                    <Label className="mb-2 block">Age Group</Label>
                    <SegmentedToggle
                      fullWidth
                      options={[
                        { value: "below60",  label: "Below 60" },
                        { value: "60to80",   label: "60–80 (Senior)" },
                        { value: "above80",  label: "80+ (Super Senior)" },
                      ]}
                      value={formData.ageGroup}
                      onChange={(v) => updateFormData("ageGroup", v)}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6 premium-glass-card premium-glass-card-hover transition-all duration-300">
                <h3 className="text-lg font-semibold text-readable mb-4 flex items-center">
                  <Coins className="mr-2 h-4 w-4 text-success" />
                  Income Sources
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="salary-income">Annual Salary Income</Label>
                    <Input
                      id="salary-income"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 1200000"
                      value={formData.salaryIncome}
                      onChange={(e) => updateFormData('salaryIncome', e.target.value)}
                      data-testid="input-salary-income"
                    />
                  </div>

                  <div>
                    <Label htmlFor="house-property-income">House Property Income</Label>
                    <Input
                      id="house-property-income"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 200000"
                      value={formData.housePropertyIncome}
                      onChange={(e) => updateFormData('housePropertyIncome', e.target.value)}
                      data-testid="input-house-property-income"
                    />
                  </div>

                  <div>
                    <Label htmlFor="business-income">Business/Professional Income</Label>
                    <Input
                      id="business-income"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 300000"
                      value={formData.businessIncome}
                      onChange={(e) => updateFormData('businessIncome', e.target.value)}
                      data-testid="input-business-income"
                    />
                  </div>

                  <div>
                    <Label htmlFor="capital-gains-income">Capital Gains Income</Label>
                    <Input
                      id="capital-gains-income"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 100000"
                      value={formData.capitalGainsIncome}
                      onChange={(e) => updateFormData('capitalGainsIncome', e.target.value)}
                      data-testid="input-capital-gains-income"
                    />
                    <p className="text-xs text-ink/55 mt-1">
                      Debt funds, unlisted shares, property — gains taxed at your slab rate.
                      Listed shares and equity mutual funds go in the two fields below.
                    </p>
                  </div>

                  {/* Listed-equity gains are charged at their own statutory rates and
                      are deliberately separate inputs. Previously a single "Capital
                      Gains" figure was added to slab income, which both taxed the
                      gains at the wrong rate and let the s.87A/156 rebate absorb the
                      tax on them. */}
                  <div>
                    <Label htmlFor="ltcg-equity">
                      Long-Term Capital Gains — Listed Equity / Equity MF
                    </Label>
                    <Input
                      id="ltcg-equity"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 300000"
                      value={formData.ltcgEquity}
                      onChange={(e) => updateFormData('ltcgEquity', e.target.value)}
                      data-testid="input-ltcg-equity"
                    />
                    <p className="text-xs text-ink/55 mt-1">
                      Held over 12 months. Section 112A — first ₹1,25,000 exempt each
                      year, balance taxed at 12.5%. Not eligible for the rebate.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="stcg-equity">
                      Short-Term Capital Gains — Listed Equity / Equity MF
                    </Label>
                    <Input
                      id="stcg-equity"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 100000"
                      value={formData.stcgEquity}
                      onChange={(e) => updateFormData('stcgEquity', e.target.value)}
                      data-testid="input-stcg-equity"
                    />
                    <p className="text-xs text-ink/55 mt-1">
                      Held 12 months or less. Section 111A — taxed at 20%.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="other-income">Other Income</Label>
                    <Input
                      id="other-income"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 50000"
                      value={formData.otherIncome}
                      onChange={(e) => updateFormData('otherIncome', e.target.value)}
                      data-testid="input-other-income"
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-2 block text-sm text-muted-foreground">
                      A few more details — used only to recommend your ITR form, not for tax calculation
                    </Label>
                    <div className="space-y-2.5">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="multiple-house-properties"
                          checked={formData.hasMultipleHouseProperties}
                          onChange={(e) => updateFormData('hasMultipleHouseProperties', e.target.checked)}
                          data-testid="checkbox-multiple-house-properties"
                        />
                        <Label htmlFor="multiple-house-properties" className="font-normal">More than one house property</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="crypto-income"
                          checked={formData.hasCryptoIncome}
                          onChange={(e) => updateFormData('hasCryptoIncome', e.target.checked)}
                          data-testid="checkbox-crypto-income"
                        />
                        <Label htmlFor="crypto-income" className="font-normal">Crypto / Virtual Digital Asset income (Sec 115BBH)</Label>
                      </div>
                      {parseFloat(formData.businessIncome) > 0 && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="presumptive-scheme"
                            checked={formData.isPresumptiveScheme}
                            onChange={(e) => updateFormData('isPresumptiveScheme', e.target.checked)}
                            data-testid="checkbox-presumptive-scheme"
                          />
                          <Label htmlFor="presumptive-scheme" className="font-normal">Business income declared under presumptive scheme (44AD/44ADA/44AE)</Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is-director"
                          checked={formData.isDirector}
                          onChange={(e) => updateFormData('isDirector', e.target.checked)}
                          data-testid="checkbox-is-director"
                        />
                        <Label htmlFor="is-director" className="font-normal">Director in a company</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is-non-resident"
                          checked={formData.isNonResident}
                          onChange={(e) => updateFormData('isNonResident', e.target.checked)}
                          data-testid="checkbox-is-non-resident"
                        />
                        <Label htmlFor="is-non-resident" className="font-normal">Non-resident / RNOR (not ordinarily resident)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="foreign-assets"
                          checked={formData.hasForeignAssets}
                          onChange={(e) => updateFormData('hasForeignAssets', e.target.checked)}
                          data-testid="checkbox-foreign-assets"
                        />
                        <Label htmlFor="foreign-assets" className="font-normal">Foreign income or foreign assets</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="agricultural-income">Agricultural Income (if any)</Label>
                    <Input
                      id="agricultural-income"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 3000"
                      value={formData.agriculturalIncome}
                      onChange={(e) => updateFormData('agriculturalIncome', e.target.value)}
                      data-testid="input-agricultural-income"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Deductions Form */}
            <div className="space-y-6">
              <Card className="p-6 premium-glass-card premium-glass-card-hover transition-all duration-300">
                <h3 className="text-lg font-semibold text-readable mb-4 flex items-center">
                  <Percent className="mr-2 h-4 w-4 text-accent" />
                  Deductions (Old Regime Only)
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="section-80c">Section 80C (PPF, ELSS, etc.)</Label>
                    <Input
                      id="section-80c"
                      type="number"
                      inputMode="numeric"
                      placeholder="Max ₹1,50,000"
                      value={formData.section80C}
                      onChange={(e) => updateFormData('section80C', e.target.value)}
                      data-testid="input-section-80c"
                    />
                  </div>

                  <div>
                    <Label htmlFor="section-80d">Section 80D (Health Insurance)</Label>
                    <Input
                      id="section-80d"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 25000"
                      value={formData.section80D}
                      onChange={(e) => updateFormData('section80D', e.target.value)}
                      data-testid="input-section-80d"
                    />
                  </div>

                  <div>
                    <Label htmlFor="section-80e">Section 80E (Student Loan Interest)</Label>
                    <Input
                      id="section-80e"
                      type="number"
                      inputMode="numeric"
                      placeholder="No upper limit"
                      value={formData.section80E}
                      onChange={(e) => updateFormData('section80E', e.target.value)}
                      data-testid="input-section-80e"
                    />
                  </div>

                  <div>
                    <Label htmlFor="section-80tta">Section 80TTA (Savings Bank Interest, max ₹10,000)</Label>
                    <Input
                      id="section-80tta"
                      type="number"
                      inputMode="numeric"
                      placeholder="Max ₹10,000"
                      value={formData.section80TTA}
                      onChange={(e) => updateFormData('section80TTA', e.target.value)}
                      data-testid="input-section-80tta"
                    />
                  </div>

                  <div>
                    <Label htmlFor="section-80ccd1b">Section 80CCD(1B) – NPS (max ₹50,000)</Label>
                    <Input
                      id="section-80ccd1b"
                      type="number"
                      inputMode="numeric"
                      placeholder="Max ₹50,000"
                      value={formData.section80CCD1B}
                      onChange={(e) => updateFormData('section80CCD1B', e.target.value)}
                      data-testid="input-section-80ccd1b"
                    />
                  </div>

                  <div>
                    <Label htmlFor="section-80g">Section 80G (Donations)</Label>
                    <Input
                      id="section-80g"
                      type="number"
                      inputMode="numeric"
                      placeholder="Eligible donation amount"
                      value={formData.section80G}
                      onChange={(e) => updateFormData('section80G', e.target.value)}
                      data-testid="input-section-80g"
                    />
                  </div>

                  <div>
                    <Label htmlFor="home-loan-interest">Section 24(b) – Home Loan Interest (max ₹2,00,000)</Label>
                    <Input
                      id="home-loan-interest"
                      type="number"
                      inputMode="numeric"
                      placeholder="Max ₹2,00,000"
                      value={formData.homeLoanInterest}
                      onChange={(e) => updateFormData('homeLoanInterest', e.target.value)}
                      data-testid="input-home-loan-interest"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lta">LTA – Leave Travel Allowance (Old Regime)</Label>
                    <Input
                      id="lta"
                      type="number"
                      inputMode="numeric"
                      placeholder="Actual LTA claimed"
                      value={formData.lta}
                      onChange={(e) => updateFormData('lta', e.target.value)}
                      data-testid="input-lta"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="hra-received">
                        HRA Received
                        {hraFromCalculator && (
                          <span className="ml-2 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                            ✓ From HRA Calculator
                          </span>
                        )}
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowHRAModal(true)}
                        className="text-xs text-ink hover:text-credit font-medium underline underline-offset-2"
                      >
                        Calculate HRA →
                      </button>
                    </div>
                    <Input
                      id="hra-received"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 200000"
                      value={formData.hraReceived}
                      onChange={(e) => { updateFormData('hraReceived', e.target.value); setHraFromCalculator(false); }}
                      data-testid="input-hra-received"
                    />
                  </div>

                  {/* Rule 2A computes the HRA exemption on BASIC + DA, not gross
                      salary. Without this input the calculation fell back to gross
                      and over-exempted allowance-heavy packages substantially. */}
                  <div>
                    <Label htmlFor="basic-salary">Basic Salary + DA (annual)</Label>
                    <Input
                      id="basic-salary"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 600000"
                      value={formData.basicSalary}
                      onChange={(e) => updateFormData('basicSalary', e.target.value)}
                      data-testid="input-basic-salary"
                    />
                    <p className="text-xs text-ink/55 mt-1">
                      {parseFloat(formData.basicSalary) > 0
                        ? 'Used for the HRA exemption — the law computes it on basic + DA, not gross salary.'
                        : 'Needed for an accurate HRA exemption. Left blank, we fall back to gross salary, which overstates the exemption.'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="rent-paid">Annual Rent Paid</Label>
                    <Input
                      id="rent-paid"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 240000"
                      value={formData.rentPaid}
                      onChange={(e) => updateFormData('rentPaid', e.target.value)}
                      data-testid="input-rent-paid"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="metro-city"
                        checked={formData.isMetroCity}
                        onChange={(e) => updateFormData('isMetroCity', e.target.checked)}
                        data-testid="checkbox-metro-city"
                      />
                      <Label htmlFor="metro-city">Living in Metro City (HRA 50% rule)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      {formData.financialYear === '2026-27'
                        ? <><span className="font-semibold">8 metro cities from FY 2026-27 (Income Tax Rules 2026):</span> Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad, Pune, Ahmedabad</>
                        : <><span className="font-semibold">4 metro cities (FY {formData.financialYear}):</span> Delhi, Mumbai, Kolkata, Chennai only</>
                      }
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="other-deductions">Other Deductions</Label>
                    <Input
                      id="other-deductions"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g., 50000"
                      value={formData.otherDeductions}
                      onChange={(e) => updateFormData('otherDeductions', e.target.value)}
                      data-testid="input-other-deductions"
                    />
                  </div>
                </div>
              </Card>

              <div className="flex space-x-4">
                <Button 
                  onClick={calculateTax} 
                  className="flex-1"
                  disabled={isCalculating}
                  data-testid="button-calculate-tax"
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate Tax
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={resetCalculator}
                  data-testid="button-reset"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {isCalculating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingState 
                message="Comparing both tax regimes..." 
                type="calculation" 
                size="lg"
              />
            </div>
          ) : result && !user ? (
            // Everyone sees the headline figure they came for — the tax payable
            // under whichever regime is cheaper for them. Sign-in buys the
            // slab-by-slab working, the regime comparison and the PDF.
            // Previously this gated the entire result, and 82% of people who
            // signed up never completed a calculation.
            <ResultAuthGate
              toolName="Income Tax Calculator"
              headline={{
                label: `Your tax under the ${result.recommendedRegime === 'new' ? 'New' : 'Old'} Regime`,
                value: `₹${(result.recommendedRegime === 'new'
                  ? result.newRegime.totalTax
                  : result.oldRegime.totalTax
                ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                hint: result.savings > 0
                  ? `That's ₹${result.savings.toLocaleString('en-IN', { maximumFractionDigits: 0 })} less than the ${result.recommendedRegime === 'new' ? 'Old' : 'New'} Regime`
                  : undefined,
              }}
            />
          ) : result ? (
            <div className="space-y-6">
              {/* Recommendation Banner — DS Callout style */}
              <div className="rounded-2xl border overflow-hidden bg-card shadow-sm">
                <div className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  result.recommendedRegime === 'new'
                    ? 'bg-ink text-white'
                    : 'bg-green-600 text-white'
                }`}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-0.5">Recommended Regime</p>
                    <h3 className="text-xl font-bold">
                      {result.recommendedRegime === 'old' ? 'Old Regime' : 'New Regime'} saves you more
                    </h3>
                    <p className="text-sm opacity-90 mt-0.5">
                      You save ₹{result.savings.toLocaleString('en-IN')} vs the other regime
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => { if (user) { generatePDF(); } else { onGuestDownload?.(); } }}
                      disabled={isGeneratingPDF}
                      className="bg-card/20 hover:bg-card/30 text-white border-white/30 border"
                      variant="outline"
                      data-testid="button-download-pdf"
                    >
                      {isGeneratingPDF ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</> : <><Download className="mr-2 h-4 w-4" />Download PDF</>}
                    </Button>
                    {user && (
                      <Button
                        onClick={saveCalculation}
                        disabled={isSaving}
                        className="bg-card/20 hover:bg-card/30 text-white border-white/30 border"
                        variant="outline"
                        data-testid="button-save-calculation"
                      >
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save</>}
                      </Button>
                    )}
                  </div>
                </div>
                {result.savings > 0 && (
                  <div className="px-5 py-3 border-t border-rule">
                    <Callout tone="info">
                      Switch to the <strong>{result.recommendedRegime === 'old' ? 'Old' : 'New'} Regime</strong> when your employer asks for your regime declaration this April — you cannot change it mid-year for TDS purposes.
                    </Callout>
                  </div>
                )}
              </div>

              {/* Recommended ITR Form */}
              {(() => {
                const itr: ITRFormResult = recommendITRForm({
                  residentialStatus: formData.isNonResident ? 'nonResident' : 'resident',
                  totalIncome: result.oldRegime.grossIncome,
                  hasSalaryIncome: (parseFloat(formData.salaryIncome) || 0) > 0,
                  housePropertyCount: formData.hasMultipleHouseProperties ? 2 : ((parseFloat(formData.housePropertyIncome) || 0) > 0 ? 1 : 0),
                  hasBusinessIncome: (parseFloat(formData.businessIncome) || 0) > 0,
                  isPresumptiveScheme: formData.isPresumptiveScheme,
                  hasCapitalGains: (parseFloat(formData.capitalGainsIncome) || 0) > 0,
                  hasVDAIncome: formData.hasCryptoIncome,
                  hasOtherSources: (parseFloat(formData.otherIncome) || 0) > 0,
                  agriculturalIncome: parseFloat(formData.agriculturalIncome) || 0,
                  isDirectorInCompany: formData.isDirector,
                  hasForeignIncomeOrAssets: formData.hasForeignAssets,
                });
                return (
                  <Card className="p-5 premium-glass-card premium-glass-card-hover transition-all duration-300">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recommended ITR Form</p>
                        <h3 className="text-2xl font-bold text-ink">{itr.formLabel}</h3>
                      </div>
                      <Badge variant="secondary" className="mt-1">Based on income sources entered above</Badge>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {itr.reasons.map((r, i) => (
                        <p key={i} className="text-sm text-readable-light">{r}</p>
                      ))}
                    </div>
                    {itr.blockers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-rule">
                        <p className="text-xs font-semibold text-ink/55 mb-1.5">Why not the simpler form:</p>
                        <ul className="space-y-1">
                          {itr.blockers.map((b, i) => (
                            <li key={i} className="text-xs text-ink/55 flex items-start gap-1.5">
                              <span className="mt-1 w-1 h-1 rounded-full bg-ink/40 flex-shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {itr.warnings.length > 0 && (
                      <div className="mt-3">
                        <Callout tone="warning">
                          {itr.warnings.join(' ')}
                        </Callout>
                      </div>
                    )}
                  </Card>
                );
              })()}

              {/* Regime Comparison Bar Chart */}
              <Card className="p-5 premium-glass-card premium-glass-card-hover transition-all duration-300">
                <h3 className="text-sm font-semibold text-ink/80 mb-4">Tax Comparison — Old vs New Regime</h3>
                <RegimeChart
                  oldTax={result.oldRegime.totalTax}
                  newTax={result.newRegime.totalTax}
                  recommended={result.recommendedRegime}
                />
              </Card>

              {/* Side by Side Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Old Regime */}
                <Card className={`p-6 premium-glass-card transition-all duration-300 ${result.recommendedRegime === 'old' ? 'ring-2 ring-blue-600/50 border-blue-500/50 shadow-blue-500/5' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-readable">Old Tax Regime</h3>
                    {result.recommendedRegime === 'old' && (
                      <Badge variant="default">Recommended</Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-readable-light">Gross Income</span>
                      <span className="font-bold">{formatCurrency(result.oldRegime.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-readable-light">Total Deductions</span>
                      <span className="font-bold text-success">-{formatCurrency(result.oldRegime.totalDeductions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-readable-light">Taxable Income</span>
                      <span className="font-bold">{formatCurrency(result.oldRegime.taxableIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-readable-light">Income Tax</span>
                      <span className="font-bold">{formatCurrency(result.oldRegime.incomeTax)}</span>
                    </div>
                    {result.oldRegime.rebate87A > 0 && (
                      <div className="flex justify-between">
                        <span className="text-readable-light">
                          {formData.financialYear === "2026-27" ? "Rebate u/s 156" : "Rebate u/s 87A"}
                        </span>
                        <span className="font-bold text-success">-{formatCurrency(result.oldRegime.rebate87A)}</span>
                      </div>
                    )}
                    {result.oldRegime.marginalRelief > 0 && (
                      <div className="flex justify-between">
                        <span className="text-readable-light">Marginal Relief</span>
                        <span className="font-bold text-success">-{formatCurrency(result.oldRegime.marginalRelief)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-readable-light">Health & Education Cess (4%)</span>
                      <span className="font-bold">{formatCurrency(result.oldRegime.cess)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg">
                      <span className="font-bold text-ink">Total Tax</span>
                      <span className="font-bold text-ink">{formatCurrency(result.oldRegime.totalTax)}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="font-bold text-success">Take Home</span>
                      <span className="font-bold text-success">{formatCurrency(result.oldRegime.takeHome)}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-secondary rounded">
                    <div className="text-center">
                      <div className="text-sm text-readable-light">Effective Tax Rate</div>
                      <div className="text-xl font-bold text-primary">{`${result.oldRegime.effectiveRate.toFixed(1)}%`}</div>
                    </div>
                  </div>
                </Card>

                {/* New Regime */}
                <Card className={`p-6 premium-glass-card transition-all duration-300 ${result.recommendedRegime === 'new' ? 'ring-2 ring-blue-600/50 border-blue-500/50 shadow-blue-500/5' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-readable">New Tax Regime</h3>
                    {result.recommendedRegime === 'new' && (
                      <Badge variant="default">Recommended</Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-readable-light">Gross Income</span>
                      <span className="font-bold">{formatCurrency(result.newRegime.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-readable-light">Total Deductions</span>
                      <span className="font-bold text-success">-{formatCurrency(result.newRegime.totalDeductions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-readable-light">Taxable Income</span>
                      <span className="font-bold">{formatCurrency(result.newRegime.taxableIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-readable-light">Income Tax</span>
                      <span className="font-bold">{formatCurrency(result.newRegime.incomeTax)}</span>
                    </div>
                    {result.newRegime.rebate87A > 0 && (
                      <div className="flex justify-between">
                        <span className="text-readable-light">
                          {formData.financialYear === "2026-27" ? "Rebate u/s 156" : "Rebate u/s 87A"}
                        </span>
                        <span className="font-bold text-success">-{formatCurrency(result.newRegime.rebate87A)}</span>
                      </div>
                    )}
                    {result.newRegime.marginalRelief > 0 && (
                      <div className="flex justify-between bg-green-50 p-2 rounded">
                        <div>
                          <div className="text-readable-light font-medium">Marginal Relief</div>
                          <div className="text-xs text-green-600">Protection benefit for higher income</div>
                        </div>
                        <span className="font-bold text-success">-{formatCurrency(result.newRegime.marginalRelief)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-readable-light">Health & Education Cess (4%)</span>
                      <span className="font-bold">{formatCurrency(result.newRegime.cess)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg">
                      <span className="font-bold text-ink">Total Tax</span>
                      <span className="font-bold text-ink">{formatCurrency(result.newRegime.totalTax)}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="font-bold text-success">Take Home</span>
                      <span className="font-bold text-success">{formatCurrency(result.newRegime.takeHome)}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-secondary rounded">
                    <div className="text-center">
                      <div className="text-sm text-readable-light">Effective Tax Rate</div>
                      <div className="text-xl font-bold text-primary">{`${result.newRegime.effectiveRate.toFixed(1)}%`}</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <PieChart className="h-10 w-10 text-ink/35 mb-4" />
              <p className="text-readable-light">Complete the calculation to see detailed results</p>
            </div>
          )}

          {/* ── AI TAX ADVISOR PANEL ── */}
          {result && user && (
            <div className="mt-6">
              {aiLoading ? (
                <Card className="p-5 border-2 border-rule bg-gradient-to-r from-paper/70 to-paper/70 backdrop-blur-md shadow-sm transition-all duration-300">
                  <div className="flex items-center gap-3 text-ink">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span className="font-semibold">AI Tax Advisor is analysing your profile…</span>
                    <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                  </div>
                </Card>
              ) : aiAdvice && aiAdvice.tips?.length > 0 ? (
                <Card className="p-5 border-2 border-rule bg-gradient-to-br from-paper/70 to-paper/70 backdrop-blur-md shadow-sm transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-ink rounded-lg p-1.5">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-ink text-sm">AI Tax Advisor</h3>
                        <p className="text-ink text-xs">AI Powered • Personalised for you</p>
                      </div>
                    </div>
                    {aiAdvice.maxPossibleSaving > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-ink">Potential extra savings</div>
                        <div className="text-lg font-bold text-green-600">₹{aiAdvice.maxPossibleSaving.toLocaleString('en-IN')}</div>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-card/70 rounded-lg p-3 mb-4 border border-rule">
                    <p className="text-sm text-ink/80 italic">"{aiAdvice.summary}"</p>
                  </div>

                  {/* Savings score */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-ink mb-1">
                      <span>Tax Optimisation Score</span>
                      <span className="font-bold">{aiAdvice.savingsScore}/100</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${aiAdvice.savingsScore >= 80 ? 'bg-green-500' : aiAdvice.savingsScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${aiAdvice.savingsScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="space-y-3">
                    {aiAdvice.tips.map((tip, i) => (
                      <div key={i} className={`bg-card rounded-lg p-3 border ${tip.priority === 'high' ? 'border-red-200' : tip.priority === 'medium' ? 'border-amber-200' : 'border-rule'}`}>
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 shrink-0">
                            {tip.priority === 'high' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                             tip.priority === 'medium' ? <TrendingDown className="w-4 h-4 text-amber-500" /> :
                             <Info className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-ink">{tip.title}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {tip.section && (
                                  <span className="text-xs bg-secondary text-ink px-1.5 py-0.5 rounded font-medium">{tip.section}</span>
                                )}
                                {tip.potentialSaving && tip.potentialSaving > 0 && (
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Save ₹{tip.potentialSaving.toLocaleString('en-IN')}</span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-ink/65 mt-1 leading-relaxed">{tip.detail}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-ink mt-3 text-center">
                    💡 Complete your profile for more personalised AI recommendations
                  </p>
                </Card>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          {result && !user ? (
            // Everyone sees the headline figure they came for — the tax payable
            // under whichever regime is cheaper for them. Sign-in buys the
            // slab-by-slab working, the regime comparison and the PDF.
            // Previously this gated the entire result, and 82% of people who
            // signed up never completed a calculation.
            <ResultAuthGate
              toolName="Income Tax Calculator"
              headline={{
                label: `Your tax under the ${result.recommendedRegime === 'new' ? 'New' : 'Old'} Regime`,
                value: `₹${(result.recommendedRegime === 'new'
                  ? result.newRegime.totalTax
                  : result.oldRegime.totalTax
                ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                hint: result.savings > 0
                  ? `That's ₹${result.savings.toLocaleString('en-IN', { maximumFractionDigits: 0 })} less than the ${result.recommendedRegime === 'new' ? 'Old' : 'New'} Regime`
                  : undefined,
              }}
            />
          ) : result ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Old Regime Breakdown */}
              <Card className="p-6 premium-glass-card premium-glass-card-hover transition-all duration-300">
                <h3 className="text-lg font-semibold text-readable mb-4">Old Regime - Tax Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Slab</th>
                        <th className="text-right py-2">Rate</th>
                        <th className="text-right py-2">Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.oldRegime.taxBreakdown.map((slab, index) => (
                        <tr key={index} className="border-b border-rule">
                          <td className="py-2 text-sm">{slab.slab}</td>
                          <td className="py-2 text-right">{`${slab.rate}%`}</td>
                          <td className="py-2 text-right">{formatCurrency(slab.tax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* New Regime Breakdown */}
              <Card className="p-6 premium-glass-card premium-glass-card-hover transition-all duration-300">
                <h3 className="text-lg font-semibold text-readable mb-4">New Regime - Tax Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Slab</th>
                        <th className="text-right py-2">Rate</th>
                        <th className="text-right py-2">Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.newRegime.taxBreakdown.map((slab, index) => (
                        <tr key={index} className="border-b border-rule">
                          <td className="py-2 text-sm">{slab.slab}</td>
                          <td className="py-2 text-right">{`${slab.rate}%`}</td>
                          <td className="py-2 text-right">{formatCurrency(slab.tax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-10 w-10 text-ink/35 mb-4" />
              <p className="text-readable-light">Complete the calculation to see tax breakdown</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
  );

  // If onClose is provided, wrap in Modal (for use in homepage modals)
  // Otherwise, render standalone (for dedicated calculator pages)
  return (
    <>
      {showHRAModal && (
        <HRACalculatorModal
          onClose={() => setShowHRAModal(false)}
          onApplyHRA={(hraAmount: number) => {
            updateFormData('hraReceived', String(hraAmount));
            setHraFromCalculator(true);
            setShowHRAModal(false);
          }}
        />
      )}
      {onClose ? (
        <Modal isOpen={true} onClose={onClose} title="🤖 AI Income Tax Calculator FY 2025-26 / AY 2026-27" size="6xl">
          {calculatorContent}
        </Modal>
      ) : (
        calculatorContent
      )}
    </>
  );
}

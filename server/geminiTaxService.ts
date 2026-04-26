import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export interface TaxAdviceInput {
  // User profile
  occupation?: string;
  ageGroup?: string;
  // Income breakdown
  salaryIncome: number;
  housePropertyIncome: number;
  businessIncome: number;
  capitalGainsIncome: number;
  otherIncome: number;
  totalIncome: number;
  // Deductions declared
  section80C: number;
  section80D: number;
  hraReceived: number;
  rentPaid: number;
  isMetroCity: boolean;
  otherDeductions: number;
  // Regime results
  oldRegimeTax: number;
  newRegimeTax: number;
  recommendedRegime: string;
  taxSavings: number;
  financialYear: string;
}

export interface TaxAdviceResult {
  tips: Array<{
    title: string;
    detail: string;
    potentialSaving?: number;
    section?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  savingsScore: number;         // 0–100: how optimised their tax is
  maxPossibleSaving: number;    // ₹ they're leaving on the table
  summary: string;              // 1-line AI summary
}

export interface DashboardInsightInput {
  occupation?: string;
  totalIncome?: number;
  lastTaxPaid?: number;
  financialYear?: string;
  section80C?: number;
  section80D?: number;
}

// ─────────────────────────────────────────────────────────
// FALLBACK: rule-based tips when Gemini is unavailable
// ─────────────────────────────────────────────────────────
function buildFallbackTips(input: TaxAdviceInput): TaxAdviceResult {
  const tips: TaxAdviceResult['tips'] = [];
  let maxSaving = 0;

  const income = input.totalIncome;
  const tax30pct = income > 1500000;
  const tax20pct = income > 1000000;
  const slab = tax30pct ? 0.30 : tax20pct ? 0.20 : 0.05;

  // 80C gap
  const max80C = 150000;
  const gap80C = max80C - Math.min(input.section80C, max80C);
  if (gap80C > 0 && input.recommendedRegime === 'old') {
    const saving = Math.round(gap80C * slab);
    maxSaving += saving;
    tips.push({
      title: `Invest ₹${(gap80C / 1000).toFixed(0)}K more under Section 80C`,
      detail: `You've claimed ₹${(input.section80C / 1000).toFixed(0)}K of the ₹1.5L limit. Top up via ELSS, PPF, EPF, or LIC to save up to ₹${saving.toLocaleString('en-IN')} more in tax.`,
      potentialSaving: saving,
      section: '80C',
      priority: gap80C > 50000 ? 'high' : 'medium'
    });
  }

  // 80D health insurance
  const max80D = input.ageGroup === 'senior' ? 50000 : 25000;
  const gap80D = max80D - Math.min(input.section80D, max80D);
  if (gap80D > 0) {
    const saving = Math.round(gap80D * slab);
    maxSaving += saving;
    tips.push({
      title: `Claim health insurance premium under Section 80D`,
      detail: `You can deduct up to ₹${max80D.toLocaleString('en-IN')} for health insurance (self + family). Including parents adds another ₹25,000–₹50,000 deduction.`,
      potentialSaving: saving,
      section: '80D',
      priority: input.section80D === 0 ? 'high' : 'medium'
    });
  }

  // NPS 80CCD(1B) – only old regime
  if (input.recommendedRegime === 'old' && income > 500000) {
    const npsSaving = Math.round(50000 * slab);
    maxSaving += npsSaving;
    tips.push({
      title: `NPS Section 80CCD(1B): Extra ₹50,000 deduction`,
      detail: `Beyond the 80C limit, NPS Tier-I contributions up to ₹50,000 are deductible. At your slab this saves ₹${npsSaving.toLocaleString('en-IN')} in tax — over and above 80C.`,
      potentialSaving: npsSaving,
      section: '80CCD(1B)',
      priority: 'high'
    });
  }

  // HRA – if salaried but not claiming
  if (input.salaryIncome > 0 && input.hraReceived === 0 && input.rentPaid === 0) {
    tips.push({
      title: `Claiming HRA? Ensure your employer splits salary`,
      detail: `If you live in rented accommodation, HRA exemption under Section 10(13A) can be significant — up to 50% of basic salary in metro cities. Ensure your CTC structure includes HRA.`,
      section: 'HRA',
      priority: 'medium'
    });
  }

  // Regime mismatch warning
  if (input.recommendedRegime === 'new' && input.section80C > 100000) {
    tips.push({
      title: `New Regime ignores your 80C investments`,
      detail: `You've invested ₹${(input.section80C / 1000).toFixed(0)}K in 80C instruments, but the New Regime (which is better for you overall) doesn't allow these deductions. You may want to redirect future 80C investments to liquid alternatives.`,
      priority: 'medium'
    });
  }

  // NRI-specific
  if (input.occupation === 'nri') {
    tips.push({
      title: `DTAA relief may reduce your withholding tax`,
      detail: `As an NRI, India–country-of-residence DTAA treaties can reduce TDS on NRO interest and dividends. Use our DTAA Calculator to check your relief amount.`,
      section: 'DTAA',
      priority: 'high'
    });
  }

  // Home loan 24(b)
  if (input.housePropertyIncome < 0) {
    tips.push({
      title: `Home loan interest: maximise Section 24(b)`,
      detail: `You can deduct up to ₹2,00,000 per year on home loan interest for a self-occupied property under Section 24(b). Ensure you're claiming the full deduction.`,
      section: '24(b)',
      priority: 'medium'
    });
  }

  const maxPossible80C = Math.round((150000 - Math.min(input.section80C, 150000)) * slab);
  const score = Math.max(0, Math.min(100, Math.round(100 - (maxSaving / (income * 0.05 + 1)) * 100)));

  return {
    tips: tips.slice(0, 5),
    savingsScore: score,
    maxPossibleSaving: maxSaving,
    summary: maxSaving > 0
      ? `You could save up to ₹${maxSaving.toLocaleString('en-IN')} more in tax with the right investments and deductions.`
      : `Your tax is well-optimised for your income profile. Keep maintaining your current investments.`
  };
}

// ─────────────────────────────────────────────────────────
// GEMINI: AI-powered tax advice
// ─────────────────────────────────────────────────────────
export class GeminiTaxService {

  async getTaxAdvice(input: TaxAdviceInput): Promise<TaxAdviceResult> {
    if (!process.env.GOOGLE_API_KEY) {
      return buildFallbackTips(input);
    }

    const occupationLabel: Record<string, string> = {
      salaried: 'Salaried Employee',
      business: 'Business Owner / Self-Employed',
      ca: 'Chartered Accountant / Professional',
      nri: 'NRI (Non-Resident Indian)',
      student: 'Student',
      retired: 'Retired',
    };

    const prompt = `You are an expert Indian Chartered Accountant providing personalised income tax advice for FY ${input.financialYear}.

USER PROFILE:
- Occupation: ${occupationLabel[input.occupation || ''] || 'Not specified'}
- Age Group: ${input.ageGroup || 'below60'}

INCOME BREAKDOWN (₹):
- Salary Income: ${input.salaryIncome.toLocaleString('en-IN')}
- House Property Income: ${input.housePropertyIncome.toLocaleString('en-IN')}
- Business/Freelance Income: ${input.businessIncome.toLocaleString('en-IN')}
- Capital Gains: ${input.capitalGainsIncome.toLocaleString('en-IN')}
- Other Income: ${input.otherIncome.toLocaleString('en-IN')}
- TOTAL INCOME: ₹${input.totalIncome.toLocaleString('en-IN')}

DEDUCTIONS CURRENTLY CLAIMED (₹):
- Section 80C: ${input.section80C.toLocaleString('en-IN')} (max ₹1,50,000)
- Section 80D (health insurance): ${input.section80D.toLocaleString('en-IN')}
- HRA Received: ${input.hraReceived.toLocaleString('en-IN')}
- Rent Paid: ${input.rentPaid.toLocaleString('en-IN')}
- Other Deductions: ${input.otherDeductions.toLocaleString('en-IN')}

TAX CALCULATION RESULT:
- Old Regime Tax: ₹${input.oldRegimeTax.toLocaleString('en-IN')}
- New Regime Tax: ₹${input.newRegimeTax.toLocaleString('en-IN')}
- Recommended Regime: ${input.recommendedRegime.toUpperCase()}
- Savings from choosing recommended regime: ₹${input.taxSavings.toLocaleString('en-IN')}

TASK: Provide exactly 3–5 specific, actionable tax-saving tips for THIS user based on their actual numbers. Focus on:
1. Deduction gaps they are missing (with exact ₹ amounts they can still claim)
2. Investment suggestions relevant to their occupation
3. Any regime switching advice based on their specific deduction profile
4. Any occupation-specific tips (NRI DTAA, professional 44ADA, etc.)

For each tip, estimate the POTENTIAL TAX SAVING in ₹.

RESPONSE FORMAT (strict JSON only, no markdown):
{
  "tips": [
    {
      "title": "Short action-oriented title (max 10 words)",
      "detail": "2-3 sentence explanation with specific ₹ amounts",
      "potentialSaving": 15000,
      "section": "80C",
      "priority": "high"
    }
  ],
  "savingsScore": 65,
  "maxPossibleSaving": 45000,
  "summary": "One sentence summary of their tax situation and biggest opportunity"
}

Rules: priority must be "high", "medium", or "low". savingsScore is 0-100 (100 = fully optimised). Return ONLY the JSON object.`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
        }
      });

      const text = result.text?.trim() || '';
      // Strip markdown code blocks if present
      const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(jsonStr) as TaxAdviceResult;

      // Validate structure
      if (!parsed.tips || !Array.isArray(parsed.tips)) throw new Error('Invalid response');
      return parsed;
    } catch (error) {
      console.error('[GeminiTaxService] Error, using fallback:', error);
      return buildFallbackTips(input);
    }
  }

  async getDashboardInsights(input: DashboardInsightInput): Promise<string[]> {
    if (!process.env.GOOGLE_API_KEY || !input.totalIncome) {
      return this.fallbackDashboardInsights(input);
    }

    // Whitelist occupation values before interpolating into the prompt —
    // otherwise a crafted string becomes a prompt-injection vector.
    const OCCUPATIONS: Record<string, string> = {
      salaried: 'Salaried Employee',
      business: 'Business Owner / Self-Employed',
      ca: 'Chartered Accountant / Professional',
      nri: 'NRI (Non-Resident Indian)',
      student: 'Student',
      retired: 'Retired',
    };
    const occupationKey = (input.occupation || '').toLowerCase();
    const safeOccupation = OCCUPATIONS[occupationKey] || 'Not specified';
    // Clamp FY to a safe, expected pattern before interpolating.
    const safeFy = /^\d{4}-\d{2}$/.test(input.financialYear || '')
      ? input.financialYear
      : '2025-26';

    const prompt = `You are a friendly Indian tax advisor. Give 3 short, specific insights (1 sentence each) for this user's tax dashboard:
- Occupation: ${safeOccupation}
- Annual Income: ₹${(input.totalIncome || 0).toLocaleString('en-IN')}
- Tax Paid: ₹${(input.lastTaxPaid || 0).toLocaleString('en-IN')}
- 80C Invested: ₹${(input.section80C || 0).toLocaleString('en-IN')}
- Financial Year: ${safeFy}

Return ONLY a JSON array of 3 strings. Each string is one insight. No markdown.
Example: ["Insight 1", "Insight 2", "Insight 3"]`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { temperature: 0.4, responseMimeType: "application/json" }
      });
      const text = result.text?.trim() || '[]';
      const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(jsonStr) as string[];
    } catch {
      return this.fallbackDashboardInsights(input);
    }
  }

  private fallbackDashboardInsights(input: DashboardInsightInput): string[] {
    const insights: string[] = [];
    const income = input.totalIncome || 0;

    if ((input.section80C || 0) < 150000) {
      insights.push(`Top up your 80C investments — you still have ₹${(150000 - (input.section80C || 0)).toLocaleString('en-IN')} of deduction limit remaining this year.`);
    }
    if (income > 1200000) {
      insights.push(`At your income level, advance tax instalments are due — missed payments attract 1% monthly interest under Section 234B/C.`);
    }
    insights.push(`ITR filing deadline for FY ${input.financialYear || '2025-26'} is 31st July 2026. File early to avoid last-minute errors.`);
    return insights.slice(0, 3);
  }
}

export const geminiTaxService = new GeminiTaxService();

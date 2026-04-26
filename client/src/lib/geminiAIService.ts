/**
 * Client-side Gemini AI service using Firebase AI Logic
 * Uses firebase/ai (GoogleAIBackend) — calls go through Firebase's
 * infrastructure, no API key exposed in browser.
 *
 * Falls back to server-side /api/ai/tax-advice if Firebase AI isn't configured.
 */
import { getGeminiModel } from "@/lib/firebase";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror server-side geminiTaxService.ts)
// ─────────────────────────────────────────────────────────────────────────────
export interface TaxAdviceInput {
  occupation?: string;
  ageGroup?: string;
  salaryIncome: number;
  housePropertyIncome: number;
  businessIncome: number;
  capitalGainsIncome: number;
  otherIncome: number;
  totalIncome: number;
  section80C: number;
  section80D: number;
  section80E?: number;
  section80TTA?: number;
  section80CCD1B?: number;
  section80G?: number;
  homeLoanInterest?: number;
  lta?: number;
  hraReceived: number;
  rentPaid: number;
  isMetroCity: boolean;
  otherDeductions: number;
  oldRegimeTax: number;
  newRegimeTax: number;
  recommendedRegime: string;
  taxSavings: number;
  financialYear: string;
}

export interface TaxAdviceTip {
  title: string;
  detail: string;
  potentialSaving?: number;
  section?: string;
  priority: "high" | "medium" | "low";
}

export interface TaxAdviceResult {
  tips: TaxAdviceTip[];
  savingsScore: number;
  maxPossibleSaving: number;
  summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback: rule-based tips when Gemini is unavailable
// ─────────────────────────────────────────────────────────────────────────────
function buildFallbackTips(input: TaxAdviceInput): TaxAdviceResult {
  const tips: TaxAdviceTip[] = [];
  let maxSaving = 0;

  const income = input.totalIncome;
  const slab = income > 1_500_000 ? 0.3 : income > 1_000_000 ? 0.2 : 0.05;

  // 80C gap
  const gap80C = 150_000 - Math.min(input.section80C, 150_000);
  if (gap80C > 0 && input.recommendedRegime === "old") {
    const saving = Math.round(gap80C * slab);
    maxSaving += saving;
    tips.push({
      title: `Invest ₹${(gap80C / 1000).toFixed(0)}K more under Section 80C`,
      detail: `You've used ₹${(input.section80C / 1000).toFixed(0)}K of the ₹1.5L limit. Top up via ELSS, PPF, EPF, or LIC to save ₹${saving.toLocaleString("en-IN")} more in tax.`,
      potentialSaving: saving,
      section: "80C",
      priority: gap80C > 50_000 ? "high" : "medium",
    });
  }

  // 80D
  const max80D = input.ageGroup === "senior" ? 50_000 : 25_000;
  const gap80D = max80D - Math.min(input.section80D, max80D);
  if (gap80D > 0) {
    const saving = Math.round(gap80D * slab);
    maxSaving += saving;
    tips.push({
      title: "Claim health insurance premium under Section 80D",
      detail: `Deduct up to ₹${max80D.toLocaleString("en-IN")} for health insurance. Including parents adds another ₹25,000–₹50,000 deduction.`,
      potentialSaving: saving,
      section: "80D",
      priority: input.section80D === 0 ? "high" : "medium",
    });
  }

  // NPS 80CCD(1B)
  if (input.recommendedRegime === "old" && income > 500_000) {
    const saving = Math.round(50_000 * slab);
    maxSaving += saving;
    tips.push({
      title: "NPS Section 80CCD(1B): Extra ₹50,000 deduction",
      detail: `Beyond 80C, NPS Tier-I contributions up to ₹50,000 are deductible. At your slab this saves ₹${saving.toLocaleString("en-IN")} — on top of 80C.`,
      potentialSaving: saving,
      section: "80CCD(1B)",
      priority: "high",
    });
  }

  // HRA not claimed
  if (input.salaryIncome > 0 && input.hraReceived === 0 && input.rentPaid === 0) {
    tips.push({
      title: "Not claiming HRA? Ensure your salary structure includes it",
      detail: "If you live in rented accommodation, HRA exemption under Section 10(13A) can be up to 50% of basic salary in metro cities.",
      section: "HRA",
      priority: "medium",
    });
  }

  // Regime mismatch
  if (input.recommendedRegime === "new" && input.section80C > 100_000) {
    tips.push({
      title: "New Regime ignores your 80C investments",
      detail: `You've invested ₹${(input.section80C / 1000).toFixed(0)}K in 80C instruments, but the New Regime (better overall for you) ignores these. Consider redirecting future 80C to liquid alternatives.`,
      priority: "medium",
    });
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - (maxSaving / (income * 0.05 + 1)) * 100)));
  return {
    tips: tips.slice(0, 5),
    savingsScore: score,
    maxPossibleSaving: maxSaving,
    summary:
      maxSaving > 0
        ? `You could save up to ₹${maxSaving.toLocaleString("en-IN")} more with the right investments and deductions.`
        : "Your tax is well-optimised for your income profile.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Gemini prompt
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt(input: TaxAdviceInput): string {
  const occupationLabel: Record<string, string> = {
    salaried: "Salaried Employee",
    business: "Business Owner / Self-Employed",
    ca: "Chartered Accountant / Professional",
    nri: "NRI (Non-Resident Indian)",
    student: "Student",
    retired: "Retired",
  };

  return `You are an expert Indian Chartered Accountant providing personalised income tax advice for FY ${input.financialYear}.

USER PROFILE:
- Occupation: ${occupationLabel[input.occupation || ""] || "Not specified"}
- Age Group: ${input.ageGroup || "below60"}

INCOME BREAKDOWN (₹):
- Salary: ${input.salaryIncome.toLocaleString("en-IN")}
- House Property: ${input.housePropertyIncome.toLocaleString("en-IN")}
- Business/Freelance: ${input.businessIncome.toLocaleString("en-IN")}
- Capital Gains: ${input.capitalGainsIncome.toLocaleString("en-IN")}
- Other: ${input.otherIncome.toLocaleString("en-IN")}
- TOTAL: ₹${input.totalIncome.toLocaleString("en-IN")}

DEDUCTIONS CLAIMED (₹):
- 80C: ${input.section80C.toLocaleString("en-IN")} / 1,50,000
- 80D: ${input.section80D.toLocaleString("en-IN")}
- HRA Received: ${input.hraReceived.toLocaleString("en-IN")}
- Rent Paid: ${input.rentPaid.toLocaleString("en-IN")}
- Other: ${input.otherDeductions.toLocaleString("en-IN")}

TAX RESULT:
- Old Regime Tax: ₹${input.oldRegimeTax.toLocaleString("en-IN")}
- New Regime Tax: ₹${input.newRegimeTax.toLocaleString("en-IN")}
- Recommended: ${input.recommendedRegime.toUpperCase()} (saves ₹${input.taxSavings.toLocaleString("en-IN")})

Give 3–5 specific, actionable tax-saving tips for THIS user based on their actual numbers. Focus on deduction gaps, investment suggestions, regime advice, and occupation-specific tips. Estimate potential tax saving in ₹ for each tip.

Return ONLY valid JSON, no markdown:
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
  "summary": "One sentence summary of biggest opportunity"
}

Rules: priority = "high" | "medium" | "low". savingsScore = 0–100 (100 = fully optimised).`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export: tries Firebase AI Logic first, falls back to server endpoint
// ─────────────────────────────────────────────────────────────────────────────
export async function getClientTaxAdvice(input: TaxAdviceInput): Promise<TaxAdviceResult> {
  // 1. Try Firebase AI Logic (client-side Gemini)
  const model = getGeminiModel();
  if (model) {
    try {
      const result = await model.generateContent(buildPrompt(input));
      const text = result.response.text().trim();
      const jsonStr = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(jsonStr) as TaxAdviceResult;
      if (parsed.tips && Array.isArray(parsed.tips)) return parsed;
    } catch (e) {
      console.warn("[GeminiAI] Client-side call failed, trying server fallback:", e);
    }
  }

  // 2. Fall back to server-side endpoint
  try {
    const res = await fetch("/api/ai/tax-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) return (await res.json()) as TaxAdviceResult;
  } catch (e) {
    console.warn("[GeminiAI] Server fallback also failed:", e);
  }

  // 3. Local rule-based fallback
  return buildFallbackTips(input);
}

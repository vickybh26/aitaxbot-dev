/**
 * Maps WizardState + WizardTaxSummary into the payload shapes the two
 * result-time features from the old TaxCalculator.tsx need:
 *   - POST /api/tax-computation/generate-pdf (see server/pdfGenerator.ts's
 *     RegimePDFData / TaxComputationData for the exact shape expected)
 *   - getClientTaxAdvice() (see client/src/lib/geminiAIService.ts's
 *     TaxAdviceInput)
 *
 * Deliberately reads every figure off RegimeSummary (as returned by
 * computeRegimeSummary in ./model.ts) rather than re-deriving income/
 * deduction figures from WizardState fields a second time here. That
 * exact pattern — a second, slightly different copy of a computation
 * living next to the real one — is called out as a specific, real risk in
 * this repo's own house style (see the "code" persona notes on duplicated
 * home-loan-interest logic), not a hypothetical one: TaxCalculator.tsx's
 * own generatePDF() had this bug (screen exempted a different HRA figure
 * than the PDF, on the same inputs) until it was fixed to read from the
 * engine instead. RegimeSummary already carries every figure below, so
 * there is nothing left to re-derive.
 *
 * Browser and PDF generator share a data-only contract in shared/taxComputation.ts.
 * This catches payload drift without importing Node-only PDF dependencies.
 */
import type { RegimePDFData, TaxComputationPayload } from "@shared/taxComputation";
import type { TaxAdviceInput } from "@/lib/geminiAIService";
import { getActiveWizardState, toAmount, type RegimeSummary, type WizardState, type WizardTaxSummary } from "./model";

const FY_TO_AY: Record<string, string> = {
  "2024-25": "2025-26",
  "2025-26": "2026-27",
  "2026-27": "2027-28",
};

function regimePDFData(state: WizardState, summary: RegimeSummary): RegimePDFData {
  const isOld = summary.regime === "old";
  const otherIncomeTotal =
    summary.businessIncome +
    summary.debtFundGains +
    toAmount(state.otherSources.savingsInterest) +
    toAmount(state.otherSources.depositInterest) +
    toAmount(state.otherSources.otherInterest);

  return {
    grossSalary: summary.grossSalary,
    hraReceived: isOld ? toAmount(state.salary.hraReceived) || undefined : undefined,
    hraExemption: isOld ? summary.hraExemption || undefined : undefined,
    ltaReceived: isOld ? toAmount(state.salary.lta) || undefined : undefined,
    ltaExemption: isOld ? summary.ltaExemption || undefined : undefined,
    standardDeduction: summary.standardDeduction,
    professionalTax: isOld ? summary.professionalTaxDeduction || undefined : undefined,
    netSalary: Math.max(
      0,
      summary.grossSalary - summary.hraExemption - summary.ltaExemption - summary.professionalTaxDeduction - summary.standardDeduction
    ),
    rentalIncome: summary.housePropertyIncomeForSlab || undefined,
    housePropertyLossNotSetOff: Math.max(0, summary.housePropertyIncomeForSlab - summary.housePropertyIncome) || undefined,
    capitalGainsLTCG: summary.ltcgEquity || undefined,
    capitalGainsSTC: summary.stcgEquity || undefined,
    dividendIncome: toAmount(state.otherSources.dividendIncome) || undefined,
    otherIncome: otherIncomeTotal || undefined,
    grossTotalIncome: summary.grossTotalIncome,
    sec80C: isOld ? summary.deductionsBreakdown.section80C || undefined : undefined,
    sec80D: isOld ? summary.deductionsBreakdown.section80D || undefined : undefined,
    sec80E: isOld ? summary.deductionsBreakdown.section80E || undefined : undefined,
    sec80TTA: isOld ? summary.deductionsBreakdown.section80TTAorTTB || undefined : undefined,
    sec80CCD1B: isOld ? summary.deductionsBreakdown.section80CCD1B || undefined : undefined,
    sec80G: isOld ? summary.deductionsBreakdown.section80G || undefined : undefined,
    // Reads the engine's own figure (self-occupied capped + let-out
    // uncapped) rather than re-deriving self-occupied-only here, which
    // previously made let-out interest vanish from the PDF entirely.
    homeLoanInterest: summary.homeLoanInterestClaimed || undefined,
    totalChapterVIA: summary.chapterVIADeductions,
    taxableIncome: summary.taxableIncome,
    incomeTax: summary.liability.incomeTax,
    specialRateTax: summary.liability.specialRateTax,
    marginalRelief: summary.liability.marginalRelief,
    rebate87A: summary.liability.rebate,
    taxAfterRebate: Math.max(0, summary.liability.incomeTax - summary.liability.rebate - summary.liability.marginalRelief + summary.liability.specialRateTax),
    surcharge: summary.liability.surcharge,
    cess: summary.liability.cess,
    totalTax: summary.liability.totalTax,
    monthlyTDS: Math.round(summary.liability.totalTax / 12),
  };
}

/** Builds the payload for POST /api/tax-computation/generate-pdf. */
export function buildTaxComputationData(state: WizardState, wizardSummary: WizardTaxSummary, displayName: string): TaxComputationPayload {
  state = getActiveWizardState(state);
  const assessmentYear = FY_TO_AY[state.financialYear] || "2027-28";
  const recommended = wizardSummary[wizardSummary.recommendedRegime];

  return {
    personalInfo: {
      name: displayName || state.basicDetails.name || "Taxpayer",
      status: "Individual",
      ageGroup: state.ageGroup,
      residencyStatus: state.isNonResident ? "Non-Resident" : "Resident",
    },
    assessmentYear,
    financialYear: state.financialYear,
    oldRegimeData: regimePDFData(state, wizardSummary.old),
    newRegimeData: regimePDFData(state, wizardSummary.new),
    recommendedRegime: wizardSummary.recommendedRegime,
    savings: Math.abs(wizardSummary.old.liability.totalTax - wizardSummary.new.liability.totalTax),
    // Legacy fallback fields — generateTaxComputationPDF requires taxBreakdown
    // even when the detailed oldRegimeData/newRegimeData above is present.
    regime: wizardSummary.recommendedRegime,
    taxBreakdown: {
      taxableIncome: recommended.taxableIncome,
      taxOnIncome: recommended.liability.incomeTax,
      surcharge: recommended.liability.surcharge,
      cess: recommended.liability.cess,
      totalTax: recommended.liability.totalTax,
    },
  };
}

/** Builds the input for getClientTaxAdvice() (client/src/lib/geminiAIService.ts). */
export function buildTaxAdviceInput(state: WizardState, wizardSummary: WizardTaxSummary): TaxAdviceInput {
  state = getActiveWizardState(state);
  const old = wizardSummary.old;
  const savings = Math.abs(old.liability.totalTax - wizardSummary.new.liability.totalTax);

  return {
    ageGroup: state.ageGroup,
    isNonResident: state.isNonResident,
    agriculturalIncome: toAmount(state.agriculturalIncome),
    salaryIncome: old.grossSalary,
    housePropertyIncome: old.housePropertyIncome,
    businessIncome: old.businessIncome,
    capitalGainsIncome: old.ltcgEquity + old.stcgEquity + old.debtFundGains,
    otherIncome: old.otherSourcesIncome,
    totalIncome: old.grossTotalIncome,
    section80C: old.deductionsBreakdown.section80C,
    section80D: old.deductionsBreakdown.section80D,
    section80E: old.deductionsBreakdown.section80E,
    section80TTA: old.deductionsBreakdown.section80TTAorTTB,
    section80CCD1B: old.deductionsBreakdown.section80CCD1B,
    section80G: old.deductionsBreakdown.section80G,
    homeLoanInterest: old.homeLoanInterestClaimed,
    lta: toAmount(state.salary.lta),
    hraReceived: toAmount(state.salary.hraReceived),
    rentPaid: toAmount(state.salary.rentPaid),
    isMetroCity: state.salary.isMetroCity,
    otherDeductions: 0,
    oldRegimeTax: wizardSummary.old.liability.totalTax,
    newRegimeTax: wizardSummary.new.liability.totalTax,
    recommendedRegime: wizardSummary.recommendedRegime,
    taxSavings: savings,
    financialYear: state.financialYear,
  };
}

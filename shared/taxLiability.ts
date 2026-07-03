/**
 * shared/taxLiability.ts
 *
 * Pure tax-liability computation ported from the live Income Tax Calculator
 * (client/src/components/calculators/TaxCalculator.tsx — getTaxSlabs,
 * calculateTaxForSlab, and the rebate/marginal-relief/cess block inside
 * calculateSingleRegime). Kept in shared/ so both the client calculator and
 * the server-side AIS/26AS/Form16 reconciliation tool compute tax the same
 * way — two calculators silently disagreeing on the same income would be a
 * worse bug than either being imperfect alone.
 *
 * NOTE: There is a separate, older Firestore-backed tax-rates system
 * (server/seedTaxRates.ts + storage.getTaxRates) that stores slabs per
 * assessment year. It disagrees with this file for AY 2026-27 (its rebate
 * limit is stuck at the pre-Budget-2025 ₹7L/₹25,000, not the current
 * ₹12L/₹60,000 rebate) — it looks like a one-time seed that was never
 * updated after the Budget 2025 change. Deliberately NOT used here for that
 * reason; flagged separately for cleanup.
 */

export type TaxRegime = "old" | "new";
export type AgeGroup = "below60" | "60to80" | "above80";

export interface TaxSlabDef {
  min: number;
  max: number; // Infinity for the top slab
  rate: number; // percent
}

export interface SlabBreakdownRow {
  slab: string;
  income: number;
  rate: number;
  tax: number;
}

export interface TaxLiabilityResult {
  taxableIncome: number;
  incomeTax: number; // slab tax before rebate/relief/cess
  rebate: number;
  marginalRelief: number;
  marginalReliefApplied: boolean;
  cess: number;
  totalTax: number; // final tax payable (incomeTax - rebate - marginalRelief + cess)
  breakdown: SlabBreakdownRow[];
}

// ─── Slab tables (must stay in sync with TaxCalculator.tsx) ─────────────────

export function getTaxSlabs(regime: TaxRegime, financialYear: string, ageGroup: AgeGroup = "below60"): TaxSlabDef[] {
  if (regime === "new") {
    if (financialYear === "2025-26" || financialYear === "2026-27") {
      // New Regime FY 2025-26 & FY 2026-27 (Income Tax Act, 2025 - Section 202)
      return [
        { min: 0, max: 400000, rate: 0 },
        { min: 400000, max: 800000, rate: 5 },
        { min: 800000, max: 1200000, rate: 10 },
        { min: 1200000, max: 1600000, rate: 15 },
        { min: 1600000, max: 2000000, rate: 20 },
        { min: 2000000, max: 2400000, rate: 25 },
        { min: 2400000, max: Infinity, rate: 30 },
      ];
    }
    return [
      { min: 0, max: 300000, rate: 0 },
      { min: 300000, max: 600000, rate: 5 },
      { min: 600000, max: 900000, rate: 10 },
      { min: 900000, max: 1200000, rate: 15 },
      { min: 1200000, max: 1500000, rate: 20 },
      { min: 1500000, max: Infinity, rate: 30 },
    ];
  }

  // Old Regime — age-based slabs
  if (ageGroup === "below60") {
    return [
      { min: 0, max: 250000, rate: 0 },
      { min: 250000, max: 500000, rate: 5 },
      { min: 500000, max: 1000000, rate: 20 },
      { min: 1000000, max: Infinity, rate: 30 },
    ];
  }
  if (ageGroup === "60to80") {
    return [
      { min: 0, max: 300000, rate: 0 },
      { min: 300000, max: 500000, rate: 5 },
      { min: 500000, max: 1000000, rate: 20 },
      { min: 1000000, max: Infinity, rate: 30 },
    ];
  }
  // above80
  return [
    { min: 0, max: 500000, rate: 0 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 },
  ];
}

export function calculateTaxForSlab(income: number, slabs: TaxSlabDef[]): { totalTax: number; breakdown: SlabBreakdownRow[] } {
  let totalTax = 0;
  const breakdown: SlabBreakdownRow[] = [];

  for (const slab of slabs) {
    if (income > slab.min) {
      const taxableInThisSlab = Math.min(income, slab.max) - slab.min;
      const taxForThisSlab = (taxableInThisSlab * slab.rate) / 100;
      totalTax += taxForThisSlab;
      if (taxableInThisSlab > 0) {
        breakdown.push({
          slab: slab.max === Infinity
            ? `Above ₹${slab.min.toLocaleString("en-IN")}`
            : `₹${slab.min.toLocaleString("en-IN")} - ₹${slab.max.toLocaleString("en-IN")}`,
          income: taxableInThisSlab,
          rate: slab.rate,
          tax: taxForThisSlab,
        });
      }
    }
  }

  return { totalTax, breakdown };
}

/**
 * Compute final tax payable on a given taxable income, applying the same
 * rebate / marginal-relief / cess sequencing as the live Income Tax
 * Calculator (Section 156 ITA 2025 rebate before cess, marginal relief for
 * New Regime FY2025-26+, 4% health & education cess on the net tax).
 */
export function computeTaxLiability(
  taxableIncome: number,
  regime: TaxRegime,
  financialYear: string,
  ageGroup: AgeGroup = "below60"
): TaxLiabilityResult {
  const income = Math.max(0, taxableIncome);
  const slabs = getTaxSlabs(regime, financialYear, ageGroup);
  const { totalTax: incomeTax, breakdown } = calculateTaxForSlab(income, slabs);

  let rebateLimit = 0;
  let rebateAmount = 0;
  if (regime === "new") {
    if (financialYear === "2025-26" || financialYear === "2026-27") {
      rebateLimit = 1200000;
      rebateAmount = 60000;
    } else {
      rebateLimit = 700000;
      rebateAmount = 25000;
    }
  } else {
    rebateLimit = 500000;
    rebateAmount = 12500;
  }

  let rebate = 0;
  let marginalRelief = 0;
  let marginalReliefApplied = false;
  let taxAfterRebate = incomeTax;
  let cess = 0;
  let finalTax = 0;

  if (regime === "new" && (financialYear === "2025-26" || financialYear === "2026-27")) {
    if (income <= 1200000) {
      // Full rebate u/s 156 (ITA 2025) — tax is NIL up to ₹12 lakh
      rebate = incomeTax;
      taxAfterRebate = 0;
      cess = 0;
      finalTax = 0;
    } else {
      rebate = 0;
      taxAfterRebate = incomeTax;
      const excessIncome = income - 1200000;
      if (taxAfterRebate > excessIncome) {
        marginalRelief = taxAfterRebate - excessIncome;
        taxAfterRebate = excessIncome;
        marginalReliefApplied = true;
      }
      cess = taxAfterRebate * 0.04;
      finalTax = taxAfterRebate + cess;
    }
  } else {
    if (income <= rebateLimit) {
      rebate = Math.min(incomeTax, rebateAmount);
    }
    taxAfterRebate = Math.max(0, incomeTax - rebate);
    cess = taxAfterRebate * 0.04;
    finalTax = taxAfterRebate + cess;
  }

  return {
    taxableIncome: income,
    incomeTax,
    rebate,
    marginalRelief,
    marginalReliefApplied,
    cess,
    totalTax: Math.max(0, finalTax),
    breakdown,
  };
}

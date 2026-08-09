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
  /** Surcharge after its own marginal relief. 0 below ₹50,00,000. */
  surcharge: number;
  surchargeRate: number;
  surchargeMarginalRelief: number;
  /** Tax on s.111A / s.112A gains, charged separately from the slab ladder. */
  specialRateTax: number;
  cess: number;
  totalTax: number; // final tax payable (incomeTax - rebate - relief + surcharge + specialRateTax + cess)
  breakdown: SlabBreakdownRow[];
}

/** Listed-equity gains, charged at their own rates rather than at slab rates. */
export interface SpecialRateIncome {
  ltcgEquity?: number;
  stcgEquity?: number;
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

// ─── Surcharge ─────────────────────────────────────────────────────────────
//
// Levied on the income-tax figure once total income crosses ₹50,00,000, with
// marginal relief at every threshold so that crossing a boundary by ₹1 can
// never cost more than the ₹1 earned.
//
// Old regime tops out at 37%; the new regime is capped at 25% (s.202, ITA 2025,
// carrying forward the erstwhile 115BAC cap). Income taxed at the special rates
// in s.111A / s.112A carries a surcharge capped at 15% regardless of regime —
// that cap is applied by computeSpecialRateTax(), not here.
//
// This was previously not computed at all: `surcharge: 0` was a literal in
// three places in TaxCalculator.tsx, while the marketing copy claimed surcharge
// was included at all thresholds.

export interface SurchargeBand {
  /** Surcharge applies once total income EXCEEDS this figure. */
  threshold: number;
  rate: number;
}

export const SURCHARGE_BANDS_OLD: SurchargeBand[] = [
  { threshold: 5000000, rate: 10 },
  { threshold: 10000000, rate: 15 },
  { threshold: 20000000, rate: 25 },
  { threshold: 50000000, rate: 37 },
];

// New regime: same ladder, but the top band is capped at 25%.
export const SURCHARGE_BANDS_NEW: SurchargeBand[] = [
  { threshold: 5000000, rate: 10 },
  { threshold: 10000000, rate: 15 },
  { threshold: 20000000, rate: 25 },
];

/** Surcharge rate applicable to a given total income, before marginal relief. */
export function getSurchargeRate(totalIncome: number, regime: TaxRegime): number {
  const bands = regime === "new" ? SURCHARGE_BANDS_NEW : SURCHARGE_BANDS_OLD;
  let rate = 0;
  for (const b of bands) if (totalIncome > b.threshold) rate = b.rate;
  return rate;
}

export interface SurchargeResult {
  surcharge: number;
  rate: number;
  marginalRelief: number;
  marginalReliefApplied: boolean;
}

/**
 * Surcharge with marginal relief.
 *
 * Relief principle: the additional (tax + surcharge) payable because income
 * crossed a threshold must not exceed the income earned above that threshold.
 * Computed against the liability of a taxpayer sitting exactly at the
 * threshold, which is the standard formulation.
 *
 * `baseTaxAtIncome` is the income-tax (post-rebate, pre-cess) on the actual
 * income. `taxAtThreshold` is the income-tax on exactly the threshold figure.
 */
export function computeSurcharge(
  totalIncome: number,
  baseTaxAtIncome: number,
  regime: TaxRegime,
  taxAtThreshold: (threshold: number) => number
): SurchargeResult {
  const rate = getSurchargeRate(totalIncome, regime);
  if (rate === 0) {
    return { surcharge: 0, rate: 0, marginalRelief: 0, marginalReliefApplied: false };
  }

  const bands = regime === "new" ? SURCHARGE_BANDS_NEW : SURCHARGE_BANDS_OLD;
  const band = [...bands].reverse().find((b) => totalIncome > b.threshold)!;

  let surcharge = (baseTaxAtIncome * rate) / 100;

  // Liability of someone exactly at the threshold: tax plus the surcharge of
  // the band BELOW this one (nil for the first band).
  const belowRate = bands
    .filter((b) => b.threshold < band.threshold)
    .reduce((r, b) => (band.threshold > b.threshold ? b.rate : r), 0);
  const thresholdTax = taxAtThreshold(band.threshold);
  const liabilityAtThreshold = thresholdTax + (thresholdTax * belowRate) / 100;

  const excessIncome = totalIncome - band.threshold;
  const liabilityHere = baseTaxAtIncome + surcharge;

  let marginalRelief = 0;
  let marginalReliefApplied = false;
  if (liabilityHere - liabilityAtThreshold > excessIncome) {
    marginalRelief = liabilityHere - liabilityAtThreshold - excessIncome;
    surcharge = Math.max(0, surcharge - marginalRelief);
    marginalReliefApplied = true;
  }

  return { surcharge, rate, marginalRelief, marginalReliefApplied };
}

// ─── Special-rate income (s.111A / s.112A) ─────────────────────────────────
//
// Capital gains on listed equity are charged at their own rates and are NOT
// pooled into slab income. Two consequences the calculator previously got
// wrong, both in the taxpayer-harming direction in at least one case:
//   1. Pooling inflated slab tax (over-charging).
//   2. Pooling let the s.87A / s.156 rebate absorb tax on LTCG, which the
//      rebate is not available against — producing a "zero tax" reading a
//      user would file on.

export const LTCG_EQUITY_EXEMPTION = 125000; // s.112A annual allowance
export const LTCG_EQUITY_RATE = 12.5;
export const STCG_EQUITY_RATE = 20; // s.111A

export interface SpecialRateResult {
  ltcgTaxable: number;
  ltcgTax: number;
  stcgTax: number;
  total: number;
}

/**
 * Tax on listed-equity gains. The ₹1,25,000 exemption applies to LTCG only and
 * is an annual allowance, not a per-transaction one.
 */
export function computeSpecialRateTax(ltcgEquity: number, stcgEquity: number): SpecialRateResult {
  const ltcg = Math.max(0, ltcgEquity);
  const stcg = Math.max(0, stcgEquity);
  const ltcgTaxable = Math.max(0, ltcg - LTCG_EQUITY_EXEMPTION);
  const ltcgTax = (ltcgTaxable * LTCG_EQUITY_RATE) / 100;
  const stcgTax = (stcg * STCG_EQUITY_RATE) / 100;
  return { ltcgTaxable, ltcgTax, stcgTax, total: ltcgTax + stcgTax };
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
  ageGroup: AgeGroup = "below60",
  special: SpecialRateIncome = {}
): TaxLiabilityResult {
  const income = Math.max(0, taxableIncome);
  const slabs = getTaxSlabs(regime, financialYear, ageGroup);
  const { totalTax: incomeTax, breakdown } = calculateTaxForSlab(income, slabs);

  // Rebate eligibility is a TOTAL INCOME test, not a slab-income test, and
  // total income includes capital gains in full. The ₹1,25,000 under s.112A is
  // not a deduction from total income — s.112A charges tax on the gains
  // *exceeding* that figure, so the whole gain still forms part of total
  // income for the s.87A / s.156 threshold.
  //
  // Getting this wrong is expensive in the dangerous direction: salary-derived
  // taxable income of ₹10,25,000 with ₹3,00,000 of LTCG is ₹13,25,000 of total
  // income and earns no rebate at all. Testing the ₹10,25,000 alone grants a
  // full rebate and understates the liability by ₹44,200.
  const grossSpecialIncome =
    Math.max(0, special.ltcgEquity ?? 0) + Math.max(0, special.stcgEquity ?? 0);
  const totalIncomeAll = income + grossSpecialIncome;

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
    if (totalIncomeAll <= 1200000) {
      // Full rebate u/s 156 (ITA 2025) — tax is NIL up to ₹12 lakh
      rebate = incomeTax;
      taxAfterRebate = 0;
      cess = 0;
      finalTax = 0;
    } else {
      rebate = 0;
      taxAfterRebate = incomeTax;
      const excessIncome = totalIncomeAll - 1200000;
      if (taxAfterRebate > excessIncome) {
        marginalRelief = taxAfterRebate - excessIncome;
        taxAfterRebate = excessIncome;
        marginalReliefApplied = true;
      }
      cess = taxAfterRebate * 0.04;
      finalTax = taxAfterRebate + cess;
    }
  } else if (regime === "new") {
    // New Regime, FY 2023-24 / FY 2024-25 — Section 87A rebate up to ₹7 lakh,
    // with Budget-2023 marginal relief at the cliff (same mechanism as the
    // ₹12L branch above, just at the ₹7L threshold). Previously missing here
    // — this overstated tax substantially for income just above ₹7,00,000
    // (e.g. ₹7.1L showed ~₹27,040 instead of the correct ~₹10,400).
    if (totalIncomeAll <= rebateLimit) {
      rebate = incomeTax;
      taxAfterRebate = 0;
      cess = 0;
      finalTax = 0;
    } else {
      rebate = 0;
      taxAfterRebate = incomeTax;
      const excessIncome = totalIncomeAll - rebateLimit;
      if (taxAfterRebate > excessIncome) {
        marginalRelief = taxAfterRebate - excessIncome;
        taxAfterRebate = excessIncome;
        marginalReliefApplied = true;
      }
      cess = taxAfterRebate * 0.04;
      finalTax = taxAfterRebate + cess;
    }
  } else {
    // Old Regime — Section 87A rebate up to ₹5 lakh. NO statutory marginal
    // relief exists for this cliff — crossing ₹5,00,000 by even ₹1 loses the
    // entire ₹12,500 rebate. Real, well-known quirk of Indian tax law, not a
    // gap in this code.
    if (totalIncomeAll <= rebateLimit) {
      rebate = Math.min(incomeTax, rebateAmount);
    }
    taxAfterRebate = Math.max(0, incomeTax - rebate);
    cess = taxAfterRebate * 0.04;
    finalTax = taxAfterRebate + cess;
  }

  // ── Special-rate gains (s.111A / s.112A) ────────────────────────────────
  // Charged separately from the slab ladder, and deliberately computed AFTER
  // the rebate block: the s.87A / s.156 rebate is not available against tax on
  // these gains. Pooling them into slab income previously let the rebate wipe
  // out LTCG tax entirely and report "zero tax".
  const sr = computeSpecialRateTax(special.ltcgEquity ?? 0, special.stcgEquity ?? 0);

  // ── Surcharge ───────────────────────────────────────────────────────────
  // Assessed on total income including the special-rate gains, and levied on
  // the whole tax figure. `taxAtThreshold` re-runs the slab+rebate ladder at
  // the band boundary so marginal relief is measured against a real liability
  // rather than an approximation.
  const totalIncomeForSurcharge = income + Math.max(0, special.ltcgEquity ?? 0) + Math.max(0, special.stcgEquity ?? 0);
  const taxBeforeSurcharge = taxAfterRebate + sr.total;

  const taxAtThreshold = (threshold: number) => {
    const t = computeTaxLiability(threshold, regime, financialYear, ageGroup);
    return t.incomeTax - t.rebate - t.marginalRelief;
  };

  const surchargeResult = computeSurcharge(
    totalIncomeForSurcharge,
    taxBeforeSurcharge,
    regime,
    taxAtThreshold
  );

  // Cess is levied on tax plus surcharge, so it must be recomputed here rather
  // than reusing the slab-only figure calculated above.
  const cessOnAll = (taxBeforeSurcharge + surchargeResult.surcharge) * 0.04;
  const finalTaxAll = taxBeforeSurcharge + surchargeResult.surcharge + cessOnAll;

  return {
    taxableIncome: income,
    incomeTax,
    rebate,
    marginalRelief,
    marginalReliefApplied,
    surcharge: surchargeResult.surcharge,
    surchargeRate: surchargeResult.rate,
    surchargeMarginalRelief: surchargeResult.marginalRelief,
    specialRateTax: sr.total,
    cess: cessOnAll,
    totalTax: Math.max(0, finalTaxAll),
    breakdown,
  };
}

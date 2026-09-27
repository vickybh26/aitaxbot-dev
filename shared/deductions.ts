/**
 * shared/deductions.ts
 *
 * Pure Chapter VI-A / house-property deduction helpers, pulled out of
 * TaxCalculator.tsx so the on-screen calculation and the PDF export use the
 * same function instead of two copies. They had already drifted once (see
 * the HRA comment in TaxCalculator.tsx's handleDownloadPDF — the on-screen
 * figure and the PDF disagreed because the PDF path re-implemented the
 * formula) — Section 80D and Section 80G were the same shape of risk: the
 * PDF path read the raw form value with no cap at all while the screen
 * capped it, so a user who over-claimed either would see two different
 * numbers on the same result.
 */

import type { TaxRegime } from "./taxLiability";

// ─── Section 80D — health insurance ────────────────────────────────────────
//
// ₹25,000 for self/family (₹50,000 if the assessee is a senior citizen) PLUS
// a SEPARATE ₹25,000 for parents (₹50,000 if the parents are senior
// citizens) — two independent caps, not one combined ₹50,000/₹1,00,000 cap
// keyed off the assessee's own age. Previously modelled as a single cap using
// the assessee's age as a proxy for both, which under-served a taxpayer under
// 60 with senior-citizen parents (capped at ₹50,000 total instead of the
// ₹75,000 they are entitled to: ₹25,000 self + ₹50,000 parents).
export function computeSection80D(
  selfPremium: number,
  isSenior: boolean,
  parentsPremium: number,
  parentsAreSenior: boolean
): number {
  const selfCap = isSenior ? 50000 : 25000;
  const parentsCap = parentsAreSenior ? 50000 : 25000;
  return Math.min(Math.max(0, selfPremium), selfCap) + Math.min(Math.max(0, parentsPremium), parentsCap);
}

// ─── Section 80G — donations ───────────────────────────────────────────────
//
// The deduction rate (100% or 50%) and whether the ₹10,000-of-adjusted-GTI
// qualifying limit even applies both depend on the DONEE's category — not on
// a single universal 10% cap as previously modelled. The four combinations
// below cover the categories that appear on the donation receipt itself:
//   - PM CARES Fund, National Defence Fund, PM National Relief Fund, etc.:
//     100%, no qualifying limit.
//   - A short list of funds (e.g. PM's Drought Relief Fund): 50%, no limit.
//   - Government/local-authority funds for specified charitable purposes,
//     and most category-A approved institutions: 100%, subject to the 10%
//     qualifying limit.
//   - The general run of approved charitable trusts/NGOs (the most common
//     receipt a taxpayer holds): 50%, subject to the 10% qualifying limit.
export type Section80GCategory = "100-no-limit" | "50-no-limit" | "100-limit" | "50-limit";

// s.80G(5D): a donation over ₹2,000 is disallowed IN FULL if paid in cash —
// not merely capped at ₹2,000. Previously not modelled at all.
export const SECTION_80G_CASH_LIMIT = 2000;

export function computeSection80G(
  donationAmount: number,
  category: Section80GCategory,
  paidInCash: boolean,
  adjustedGrossTotalIncome: number
): number {
  const amount = Math.max(0, donationAmount);
  if (paidInCash && amount > SECTION_80G_CASH_LIMIT) return 0;

  const hasLimit = category === "100-limit" || category === "50-limit";
  const rate = category === "100-no-limit" || category === "100-limit" ? 1 : 0.5;
  const qualifyingAmount = hasLimit ? Math.min(amount, adjustedGrossTotalIncome * 0.1) : amount;
  return qualifyingAmount * rate;
}

// ─── Section 24(b) — house property interest ───────────────────────────────
//
// Self-occupied: interest capped at ₹2,00,000/year, and — per s.115BAC/s.202
// — not available at all under the New Regime.
//
// Let-out: NO cap on the interest deduction itself against the rental
// income actually earned (this is part of computing income under the head,
// which the New Regime does not disallow — it only disallows specific
// exemptions/deductions like 80C, HRA, and self-occupied home loan interest,
// not the mechanics of computing a head's own income). The cap that DOES
// apply is on how much of the resulting LOSS can be set off against OTHER
// heads in the same year: ₹2,00,000 (s.71(3A)); any excess is carried
// forward, which a single-year calculator cannot model and does not claim to.
//
// Previously: a single unconditional `min(interest, 200000)` regardless of
// property type or regime — correct for self-occupied, but it silently
// disallowed a let-out property's full interest deduction (no statutory cap)
// and gave the New Regime a self-occupied-only deduction it is not entitled
// to on a let-out property.
export type PropertyType = "selfOccupied" | "letOut";

export function computeHousePropertyNet(
  rentalOrOtherIncome: number,
  loanInterest: number,
  propertyType: PropertyType,
  regime: TaxRegime
): number {
  const income = rentalOrOtherIncome;
  const interest = Math.max(0, loanInterest);

  if (propertyType === "letOut") {
    const net = income - interest;
    return net < 0 ? Math.max(net, -200000) : net;
  }

  const cappedInterest = regime === "old" ? Math.min(interest, 200000) : 0;
  return income - cappedInterest;
}

/**
 * AiTaxBot Income Tax Wizard — shared state shape.
 *
 * This is the FIRST increment of a multi-PR rebuild that replaces the old
 * single-page "throw every field at the user" calculator (TaxCalculator.tsx)
 * with a step-by-step flow: basic details -> FY/AY + which income heads
 * apply -> one focused step per selected head -> deductions -> result.
 *
 * Deliberately NOT wired into the live /calculators/income-tax route yet.
 * TaxCalculator.tsx keeps serving real traffic unchanged until every income
 * head this wizard needs (Salary, House Property, Business 44AD/ADA/AE,
 * Capital Gains equity/MF, Other Sources) has its own step and the combined
 * output is verified to match computeTaxLiability() in shared/taxLiability.ts
 * exactly. Only then does a final cutover PR swap the route. See
 * client/src/pages/IncomeTaxCalculatorWizard.tsx for the preview route.
 */

import { computeSpecialRateTax, type AgeGroup } from "@shared/taxLiability";

export type IncomeHeadKey =
  | "salary"
  | "houseProperty"
  | "business"
  | "capitalGains"
  | "otherSources";

export interface BasicDetails {
  name: string;
  mobile: string;
  email: string;
}

/**
 * Salary breakup, more granular than TaxCalculator.tsx's existing combined
 * "Basic Salary + DA (annual)" field — this session's request specifically
 * asked for Basic and DA broken out separately. Standard deduction u/s
 * 16(ia), entertainment allowance u/s 16(ii), and old-vs-new regime handling
 * are NOT collected here: they're auto-computed downstream from regime
 * choice, matching TaxCalculator.tsx's existing behaviour (see
 * standardDeductionAmount in TaxCalculator.tsx) - asking for them here would
 * just be asking the user to do the app's job.
 */
export interface SalaryDetails {
  basicSalary: string;
  dearnessAllowance: string;
  hraReceived: string;
  lta: string;
  otherAllowances: string;
  professionalTax: string;
}

/**
 * House Property, per the plan from this session: interest on home loan,
 * number of properties, number of let-out properties. TaxCalculator.tsx's
 * existing "House Property Income" field is a single lump number the user
 * has to have already computed themselves — this step does that computation
 * for them instead.
 *
 * Deliberately aggregate, not per-property: self-occupied properties are all
 * summed into one interest figure (capped at Rs.2L total under Section
 * 24(b)/Section 25 ITA2025 regardless of how many self-occupied properties
 * there are — only up to 2 can even be treated as self-occupied/nil, a rule
 * called out in the UI rather than modelled with per-property state, which
 * would be real complexity for a case that's rare for this product's
 * audience). Let-out properties are likewise summed into one rent/interest
 * figure. A user with meaningfully different let-out properties can still
 * get a correct AGGREGATE answer this way, just not a per-property one.
 */
export interface HousePropertyDetails {
  numberOfProperties: string;
  numberOfLetOut: string;
  // Let-out properties
  annualRentReceived: string;
  municipalTaxesPaid: string;
  letOutHomeLoanInterest: string;
  // Self-occupied properties (up to 2 can be nil-value; interest capped Rs.2L total)
  selfOccupiedHomeLoanInterest: string;
}

/**
 * Business/Profession — presumptive taxation only (44AD/44ADA/44AE), per
 * this session's explicit scope: "currently we support 44AD, ADA and AE".
 * A taxpayer picks exactly ONE scheme; running two different presumptive
 * businesses simultaneously is real but rare for this product's audience,
 * and adding a second scheme's fields would double the step's complexity
 * for a case that doesn't come up often — out of scope for this pass.
 *
 * 44AD/44ADA share the same digital-vs-cash receipt split (it's what
 * decides both the presumptive rate AND the turnover-limit extension, per
 * the real ITR-3 Schedule BP: 6% digital / 8% cash for 44AD, 50% flat for
 * 44ADA, and in both cases the limit extends if cash receipts are <=5% of
 * total turnover). 44AE has a completely different shape (per-vehicle,
 * per-month), so it gets its own fields.
 */
export type BusinessScheme = "44AD" | "44ADA" | "44AE" | "";

export interface BusinessDetails {
  scheme: BusinessScheme;
  // 44AD / 44ADA
  digitalReceipts: string; // via bank/cheque/ECS/prescribed electronic modes
  cashReceipts: string;
  // 44AE — aggregate across vehicles, not per-vehicle (see HousePropertyDetails
  // for the same aggregate-not-itemised design choice and why).
  vehicleCount: string;
  isHeavyVehicle: boolean; // > 12 tonnes gross vehicle weight
  avgTonnageMT: string; // only used when isHeavyVehicle
  monthsHeld: string; // 1-12, average across vehicles if count > 1
}

/**
 * Capital Gains — shares and mutual funds only, per this session's explicit
 * scope ("Support only Sharemarket and mutual fund capital gains").
 *
 * Equity shares and equity-oriented mutual funds (STT paid) are taxed at the
 * special rates in Section 111A (STCG, <12 months) / Section 112A (LTCG,
 * >=12 months, first Rs.1,25,000/year exempt) — computed here via
 * computeSpecialRateTax(), the SAME function shared/taxLiability.ts's
 * computeTaxLiability() already uses for the live calculator. Reusing it
 * (rather than re-deriving the 12.5%/20%/Rs.1.25L constants here) means this
 * step's live preview can never drift out of sync with the real computation
 * engine — a risk every other step in this wizard has, since no shared
 * function existed for Salary/House Property/Business before this rebuild.
 *
 * Debt mutual funds (bought on or after 1 April 2023) lost LTCG/indexation
 * treatment entirely under Finance Act 2023 — ALL gains, any holding period,
 * are taxed at the taxpayer's slab rate, same as any other income. So unlike
 * equity, there's no separate rate to compute here: this figure just gets
 * added to slab-taxed income downstream, which is why there's no "STCG vs
 * LTCG" split for it in this type.
 */
export interface CapitalGainsDetails {
  stcgEquity: string; // Section 111A, listed shares/equity MF held <12 months
  ltcgEquity: string; // Section 112A, listed shares/equity MF held >=12 months
  debtFundGains: string; // Slab rate since FA2023, any holding period
}

/**
 * Other Sources — dividend and interest income, per this session's scope.
 * All of it is taxed at slab rate (no special-rate treatment like Capital
 * Gains), so there's no tax computation to show here, just a running total.
 *
 * Interest is split into savingsInterest vs otherInterest rather than one
 * lump figure, even though both are taxed identically here, because they are
 * NOT treated identically at deduction time: only savings-account interest
 * qualifies for Section 80TTA (₹10,000 cap, or Section 80TTB's ₹50,000 cap
 * for senior citizens) — see section80TTA in TaxCalculator.tsx, which
 * currently makes the user re-enter this same figure a second time in the
 * deductions section. Keeping it separate here means a later Deductions step
 * in this wizard can read state.otherSources.savingsInterest directly and
 * suggest the correct cap, instead of asking twice.
 */
export interface OtherSourcesDetails {
  dividendIncome: string;
  savingsInterest: string; // eligible for 80TTA/80TTB later
  otherInterest: string; // FD/RD/bonds/etc — NOT 80TTA/80TTB-eligible
}

/**
 * Deductions — Chapter VI-A, Old Regime only (New Regime disallows all of
 * these except employer NPS contribution u/s 80CCD(2), which this wizard
 * doesn't collect since it isn't information the TAXPAYER provides — it's
 * already reflected in Form 16/payslip figures collected in SalaryStep).
 *
 * Two deductions from the real ITR-3's Schedule VI-A are deliberately NOT
 * fields here because they're already fully accounted for elsewhere without
 * double-asking:
 *   - Home loan interest (s.24(b)) reduces "Income from House Property"
 *     itself (computed in HousePropertyStep) — it is not a Chapter VI-A
 *     deduction from Gross Total Income, so it must never appear again here.
 *   - Section 80TTA/80TTB (savings interest) is auto-derived from
 *     state.otherSources.savingsInterest + ageGroup (see
 *     computeAutoDerivedDeductions) rather than re-asked, per the same
 *     "don't ask twice" reasoning documented on OtherSourcesDetails.
 */
export interface DeductionsDetails {
  section80C: string; // PPF, ELSS, life insurance, etc. — capped Rs.1,50,000
  section80D: string; // Health insurance premium — capped Rs.25,000/Rs.50,000 by age (simplified, see below)
  section80E: string; // Student loan interest — uncapped
  section80CCD1B: string; // Additional NPS (own contribution) — capped Rs.50,000
  section80G: string; // Donations — treated as fully deductible here (simplified; real rule varies 50%/100% by donee)
}

export const SECTION_80C_CAP = 150000;
export const SECTION_80CCD1B_CAP = 50000;
export const SECTION_80D_CAP_BELOW60 = 25000;
export const SECTION_80D_CAP_SENIOR = 50000;
export const SECTION_80TTA_CAP = 10000;
export const SECTION_80TTB_CAP = 50000; // senior citizens only

export interface WizardState {
  basicDetails: BasicDetails;
  financialYear: string; // matches TaxCalculator.tsx's existing values: "2024-25" | "2025-26" | "2026-27"
  ageGroup: AgeGroup;
  incomeHeads: Record<IncomeHeadKey, boolean>;
  salary: SalaryDetails;
  houseProperty: HousePropertyDetails;
  business: BusinessDetails;
  capitalGains: CapitalGainsDetails;
  otherSources: OtherSourcesDetails;
  deductions: DeductionsDetails;
}

export const SELF_OCCUPIED_INTEREST_CAP = 200000;

export const INCOME_HEAD_LABELS: Record<IncomeHeadKey, { label: string; hint: string }> = {
  salary: {
    label: "Salary",
    hint: "You're a salaried employee — Basic, DA, HRA, and other components on your payslip",
  },
  houseProperty: {
    label: "House Property",
    hint: "You own a house — self-occupied or rented out, with or without a home loan",
  },
  business: {
    label: "Business or Profession",
    hint: "Presumptive taxation only — Section 44AD, 44ADA, or 44AE",
  },
  capitalGains: {
    label: "Capital Gains",
    hint: "Sold shares or mutual funds during the year",
  },
  otherSources: {
    label: "Other Sources",
    hint: "Dividend income, savings account or fixed deposit interest",
  },
};

export function createEmptyWizardState(): WizardState {
  return {
    basicDetails: { name: "", mobile: "", email: "" },
    financialYear: "2026-27",
    ageGroup: "below60",
    incomeHeads: {
      salary: false,
      houseProperty: false,
      business: false,
      capitalGains: false,
      otherSources: false,
    },
    salary: {
      basicSalary: "",
      dearnessAllowance: "",
      hraReceived: "",
      lta: "",
      otherAllowances: "",
      professionalTax: "",
    },
    houseProperty: {
      numberOfProperties: "1",
      numberOfLetOut: "0",
      annualRentReceived: "",
      municipalTaxesPaid: "",
      letOutHomeLoanInterest: "",
      selfOccupiedHomeLoanInterest: "",
    },
    business: {
      scheme: "",
      digitalReceipts: "",
      cashReceipts: "",
      vehicleCount: "1",
      isHeavyVehicle: false,
      avgTonnageMT: "",
      monthsHeld: "12",
    },
    capitalGains: {
      stcgEquity: "",
      ltcgEquity: "",
      debtFundGains: "",
    },
    otherSources: {
      dividendIncome: "",
      savingsInterest: "",
      otherInterest: "",
    },
    deductions: {
      section80C: "",
      section80D: "",
      section80E: "",
      section80CCD1B: "",
      section80G: "",
    },
  };
}

export function computeOtherSourcesIncome(os: OtherSourcesDetails): number {
  return toAmount(os.dividendIncome) + toAmount(os.savingsInterest) + toAmount(os.otherInterest);
}

/** Parses a wizard numeric-string field to a safe non-negative number. */
export function toAmount(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function computeGrossSalary(salary: SalaryDetails): number {
  return (
    toAmount(salary.basicSalary) +
    toAmount(salary.dearnessAllowance) +
    toAmount(salary.hraReceived) +
    toAmount(salary.lta) +
    toAmount(salary.otherAllowances)
  );
}

export interface HousePropertyComputation {
  letOutNetAnnualValue: number;
  letOutStandardDeduction: number; // 30% of NAV, Section 24(a)
  letOutIncome: number; // can be negative (loss)
  selfOccupiedInterestCapped: number; // always <= SELF_OCCUPIED_INTEREST_CAP
  selfOccupiedIncome: number; // always <= 0 (a deduction/loss, never positive)
  totalIncome: number; // letOutIncome + selfOccupiedIncome — can be negative
}

/**
 * Computes income from house property from the aggregate figures collected
 * in HousePropertyDetails. Mirrors the standard Section 22-27 (ITA 1961) /
 * Section 20-25 (ITA 2025) computation:
 *   Let-out: NAV (rent - municipal taxes) -> less 30% standard deduction
 *            (s.24(a)) -> less home loan interest, UNCAPPED (s.24(b))
 *   Self-occupied: Nil annual value; only interest is deductible, CAPPED at
 *            Rs.2,00,000 total regardless of how many self-occupied
 *            properties there are (s.24(b) proviso / s.25 ITA2025)
 */
export function computeHousePropertyIncome(hp: HousePropertyDetails): HousePropertyComputation {
  const letOutCount = toAmount(hp.numberOfLetOut);

  const rent = toAmount(hp.annualRentReceived);
  const municipalTaxes = toAmount(hp.municipalTaxesPaid);
  const letOutInterest = toAmount(hp.letOutHomeLoanInterest);

  const letOutNetAnnualValue = letOutCount > 0 ? Math.max(0, rent - municipalTaxes) : 0;
  const letOutStandardDeduction = letOutNetAnnualValue * 0.3;
  const letOutIncome = letOutCount > 0 ? letOutNetAnnualValue - letOutStandardDeduction - letOutInterest : 0;

  const selfOccupiedInterestCapped = Math.min(
    toAmount(hp.selfOccupiedHomeLoanInterest),
    SELF_OCCUPIED_INTEREST_CAP
  );
  const selfOccupiedIncome = -selfOccupiedInterestCapped;

  return {
    letOutNetAnnualValue,
    letOutStandardDeduction,
    letOutIncome,
    selfOccupiedInterestCapped,
    selfOccupiedIncome,
    totalIncome: letOutIncome + selfOccupiedIncome,
  };
}

// 44AE flat rates, straight from Schedule BP of a real filed ITR-3
// (Form_pdf_912974760290826.pdf, section 63): Rs.1,000/tonne/month for a
// goods carriage over 12MT gross vehicle weight, else a flat Rs.7,500/month
// regardless of tonnage.
export const HEAVY_VEHICLE_RATE_PER_TON_PER_MONTH = 1000;
export const LIGHT_VEHICLE_FLAT_RATE_PER_MONTH = 7500;
export const MAX_VEHICLES_WITHOUT_AUDIT_44AE = 10;

export interface BusinessComputation {
  totalTurnover: number;
  cashPercentage: number; // of total turnover, 0-100
  turnoverLimit: number; // depends on scheme + whether cash <= 5% of turnover
  exceedsLimit: boolean;
  presumptiveIncome: number;
  auditWarning: string | null; // null when no warning applies
}

/**
 * Computes presumptive income for whichever scheme is selected. Mirrors
 * Schedule BP sections 61 (44AD), 62 (44ADA), 63 (44AE) of a real filed
 * ITR-3 exactly — the digital/cash split, the specific presumptive rates,
 * and the turnover-limit extension rule (limit is extended by 50% if cash
 * receipts are <=5% of total turnover) are not general tax knowledge
 * approximations, they're copied from the actual form structure.
 */
export function computeBusinessIncome(b: BusinessDetails): BusinessComputation {
  if (b.scheme === "44AD" || b.scheme === "44ADA") {
    const digital = toAmount(b.digitalReceipts);
    const cash = toAmount(b.cashReceipts);
    const totalTurnover = digital + cash;
    const cashPercentage = totalTurnover > 0 ? (cash / totalTurnover) * 100 : 0;
    const cashWithinFivePercent = cashPercentage <= 5;

    if (b.scheme === "44AD") {
      const turnoverLimit = cashWithinFivePercent ? 30000000 : 20000000; // Rs.3Cr / Rs.2Cr
      const presumptiveIncome = digital * 0.06 + cash * 0.08;
      const exceedsLimit = totalTurnover > turnoverLimit;
      return {
        totalTurnover,
        cashPercentage,
        turnoverLimit,
        exceedsLimit,
        presumptiveIncome,
        auditWarning: exceedsLimit
          ? "Your turnover is above the 44AD limit for your digital/cash mix — presumptive taxation isn't available; you'd need to maintain full books and a tax audit under Section 44AB."
          : null,
      };
    }

    // 44ADA
    const turnoverLimit = cashWithinFivePercent ? 7500000 : 5000000; // Rs.75L / Rs.50L
    const presumptiveIncome = totalTurnover * 0.5;
    const exceedsLimit = totalTurnover > turnoverLimit;
    return {
      totalTurnover,
      cashPercentage,
      turnoverLimit,
      exceedsLimit,
      presumptiveIncome,
      auditWarning: exceedsLimit
        ? "Your gross receipts are above the 44ADA limit for your digital/cash mix — presumptive taxation isn't available; you'd need to maintain full books and a tax audit under Section 44AB."
        : null,
    };
  }

  if (b.scheme === "44AE") {
    const count = toAmount(b.vehicleCount);
    const months = Math.min(12, Math.max(0, toAmount(b.monthsHeld)));
    const perVehiclePerMonth = b.isHeavyVehicle
      ? toAmount(b.avgTonnageMT) * HEAVY_VEHICLE_RATE_PER_TON_PER_MONTH
      : LIGHT_VEHICLE_FLAT_RATE_PER_MONTH;
    const presumptiveIncome = count * months * perVehiclePerMonth;
    const tooManyVehicles = count > MAX_VEHICLES_WITHOUT_AUDIT_44AE;
    return {
      totalTurnover: 0, // 44AE has no turnover-based limit — it's a vehicle-count limit instead
      cashPercentage: 0,
      turnoverLimit: 0,
      exceedsLimit: tooManyVehicles,
      presumptiveIncome,
      auditWarning: tooManyVehicles
        ? `44AE presumptive taxation only applies with up to ${MAX_VEHICLES_WITHOUT_AUDIT_44AE} goods carriages — with more than that, you'd need to maintain full books and a tax audit under Section 44AB.`
        : null,
    };
  }

  return {
    totalTurnover: 0,
    cashPercentage: 0,
    turnoverLimit: 0,
    exceedsLimit: false,
    presumptiveIncome: 0,
    auditWarning: null,
  };
}

/**
 * Thin wrapper around shared/taxLiability.ts's computeSpecialRateTax() — see
 * the doc comment on CapitalGainsDetails for why this delegates instead of
 * re-deriving the rates. debtFundGains is passed through untaxed here since
 * it's taxed at slab rate downstream, not at a special rate.
 */
export function computeCapitalGainsTax(cg: CapitalGainsDetails) {
  const special = computeSpecialRateTax(toAmount(cg.ltcgEquity), toAmount(cg.stcgEquity));
  return {
    ...special,
    debtFundGains: toAmount(cg.debtFundGains),
  };
}

export interface DeductionsComputation {
  section80C: number; // capped
  section80D: number; // capped by age
  section80E: number; // uncapped
  section80CCD1B: number; // capped
  section80G: number; // uncapped here (simplified)
  section80TTAorTTB: number; // auto-derived, capped by age — not a user input
  total: number;
}

/**
 * Applies every cap explicitly, rather than trusting the raw entered figures
 * — the same "compute the real minimum/maximum for the user, don't just
 * echo what they typed" principle as every other step's live totals. The
 * 80TTA/80TTB line is auto-derived from otherSources.savingsInterest + the
 * wizard-level ageGroup — see the doc comment on DeductionsDetails for why
 * it isn't a field the user fills in here.
 */
export function computeDeductions(
  deductions: DeductionsDetails,
  otherSources: OtherSourcesDetails,
  ageGroup: AgeGroup
): DeductionsComputation {
  const section80C = Math.min(toAmount(deductions.section80C), SECTION_80C_CAP);
  const section80DCap = ageGroup === "below60" ? SECTION_80D_CAP_BELOW60 : SECTION_80D_CAP_SENIOR;
  const section80D = Math.min(toAmount(deductions.section80D), section80DCap);
  const section80E = toAmount(deductions.section80E);
  const section80CCD1B = Math.min(toAmount(deductions.section80CCD1B), SECTION_80CCD1B_CAP);
  const section80G = toAmount(deductions.section80G);

  const savingsInterestCap = ageGroup === "below60" ? SECTION_80TTA_CAP : SECTION_80TTB_CAP;
  const section80TTAorTTB = Math.min(toAmount(otherSources.savingsInterest), savingsInterestCap);

  return {
    section80C,
    section80D,
    section80E,
    section80CCD1B,
    section80G,
    section80TTAorTTB,
    total: section80C + section80D + section80E + section80CCD1B + section80G + section80TTAorTTB,
  };
}

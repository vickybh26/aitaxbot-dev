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

export interface WizardState {
  basicDetails: BasicDetails;
  financialYear: string; // matches TaxCalculator.tsx's existing values: "2024-25" | "2025-26" | "2026-27"
  incomeHeads: Record<IncomeHeadKey, boolean>;
  salary: SalaryDetails;
  houseProperty: HousePropertyDetails;
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
  };
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

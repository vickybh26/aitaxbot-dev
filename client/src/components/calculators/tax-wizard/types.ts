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

export interface WizardState {
  basicDetails: BasicDetails;
  financialYear: string; // matches TaxCalculator.tsx's existing values: "2024-25" | "2025-26" | "2026-27"
  incomeHeads: Record<IncomeHeadKey, boolean>;
}

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
  };
}

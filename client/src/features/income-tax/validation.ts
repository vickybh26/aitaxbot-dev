/** Pure input rules: no React, UI components, browser APIs or network calls. */
import { parseAmount, toAmount, computeOtherSourcesIncome, computeBusinessIncome,
  MAX_VEHICLES_WITHOUT_AUDIT_44AE, type BasicDetails, type SalaryDetails, type HousePropertyDetails, type BusinessDetails,
  type CapitalGainsDetails, type OtherSourcesDetails, type DeductionsDetails, type WizardState } from "./model";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_PATTERN = /^[6-9]\d{9}$/;
export const FINANCIAL_YEARS = ["2024-25", "2025-26", "2026-27"] as const;

export function hasInvalidAmounts(value: object, excluded: string[] = []): boolean {
  return Object.entries(value).some(([key, amount]) =>
    typeof amount === "string" && !excluded.includes(key) && parseAmount(amount) === null);
}
export function isBasicDetailsValid(value: BasicDetails): boolean {
  return value.name.trim().length >= 2 && MOBILE_PATTERN.test(value.mobile.trim()) && EMAIL_PATTERN.test(value.email.trim());
}
export function hasAtLeastOneIncomeHead(heads: WizardState["incomeHeads"]): boolean {
  return Object.values(heads).some(Boolean);
}
export function isYearAndHeadsValid(state: WizardState): boolean {
  return FINANCIAL_YEARS.includes(state.financialYear as typeof FINANCIAL_YEARS[number])
    && parseAmount(state.agriculturalIncome) !== null && hasAtLeastOneIncomeHead(state.incomeHeads);
}
export function isSalaryStepValid(value: SalaryDetails): boolean {
  return !hasInvalidAmounts(value) && toAmount(value.basicSalary) > 0
    && toAmount(value.eligibleLtaExemption) <= toAmount(value.lta);
}
export function isBusinessStepValid(value: BusinessDetails): boolean {
  if (!["44AD", "44ADA", "44AE"].includes(value.scheme)) return false;
  if (value.scheme === "44AD" || value.scheme === "44ADA") {
    return !hasInvalidAmounts({ digital: value.digitalReceipts, cash: value.cashReceipts })
      && toAmount(value.digitalReceipts) + toAmount(value.cashReceipts) > 0
      && !computeBusinessIncome(value).exceedsLimit;
  }
  const count = parseAmount(value.vehicleCount);
  const months = parseAmount(value.monthsHeld);
  if (count === null || months === null || !Number.isInteger(count) || !Number.isInteger(months)
    || count < 1 || count > MAX_VEHICLES_WITHOUT_AUDIT_44AE || months < 1 || months > 12) return false;
  return !value.isHeavyVehicle || (parseAmount(value.avgTonnageMT) !== null && toAmount(value.avgTonnageMT) > 0);
}
export function isHousePropertyStepValid(value: HousePropertyDetails): boolean {
  if (hasInvalidAmounts(value)) return false;
  const total = toAmount(value.numberOfProperties), letOut = toAmount(value.numberOfLetOut);
  return Number.isInteger(total) && Number.isInteger(letOut) && total >= 1 && letOut <= total
    && (letOut === 0 || toAmount(value.annualRentReceived) > 0);
}
export function isCapitalGainsStepValid(value: CapitalGainsDetails): boolean {
  return !hasInvalidAmounts(value) && Object.values(value).some((amount) => toAmount(amount) > 0);
}
export function isOtherSourcesStepValid(value: OtherSourcesDetails): boolean {
  return !hasInvalidAmounts(value) && computeOtherSourcesIncome(value) > 0;
}
/** Deductions are optional; invalid non-empty amounts must still block submission. */
export function isDeductionsStepValid(value: DeductionsDetails): boolean {
  return !hasInvalidAmounts(value, ["section80GCategory"]);
}

/** Step selection and validation are feature behaviour, independent of layout. */
import { toAmount, type WizardState } from "./model";
import { isBasicDetailsValid, isYearAndHeadsValid, hasInvalidAmounts, isSalaryStepValid,
  isHousePropertyStepValid, isBusinessStepValid, isCapitalGainsStepValid,
  isOtherSourcesStepValid, isDeductionsStepValid } from "./validation";

export type StepId =
  | "basicDetails"
  | "fyAndHeads"
  | "salary"
  | "houseProperty"
  | "business"
  | "capitalGains"
  | "otherSources"
  | "deductions"
  | "result";

export function getActiveSteps(incomeHeads: WizardState["incomeHeads"]): { id: StepId; label: string }[] {
  const steps: { id: StepId; label: string }[] = [
    { id: "basicDetails", label: "Basic Details" },
    { id: "fyAndHeads", label: "Year & Income Type" },
  ];
  if (incomeHeads.salary) steps.push({ id: "salary", label: "Salary" });
  if (incomeHeads.houseProperty) steps.push({ id: "houseProperty", label: "House Property" });
  if (incomeHeads.business) steps.push({ id: "business", label: "Business" });
  if (incomeHeads.capitalGains) steps.push({ id: "capitalGains", label: "Capital Gains" });
  if (incomeHeads.otherSources) steps.push({ id: "otherSources", label: "Other Sources" });
  steps.push({ id: "deductions", label: "Deductions" }); // unconditional
  steps.push({ id: "result", label: "Result" }); // unconditional, always last
  return steps;
}

export function canContinue(state: WizardState, stepId: StepId): boolean {
  return stepId === "basicDetails"
      ? isBasicDetailsValid(state.basicDetails)
      : stepId === "fyAndHeads"
      ? isYearAndHeadsValid(state)
      : stepId === "salary"
      ? isSalaryStepValid(state.salary)
      : stepId === "houseProperty"
      ? isHousePropertyStepValid(state.houseProperty)
      : stepId === "business"
      ? isBusinessStepValid(state.business)
      : stepId === "capitalGains"
      ? isCapitalGainsStepValid(state.capitalGains)
      : stepId === "otherSources"
      ? isOtherSourcesStepValid(state.otherSources)
      : stepId === "deductions"
      ? isDeductionsStepValid(state.deductions)
      : stepId === "result"
      ? true // nothing to validate — this is the terminal display step
      : false;
}

/** Explain malformed inputs without adding business rules to screen components. */
export function getStepValidationMessage(state: WizardState, stepId: StepId): string | null {
  const values: Partial<Record<StepId, object>> = {
    fyAndHeads: { agriculturalIncome: state.agriculturalIncome }, salary: state.salary,
    houseProperty: state.houseProperty, capitalGains: state.capitalGains,
    otherSources: state.otherSources, deductions: state.deductions,
  };
  const value = values[stepId];
  if (value && hasInvalidAmounts(value, ["section80GCategory"])) {
    return "Enter valid non-negative amounts with at most two decimal places. Commas are supported.";
  }
  if (stepId === "salary" && toAmount(state.salary.eligibleLtaExemption) > toAmount(state.salary.lta)) {
    return "Eligible LTA exemption cannot exceed the LTA received.";
  }
  if (stepId === "business" && state.business.scheme && !isBusinessStepValid(state.business)) {
    return "Check the amounts, whole-number vehicle/month counts and the scheme limits shown above. Calculations outside those limits are not supported.";
  }
  if (stepId === "houseProperty" && !isHousePropertyStepValid(state.houseProperty)) {
    return "Enter whole-number property counts. Let-out properties cannot exceed the total; enter rent for each let-out property.";
  }
  return null;
}

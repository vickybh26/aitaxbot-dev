import type { SavedResultPayload } from "@/hooks/useTrackToolUse";
import { getActiveWizardState, toAmount, type WizardState, type WizardTaxSummary } from "./model";

/** Dashboard contract: selected financial inputs only; never contact details. */
export function buildIncomeTaxSavedResult(state: WizardState, summary: WizardTaxSummary): SavedResultPayload {
  state = getActiveWizardState(state);
  const rs = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;
  const recommended = summary[summary.recommendedRegime];
  const other = summary[summary.recommendedRegime === "old" ? "new" : "old"];
  const label = summary.recommendedRegime === "new" ? "New Regime" : "Old Regime";
  const savings = Math.max(0, other.liability.totalTax - recommended.liability.totalTax);
  return {
    toolKey: "income-tax",
    route: "/calculators/income-tax",
    kind: "calculator",
    headline: { label: `Your tax · ${label}`, value: rs(recommended.liability.totalTax),
      hint: savings > 0 ? `${rs(savings)} less than the other regime` : undefined },
    details: [
      { label: "Financial year", value: state.financialYear },
      { label: "Gross income", value: rs(summary.old.grossTotalIncome) },
      { label: "Old Regime tax", value: rs(summary.old.liability.totalTax) },
      { label: "New Regime tax", value: rs(summary.new.liability.totalTax) },
    ],
    inputs: {
      financialYear: state.financialYear, ageGroup: state.ageGroup, isNonResident: state.isNonResident,
      salaryIncome: summary.old.grossSalary,
      section80C: toAmount(state.deductions.section80C),
      section80D: toAmount(state.deductions.section80D) + toAmount(state.deductions.section80DParents),
      section80CCD1B: toAmount(state.deductions.section80CCD1B),
    },
  };
}

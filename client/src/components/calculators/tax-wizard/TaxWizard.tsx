import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BasicDetailsStep, { isBasicDetailsValid } from "./steps/BasicDetailsStep";
import FYAndHeadsStep, { hasAtLeastOneIncomeHead } from "./steps/FYAndHeadsStep";
import { createEmptyWizardState, type WizardState } from "./types";

/**
 * Step 1 of the multi-PR wizard rebuild — see types.ts for the full plan
 * and why this isn't wired into the live calculator route yet.
 *
 * Steps implemented so far: Basic Details, FY/AY + Income Head picker.
 * Steps landing in follow-up PRs: Salary, House Property, Business
 * (44AD/44ADA/44AE), Capital Gains (equity/MF), Other Sources, Deductions,
 * Result — each one only shown if its income head was selected in step 2.
 */

type StepId = "basicDetails" | "fyAndHeads";

const STEPS: { id: StepId; label: string }[] = [
  { id: "basicDetails", label: "Basic Details" },
  { id: "fyAndHeads", label: "Year & Income Type" },
];

export default function TaxWizard() {
  const [state, setState] = useState<WizardState>(createEmptyWizardState());
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  const canGoNext =
    currentStep.id === "basicDetails"
      ? isBasicDetailsValid(state.basicDetails)
      : currentStep.id === "fyAndHeads"
      ? hasAtLeastOneIncomeHead(state.incomeHeads)
      : false;

  function goNext() {
    if (!canGoNext) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Next step in the plan (Salary/House Property/... sub-steps) lands
      // here in a follow-up PR. For now, this is as far as the wizard goes.
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <Card className="p-6 max-w-xl mx-auto">
      {/* Progress indicator — compact by design. The old calculator's
          legal-citation box alone cost 488px of mobile scroll (measured
          2026-08-29); this wizard's whole per-step chrome should not repeat
          that mistake. */}
      <div className="flex items-center gap-2 mb-6" role="tablist" aria-label="Wizard progress">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx <= stepIndex ? "bg-primary" : "bg-neutral-200"
              }`}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-neutral-500 mb-4">
        Step {stepIndex + 1} of {STEPS.length} — {currentStep.label}
      </p>

      {currentStep.id === "basicDetails" && (
        <BasicDetailsStep
          value={state.basicDetails}
          onChange={(basicDetails) => setState((s) => ({ ...s, basicDetails }))}
        />
      )}

      {currentStep.id === "fyAndHeads" && (
        <FYAndHeadsStep
          financialYear={state.financialYear}
          incomeHeads={state.incomeHeads}
          onFinancialYearChange={(financialYear) => setState((s) => ({ ...s, financialYear }))}
          onIncomeHeadsChange={(incomeHeads) => setState((s) => ({ ...s, incomeHeads }))}
        />
      )}

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={stepIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="button" onClick={goNext} disabled={!canGoNext} className="gap-1">
          {stepIndex < STEPS.length - 1 ? "Continue" : "Continue (more steps coming soon)"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

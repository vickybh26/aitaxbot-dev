import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BasicDetailsStep, { isBasicDetailsValid } from "./steps/BasicDetailsStep";
import FYAndHeadsStep, { hasAtLeastOneIncomeHead } from "./steps/FYAndHeadsStep";
import SalaryStep, { isSalaryStepValid } from "./steps/SalaryStep";
import HousePropertyStep, { isHousePropertyStepValid } from "./steps/HousePropertyStep";
import BusinessStep, { isBusinessStepValid } from "./steps/BusinessStep";
import CapitalGainsStep, { isCapitalGainsStepValid } from "./steps/CapitalGainsStep";
import OtherSourcesStep, { isOtherSourcesStepValid } from "./steps/OtherSourcesStep";
import { createEmptyWizardState, type WizardState } from "./types";

/**
 * Multi-PR wizard rebuild — see types.ts for the full plan and why this
 * isn't wired into the live calculator route yet.
 *
 * Steps implemented so far: Basic Details, FY/AY + Income Head picker,
 * Salary, House Property, Business, Capital Gains, Other Sources. Steps
 * landing in follow-up PRs: Deductions, Result — each one only shown if its
 * income head was selected in step 2.
 *
 * The step LIST is dynamic, not a fixed array: getActiveSteps() below
 * recomputes it from state.incomeHeads on every render, so toggling a head
 * on/off in step 2 immediately adds or removes its step from the flow.
 */

type StepId =
  | "basicDetails"
  | "fyAndHeads"
  | "salary"
  | "houseProperty"
  | "business"
  | "capitalGains"
  | "otherSources";

function getActiveSteps(incomeHeads: WizardState["incomeHeads"]): { id: StepId; label: string }[] {
  const steps: { id: StepId; label: string }[] = [
    { id: "basicDetails", label: "Basic Details" },
    { id: "fyAndHeads", label: "Year & Income Type" },
  ];
  if (incomeHeads.salary) steps.push({ id: "salary", label: "Salary" });
  if (incomeHeads.houseProperty) steps.push({ id: "houseProperty", label: "House Property" });
  if (incomeHeads.business) steps.push({ id: "business", label: "Business" });
  if (incomeHeads.capitalGains) steps.push({ id: "capitalGains", label: "Capital Gains" });
  if (incomeHeads.otherSources) steps.push({ id: "otherSources", label: "Other Sources" });
  // All 5 income heads now covered. Deductions + Result land in follow-up PRs.
  return steps;
}

export default function TaxWizard() {
  const [state, setState] = useState<WizardState>(createEmptyWizardState());
  const [stepIndex, setStepIndex] = useState(0);

  const steps = getActiveSteps(state.incomeHeads);
  // Guards against stepIndex pointing past the end if the user went Back to
  // step 2 and unchecked a head whose step they'd already moved past.
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeStepIndex];

  const canGoNext =
    currentStep.id === "basicDetails"
      ? isBasicDetailsValid(state.basicDetails)
      : currentStep.id === "fyAndHeads"
      ? hasAtLeastOneIncomeHead(state.incomeHeads)
      : currentStep.id === "salary"
      ? isSalaryStepValid(state.salary)
      : currentStep.id === "houseProperty"
      ? isHousePropertyStepValid(state.houseProperty)
      : currentStep.id === "business"
      ? isBusinessStepValid(state.business)
      : currentStep.id === "capitalGains"
      ? isCapitalGainsStepValid(state.capitalGains)
      : currentStep.id === "otherSources"
      ? isOtherSourcesStepValid(state.otherSources)
      : false;

  const isLastStep = safeStepIndex === steps.length - 1;

  function goNext() {
    if (!canGoNext) return;
    if (!isLastStep) {
      setStepIndex(safeStepIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Next head's step (House Property/Business/...) lands here in a
      // follow-up PR. For now, this is as far as the wizard goes.
    }
  }

  function goBack() {
    if (safeStepIndex > 0) {
      setStepIndex(safeStepIndex - 1);
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
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx <= safeStepIndex ? "bg-primary" : "bg-neutral-200"
              }`}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-neutral-500 mb-4">
        Step {safeStepIndex + 1} of {steps.length} — {currentStep.label}
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

      {currentStep.id === "salary" && (
        <SalaryStep
          value={state.salary}
          onChange={(salary) => setState((s) => ({ ...s, salary }))}
        />
      )}

      {currentStep.id === "houseProperty" && (
        <HousePropertyStep
          value={state.houseProperty}
          onChange={(houseProperty) => setState((s) => ({ ...s, houseProperty }))}
        />
      )}

      {currentStep.id === "business" && (
        <BusinessStep
          value={state.business}
          onChange={(business) => setState((s) => ({ ...s, business }))}
        />
      )}

      {currentStep.id === "capitalGains" && (
        <CapitalGainsStep
          value={state.capitalGains}
          onChange={(capitalGains) => setState((s) => ({ ...s, capitalGains }))}
        />
      )}

      {currentStep.id === "otherSources" && (
        <OtherSourcesStep
          value={state.otherSources}
          onChange={(otherSources) => setState((s) => ({ ...s, otherSources }))}
        />
      )}

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={safeStepIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="button" onClick={goNext} disabled={!canGoNext} className="gap-1">
          {!isLastStep ? "Continue" : "Continue (more steps coming soon)"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

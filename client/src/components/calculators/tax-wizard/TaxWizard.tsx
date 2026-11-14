import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BasicDetailsStep from "./steps/BasicDetailsStep";
import FYAndHeadsStep from "./steps/FYAndHeadsStep";
import SalaryStep from "./steps/SalaryStep";
import HousePropertyStep from "./steps/HousePropertyStep";
import BusinessStep from "./steps/BusinessStep";
import CapitalGainsStep from "./steps/CapitalGainsStep";
import OtherSourcesStep from "./steps/OtherSourcesStep";
import DeductionsStep from "./steps/DeductionsStep";
import ResultStep from "./steps/ResultStep";
import { useIncomeTaxWizard } from "@/features/income-tax/useIncomeTaxWizard";

/** Presentation for the income-tax feature. Workflow rules live in features/income-tax. */

export default function TaxWizard() {
  const { state, activeState, setState, steps, safeStepIndex, currentStep, canGoNext, validationMessage, goNext, goBack } = useIncomeTaxWizard();

  function handleNext() {
    if (!canGoNext || currentStep.id === "result") return;
    goNext();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function handleBack() {
    if (safeStepIndex === 0) return;
    goBack();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    // .bento — exact card treatment ported from Lovable 2026-09-04 (rounded
    // 2rem, soft ink-tinted shadow; see index.css). Replaces the old flat
    // `<Card className="p-6">`. The step-by-step flow itself (as opposed to
    // Lovable's single all-fields-at-once page) is unchanged — that's a
    // deliberate, already-shipped product decision (commit 6a026cc: cut
    // production over to this wizard specifically to cut mobile scroll
    // before the first input), not a "look" this port is meant to undo.
    <div className="bento max-w-xl mx-auto p-6 sm:p-7">
      {/* Progress indicator — compact by design. The old calculator's
          legal-citation box alone cost 488px of mobile scroll (measured
          2026-08-29); this wizard's whole per-step chrome should not repeat
          that mistake. Track/fill colours now bg-secondary/bg-ink, matching
          Lovable's progress bar exactly instead of the old neutral-200/blue. */}
      <div className="flex items-center gap-2 mb-6" role="tablist" aria-label="Wizard progress">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                idx <= safeStepIndex ? "bg-ink" : "bg-secondary"
              }`}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <p className="field-label mb-4">
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
          ageGroup={state.ageGroup}
          isNonResident={state.isNonResident}
          agriculturalIncome={state.agriculturalIncome}
          incomeHeads={state.incomeHeads}
          onFinancialYearChange={(financialYear) => setState((s) => ({ ...s, financialYear }))}
          onAgeGroupChange={(ageGroup) => setState((s) => ({ ...s, ageGroup }))}
          onIsNonResidentChange={(isNonResident) => setState((s) => ({ ...s, isNonResident }))}
          onAgriculturalIncomeChange={(agriculturalIncome) => setState((s) => ({ ...s, agriculturalIncome }))}
          onIncomeHeadsChange={(incomeHeads) => setState((s) => ({ ...s, incomeHeads }))}
        />
      )}

      {currentStep.id === "salary" && (
        <SalaryStep
          value={state.salary}
          onChange={(salary) => setState((s) => ({ ...s, salary }))}
          financialYear={state.financialYear}
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
          financialYear={state.financialYear}
          onChange={(capitalGains) => setState((s) => ({ ...s, capitalGains }))}
        />
      )}

      {currentStep.id === "otherSources" && (
        <OtherSourcesStep
          value={state.otherSources}
          onChange={(otherSources) => setState((s) => ({ ...s, otherSources }))}
        />
      )}

      {currentStep.id === "deductions" && (
        <DeductionsStep
          value={state.deductions}
          otherSources={activeState.otherSources}
          ageGroup={state.ageGroup}
          isNonResident={state.isNonResident}
          onChange={(deductions) => setState((s) => ({ ...s, deductions }))}
        />
      )}

      {currentStep.id === "result" && <ResultStep state={state} />}

      {validationMessage && <p role="alert" className="mt-4 text-sm text-debit">{validationMessage}</p>}

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-rule">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={safeStepIndex === 0}
          className="gap-1 rounded-full border-rule"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {currentStep.id !== "result" && (
          // default variant = bg-primary/text-primary-foreground, which now
          // resolves to bg-ink/text-paper exactly (index.css, 2026-09-04) —
          // only rounded-full is added here to get Lovable's pill shape.
          <Button type="button" onClick={handleNext} disabled={!canGoNext} className="gap-1 rounded-full">
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { createEmptyWizardState, getActiveWizardState } from "./model";
import { canContinue, getActiveSteps, getStepValidationMessage } from "./flow";

export function useIncomeTaxWizard() {
  const [state, setState] = useState(createEmptyWizardState);
  const [stepIndex, setStepIndex] = useState(0);
  const activeState = getActiveWizardState(state);
  const steps = getActiveSteps(state.incomeHeads);
  // Income-head edits can shorten the flow after the user goes back.
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeStepIndex];
  const canGoNext = canContinue(state, currentStep.id);

  const validationMessage = getStepValidationMessage(state, currentStep.id);

  function goNext() {
    if (!canGoNext || currentStep.id === "result") return;
    setStepIndex(safeStepIndex + 1);
  }
  function goBack() {
    if (safeStepIndex > 0) setStepIndex(safeStepIndex - 1);
  }
  return { state, activeState, setState, steps, safeStepIndex, currentStep, canGoNext, validationMessage, goNext, goBack };
}

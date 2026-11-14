import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTrackToolUse } from "@/hooks/useTrackToolUse";
import { getClientTaxAdvice, type TaxAdviceResult } from "@/lib/geminiAIService";
import { computeWizardTaxSummary, type WizardState } from "./model";
import { buildIncomeTaxSavedResult } from "./savedResult";
import { buildTaxAdviceInput, buildTaxComputationData } from "./resultExport";

/** Result orchestration, separate from result card markup and styling. */
export function useIncomeTaxResult(state: WizardState) {
  const { isAuthenticated, user, userProfile } = useAuth();
  const { toast } = useToast();
  const trackTool = useTrackToolUse();
  const [aiAdvice, setAiAdvice] = useState<TaxAdviceResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const summary = useMemo(() => computeWizardTaxSummary(state), [state]);
  const adviceInput = useMemo(() => buildTaxAdviceInput(state, summary), [state, summary]);
  const saved = useMemo(() => buildIncomeTaxSavedResult(state, summary), [state, summary]);
  const recommended = summary[summary.recommendedRegime];
  const other = summary[summary.recommendedRegime === "old" ? "new" : "old"];
  const savings = Math.max(0, other.liability.totalTax - recommended.liability.totalTax);

  // Save the complete current summary, not only changes to the recommended tax.
  // Account identity is a dependency so switching accounts cannot retain another user's result.
  useEffect(() => {
    if (!isAuthenticated) return;
    trackTool("Income Tax Calculator", `${saved.headline.label}: ${saved.headline.value} tax`, saved);
    // trackTool follows the auth context's non-memoized token getter; including its
    // changing identity would reschedule the debounce on unrelated UI renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.uid, saved]);

  // AI tax-saving tips — fetched once per visit to this step, matching how
  // TaxCalculator.tsx fetched them once per Calculate click rather than on
  // every keystroke. getClientTaxAdvice() already has its own 3-tier
  // fallback (client Gemini -> server -> local rule-based), so this never
  // blocks or breaks the page even if AI is unavailable.
  useEffect(() => {
    if (!isAuthenticated) { setAiAdvice(null); setAiLoading(false); return; }
    let cancelled = false;
    setAiLoading(true);
    setAiAdvice(null);
    getClientTaxAdvice(adviceInput)
      .then((data) => {
        if (!cancelled) setAiAdvice(data);
      })
      .catch((error) => {
        console.error("Income-tax advice failed:", error);
        if (!cancelled) setAiAdvice(null);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.uid, adviceInput]);

  async function handleDownloadPDF() {
    if (!isAuthenticated || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const displayName =
        user?.displayName ||
        [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
        state.basicDetails.name;
      const payload = buildTaxComputationData(state, summary, displayName);
      const response = await fetch("/api/tax-computation/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Tax_Computation_AY${payload.assessmentYear}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: "PDF Downloaded", description: "Detailed tax computation downloaded successfully!" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  return { isAuthenticated, summary, recommended, savings, aiAdvice, aiLoading, isGeneratingPDF, handleDownloadPDF };
}

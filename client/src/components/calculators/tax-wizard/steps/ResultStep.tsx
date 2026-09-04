import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTrackToolUse } from "@/hooks/useTrackToolUse";
import { getClientTaxAdvice, type TaxAdviceResult } from "@/lib/geminiAIService";
import ResultAuthGate from "@/components/ResultAuthGate";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, Info, Loader2, Sparkles, TrendingDown } from "lucide-react";
import { computeWizardTaxSummary, type RegimeSummary, type WizardState } from "../types";
import { buildTaxAdviceInput, buildTaxComputationData } from "../resultExport";

interface ResultStepProps {
  state: WizardState;
}

function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// Recommended regime renders as the dark "ink" verdict card — Lovable's
// bg-ink/text-paper treatment for the primary result (income-tax.tsx's
// "Recommended regime" panel) — via `dark`; the other regime stays a plain
// .bento card for comparison. Rows are inline rather than the shared Line
// component (calc/Field.tsx) because the emphasis-row-gets-a-top-border and
// dark/light dual-tone logic here don't fit Line's simpler contract. All
// figures/logic below are unchanged from before this pass — only the
// markup changed.
function RegimeCard({ label, summary, isRecommended }: { label: string; summary: RegimeSummary; isRecommended: boolean }) {
  const rows: { label: string; value: number; emphasis?: boolean }[] = [
    { label: "Gross Total Income", value: summary.grossTotalIncome },
    { label: "Standard Deduction", value: -summary.standardDeduction },
  ];
  if (summary.hraExemption > 0) rows.push({ label: "HRA Exemption", value: -summary.hraExemption });
  if (summary.ltaExemption > 0) rows.push({ label: "LTA Exemption", value: -summary.ltaExemption });
  if (summary.professionalTaxDeduction > 0)
    rows.push({ label: "Professional Tax", value: -summary.professionalTaxDeduction });
  if (summary.chapterVIADeductions > 0)
    rows.push({ label: "Chapter VI-A Deductions (80C, 80D, etc.)", value: -summary.chapterVIADeductions });
  rows.push({ label: "Taxable Income", value: summary.taxableIncome, emphasis: true });

  const { liability } = summary;
  const dark = isRecommended;

  return (
    <div
      className={
        dark
          ? "rounded-[2rem] border border-rule bg-ink p-6 text-paper space-y-3"
          : "bento p-6 space-y-3"
      }
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${dark ? "text-paper" : "text-ink"}`}>{label}</span>
        {isRecommended && (
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink bg-credit px-2.5 py-1 rounded-full">
            Recommended
          </span>
        )}
      </div>

      <div>
        {rows.map((row) => (
          <div key={row.label} className={`flex items-baseline justify-between gap-4 py-1.5 text-xs ${dark ? "border-paper/15" : "border-rule"} ${row.emphasis ? "border-t mt-1 pt-2.5" : ""}`}>
            <span className={row.emphasis ? `font-medium ${dark ? "text-paper" : "text-ink"}` : dark ? "text-paper/65" : "text-ink/60"}>{row.label}</span>
            <span className={`tabular-figures ${row.emphasis ? `font-semibold ${dark ? "text-paper" : "text-ink"}` : dark ? "text-paper/75" : "text-ink/70"}`}>
              {row.value < 0 ? "−" : ""}
              {formatINR(Math.abs(row.value))}
            </span>
          </div>
        ))}
      </div>

      <div className={`border-t pt-2 space-y-1 ${dark ? "border-paper/15" : "border-rule"}`}>
        <div className={`flex items-center justify-between text-xs ${dark ? "text-paper/65" : "text-ink/60"}`}>
          <span>Income Tax</span>
          <span className="tabular-figures">{formatINR(liability.incomeTax)}</span>
        </div>
        {liability.rebate > 0 && (
          <div className={`flex items-center justify-between text-xs ${dark ? "text-paper/65" : "text-ink/60"}`}>
            <span>Rebate (Sec 87A/156)</span>
            <span className="tabular-figures">−{formatINR(liability.rebate)}</span>
          </div>
        )}
        {liability.marginalReliefApplied && (
          <div className={`flex items-center justify-between text-xs ${dark ? "text-paper/65" : "text-ink/60"}`}>
            <span>Marginal Relief</span>
            <span className="tabular-figures">−{formatINR(liability.marginalRelief)}</span>
          </div>
        )}
        {liability.surcharge > 0 && (
          <div className={`flex items-center justify-between text-xs ${dark ? "text-paper/65" : "text-ink/60"}`}>
            <span>Surcharge ({liability.surchargeRate}%)</span>
            <span className="tabular-figures">{formatINR(liability.surcharge)}</span>
          </div>
        )}
        {liability.specialRateTax > 0 && (
          <div className={`flex items-center justify-between text-xs ${dark ? "text-paper/65" : "text-ink/60"}`}>
            <span>Tax on Capital Gains (special rate)</span>
            <span className="tabular-figures">{formatINR(liability.specialRateTax)}</span>
          </div>
        )}
        <div className={`flex items-center justify-between text-xs ${dark ? "text-paper/65" : "text-ink/60"}`}>
          <span>Health &amp; Education Cess (4%)</span>
          <span className="tabular-figures">{formatINR(liability.cess)}</span>
        </div>
      </div>

      <div className={`border-t pt-2 flex items-center justify-between ${dark ? "border-paper/15" : "border-rule"}`}>
        <span className={`text-sm font-bold ${dark ? "text-paper" : "text-ink"}`}>Total Tax Payable</span>
        <span className={`font-display text-xl font-extrabold tabular-figures ${dark ? "text-credit" : "text-ink"}`}>
          {formatINR(liability.totalTax)}
        </span>
      </div>
      <div className={`flex items-center justify-between text-xs ${dark ? "text-paper/65" : "text-ink/60"}`}>
        <span>Take-Home (after tax)</span>
        <span className="tabular-figures">{formatINR(summary.takeHome)}</span>
      </div>
    </div>
  );
}

export default function ResultStep({ state }: ResultStepProps) {
  const { isAuthenticated, user, userProfile } = useAuth();
  const { toast } = useToast();
  const trackTool = useTrackToolUse();
  const [aiAdvice, setAiAdvice] = useState<TaxAdviceResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const summary = computeWizardTaxSummary(state);
  const recommended = summary[summary.recommendedRegime];
  const other = summary[summary.recommendedRegime === "old" ? "new" : "old"];
  const savings = Math.max(0, other.liability.totalTax - recommended.liability.totalTax);

  // Both effects below must run on every render regardless of the
  // isAuthenticated branch taken further down (Rules of Hooks) — each one
  // guards itself internally instead of living after an early return.

  // Activation metric: records that this user actually reached a result, not
  // just that they opened the calculator. Debounced + idempotent per tool
  // inside useTrackToolUse, so firing it once per mount here is enough — see
  // that hook's own doc comment. This is the same event the founder's
  // returning-user/activation KPI on /admin is computed from; the wizard
  // cutover shipped without this call, which would have silently zeroed out
  // that metric for every income-tax calculation going forward.
  useEffect(() => {
    if (!isAuthenticated) return;
    const recLabel = summary.recommendedRegime === "new" ? "New Regime" : "Old Regime";
    const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
    trackTool("Income Tax Calculator", `${recLabel}: ${rs(recommended.liability.totalTax)} tax`, {
      toolKey: "income-tax",
      route: "/calculators/income-tax",
      kind: "calculator",
      headline: {
        label: `Your tax · ${recLabel}`,
        value: rs(recommended.liability.totalTax),
        hint: savings > 0 ? `${rs(savings)} less than the other regime` : undefined,
      },
      details: [
        { label: "Gross income", value: rs(summary.old.grossTotalIncome) },
        { label: "Old Regime tax", value: rs(summary.old.liability.totalTax) },
        { label: "New Regime tax", value: rs(summary.new.liability.totalTax) },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, recommended.liability.totalTax, summary.recommendedRegime]);

  // AI tax-saving tips — fetched once per visit to this step, matching how
  // TaxCalculator.tsx fetched them once per Calculate click rather than on
  // every keystroke. getClientTaxAdvice() already has its own 3-tier
  // fallback (client Gemini -> server -> local rule-based), so this never
  // blocks or breaks the page even if AI is unavailable.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setAiLoading(true);
    setAiAdvice(null);
    getClientTaxAdvice(buildTaxAdviceInput(state, summary))
      .then((data) => {
        if (!cancelled) setAiAdvice(data);
      })
      .catch(() => {
        if (!cancelled) setAiAdvice(null);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function handleDownloadPDF() {
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

  if (!isAuthenticated) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Your result</h2>
          <p className="text-sm text-ink/65 mt-1">
            Based on everything you've entered, here's your recommended regime.
          </p>
        </div>
        <ResultAuthGate
          toolName="Income Tax Calculator"
          headline={{
            label: `${summary.recommendedRegime === "old" ? "Old" : "New"} Regime Recommended`,
            value: formatINR(recommended.liability.totalTax),
            hint: savings > 0 ? `Saves ${formatINR(savings)} vs the other regime` : "Tax payable",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">Your result</h2>
        <p className="text-sm text-ink/65 mt-1">
          {summary.recommendedRegime === "old" ? "Old" : "New"} Regime saves you{" "}
          {savings > 0 ? formatINR(savings) : "the same amount"} compared to the other regime.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <RegimeCard label="Old Regime" summary={summary.old} isRecommended={summary.recommendedRegime === "old"} />
        <RegimeCard label="New Regime" summary={summary.new} isRecommended={summary.recommendedRegime === "new"} />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleDownloadPDF}
        disabled={isGeneratingPDF}
        className="w-full gap-2 rounded-2xl border-rule"
      >
        {isGeneratingPDF ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download PDF
          </>
        )}
      </Button>

      {aiLoading ? (
        <div className="bento flex items-center gap-3 p-4 text-ink">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">AI Tax Advisor is analysing your profile…</span>
          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
        </div>
      ) : aiAdvice && aiAdvice.tips?.length > 0 ? (
        <div className="bento space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-ink rounded-xl p-1.5">
                <Sparkles className="h-4 w-4 text-paper" />
              </div>
              <div>
                <h3 className="font-display font-bold text-ink text-sm">AI Tax Advisor</h3>
                <p className="text-ink/55 text-xs">AI powered · personalised for you</p>
              </div>
            </div>
            {aiAdvice.maxPossibleSaving > 0 && (
              <div className="text-right shrink-0">
                <div className="field-label !text-[9px]">Potential extra savings</div>
                <div className="text-base font-bold text-credit tabular-figures">
                  {formatINR(aiAdvice.maxPossibleSaving)}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-paper p-3 border border-rule">
            <p className="text-sm text-ink/75 italic">"{aiAdvice.summary}"</p>
          </div>

          <div>
            <div className="flex justify-between text-xs text-ink/60 mb-1">
              <span>Tax Optimisation Score</span>
              <span className="font-bold">{aiAdvice.savingsScore}/100</span>
            </div>
            <div className="h-2 bg-paper rounded-full overflow-hidden border border-rule">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  aiAdvice.savingsScore >= 80 ? "bg-credit" : aiAdvice.savingsScore >= 50 ? "bg-[hsl(var(--warning-orange))]" : "bg-debit"
                }`}
                style={{ width: `${aiAdvice.savingsScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {aiAdvice.tips.map((tip, i) => (
              <div
                key={i}
                className={`rounded-2xl bg-paper p-3 border ${
                  tip.priority === "high" ? "border-debit/30" : tip.priority === "medium" ? "border-[hsl(var(--warning-orange))]/30" : "border-rule"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {tip.priority === "high" ? (
                      <AlertTriangle className="h-4 w-4 text-debit" />
                    ) : tip.priority === "medium" ? (
                      <TrendingDown className="h-4 w-4 text-[hsl(var(--warning-orange))]" />
                    ) : (
                      <Info className="h-4 w-4 text-ink" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-ink">{tip.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tip.section && (
                          <span className="text-[10px] bg-secondary text-ink px-1.5 py-0.5 rounded font-medium">
                            {tip.section}
                          </span>
                        )}
                        {tip.potentialSaving && tip.potentialSaving > 0 && (
                          <span className="text-[10px] bg-credit/10 text-credit px-1.5 py-0.5 rounded font-bold">
                            Save {formatINR(tip.potentialSaving)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-ink/60 mt-1 leading-relaxed">{tip.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-ink/55">
        This is an estimate based on the figures you entered. Marginal relief, surcharge, and cess are
        applied automatically per current tax rules. For filing, verify with a Chartered Accountant.
      </p>
    </div>
  );
}

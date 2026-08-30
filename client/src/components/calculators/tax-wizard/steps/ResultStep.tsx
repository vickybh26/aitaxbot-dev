import { useAuth } from "@/contexts/AuthContext";
import ResultAuthGate from "@/components/ResultAuthGate";
import { computeWizardTaxSummary, type RegimeSummary, type WizardState } from "../types";

interface ResultStepProps {
  state: WizardState;
}

function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

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

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        isRecommended ? "border-primary bg-primary-light" : "border-border bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-900">{label}</span>
        {isRecommended && (
          <span className="text-[10px] font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
            RECOMMENDED
          </span>
        )}
      </div>

      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs">
            <span className={row.emphasis ? "font-medium text-neutral-800" : "text-neutral-500"}>{row.label}</span>
            <span className={`tabular-figures money ${row.emphasis ? "font-semibold text-neutral-900" : "text-neutral-600"}`}>
              {row.value < 0 ? "−" : ""}
              {formatINR(Math.abs(row.value))}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-2 space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Income Tax</span>
          <span className="tabular-figures money">{formatINR(liability.incomeTax)}</span>
        </div>
        {liability.rebate > 0 && (
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Rebate (Sec 87A/156)</span>
            <span className="tabular-figures money">−{formatINR(liability.rebate)}</span>
          </div>
        )}
        {liability.marginalReliefApplied && (
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Marginal Relief</span>
            <span className="tabular-figures money">−{formatINR(liability.marginalRelief)}</span>
          </div>
        )}
        {liability.surcharge > 0 && (
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Surcharge ({liability.surchargeRate}%)</span>
            <span className="tabular-figures money">{formatINR(liability.surcharge)}</span>
          </div>
        )}
        {liability.specialRateTax > 0 && (
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Tax on Capital Gains (special rate)</span>
            <span className="tabular-figures money">{formatINR(liability.specialRateTax)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Health &amp; Education Cess (4%)</span>
          <span className="tabular-figures money">{formatINR(liability.cess)}</span>
        </div>
      </div>

      <div className="border-t border-border pt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-neutral-900">Total Tax Payable</span>
        <span className={`text-base font-bold tabular-figures money ${isRecommended ? "text-primary" : "text-neutral-700"}`}>
          {formatINR(liability.totalTax)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>Take-Home (after tax)</span>
        <span className="tabular-figures money">{formatINR(summary.takeHome)}</span>
      </div>
    </div>
  );
}

export default function ResultStep({ state }: ResultStepProps) {
  const { isAuthenticated } = useAuth();
  const summary = computeWizardTaxSummary(state);
  const recommended = summary[summary.recommendedRegime];
  const other = summary[summary.recommendedRegime === "old" ? "new" : "old"];
  const savings = Math.max(0, other.liability.totalTax - recommended.liability.totalTax);

  if (!isAuthenticated) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Your result</h2>
          <p className="text-sm text-neutral-500 mt-1">
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
        <h2 className="text-lg font-semibold text-neutral-900">Your result</h2>
        <p className="text-sm text-neutral-500 mt-1">
          {summary.recommendedRegime === "old" ? "Old" : "New"} Regime saves you{" "}
          {savings > 0 ? formatINR(savings) : "the same amount"} compared to the other regime.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <RegimeCard label="Old Regime" summary={summary.old} isRecommended={summary.recommendedRegime === "old"} />
        <RegimeCard label="New Regime" summary={summary.new} isRecommended={summary.recommendedRegime === "new"} />
      </div>

      <p className="text-xs text-neutral-500">
        This is an estimate based on the figures you entered. Marginal relief, surcharge, and cess are
        applied automatically per current tax rules. For filing, verify with a Chartered Accountant.
      </p>
    </div>
  );
}

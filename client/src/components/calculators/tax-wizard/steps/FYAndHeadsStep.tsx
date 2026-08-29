import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { INCOME_HEAD_LABELS, type IncomeHeadKey, type WizardState } from "../types";

interface FYAndHeadsStepProps {
  financialYear: string;
  incomeHeads: WizardState["incomeHeads"];
  onFinancialYearChange: (fy: string) => void;
  onIncomeHeadsChange: (next: WizardState["incomeHeads"]) => void;
}

export function hasAtLeastOneIncomeHead(heads: WizardState["incomeHeads"]): boolean {
  return Object.values(heads).some(Boolean);
}

const HEAD_ORDER: IncomeHeadKey[] = [
  "salary",
  "houseProperty",
  "business",
  "capitalGains",
  "otherSources",
];

export default function FYAndHeadsStep({
  financialYear,
  incomeHeads,
  onFinancialYearChange,
  onIncomeHeadsChange,
}: FYAndHeadsStepProps) {
  function toggleHead(key: IncomeHeadKey) {
    onIncomeHeadsChange({ ...incomeHeads, [key]: !incomeHeads[key] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Which year, and what kind of income?</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Pick the year you're filing for, then select every type of income that applies — we'll
          only ask about what you actually need next.
        </p>
      </div>

      <div>
        <Label htmlFor="wizard-fy">Financial Year</Label>
        <Select value={financialYear} onValueChange={onFinancialYearChange}>
          <SelectTrigger id="wizard-fy" className="mt-1" data-testid="select-wizard-financial-year">
            <SelectValue placeholder="Select Financial Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024-25">FY 2024-25 / AY 2025-26</SelectItem>
            <SelectItem value="2025-26">FY 2025-26 / AY 2026-27</SelectItem>
            <SelectItem value="2026-27">FY 2026-27 (AY 2027-28) — Income Tax Act, 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">Sources of Income (select all that apply)</Label>
        <div className="space-y-2">
          {HEAD_ORDER.map((key) => {
            const { label, hint } = INCOME_HEAD_LABELS[key];
            const checked = incomeHeads[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleHead(key)}
                aria-pressed={checked}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  checked
                    ? "border-primary bg-primary-light"
                    : "border-border bg-white hover:border-neutral-400"
                }`}
              >
                <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                <span>
                  <span className="block text-sm font-medium text-neutral-900">{label}</span>
                  <span className="block text-xs text-neutral-500 mt-0.5">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        {!hasAtLeastOneIncomeHead(incomeHeads) && (
          <p className="text-xs text-neutral-500 mt-2">Select at least one to continue.</p>
        )}
      </div>
    </div>
  );
}

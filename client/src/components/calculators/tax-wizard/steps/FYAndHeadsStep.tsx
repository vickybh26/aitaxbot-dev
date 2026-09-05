import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Choice, Field, ToggleCard } from "@/components/calc/Field";
import type { AgeGroup } from "@shared/taxLiability";
import { INCOME_HEAD_LABELS, type IncomeHeadKey, type WizardState } from "../types";

interface FYAndHeadsStepProps {
  financialYear: string;
  ageGroup: AgeGroup;
  incomeHeads: WizardState["incomeHeads"];
  onFinancialYearChange: (fy: string) => void;
  onAgeGroupChange: (ageGroup: AgeGroup) => void;
  onIncomeHeadsChange: (next: WizardState["incomeHeads"]) => void;
}

const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "below60", label: "Below 60" },
  { value: "60to80", label: "60–80" },
  { value: "above80", label: "Above 80" },
];

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
  ageGroup,
  incomeHeads,
  onFinancialYearChange,
  onAgeGroupChange,
  onIncomeHeadsChange,
}: FYAndHeadsStepProps) {
  function toggleHead(key: IncomeHeadKey) {
    onIncomeHeadsChange({ ...incomeHeads, [key]: !incomeHeads[key] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Which year, and what kind of income?</h2>
        <p className="text-sm text-ink/65 mt-1">
          Pick the year you're filing for, then select every type of income that applies — we'll
          only ask about what you actually need next.
        </p>
      </div>

      <Field label="Financial Year">
        <Select value={financialYear} onValueChange={onFinancialYearChange}>
          <SelectTrigger
            id="wizard-fy"
            className="rounded-2xl border-rule bg-paper text-[15px] font-semibold"
            data-testid="select-wizard-financial-year"
          >
            <SelectValue placeholder="Select Financial Year" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-rule">
            <SelectItem value="2024-25">FY 2024-25 / AY 2025-26</SelectItem>
            <SelectItem value="2025-26">FY 2025-26 / AY 2026-27</SelectItem>
            <SelectItem value="2026-27">FY 2026-27 (AY 2027-28) — Income Tax Act, 2025</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Age Group"
        hint="Affects your tax-free income threshold under the Old Regime, and deduction limits like 80D and 80TTB."
      >
        <Choice<AgeGroup> value={ageGroup} onChange={onAgeGroupChange} options={AGE_GROUP_OPTIONS} />
      </Field>

      <div>
        <Label className="field-label mb-2 block">Sources of Income (select all that apply)</Label>
        <div className="space-y-2">
          {HEAD_ORDER.map((key) => {
            const { label, hint } = INCOME_HEAD_LABELS[key];
            const checked = incomeHeads[key];
            return (
              <ToggleCard key={key} checked={checked} onClick={() => toggleHead(key)} title={label} hint={hint} />
            );
          })}
        </div>
        {!hasAtLeastOneIncomeHead(incomeHeads) && (
          <p className="text-xs text-ink/55 mt-2">Select at least one to continue.</p>
        )}
      </div>
    </div>
  );
}

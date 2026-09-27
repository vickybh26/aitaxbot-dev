import { Field, StringMoneyInput, ToggleCard } from "@/components/calc/Field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AgeGroup } from "@shared/taxLiability";
import type { Section80GCategory } from "@shared/deductions";
import {
  computeDeductions,
  toAmount,
  SECTION_80C_CAP,
  SECTION_80CCD1B_CAP,
  type DeductionsDetails,
  type OtherSourcesDetails,
} from "../types";

interface DeductionsStepProps {
  value: DeductionsDetails;
  otherSources: OtherSourcesDetails;
  ageGroup: AgeGroup;
  onChange: (next: DeductionsDetails) => void;
}

// Deductions are entirely optional — someone with zero Chapter VI-A
// deductions (a very plausible, correct answer) must still be able to
// continue, unlike every income-head step where "nothing entered" would
// mean the step shouldn't have been reached at all.
export function isDeductionsStepValid(): boolean {
  return true;
}

type MoneyFieldKey = "section80C" | "section80D" | "section80DParents" | "section80E" | "section80CCD1B" | "section80G";

interface FieldDef {
  key: MoneyFieldKey;
  label: string;
  hint: string;
}

const SECTION_80G_CATEGORY_OPTIONS: { value: Section80GCategory; label: string }[] = [
  { value: "100-no-limit", label: "100% deduction, no limit (PM CARES, National Defence Fund, PM National Relief Fund)" },
  { value: "50-no-limit", label: "50% deduction, no limit (e.g. PM's Drought Relief Fund)" },
  { value: "100-limit", label: "100% deduction, up to 10% of adjusted income (govt./local authority funds for specified purposes)" },
  { value: "50-limit", label: "50% deduction, up to 10% of adjusted income (most registered charitable trusts/NGOs)" },
];

export default function DeductionsStep({ value, otherSources, ageGroup, onChange }: DeductionsStepProps) {
  const result = computeDeductions(value, otherSources, ageGroup);
  const isSenior = ageGroup === "60to80" || ageGroup === "above80";

  const FIELDS: FieldDef[] = [
    {
      key: "section80C",
      label: "Section 80C (PPF, ELSS, Life Insurance, etc.)",
      hint: `Capped at ₹${SECTION_80C_CAP.toLocaleString("en-IN")}/year — we'll apply the cap automatically.`,
    },
    {
      key: "section80D",
      label: "Section 80D (Health Insurance — Self & Family)",
      hint: `Capped at ₹${isSenior ? "50,000" : "25,000"}/year for your age group.`,
    },
    {
      key: "section80DParents",
      label: "Section 80D (Health Insurance — Parents)",
      hint: "A separate cap from the one above — not shared with it.",
    },
    {
      key: "section80E",
      label: "Section 80E (Education Loan Interest)",
      hint: "No upper limit — the full interest amount is deductible.",
    },
    {
      key: "section80CCD1B",
      label: "Section 80CCD(1B) — Additional NPS",
      hint: `On top of 80C, capped at ₹${SECTION_80CCD1B_CAP.toLocaleString("en-IN")}/year.`,
    },
    {
      key: "section80G",
      label: "Section 80G (Donations)",
      hint: "The rate (100%/50%) and whether the 10%-of-adjusted-income limit applies both depend on the donee category — set that below.",
    },
  ];

  function update(key: MoneyFieldKey, raw: string) {
    onChange({ ...value, [key]: raw.replace(/[^\d.]/g, "") });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Deductions</h2>
        <p className="text-sm text-ink/65 mt-1">
          These only reduce your tax under the Old Regime — the New Regime doesn't allow them. We'll
          show you both results at the end. Leave anything blank that doesn't apply to you.
        </p>
      </div>

      {toAmount(otherSources.savingsInterest) > 0 && (
        <div className="rounded-2xl border border-rule bg-paper p-3 flex items-center justify-between">
          <span className="text-sm text-ink/70">
            Section 80TTA/80TTB (Savings Interest) — applied automatically
          </span>
          <span className="text-sm font-semibold tabular-figures text-ink">
            ₹{Math.round(result.section80TTAorTTB).toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {FIELDS.map(({ key, label, hint }) => (
        <div key={key}>
          <Field label={label} hint={hint}>
            <StringMoneyInput id={`ded-${key}`} value={value[key]} onChange={(v) => update(key, v)} />
          </Field>

          {key === "section80DParents" && (
            <div className="mt-2">
              <ToggleCard
                checked={value.section80DParentsAreSenior}
                onClick={() => onChange({ ...value, section80DParentsAreSenior: !value.section80DParentsAreSenior })}
                title="Parents are senior citizens (60+)"
                hint="Raises their cap to ₹50,000/year."
              />
            </div>
          )}

          {key === "section80G" && toAmount(value.section80G) > 0 && (
            <div className="mt-3 space-y-3">
              <Field label="Donee Category (check your receipt)">
                <Select
                  value={value.section80GCategory}
                  onValueChange={(v) => onChange({ ...value, section80GCategory: v as Section80GCategory })}
                >
                  <SelectTrigger id="ded-80g-category" className="rounded-2xl border-rule bg-paper text-[15px] font-semibold">
                    <SelectValue placeholder="Select donee category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-rule">
                    {SECTION_80G_CATEGORY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <ToggleCard
                checked={value.section80GPaidInCash}
                onClick={() => onChange({ ...value, section80GPaidInCash: !value.section80GPaidInCash })}
                title="Paid in cash"
                hint="A cash donation over ₹2,000 gets NO deduction at all under Section 80G(5D) — not even the first ₹2,000."
              />
            </div>
          )}
        </div>
      ))}

      <div className="rounded-2xl border border-rule bg-paper p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-ink/70">Total Deductions (Old Regime)</span>
        <span className="font-display text-base font-bold text-ink tabular-figures">
          ₹{Math.round(result.total).toLocaleString("en-IN")}
        </span>
      </div>
      <p className="text-xs text-ink/65">
        Home loan interest isn't listed here — it already reduced your House Property income in that
        step, so it's not counted twice.
      </p>
    </div>
  );
}

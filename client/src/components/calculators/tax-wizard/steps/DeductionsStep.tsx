import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AgeGroup } from "@shared/taxLiability";
import {
  computeDeductions,
  toAmount,
  SECTION_80C_CAP,
  SECTION_80CCD1B_CAP,
  SECTION_80D_CAP_BELOW60,
  SECTION_80D_CAP_SENIOR,
  SECTION_80TTA_CAP,
  SECTION_80TTB_CAP,
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

interface FieldDef {
  key: keyof DeductionsDetails;
  label: string;
  hint: string;
}

export default function DeductionsStep({ value, otherSources, ageGroup, onChange }: DeductionsStepProps) {
  const result = computeDeductions(value, otherSources, ageGroup);
  const section80DCap = ageGroup === "below60" ? SECTION_80D_CAP_BELOW60 : SECTION_80D_CAP_SENIOR;
  const savingsInterestCap = ageGroup === "below60" ? SECTION_80TTA_CAP : SECTION_80TTB_CAP;

  const FIELDS: FieldDef[] = [
    {
      key: "section80C",
      label: "Section 80C (PPF, ELSS, Life Insurance, etc.)",
      hint: `Capped at ₹${SECTION_80C_CAP.toLocaleString("en-IN")}/year — we'll apply the cap automatically.`,
    },
    {
      key: "section80D",
      label: "Section 80D (Health Insurance Premium)",
      hint: `Capped at ₹${section80DCap.toLocaleString("en-IN")}/year for your age group.`,
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
      hint: "Some donations qualify for only 50% deduction — talk to your CA if you're unsure which applies. Also capped at 10% of your adjusted income overall; we'll apply that on the result page.",
    },
  ];

  function update(key: keyof DeductionsDetails, raw: string) {
    onChange({ ...value, [key]: raw.replace(/[^\d.]/g, "") });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Deductions</h2>
        <p className="text-sm text-neutral-500 mt-1">
          These only reduce your tax under the Old Regime — the New Regime doesn't allow them. We'll
          show you both results at the end. Leave anything blank that doesn't apply to you.
        </p>
      </div>

      {toAmount(otherSources.savingsInterest) > 0 && (
        <div className="rounded-lg border border-border bg-neutral-50 p-3 flex items-center justify-between">
          <span className="text-sm text-neutral-700">
            Section 80TTA/80TTB (Savings Interest) — applied automatically
          </span>
          <span className="text-sm font-semibold tabular-figures money">
            ₹{Math.round(result.section80TTAorTTB).toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {FIELDS.map(({ key, label, hint }) => (
        <div key={key}>
          <Label htmlFor={`ded-${key}`}>{label}</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
            <Input
              id={`ded-${key}`}
              type="text"
              inputMode="decimal"
              value={value[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">{hint}</p>
        </div>
      ))}

      <div className="rounded-lg border border-border bg-neutral-50 p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-700">Total Deductions (Old Regime)</span>
        <span className="text-base font-bold text-primary tabular-figures money">
          ₹{Math.round(result.total).toLocaleString("en-IN")}
        </span>
      </div>
      <p className="text-xs text-neutral-500">
        Home loan interest isn't listed here — it already reduced your House Property income in that
        step, so it's not counted twice.
      </p>
    </div>
  );
}

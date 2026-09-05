import { Field, StringMoneyInput } from "@/components/calc/Field";
import { computeOtherSourcesIncome, toAmount, type OtherSourcesDetails } from "../types";

interface OtherSourcesStepProps {
  value: OtherSourcesDetails;
  onChange: (next: OtherSourcesDetails) => void;
}

export function isOtherSourcesStepValid(value: OtherSourcesDetails): boolean {
  return computeOtherSourcesIncome(value) > 0;
}

interface FieldDef {
  key: keyof OtherSourcesDetails;
  label: string;
  hint: string;
}

const FIELDS: FieldDef[] = [
  {
    key: "dividendIncome",
    label: "Dividend Income (annual)",
    hint: "From shares or mutual funds — taxed at your slab rate, no special rate applies to dividends.",
  },
  {
    key: "savingsInterest",
    label: "Savings Bank Account Interest (annual)",
    hint: "Up to ₹10,000 (₹50,000 if you're a senior citizen) is deductible later under Section 80TTA/80TTB — we'll apply that automatically when we get to deductions.",
  },
  {
    key: "otherInterest",
    label: "Other Interest — FDs, RDs, Bonds (annual)",
    hint: "Fully taxable at your slab rate — unlike savings interest, this doesn't qualify for any deduction.",
  },
];

export default function OtherSourcesStep({ value, onChange }: OtherSourcesStepProps) {
  const total = computeOtherSourcesIncome(value);

  function update(key: keyof OtherSourcesDetails, raw: string) {
    onChange({ ...value, [key]: raw.replace(/[^\d.]/g, "") });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Dividend and interest income</h2>
        <p className="text-sm text-ink/65 mt-1">
          All taxed at your regular slab rate — there's no special rate here.
        </p>
      </div>

      {FIELDS.map(({ key, label, hint }) => (
        <Field key={key} label={label} hint={hint}>
          <StringMoneyInput id={`os-${key}`} value={value[key]} onChange={(v) => update(key, v)} />
        </Field>
      ))}

      <div className="rounded-2xl border border-rule bg-paper p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-ink/70">Total Other Sources Income</span>
        <span className="font-display text-base font-bold text-ink tabular-figures">
          ₹{Math.round(total).toLocaleString("en-IN")}
        </span>
      </div>
      {toAmount(value.savingsInterest) > 0 && (
        <p className="text-xs text-ink/55">
          This is added to your income now — the 80TTA/80TTB deduction on your ₹
          {toAmount(value.savingsInterest).toLocaleString("en-IN")} savings interest comes off your total
          later, in the deductions step.
        </p>
      )}
    </div>
  );
}

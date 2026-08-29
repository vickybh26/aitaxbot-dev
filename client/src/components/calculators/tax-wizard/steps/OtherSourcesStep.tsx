import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
        <h2 className="text-lg font-semibold text-neutral-900">Dividend and interest income</h2>
        <p className="text-sm text-neutral-500 mt-1">
          All taxed at your regular slab rate — there's no special rate here.
        </p>
      </div>

      {FIELDS.map(({ key, label, hint }) => (
        <div key={key}>
          <Label htmlFor={`os-${key}`}>{label}</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
            <Input
              id={`os-${key}`}
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
        <span className="text-sm font-medium text-neutral-700">Total Other Sources Income</span>
        <span className="text-base font-bold text-primary tabular-figures money">
          ₹{Math.round(total).toLocaleString("en-IN")}
        </span>
      </div>
      {toAmount(value.savingsInterest) > 0 && (
        <p className="text-xs text-neutral-500">
          This is added to your income now — the 80TTA/80TTB deduction on your ₹
          {toAmount(value.savingsInterest).toLocaleString("en-IN")} savings interest comes off your total
          later, in the deductions step.
        </p>
      )}
    </div>
  );
}

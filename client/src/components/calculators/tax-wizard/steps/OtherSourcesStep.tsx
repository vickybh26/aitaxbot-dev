import { Field, StringMoneyInput } from "@/components/calc/Field";
import { computeOtherSourcesIncome, toAmount, type OtherSourcesDetails } from "@/features/income-tax/model";

interface OtherSourcesStepProps {
  value: OtherSourcesDetails;
  onChange: (next: OtherSourcesDetails) => void;
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
    key: "depositInterest",
    label: "Bank / Post Office Deposit Interest (annual)",
    hint: "Eligible FD/RD interest from banks, qualifying co-operative banks and post offices. For resident senior citizens, this shares the ₹50,000 Section 80TTB cap with savings interest. Do not repeat it below.",
  },
  {
    key: "otherInterest",
    label: "Other Interest — Bonds / Other Sources (annual)",
    hint: "Interest not included in savings or eligible bank/post-office deposits above. Do not repeat any amount already entered.",
  },
];

export default function OtherSourcesStep({ value, onChange }: OtherSourcesStepProps) {
  const total = computeOtherSourcesIncome(value);

  function update(key: keyof OtherSourcesDetails, raw: string) {
    onChange({ ...value, [key]: raw });
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
        <p className="text-xs text-ink/65">
          This is added to your income now — the 80TTA/80TTB deduction on your ₹
          {toAmount(value.savingsInterest).toLocaleString("en-IN")} savings interest comes off your total
          later, in the deductions step.
        </p>
      )}
    </div>
  );
}

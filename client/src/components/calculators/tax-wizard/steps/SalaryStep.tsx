import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { computeGrossSalary, toAmount, type SalaryDetails } from "../types";

interface SalaryStepProps {
  value: SalaryDetails;
  onChange: (next: SalaryDetails) => void;
}

export function isSalaryStepValid(value: SalaryDetails): boolean {
  // Only Basic Salary is required — everything else is genuinely optional
  // (most private-sector payslips have no DA; not everyone gets HRA or LTA).
  return toAmount(value.basicSalary) > 0;
}

interface FieldDef {
  key: keyof SalaryDetails;
  label: string;
  hint?: string;
  required?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: "basicSalary", label: "Basic Salary (annual)", required: true },
  {
    key: "dearnessAllowance",
    label: "Dearness Allowance / DA (annual)",
    hint: "Common in government jobs. Leave blank if your payslip doesn't show this — most private-sector salaries don't have it.",
  },
  {
    key: "hraReceived",
    label: "HRA Received (annual)",
    hint: "House Rent Allowance from your employer. If you pay rent, we'll work out your exemption for this later.",
  },
  {
    key: "lta",
    label: "LTA — Leave Travel Allowance (annual)",
    hint: "Only exempt under the Old Regime, and only against actual travel fare within India.",
  },
  {
    key: "otherAllowances",
    label: "Other Taxable Allowances (annual)",
    hint: "Special allowance, conveyance, or anything else on your payslip not covered above.",
  },
  {
    key: "professionalTax",
    label: "Professional Tax Paid (annual)",
    hint: "Usually deducted monthly by your employer in states that levy it (e.g. ₹200/month in Maharashtra, Karnataka, West Bengal). Check your payslip — many states don't have this at all.",
  },
];

export default function SalaryStep({ value, onChange }: SalaryStepProps) {
  const grossSalary = computeGrossSalary(value);

  function update(key: keyof SalaryDetails, raw: string) {
    // Digits and a single decimal point only — matches the numeric-input
    // discipline from the main calculator's inputMode fix (PR #6).
    const cleaned = raw.replace(/[^\d.]/g, "");
    onChange({ ...value, [key]: cleaned });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Your salary, broken down</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Only Basic Salary is required — leave anything that doesn't apply to you blank.
        </p>
      </div>

      {FIELDS.map(({ key, label, hint, required }) => (
        <div key={key}>
          <Label htmlFor={`salary-${key}`}>
            {label}
            {required && <span className="text-destructive"> *</span>}
          </Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
            <Input
              id={`salary-${key}`}
              type="text"
              inputMode="decimal"
              value={value[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder="0"
              className="pl-7"
            />
          </div>
          {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
        </div>
      ))}

      <div className="rounded-lg border border-border bg-neutral-50 p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-700">Gross Salary (before deductions)</span>
        <span className="text-base font-bold text-primary tabular-figures money">
          ₹{grossSalary.toLocaleString("en-IN")}
        </span>
      </div>
      <p className="text-xs text-neutral-500">
        Standard deduction (₹75,000 New Regime / ₹50,000 Old Regime) and professional tax are applied
        automatically when we compute your result — you don't need to work those out yourself.
      </p>
    </div>
  );
}

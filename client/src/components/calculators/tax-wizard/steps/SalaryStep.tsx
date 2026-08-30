import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { computeGrossSalary, computeHRAExemption, toAmount, type SalaryDetails } from "../types";

interface SalaryStepProps {
  value: SalaryDetails;
  onChange: (next: SalaryDetails) => void;
}

export function isSalaryStepValid(value: SalaryDetails): boolean {
  // Only Basic Salary is required — everything else is genuinely optional
  // (most private-sector payslips have no DA; not everyone gets HRA or LTA).
  return toAmount(value.basicSalary) > 0;
}

// Excludes isMetroCity (a boolean, rendered separately as a toggle below,
// not through this string-input field list).
type AmountFieldKey = Exclude<keyof SalaryDetails, "isMetroCity">;

interface FieldDef {
  key: AmountFieldKey;
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
    hint: "House Rent Allowance from your employer. If you pay rent, we'll work out your exemption below.",
  },
  {
    key: "rentPaid",
    label: "Rent Paid (annual)",
    hint: "Needed to work out your HRA exemption — leave blank if you don't pay rent or don't receive HRA.",
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
  const hraExemption = computeHRAExemption(value);
  const showMetroToggle = toAmount(value.rentPaid) > 0 && toAmount(value.hraReceived) > 0;

  function update(key: AmountFieldKey, raw: string) {
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

      {showMetroToggle && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, isMetroCity: !value.isMetroCity })}
            aria-pressed={value.isMetroCity}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              value.isMetroCity ? "border-primary bg-primary-light" : "border-border bg-white"
            }`}
          >
            <Checkbox checked={value.isMetroCity} className="mt-0.5 pointer-events-none" />
            <span>
              <span className="block text-sm font-medium text-neutral-900">
                You live in Delhi, Mumbai, Kolkata, or Chennai
              </span>
              <span className="block text-xs text-neutral-500 mt-0.5">
                These 4 metro cities get a 50% HRA exemption limit instead of 40% elsewhere.
              </span>
            </span>
          </button>
          <div className="rounded-lg border border-border bg-neutral-50 p-3 flex items-center justify-between">
            <span className="text-sm text-neutral-700">HRA Exemption (Old Regime only)</span>
            <span className="text-sm font-semibold tabular-figures money">
              ₹{Math.round(hraExemption).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}

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

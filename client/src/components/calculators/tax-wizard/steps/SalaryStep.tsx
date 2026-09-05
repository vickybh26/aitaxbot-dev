import { Field, StringMoneyInput, ToggleCard } from "@/components/calc/Field";
import { computeGrossSalary, computeHRAExemption, toAmount, type SalaryDetails } from "../types";

interface SalaryStepProps {
  value: SalaryDetails;
  onChange: (next: SalaryDetails) => void;
  financialYear: string;
}

// Rule 279 of the notified IT Rules 2026 (verified directly against the
// gazette PDF, En-Notified-IT-Rules-2026-20-03-2026.pdf, p.1776) expanded the
// HRA metro-city list from 4 to 8 cities, effective FY 2026-27. For FY
// 2025-26 and earlier, only the original 4 cities qualified for the 50% cap
// — using the 8-city list for those years would over-exempt. The 50%/40%
// split itself (computeHRAExemption in ../types.ts) doesn't need to know the
// year; only this copy, which tells the user which cities the toggle below
// actually covers, does.
const METRO_CITIES_FROM_2026_27 = ["Mumbai", "Delhi", "Kolkata", "Chennai", "Hyderabad", "Bengaluru", "Pune", "Ahmedabad"];
const METRO_CITIES_BEFORE_2026_27 = ["Delhi", "Mumbai", "Kolkata", "Chennai"];

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

export default function SalaryStep({ value, onChange, financialYear }: SalaryStepProps) {
  const grossSalary = computeGrossSalary(value);
  const hraExemption = computeHRAExemption(value);
  const showMetroToggle = toAmount(value.rentPaid) > 0 && toAmount(value.hraReceived) > 0;
  // "2024-25" < "2025-26" < "2026-27" as plain strings, so a lexical
  // comparison is safe for the wizard's fixed set of FY options.
  const metroCitiesApply8CityRule = financialYear >= "2026-27";
  const metroCityList = metroCitiesApply8CityRule ? METRO_CITIES_FROM_2026_27 : METRO_CITIES_BEFORE_2026_27;

  function update(key: AmountFieldKey, raw: string) {
    // Digits and a single decimal point only — matches the numeric-input
    // discipline from the main calculator's inputMode fix (PR #6).
    const cleaned = raw.replace(/[^\d.]/g, "");
    onChange({ ...value, [key]: cleaned });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Your salary, broken down</h2>
        <p className="text-sm text-ink/65 mt-1">
          Only Basic Salary is required — leave anything that doesn't apply to you blank.
        </p>
      </div>

      {FIELDS.map(({ key, label, hint, required }) => (
        <Field
          key={key}
          label={required ? `${label} *` : label}
          hint={key !== "hraReceived" ? hint : undefined}
        >
          <>
            {key === "hraReceived" && (
              <div className="flex items-center justify-end mb-1.5">
                <a
                  href="/calculators/hra"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-credit hover:underline underline-offset-2 shrink-0"
                >
                  Don't know this? Use the HRA Calculator →
                </a>
              </div>
            )}
            <StringMoneyInput id={`salary-${key}`} value={value[key]} onChange={(v) => update(key, v)} />
            {key === "hraReceived" && hint && (
              <p className="mt-1.5 text-xs text-ink/55">{hint}</p>
            )}
          </>
        </Field>
      ))}

      {showMetroToggle && (
        <div className="space-y-2">
          <ToggleCard
            checked={value.isMetroCity}
            onClick={() => onChange({ ...value, isMetroCity: !value.isMetroCity })}
            title={<>You live in {metroCityList.slice(0, -1).join(", ")}, or {metroCityList[metroCityList.length - 1]}</>}
            hint={
              metroCitiesApply8CityRule
                ? `These ${metroCityList.length} metro cities (expanded from 4 under IT Rules 2026, Rule 279, effective FY 2026-27) get a 50% HRA exemption limit instead of 40% elsewhere.`
                : `These ${metroCityList.length} metro cities get a 50% HRA exemption limit instead of 40% elsewhere. (Hyderabad, Bengaluru, Pune, and Ahmedabad are added to this list only from FY 2026-27 onwards.)`
            }
          />
          <div className="rounded-2xl border border-rule bg-paper p-3 flex items-center justify-between">
            <span className="text-sm text-ink/70">HRA Exemption (Old Regime only)</span>
            <span className="text-sm font-semibold tabular-figures text-credit">
              ₹{Math.round(hraExemption).toLocaleString("en-IN")}
            </span>
          </div>
          <a
            href="/calculators/hra"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-credit hover:underline underline-offset-2 text-right"
          >
            See the full HRA breakdown & formula →
          </a>
        </div>
      )}

      <div className="rounded-2xl border border-rule bg-paper p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-ink/70">Gross Salary (before deductions)</span>
        <span className="font-display text-base font-bold text-ink tabular-figures">
          ₹{grossSalary.toLocaleString("en-IN")}
        </span>
      </div>
      <p className="text-xs text-ink/55">
        Standard deduction (₹75,000 New Regime / ₹50,000 Old Regime) and professional tax are applied
        automatically when we compute your result — you don't need to work those out yourself.
      </p>
    </div>
  );
}

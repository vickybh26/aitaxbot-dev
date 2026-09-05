import { Choice, CountInput, Field, StringMoneyInput, ToggleCard } from "@/components/calc/Field";
import { AlertTriangle } from "lucide-react";
import { computeBusinessIncome, toAmount, type BusinessDetails, type BusinessScheme } from "../types";

interface BusinessStepProps {
  value: BusinessDetails;
  onChange: (next: BusinessDetails) => void;
}

export function isBusinessStepValid(value: BusinessDetails): boolean {
  if (!value.scheme) return false;
  if (value.scheme === "44AD" || value.scheme === "44ADA") {
    return toAmount(value.digitalReceipts) + toAmount(value.cashReceipts) > 0;
  }
  // 44AE
  const count = toAmount(value.vehicleCount);
  const months = toAmount(value.monthsHeld);
  if (count <= 0 || months <= 0 || months > 12) return false;
  if (value.isHeavyVehicle && toAmount(value.avgTonnageMT) <= 0) return false;
  return true;
}

const SCHEME_OPTIONS: { value: BusinessScheme; label: string }[] = [
  { value: "44AD", label: "44AD" },
  { value: "44ADA", label: "44ADA" },
  { value: "44AE", label: "44AE" },
];

const SCHEME_DESCRIPTIONS: Record<Exclude<BusinessScheme, "">, string> = {
  "44AD": "Business (trading, manufacturing, etc.) — presumptive income at 6% or 8% of turnover.",
  "44ADA": "Profession (freelancing, consulting, doctors, etc.) — presumptive income at 50% of receipts.",
  "44AE": "Goods transport — you own or lease trucks/carriages for hire.",
};

export default function BusinessStep({ value, onChange }: BusinessStepProps) {
  const result = computeBusinessIncome(value);

  function updateAmount(key: keyof BusinessDetails, raw: string) {
    onChange({ ...value, [key]: raw.replace(/[^\d.]/g, "") });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Your business or profession</h2>
        <p className="text-sm text-ink/65 mt-1">
          Which presumptive scheme applies to you? Pick the one that matches your work.
        </p>
      </div>

      <div>
        {/* Choice requires a non-empty value type; BusinessScheme's "" (no
            selection yet) is cast through at the call site only — Choice
            itself never sees or renders an empty state specially, it just
            won't highlight any option until one is picked. */}
        <Choice<BusinessScheme>
          value={value.scheme}
          onChange={(scheme) => onChange({ ...value, scheme })}
          options={SCHEME_OPTIONS}
        />
        {value.scheme && (
          <p className="text-xs text-ink/55 mt-2">{SCHEME_DESCRIPTIONS[value.scheme]}</p>
        )}
      </div>

      {(value.scheme === "44AD" || value.scheme === "44ADA") && (
        <>
          <Field
            label={`${value.scheme === "44AD" ? "Turnover" : "Gross Receipts"} via Bank/Digital (annual)`}
            hint="Received via bank transfer, cheque, UPI, or card — before the specified date."
          >
            <StringMoneyInput id="biz-digital" value={value.digitalReceipts} onChange={(v) => updateAmount("digitalReceipts", v)} />
          </Field>

          <Field
            label="Received in Cash (annual)"
            hint={
              value.scheme === "44AD"
                ? "Taxed at 8% instead of 6% — and if cash is more than 5% of your turnover, your turnover limit for this scheme drops from ₹3 crore to ₹2 crore."
                : "Taxed the same way as digital receipts, but if cash is more than 5% of your total receipts, your limit for this scheme drops from ₹75 lakh to ₹50 lakh."
            }
          >
            <StringMoneyInput id="biz-cash" value={value.cashReceipts} onChange={(v) => updateAmount("cashReceipts", v)} />
          </Field>

          {result.totalTurnover > 0 && (
            <div className="bento space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink/60">
                  {value.scheme === "44AD" ? "Total Turnover" : "Total Receipts"}
                </span>
                <span className="font-medium tabular-figures">
                  ₹{Math.round(result.totalTurnover).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink/60">Cash Share</span>
                <span className="font-medium">{result.cashPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink/60">
                  Your Limit ({result.cashPercentage <= 5 ? "extended" : "standard"})
                </span>
                <span className="font-medium tabular-figures">
                  ₹{Math.round(result.turnoverLimit).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {value.scheme === "44AE" && (
        <>
          <Field label="Number of Goods Carriages" hint="Owned, leased, or hired at any time during the year.">
            <CountInput
              id="biz-vehicle-count"
              value={value.vehicleCount}
              onChange={(v) => onChange({ ...value, vehicleCount: v.replace(/\D/g, "") })}
            />
          </Field>

          <Field label="Months Held During the Year" hint="Average across your carriages if it varies, out of 12 months.">
            <CountInput
              id="biz-months"
              value={value.monthsHeld}
              onChange={(v) => onChange({ ...value, monthsHeld: v.replace(/\D/g, "").slice(0, 2) })}
            />
          </Field>

          <ToggleCard
            checked={value.isHeavyVehicle}
            onClick={() => onChange({ ...value, isHeavyVehicle: !value.isHeavyVehicle })}
            title="Any of these are heavy goods vehicles (over 12 tonnes)"
            hint="Heavy vehicles are taxed by tonnage; lighter ones use a flat monthly rate."
          />

          {value.isHeavyVehicle && (
            <Field label="Average Tonnage (MT)">
              <StringMoneyInput
                id="biz-tonnage"
                value={value.avgTonnageMT}
                onChange={(v) => updateAmount("avgTonnageMT", v)}
                placeholder="e.g., 15"
              />
            </Field>
          )}
        </>
      )}

      {value.scheme && (
        <div className="rounded-2xl border border-rule bg-paper p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-ink/70">Presumptive Business Income</span>
          <span className="font-display text-base font-bold text-ink tabular-figures">
            ₹{Math.round(result.presumptiveIncome).toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {result.auditWarning && (
        <div className="flex gap-2 rounded-2xl border border-notice/40 bg-warning-light p-3">
          <AlertTriangle className="h-4 w-4 text-notice shrink-0 mt-0.5" />
          <p className="text-xs text-notice">{result.auditWarning}</p>
        </div>
      )}

      <p className="text-xs text-ink/55">
        This is the minimum presumptive income the law requires. If your actual books show a higher
        profit, you can declare that instead — talk to your CA if that applies to you.
      </p>
    </div>
  );
}

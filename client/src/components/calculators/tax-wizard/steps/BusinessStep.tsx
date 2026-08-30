import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
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
        <h2 className="text-lg font-semibold text-neutral-900">Your business or profession</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Which presumptive scheme applies to you? Pick the one that matches your work.
        </p>
      </div>

      <div>
        <SegmentedToggle
          fullWidth
          options={SCHEME_OPTIONS}
          value={value.scheme}
          onChange={(scheme) => onChange({ ...value, scheme: scheme as BusinessScheme })}
        />
        {value.scheme && (
          <p className="text-xs text-neutral-500 mt-2">{SCHEME_DESCRIPTIONS[value.scheme]}</p>
        )}
      </div>

      {(value.scheme === "44AD" || value.scheme === "44ADA") && (
        <>
          <div>
            <Label htmlFor="biz-digital">
              {value.scheme === "44AD" ? "Turnover" : "Gross Receipts"} via Bank/Digital (annual)
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
              <Input
                id="biz-digital"
                type="text"
                inputMode="decimal"
                value={value.digitalReceipts}
                onChange={(e) => updateAmount("digitalReceipts", e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Received via bank transfer, cheque, UPI, or card — before the specified date.
            </p>
          </div>

          <div>
            <Label htmlFor="biz-cash">Received in Cash (annual)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
              <Input
                id="biz-cash"
                type="text"
                inputMode="decimal"
                value={value.cashReceipts}
                onChange={(e) => updateAmount("cashReceipts", e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {value.scheme === "44AD"
                ? "Taxed at 8% instead of 6% — and if cash is more than 5% of your turnover, your turnover limit for this scheme drops from ₹3 crore to ₹2 crore."
                : "Taxed the same way as digital receipts, but if cash is more than 5% of your total receipts, your limit for this scheme drops from ₹75 lakh to ₹50 lakh."}
            </p>
          </div>

          {result.totalTurnover > 0 && (
            <div className="rounded-lg border border-border bg-neutral-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  {value.scheme === "44AD" ? "Total Turnover" : "Total Receipts"}
                </span>
                <span className="font-medium tabular-figures money">
                  ₹{Math.round(result.totalTurnover).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Cash Share</span>
                <span className="font-medium">{result.cashPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  Your Limit ({result.cashPercentage <= 5 ? "extended" : "standard"})
                </span>
                <span className="font-medium tabular-figures money">
                  ₹{Math.round(result.turnoverLimit).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {value.scheme === "44AE" && (
        <>
          <div>
            <Label htmlFor="biz-vehicle-count">Number of Goods Carriages</Label>
            <Input
              id="biz-vehicle-count"
              type="text"
              inputMode="numeric"
              value={value.vehicleCount}
              onChange={(e) => onChange({ ...value, vehicleCount: e.target.value.replace(/\D/g, "") })}
              className="mt-1"
            />
            <p className="text-xs text-neutral-500 mt-1">Owned, leased, or hired at any time during the year.</p>
          </div>

          <div>
            <Label htmlFor="biz-months">Months Held During the Year</Label>
            <Input
              id="biz-months"
              type="text"
              inputMode="numeric"
              value={value.monthsHeld}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                onChange({ ...value, monthsHeld: digits });
              }}
              className="mt-1"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Average across your carriages if it varies, out of 12 months.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onChange({ ...value, isHeavyVehicle: !value.isHeavyVehicle })}
            aria-pressed={value.isHeavyVehicle}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              value.isHeavyVehicle ? "border-primary bg-primary-light" : "border-border bg-white"
            }`}
          >
            <Checkbox checked={value.isHeavyVehicle} className="mt-0.5 pointer-events-none" />
            <span>
              <span className="block text-sm font-medium text-neutral-900">
                Any of these are heavy goods vehicles (over 12 tonnes)
              </span>
              <span className="block text-xs text-neutral-500 mt-0.5">
                Heavy vehicles are taxed by tonnage; lighter ones use a flat monthly rate.
              </span>
            </span>
          </button>

          {value.isHeavyVehicle && (
            <div>
              <Label htmlFor="biz-tonnage">Average Tonnage (MT)</Label>
              <Input
                id="biz-tonnage"
                type="text"
                inputMode="decimal"
                value={value.avgTonnageMT}
                onChange={(e) => updateAmount("avgTonnageMT", e.target.value)}
                placeholder="e.g., 15"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {value.scheme && (
        <div className="rounded-lg border border-border bg-neutral-50 p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Presumptive Business Income</span>
          <span className="text-base font-bold text-primary tabular-figures money">
            ₹{Math.round(result.presumptiveIncome).toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {result.auditWarning && (
        <div className="flex gap-2 rounded-lg border border-[hsl(var(--warning-orange)/0.4)] bg-warning-light p-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning">{result.auditWarning}</p>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        This is the minimum presumptive income the law requires. If your actual books show a higher
        profit, you can declare that instead — talk to your CA if that applies to you.
      </p>
    </div>
  );
}

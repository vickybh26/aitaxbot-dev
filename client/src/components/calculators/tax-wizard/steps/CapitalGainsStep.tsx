import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LTCG_EQUITY_EXEMPTION } from "@shared/taxLiability";
import { computeCapitalGainsTax, toAmount, type CapitalGainsDetails } from "../types";

interface CapitalGainsStepProps {
  value: CapitalGainsDetails;
  onChange: (next: CapitalGainsDetails) => void;
}

export function isCapitalGainsStepValid(value: CapitalGainsDetails): boolean {
  return (
    toAmount(value.stcgEquity) > 0 || toAmount(value.ltcgEquity) > 0 || toAmount(value.debtFundGains) > 0
  );
}

export default function CapitalGainsStep({ value, onChange }: CapitalGainsStepProps) {
  const result = computeCapitalGainsTax(value);

  function update(key: keyof CapitalGainsDetails, raw: string) {
    onChange({ ...value, [key]: raw.replace(/[^\d.]/g, "") });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Capital gains from shares & mutual funds</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Only listed shares and mutual funds — property, gold, and other assets aren't covered here.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-neutral-900">Equity Shares & Equity Mutual Funds</p>

        <div>
          <Label htmlFor="cg-stcg">Short-Term Gains (held under 12 months)</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
            <Input
              id="cg-stcg"
              type="text"
              inputMode="decimal"
              value={value.stcgEquity}
              onChange={(e) => update("stcgEquity", e.target.value)}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">Taxed flat at 20% — Section 111A.</p>
        </div>

        <div>
          <Label htmlFor="cg-ltcg">Long-Term Gains (held 12 months or more)</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
            <Input
              id="cg-ltcg"
              type="text"
              inputMode="decimal"
              value={value.ltcgEquity}
              onChange={(e) => update("ltcgEquity", e.target.value)}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            First ₹{LTCG_EQUITY_EXEMPTION.toLocaleString("en-IN")} exempt every year, 12.5% on the rest —
            Section 112A.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-neutral-900">Debt Mutual Funds</p>
        <div>
          <Label htmlFor="cg-debt">Gains from Debt Funds (any holding period)</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₹</span>
            <Input
              id="cg-debt"
              type="text"
              inputMode="decimal"
              value={value.debtFundGains}
              onChange={(e) => update("debtFundGains", e.target.value)}
              placeholder="0"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Bought on or after 1 April 2023? These no longer get any long-term rate — the entire gain is
            taxed at your regular income slab rate, however long you held it.
          </p>
        </div>
      </div>

      {(toAmount(value.stcgEquity) > 0 || toAmount(value.ltcgEquity) > 0) && (
        <div className="rounded-lg border border-border bg-neutral-50 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Short-Term Tax (20%)</span>
            <span className="font-medium tabular-figures money">
              ₹{Math.round(result.stcgTax).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Long-Term Taxable (after exemption)</span>
            <span className="font-medium tabular-figures money">
              ₹{Math.round(result.ltcgTaxable).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Long-Term Tax (12.5%)</span>
            <span className="font-medium tabular-figures money">
              ₹{Math.round(result.ltcgTax).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium text-neutral-700">Total Capital Gains Tax</span>
            <span className="text-base font-bold text-primary tabular-figures money">
              ₹{Math.round(result.total).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}

      {toAmount(value.debtFundGains) > 0 && (
        <p className="text-xs text-neutral-500">
          Your ₹{toAmount(value.debtFundGains).toLocaleString("en-IN")} debt fund gain will be added to
          your total income and taxed at your slab rate — it isn't shown separately above because it
          doesn't get a special rate.
        </p>
      )}
    </div>
  );
}

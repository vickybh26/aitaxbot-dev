import { Field, StringMoneyInput } from "@/components/calc/Field";
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
        <h2 className="font-display text-lg font-bold">Capital gains from shares & mutual funds</h2>
        <p className="text-sm text-ink/65 mt-1">
          Only listed shares and mutual funds — property, gold, and other assets aren't covered here.
        </p>
      </div>

      <div className="bento space-y-4 p-4">
        <p className="text-sm font-medium text-ink">Equity Shares & Equity Mutual Funds</p>

        <Field label="Short-Term Gains (held under 12 months)" hint="Taxed flat at 20% — Section 111A.">
          <StringMoneyInput id="cg-stcg" value={value.stcgEquity} onChange={(v) => update("stcgEquity", v)} />
        </Field>

        <Field
          label="Long-Term Gains (held 12 months or more)"
          hint={`First ₹${LTCG_EQUITY_EXEMPTION.toLocaleString("en-IN")} exempt every year, 12.5% on the rest — Section 112A.`}
        >
          <StringMoneyInput id="cg-ltcg" value={value.ltcgEquity} onChange={(v) => update("ltcgEquity", v)} />
        </Field>
      </div>

      <div className="bento space-y-4 p-4">
        <p className="text-sm font-medium text-ink">Debt Mutual Funds</p>
        <Field
          label="Gains from Debt Funds (any holding period)"
          hint="Bought on or after 1 April 2023? These no longer get any long-term rate — the entire gain is taxed at your regular income slab rate, however long you held it."
        >
          <StringMoneyInput id="cg-debt" value={value.debtFundGains} onChange={(v) => update("debtFundGains", v)} />
        </Field>
      </div>

      {(toAmount(value.stcgEquity) > 0 || toAmount(value.ltcgEquity) > 0) && (
        <div className="bento space-y-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/60">Short-Term Tax (20%)</span>
            <span className="font-medium tabular-figures">
              ₹{Math.round(result.stcgTax).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/60">Long-Term Taxable (after exemption)</span>
            <span className="font-medium tabular-figures">
              ₹{Math.round(result.ltcgTaxable).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/60">Long-Term Tax (12.5%)</span>
            <span className="font-medium tabular-figures">
              ₹{Math.round(result.ltcgTax).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-rule">
            <span className="text-sm font-medium text-ink/70">Total Capital Gains Tax</span>
            <span className="font-display text-base font-bold text-ink tabular-figures">
              ₹{Math.round(result.total).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}

      {toAmount(value.debtFundGains) > 0 && (
        <p className="text-xs text-ink/55">
          Your ₹{toAmount(value.debtFundGains).toLocaleString("en-IN")} debt fund gain will be added to
          your total income and taxed at your slab rate — it isn't shown separately above because it
          doesn't get a special rate.
        </p>
      )}
    </div>
  );
}

/**
 * TaxPosition — the headline panel: what this person owes, under which
 * regime, and what the other regime would have cost.
 *
 * Ported from Lovable's TaxPosition.tsx (2026-09-06) with one deliberate
 * departure. Lovable's mock renders "₹62,000 already paid · ₹22,240 still to
 * go" over a progress bar. AiTaxBot does not track tax already paid — there is
 * no TDS/advance-tax ledger anywhere in the product — so that row and its bar
 * are not rendered rather than filled with a plausible-looking number. The
 * third card is likewise "saved by the regime you chose", which is exactly
 * what the stored figures support, not Lovable's broader "regime + deductions
 * already claimed", which they do not.
 */

import {
  useSavedResults,
  parseRupees,
  detailValue,
  inr,
  regimeFromHeadline,
  timeAgo,
} from "./useSavedResults";
import Panel, { EmptyState, PanelAction, PanelLink } from "./Panel";

/** "2026-27" → "2027-28". Returns null for anything unexpected. */
export function ayFromFy(fy: string | null | undefined): string | null {
  if (!fy) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(fy.trim());
  if (!m) return null;
  const start = Number(m[1]) + 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export default function TaxPosition() {
  const { data: saved = [], isLoading } = useSavedResults();
  const result = saved.find((r) => r.toolKey === "income-tax");

  const fy = (result?.inputs?.financialYear as string | undefined) || null;
  const ay = ayFromFy(fy);
  const regime = regimeFromHeadline(result?.headline.label);
  const oldTax = parseRupees(detailValue(result, "Old Regime tax"));
  const newTax = parseRupees(detailValue(result, "New Regime tax"));
  const gross = detailValue(result, "Gross income");
  const gap = oldTax !== null && newTax !== null ? Math.abs(oldTax - newTax) : null;

  const title = `Your tax position${fy ? ` — FY ${fy}` : ""}`;
  const meta = result
    ? `Last computed ${timeAgo(result.updatedAt)}${ay ? ` · AY ${ay}` : ""}`
    : "Nothing computed yet";

  return (
    <Panel
      id="overview"
      title={title}
      meta={isLoading ? "Loading your figures…" : meta}
      action={<PanelAction href="/calculators/income-tax">{result ? "Recompute" : "Compute"}</PanelAction>}
    >
      {!result ? (
        <EmptyState
          what="Run the income tax calculator once and your position — tax payable, which regime wins, and by how much — stays here for you."
          next={<PanelLink href="/calculators/income-tax">Compute this year's tax →</PanelLink>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <p className="field-label">Tax payable</p>
            <p className="tabular-figures mt-1 font-display text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold leading-none text-ink">
              {result.headline.value}
            </p>
            {gross && (
              <p className="mt-2 text-xs text-ink/55">
                On gross income of <span className="tabular-figures">{gross}</span>
              </p>
            )}
            <p className="mt-2 text-xs text-ink/45">
              Your own figures, computed on this device — nothing is filed or paid from here.
            </p>
          </div>

          {regime && oldTax !== null && newTax !== null ? (
            <div className="rounded-2xl bg-paper p-5 sm:col-span-1">
              <p className="field-label">Better regime</p>
              <p className="mt-1 font-display text-2xl font-extrabold capitalize text-ink">
                {regime} regime
              </p>
              {gap !== null && gap > 0 && (
                <p className="mt-2 text-xs text-ink/55">
                  {inr(gap)} cheaper than the {regime === "new" ? "old" : "new"} regime this year.
                </p>
              )}
              <dl className="mt-3 space-y-1 text-xs text-ink/65">
                <div className="flex justify-between">
                  <dt>Old regime</dt>
                  <dd className="tabular-figures font-semibold">{inr(oldTax)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>New regime</dt>
                  <dd className="tabular-figures font-semibold">{inr(newTax)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="rounded-2xl bg-paper p-5 sm:col-span-1">
              <p className="field-label">Better regime</p>
              <p className="mt-2 text-xs text-ink/55">
                Recompute to see both regimes side by side — this saved result predates the
                comparison being stored.
              </p>
            </div>
          )}

          {/* Green is reserved for money the user gains. A regime choice that
              costs less genuinely is that; nothing else on this panel earns it. */}
          <div className="rounded-2xl bg-credit-wash p-5 sm:col-span-1">
            <p className="field-label">Saved by regime choice</p>
            <p className="tabular-figures mt-1 font-display text-2xl font-extrabold text-credit">
              {gap !== null ? inr(gap) : "—"}
            </p>
            <p className="mt-2 text-xs text-ink/65">
              {gap !== null && regime
                ? `What the ${regime} regime saves you against the ${regime === "new" ? "old" : "new"} one on these figures.`
                : "Run the comparison to see the gap between the two regimes."}
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

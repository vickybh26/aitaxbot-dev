/**
 * LeftToClaim — how much of each deduction ceiling this person has actually
 * used, and what the unused part is worth.
 *
 * Ported from Lovable's LeftToClaim.tsx (2026-09-06). Two things had to change
 * for it to be true rather than merely pretty:
 *
 * 1. THE REGIME GATE. 80C, 80D and 80CCD(1B) are Old Regime deductions. Under
 *    the New Regime they are not available at all, so telling a New Regime
 *    filer they have "₹55,000 unclaimed — ₹11,000 of tax" would be advice to
 *    chase a deduction they cannot take. When the saved calculation says the
 *    New Regime won, this panel says so instead of listing ceilings.
 *
 * 2. THE CEILINGS ARE THE CALCULATOR'S OWN. The 80D cap mirrors
 *    TaxCalculator.tsx's `isSenior ? 1,00,000 : 50,000` exactly, so the two
 *    screens can't disagree about the same taxpayer. (The statute is finer
 *    than that — 25k self + 50k senior parents — which is why the caption
 *    says "ceiling applied by the calculator" rather than stating it as the
 *    law in the abstract.)
 *
 * The tax-saved figure is an estimate at the top slab and is captioned as one.
 * We do not store the user's marginal rate, and inventing one per row would be
 * a worse lie than a labelled assumption.
 */

import {
  useSavedResults,
  parseInput,
  inr,
  regimeFromHeadline,
} from "./useSavedResults";
import Panel, { EmptyState, PanelLink } from "./Panel";

/** Slab used for the "worth this much in tax" estimate. Labelled everywhere it shows. */
const ESTIMATE_SLAB = 0.3;

interface Slot {
  section: string;
  title: string;
  examples: string;
  limit: number;
  claimed: number | null;
  href: string;
}

export default function LeftToClaim() {
  const { data: saved = [] } = useSavedResults();
  const result = saved.find((r) => r.toolKey === "income-tax");
  const regime = regimeFromHeadline(result?.headline.label);
  const inputs = result?.inputs ?? {};

  const isSenior = inputs.ageGroup === "60to80" || inputs.ageGroup === "above80";
  const has80DSeniorCap = isSenior;

  const claimed80C = parseInput(inputs.section80C);
  const claimed80D = parseInput(inputs.section80D);
  const claimedNps = parseInput(inputs.section80CCD1B);
  const knowsClaims =
    "section80C" in inputs || "section80D" in inputs || "section80CCD1B" in inputs;

  const slots: Slot[] = [
    {
      section: "80C",
      title: "Investments & life cover",
      examples: "ELSS · PPF · EPF · life premium · tuition fees",
      limit: 150_000,
      claimed: claimed80C,
      href: "/calculators/income-tax",
    },
    {
      section: "80D",
      title: "Health insurance",
      examples: has80DSeniorCap
        ? "Self, family and senior-citizen parents"
        : "Self, family and parents",
      limit: has80DSeniorCap ? 100_000 : 50_000,
      claimed: claimed80D,
      href: "/calculators/income-tax",
    },
    {
      section: "80CCD(1B)",
      title: "NPS — the extra slice",
      examples: "Over and above the 80C ceiling",
      limit: 50_000,
      claimed: claimedNps,
      href: "/calculators/nps",
    },
  ];

  // ── New Regime: none of the above applies ────────────────────────────────
  if (regime === "new") {
    return (
      <Panel
        id="deductions"
        title="Left to claim"
        meta="You're on the New Regime this year"
      >
        <div className="rounded-2xl border border-rule bg-paper px-5 py-6">
          <p className="text-sm text-ink/75">
            80C, 80D and 80CCD(1B) are Old Regime deductions — under the New Regime they
            can't be claimed, so there's no ceiling left to fill.
          </p>
          <p className="mt-3 text-sm text-ink/65">
            What still counts under the New Regime: the{" "}
            <span className="font-semibold text-ink">₹75,000 standard deduction</span> on
            salary, and your employer's NPS contribution under{" "}
            <span className="font-semibold text-ink">80CCD(2)</span>.
          </p>
          <div className="mt-4">
            <PanelLink href="/calculators/income-tax">
              Compare both regimes again →
            </PanelLink>
          </div>
        </div>
      </Panel>
    );
  }

  // ── Nothing computed yet, or a saved result from before deductions were
  //    stored: show the ceilings as information, with no invented progress ──
  if (!result || !knowsClaims) {
    return (
      <Panel
        id="deductions"
        title="Left to claim"
        meta="Old Regime ceilings — run the calculator to see your own gap"
      >
        <ul className="space-y-3">
          {slots.map((slot) => (
            <li
              key={slot.section}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 rounded-2xl border border-rule bg-paper px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {slot.section} · {slot.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink/55">{slot.examples}</p>
              </div>
              <span className="tabular-figures shrink-0 text-xs font-semibold text-ink/65">
                up to {inr(slot.limit)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <PanelLink href="/calculators/income-tax">
            {result ? "Recompute to fill these in →" : "Work out your tax →"}
          </PanelLink>
        </div>
      </Panel>
    );
  }

  // ── Old Regime, with the user's own figures ──────────────────────────────
  const rows = slots.map((slot) => {
    const claimed = slot.claimed ?? 0;
    const unclaimed = Math.max(0, slot.limit - claimed);
    return { ...slot, claimed, unclaimed, taxSaved: Math.round(unclaimed * ESTIMATE_SLAB) };
  });
  const totalTaxSaved = rows.reduce((sum, r) => sum + r.taxSaved, 0);

  return (
    <Panel
      id="deductions"
      title="Left to claim"
      meta={
        totalTaxSaved > 0
          ? `Fill these and you'd cut roughly ${inr(totalTaxSaved)} off your bill`
          : "Every ceiling is already full"
      }
    >
      <ul className="space-y-4">
        {rows.map((row) => {
          const pct = Math.min(100, Math.round((row.claimed / row.limit) * 100));
          return (
            <li key={row.section}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {row.section} · {row.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink/55">{row.examples}</p>
                </div>
                <span className="tabular-figures shrink-0 text-xs text-ink/55">
                  {inr(row.claimed)} / {inr(row.limit)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-credit" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink/65">
                  {row.unclaimed === 0 ? (
                    "Fully claimed."
                  ) : (
                    <>
                      <span className="tabular-figures font-semibold">{inr(row.unclaimed)}</span>{" "}
                      unclaimed — about{" "}
                      <span className="tabular-figures font-semibold text-credit">
                        {inr(row.taxSaved)}
                      </span>{" "}
                      of tax
                    </>
                  )}
                </p>
                <PanelLink href={row.href}>Work it out →</PanelLink>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11px] text-ink/45">
        Tax figures are estimated at the 30% slab and assume the Old Regime, which your last
        calculation chose. Your actual saving depends on your slab.
      </p>
    </Panel>
  );
}

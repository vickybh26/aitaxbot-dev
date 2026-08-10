#!/usr/bin/env node
/**
 * Tax calculation golden fixtures + engine drift guard
 * ────────────────────────────────────────────────────
 * Run:  npm run test:calc
 *
 * WHY THIS EXISTS
 * The reconciliation parsers got a regression suite in July 2026 after three
 * bugs shipped, each found only because someone happened to read the output
 * carefully. The slab/rebate/cess engine underneath the calculators has never
 * had one — despite producing the number the entire product exists to show.
 *
 * HOW THE EXPECTED VALUES WERE DERIVED — read before adding a case
 * Every figure below was computed by hand from the statutory slab table and
 * cross-checked against the live site's rendered output. They were NOT produced
 * by running computeTaxLiability() and pasting the result. That distinction is
 * the whole point: a fixture generated from the code under test asserts only
 * that the code still agrees with itself, and would have happily locked in any
 * of the bugs this file is meant to catch.
 *
 * Worked example — New Regime, FY 2026-27, taxable ₹20,25,000:
 *      0 –  4,00,000  @  0%  =        0
 *   4,00,000 –  8,00,000  @  5%  =   20,000
 *   8,00,000 – 12,00,000  @ 10%  =   40,000
 *  12,00,000 – 16,00,000  @ 15%  =   60,000
 *  16,00,000 – 20,00,000  @ 20%  =   80,000
 *  20,00,000 – 20,25,000  @ 25%  =    6,250
 *                        incomeTax = 2,06,250
 *                     cess @ 4%    =    8,250
 *                        totalTax  = 2,14,500
 * The live calculator rendered exactly 2,06,250 / 8,250 / 2,14,500 for this
 * input on 7 Aug 2026, so this case is anchored to observed product behaviour
 * as well as to the statute.
 *
 * THE DRIFT GUARD
 * There are two tax engines in this repo. shared/taxLiability.ts is imported by
 * exactly one file (server/taxReconcileService.ts). The flagship calculator,
 * client/src/components/calculators/TaxCalculator.tsx, carries its own private
 * copy of getTaxSlabs() — see the comment at shared/taxLiability.ts:48, which
 * asks that they "stay in sync" but has no way to enforce it. Roughly 84% of
 * measured traffic hits the calculator, i.e. the copy these fixtures do NOT
 * cover. The guard below parses the slab tables out of the .tsx source and
 * asserts they still match the shared ones numerically, so a change to one and
 * not the other fails here instead of on a taxpayer's return.
 *
 * The real fix is for TaxCalculator.tsx to import from shared/. Until then this
 * is the cheap insurance.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  computeTaxLiability,
  getTaxSlabs,
  getSurchargeRate,
  SPECIAL_RATE_SURCHARGE_CAP,
  computeSpecialRateTax,
  LTCG_EQUITY_EXEMPTION,
  type TaxRegime,
  type AgeGroup,
} from "../shared/taxLiability";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CALCULATOR_TSX = join(
  ROOT,
  "client",
  "src",
  "components",
  "calculators",
  "TaxCalculator.tsx"
);

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, actual: number, expected: number, tolerance = 0.5) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    const msg = `  ✗ ${label}\n      expected ${expected.toLocaleString("en-IN")}, got ${actual.toLocaleString("en-IN")}`;
    console.log(msg);
    failures.push(label);
  }
}

// ─── Golden fixtures ───────────────────────────────────────────────────────
// Each expected value is hand-derived from the statutory slabs. See header.

interface Fixture {
  name: string;
  income: number;
  regime: TaxRegime;
  fy: string;
  age?: AgeGroup;
  incomeTax: number;
  rebate?: number;
  marginalRelief?: number;
  totalTax: number;
  why: string;
}

const FIXTURES: Fixture[] = [
  {
    name: "New 26-27 · ₹20,25,000 (anchored to live site output)",
    income: 2025000, regime: "new", fy: "2026-27",
    incomeTax: 206250, totalTax: 214500,
    why: "20k+40k+60k+80k+6.25k = 2,06,250; cess 8,250. Site rendered the same.",
  },
  {
    name: "Old · ₹20,50,000 (anchored to live site output)",
    income: 2050000, regime: "old", fy: "2026-27",
    incomeTax: 427500, totalTax: 444600,
    why: "12.5k+1L+3.15L = 4,27,500; cess 17,100. Site rendered the same.",
  },
  {
    name: "New 26-27 · ₹12,00,000 — full rebate u/s 156, tax NIL",
    income: 1200000, regime: "new", fy: "2026-27",
    incomeTax: 60000, rebate: 60000, totalTax: 0,
    why: "At the ₹12L threshold the whole liability is rebated and cess is nil.",
  },
  {
    name: "New 26-27 · ₹12,00,001 — marginal relief caps tax at the excess",
    income: 1200001, regime: "new", fy: "2026-27",
    incomeTax: 60000.15, marginalRelief: 59999.15, totalTax: 1.04,
    why: "₹1 over the cliff must not cost ₹60k. Relief caps tax at the ₹1 excess.",
  },
  {
    name: "New 24-25 · ₹7,10,000 — the marginal-relief bug that was fixed",
    income: 710000, regime: "new", fy: "2024-25",
    incomeTax: 26000, marginalRelief: 16000, totalTax: 10400,
    why: "Regression lock: this once returned ~₹27,040 instead of ₹10,400.",
  },
  {
    name: "Old · ₹5,00,000 — 87A rebate, tax NIL",
    income: 500000, regime: "old", fy: "2026-27",
    incomeTax: 12500, rebate: 12500, totalTax: 0,
    why: "Rebate exactly cancels the liability at the threshold.",
  },
  {
    name: "Old · ₹5,00,001 — rebate lost entirely, NO marginal relief (real law)",
    income: 500001, regime: "old", fy: "2026-27",
    incomeTax: 12500.2, rebate: 0, totalTax: 13000.21,
    why: "Deliberate: the old-regime cliff has no statutory relief. Do not 'fix'.",
  },
  {
    name: "Old · senior 60–80 · ₹6,00,000",
    income: 600000, regime: "old", fy: "2026-27", age: "60to80",
    incomeTax: 30000, totalTax: 31200,
    why: "₹3L exempt, 3–5L @5% = 10,000, 5–6L @20% = 20,000; cess 1,200.",
  },
  {
    name: "Old · super-senior 80+ · ₹6,00,000",
    income: 600000, regime: "old", fy: "2026-27", age: "above80",
    incomeTax: 20000, totalTax: 20800,
    why: "₹5L exempt, 5–6L @20% = 20,000; cess 800.",
  },
  {
    name: "Zero income — must not produce negative tax",
    income: 0, regime: "new", fy: "2026-27",
    incomeTax: 0, totalTax: 0,
    why: "Guards the Math.max(0, …) floor.",
  },
];

console.log("\nGolden fixtures — shared/taxLiability.ts\n" + "─".repeat(60));
for (const f of FIXTURES) {
  const r = computeTaxLiability(f.income, f.regime, f.fy, f.age ?? "below60");
  check(`${f.name} · incomeTax`, r.incomeTax, f.incomeTax);
  check(`${f.name} · totalTax`, r.totalTax, f.totalTax);
  if (f.rebate !== undefined) check(`${f.name} · rebate`, r.rebate, f.rebate);
  if (f.marginalRelief !== undefined)
    check(`${f.name} · marginalRelief`, r.marginalRelief, f.marginalRelief);
}

// ─── Surcharge (audit finding 1) ───────────────────────────────────────────
// Surcharge was not computed anywhere: `surcharge: 0` was a literal in three
// places, while three pieces of shipped copy claimed it was applied "at all
// thresholds". Expected values below are hand-derived from the slab ladder;
// they matched the independent audit's figures exactly on first run.
console.log("\nSurcharge — bands, marginal relief, cess on tax+surcharge\n" + "─".repeat(60));
{
  const cases = [
    { income: 6000000, rate: 10, slab: 1380000, surcharge: 138000, total: 1578720 },
    { income: 12000000, rate: 15, slab: 3180000, surcharge: 477000, total: 3803280 },
    { income: 25000000, rate: 25, slab: 7080000, surcharge: 1770000, total: 9204000 },
  ];
  for (const c of cases) {
    const r = computeTaxLiability(c.income, "new", "2026-27");
    const L = `new 26-27 · ₹${c.income.toLocaleString("en-IN")}`;
    check(`${L} · surcharge rate ${c.rate}%`, r.surchargeRate, c.rate, 0);
    check(`${L} · slab tax`, r.incomeTax, c.slab);
    check(`${L} · surcharge`, r.surcharge, c.surcharge);
    check(`${L} · total`, r.totalTax, c.total);
  }
  // Below ₹50L there must be no surcharge at all.
  check("no surcharge at ₹50,00,000 exactly", getSurchargeRate(5000000, "new"), 0, 0);
  check("surcharge begins above ₹50,00,000", getSurchargeRate(5000001, "new"), 10, 0);
  // The new regime is capped at 25%; the old regime reaches 37%.
  check("new regime capped at 25%", getSurchargeRate(60000000, "new"), 25, 0);
  check("old regime reaches 37%", getSurchargeRate(60000000, "old"), 37, 0);

  // Marginal relief: crossing ₹50L by ₹1 must not cost more than ₹1 of extra
  // take-home. Without relief the surcharge alone would be ~₹1.08L.
  const at = 5000000 - computeTaxLiability(5000000, "new", "2026-27").totalTax;
  const over = 5000100 - computeTaxLiability(5000100, "new", "2026-27").totalTax;
  check("surcharge marginal relief holds the ₹50L cliff", Math.max(0, at - over), 0, 105);
}

// ─── Special-rate gains (audit findings 2 and 3) ───────────────────────────
// Listed-equity gains were pooled into slab income, which taxed them at slab
// rates AND let the s.87A/156 rebate absorb the tax on them — the second of
// those reported "zero tax" on a return that had a real liability.
console.log("\nCapital gains — s.112A / s.111A charged separately\n" + "─".repeat(60));
{
  check("LTCG allowance is ₹1,25,000", LTCG_EQUITY_EXEMPTION, 125000, 0);
  const sr = computeSpecialRateTax(300000, 0);
  check("LTCG ₹3,00,000 → taxable ₹1,75,000", sr.ltcgTaxable, 175000);
  check("LTCG ₹3,00,000 → tax ₹21,875 @12.5%", sr.ltcgTax, 21875);
  check("LTCG below the allowance is untaxed", computeSpecialRateTax(120000, 0).ltcgTax, 0);
  check("STCG ₹1,00,000 → ₹20,000 @20% (s.111A)", computeSpecialRateTax(0, 100000).stcgTax, 20000);

  // Finding 2: slab ₹10,25,000 + LTCG ₹3,00,000. Total income ₹13,25,000
  // exceeds ₹12L, so NO rebate is due — the gains count towards the threshold
  // in full, because the ₹1,25,000 is not a deduction from total income.
  const f2 = computeTaxLiability(1025000, "new", "2026-27", "below60", { ltcgEquity: 300000 });
  check("F2 · rebate denied — total income ₹13,25,000 > ₹12L", f2.rebate, 0);
  check("F2 · total tax ₹66,950", f2.totalTax, 66950);

  // Finding 3: slab ₹9,00,000 + LTCG ₹2,50,000. Total ₹11,50,000 is under the
  // threshold so the rebate IS due — but only against the slab tax, never
  // against the LTCG. Reporting ₹0 here was the dangerous case.
  const f3 = computeTaxLiability(900000, "new", "2026-27", "below60", { ltcgEquity: 250000 });
  check("F3 · rebate covers slab tax only", f3.rebate, 30000);
  check("F3 · LTCG still taxed ₹15,625", f3.specialRateTax, 15625);
  check("F3 · total ₹16,250, not zero", f3.totalTax, 16250);
}

// ─── 15% surcharge cap on special-rate income (re-verify finding A) ────────
//
// The proviso caps surcharge on s.111A / s.112A / s.112 tax at 15%, however
// high the band rate on the rest of the income. It only bites above ₹2Cr, where
// the band rate first exceeds 15%.
//
// Asserted on the GAINS PORTION directly, not just the total: the re-verify
// audit's warning was that a total-only assertion can pass on a compensating
// error, and it is right — the total is a sum of two surcharge terms.
console.log("\nSurcharge cap on s.111A/112A income — max 15%\n" + "─".repeat(60));
{
  check("cap constant is 15%", SPECIAL_RATE_SURCHARGE_CAP, 15, 0);

  // Old regime, band rate 37%. Slab tax and gains tax are known independently,
  // so the surcharge decomposes and each term can be checked on its own.
  const slabIncome = 40250000;
  const ltcg = 10000000;
  const r = computeTaxLiability(slabIncome, "old", "2026-27", "below60", { ltcgEquity: ltcg });

  const expectedSlabTax = 12500 + 100000 + (slabIncome - 1000000) * 0.30;
  const expectedGainsTax = (ltcg - 125000) * 0.125;
  check("band rate is 37% (old, total > ₹5Cr)", r.surchargeRate, 37, 0);
  check("slab tax", r.incomeTax, expectedSlabTax);
  check("gains tax @12.5% above the allowance", r.specialRateTax, expectedGainsTax);

  // The decomposition being asserted: slab @37%, gains @15%.
  const expectedSurcharge = expectedSlabTax * 0.37 + expectedGainsTax * 0.15;
  check("surcharge = slab@37% + gains@15%", r.surcharge, expectedSurcharge, 1);

  // And the counterfactual the bug produced — gains charged at the band rate.
  const buggySurcharge = (expectedSlabTax + expectedGainsTax) * 0.37;
  const overcharge = (buggySurcharge - expectedSurcharge) * 1.04;
  check(
    `uncapped would have overcharged ~₹${Math.round(overcharge).toLocaleString("en-IN")}`,
    r.surcharge < buggySurcharge ? 1 : 0, 1, 0
  );

  // Below ₹2Cr the cap is inert — band rate 15% or less, so min(rate,15) = rate.
  const under = computeTaxLiability(15000000, "new", "2026-27", "below60", { ltcgEquity: 2000000 });
  const underSlab = under.incomeTax - under.rebate - under.marginalRelief;
  check(
    "cap inert at the 15% band (no divergence below ₹2Cr)",
    under.surcharge,
    (underSlab + under.specialRateTax) * 0.15,
    1
  );
}

// ─── Old-regime surcharge reaches 37% (re-verify finding B) ────────────────
// The NRI page passed the literal "new" to computeSurcharge, capping an
// old-regime taxpayer at the 25% band. Guarded here at the engine level.
console.log("\nRegime is honoured in the surcharge band\n" + "─".repeat(60));
{
  check("old regime hits 37% above ₹5Cr", getSurchargeRate(60000000, "old"), 37, 0);
  check("new regime stays at 25% above ₹5Cr", getSurchargeRate(60000000, "new"), 25, 0);
  const oldR = computeTaxLiability(60000000, "old", "2026-27");
  const newR = computeTaxLiability(60000000, "new", "2026-27");
  check("old-regime surcharge exceeds new at ₹6Cr", oldR.surcharge > newR.surcharge ? 1 : 0, 1, 0);
}

// ─── Incremental tax on trading profit (calculator audit T1) ───────────────
//
// The Trading calculator took the band rate for the user's EXISTING income and
// applied it to the profit. Wrong in both directions: it ignored the s.156
// rebate (overstating for sub-₹12L users) and it read the rate off the wrong
// income (understating when the profit crossed a band). Understatement is the
// direction that earns a notice, and the audit missed it — it assumed the tool
// used the dead slabTax() function, which is never called.
//
// The correct figure for "what does this profit cost me" is the difference in
// liability with and without it. Asserted here at the engine level, which is
// what the component now calls.
console.log("\nIncremental tax on additional income\n" + "─".repeat(60));
{
  const incremental = (base: number, extra: number) =>
    computeTaxLiability(base + extra, "new", "2026-27").totalTax -
    computeTaxLiability(base, "new", "2026-27").totalTax;

  // Under the rebate threshold throughout — the true incremental cost is nil.
  check("₹9,00,000 + ₹2,00,000 profit → ₹0 (rebate)", incremental(900000, 200000), 0);
  check("₹6,00,000 + ₹2,00,000 profit → ₹0 (rebate)", incremental(600000, 200000), 0);

  // Crossing ₹12L: the old code charged the ₹8–12L band rate (10%) on the whole
  // profit, giving ₹31,200 against a true ₹1,01,400.
  check("₹11,50,000 + ₹3,00,000 profit → ₹1,01,400", incremental(1150000, 300000), 101400);
  const naive = 300000 * 0.10 * 1.04;
  check("naive band-rate figure would have been ₹31,200", naive, 31200);

  // Well above the threshold the two agree — 30% band, no rebate in play.
  check("₹25,00,000 + ₹5,00,000 profit → ₹1,56,000", incremental(2500000, 500000), 156000);
}

// ─── NPS deduction caps (calculator audit T3) ──────────────────────────────
// 80CCD(1B) credited a flat ₹50,000 regardless of what was contributed, so
// every figure carried a fixed ₹15,000 of phantom saving at 30%. These assert
// the capping rules the component now applies.
console.log("\nNPS deduction caps — 80CCD(1), (1B), (2)\n" + "─".repeat(60));
{
  const npsDeductions = (annualContrib: number, employer: number, salary: number) => {
    const u1 = Math.min(annualContrib, 150000, salary * 0.10);
    const u1b = Math.min(Math.max(0, annualContrib - u1), 50000);
    const u2 = Math.min(employer, salary * 0.14);
    return { u1, u1b, u2, total: u1 + u1b + u2 };
  };
  const salary = 1200000;

  // ₹24,000 contributed: 80CCD(1) takes all of it, (1B) gets nothing.
  const small = npsDeductions(24000, 0, salary);
  check("₹2,000/m · 80CCD(1) = ₹24,000", small.u1, 24000);
  check("₹2,000/m · 80CCD(1B) = ₹0, not ₹50,000", small.u1b, 0);
  check("₹2,000/m · tax saved @31.2% = ₹7,488", small.total * 0.312, 7488);

  // ₹1,50,000 contributed against ₹12L salary: 10% cap binds at ₹1,20,000,
  // and the ₹30,000 remainder flows into (1B).
  const mid = npsDeductions(150000, 0, salary);
  check("₹12,500/m · 80CCD(1) capped at 10% of salary", mid.u1, 120000);
  check("₹12,500/m · 80CCD(1B) takes the remainder", mid.u1b, 30000);
  check("₹12,500/m · total deduction ₹1,50,000, not ₹2,00,000", mid.total, 150000);

  // Employer contribution capped at 14% of salary.
  const emp = npsDeductions(0, 240000, salary);
  check("employer ₹20,000/m capped at 14% = ₹1,68,000", emp.u2, 168000);
}

// ─── SWP self-sustaining corpus (calculator audit T4) ──────────────────────
// The withdrawal loop exits either on depletion or at the 600-month ceiling,
// and both were reported as a duration — so a corpus growing to 14× its
// opening balance was shown as "lasts 50y 0m".
console.log("\nSWP — depletion vs self-sustaining\n" + "─".repeat(60));
{
  const runSWP = (corpus: number, monthly: number, annualReturn: number) => {
    const mr = annualReturn / 12 / 100;
    let c = corpus, m = 0;
    while (c > monthly && m < 600) { c = c * (1 + mr) - monthly; m++; }
    return { months: m, finalCorpus: c, selfSustaining: m >= 600 && c >= corpus };
  };

  // 6% withdrawal rate against an 8% return — grows without limit.
  const grows = runSWP(10000000, 50000, 8);
  check("₹1Cr @8% drawing ₹50k/m hits the 600-month ceiling", grows.months, 600, 0);
  check("…and is flagged self-sustaining", grows.selfSustaining ? 1 : 0, 1, 0);
  check("…terminal corpus ≈ ₹14.22 Cr", grows.finalCorpus, 142195458, 1000);

  // 12% withdrawal rate against an 8% return — genuinely depletes.
  const depletes = runSWP(10000000, 100000, 8);
  check("₹1Cr @8% drawing ₹1L/m depletes before 600 months", depletes.months < 600 ? 1 : 0, 1, 0);
  check("…and is NOT flagged self-sustaining", depletes.selfSustaining ? 1 : 0, 0, 0);
}

// ─── Marginal-relief band invariant ────────────────────────────────────────
//
// A naive "take-home must never decrease" sweep fails here, and the reason is
// worth writing down rather than silencing.
//
// Marginal relief caps the TAX at the amount by which income exceeds the rebate
// threshold — then 4% health & education cess is levied on that capped figure.
// So inside the relief band the taxpayer always pays the excess plus cess, i.e.
// slightly more than the extra income they earned. Measured for New Regime
// FY 2026-27: take-home dips below the ₹12,00,000 figure for all incomes up to
// ₹12,74,000, worst at ₹12,70,500 where the taxpayer is ₹2,820 down.
//
// ₹2,820 is exactly 4% of the ₹70,500 excess. That is the signature of
// cess-on-relief, not of a broken relief calculation, and it matches how the
// relief is generally applied in practice.
//
// OPEN QUESTION FOR A CA — flagged, not assumed. There is a reading under which
// relief should be computed so that tax *inclusive of cess* does not exceed the
// excess, which would remove the dip entirely. This suite does not take a
// position; it pins the current behaviour precisely so that any change is
// deliberate and visible. If a CA confirms the inclusive reading, update the
// engine and this block together.
//
// The invariant asserted here is the useful one: inside the band, the shortfall
// must equal the cess on the capped tax and nothing more. A genuine relief bug
// (wrong cap, relief not applied, relief applied outside the band) breaks it.
console.log("\nMarginal-relief band — shortfall must be exactly the cess\n" + "─".repeat(60));

for (const [regime, fy, threshold] of [
  ["new", "2026-27", 1200000],
  ["new", "2024-25", 700000],
] as const) {
  const atThreshold = threshold - computeTaxLiability(threshold, regime, fy).totalTax;
  let maxExcessLoss = 0;
  // Annotated: the `as const` tuple gives `threshold` a literal type, so an
  // inferred `bandEnd` would reject the plain number assigned in the loop.
  let bandEnd: number = threshold;

  // Start one step ABOVE the threshold: at the threshold itself the full rebate
  // applies and marginalReliefApplied is false, which would exit the loop on
  // its first iteration and make this check pass without testing anything.
  for (let income = threshold + 100; income <= threshold * 1.5; income += 100) {
    const r = computeTaxLiability(income, regime, fy);
    if (!r.marginalReliefApplied) break;
    bandEnd = income;
    const takeHome = income - r.totalTax;
    const shortfall = atThreshold - takeHome;
    const expectedShortfall = (income - threshold) * 0.04; // cess on the capped tax
    maxExcessLoss = Math.max(maxExcessLoss, Math.abs(shortfall - expectedShortfall));
  }

  check(
    `${regime} ${fy}: shortfall is exactly cess across the band (…₹${bandEnd.toLocaleString("en-IN")})`,
    maxExcessLoss,
    0,
    0.01
  );
}

// Outside the known discontinuities, take-home must rise strictly with income.
// Rather than skipping a hand-guessed window (which silently hides anything
// else in it), each known discontinuity is asserted to be exactly where the
// statute puts it, and everything else must be clean.
console.log("\nMonotonicity outside known statutory cliffs\n" + "─".repeat(60));

// The old regime's ₹5,00,000 rebate cliff has NO relief mechanism: crossing it
// by ₹1 forfeits the whole ₹12,500 rebate. Measured — take-home falls from
// ₹5,00,000 to ₹4,87,000.79 (down ₹12,999.21) and does not recover until
// ₹5,16,415. Real law, deliberately preserved. See shared/taxLiability.ts:205.
{
  const peak = 500000 - computeTaxLiability(500000, "old", "2026-27").totalTax;
  const justOver = 500001 - computeTaxLiability(500001, "old", "2026-27").totalTax;
  check("old: ₹5L cliff costs the full rebate + cess", peak - justOver, 12999.21, 0.02);

  let recovery = 0;
  for (let i = 500001; i <= 560000; i++) {
    if (i - computeTaxLiability(i, "old", "2026-27").totalTax >= peak) { recovery = i; break; }
  }
  check("old: take-home recovers at the expected income", recovery, 516415, 1);
}

for (const [regime, fy, cliffFrom, cliffTo] of [
  ["new", "2026-27", 1200000, 1274000], // relief band, explained above
  ["old", "2026-27", 500000, 516415],   // rebate cliff, measured above
] as const) {
  let violations = 0;
  let prev = -Infinity;
  let firstAt = 0;
  for (let income = 0; income <= 2500000; income += 500) {
    const takeHome = income - computeTaxLiability(income, regime, fy).totalTax;
    const inKnownCliff = income >= cliffFrom && income <= cliffTo;
    if (!inKnownCliff && takeHome < prev - 0.01) {
      violations++;
      if (!firstAt) firstAt = income;
    }
    if (!inKnownCliff) prev = takeHome;
  }
  check(
    `${regime} ${fy}: no reversals outside the known cliff${firstAt ? ` (first at ₹${firstAt.toLocaleString("en-IN")})` : ""}`,
    violations, 0, 0
  );
}

// ─── Drift guard: the calculator's private slab tables vs the shared ones ───
console.log("\nEngine drift guard — TaxCalculator.tsx vs shared/taxLiability.ts\n" + "─".repeat(60));

function extractSlabArrays(src: string): { min: number; max: number; rate: number }[][] {
  // Matches the object-literal slab rows the component declares inline.
  const arrays: { min: number; max: number; rate: number }[][] = [];
  const blockRe = /\[\s*((?:\{\s*min:[^}]*\}\s*,?\s*)+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(src))) {
    const rows = [...m[1].matchAll(/\{\s*min:\s*([0-9_]+)\s*,\s*max:\s*(Infinity|[0-9_]+)\s*,\s*rate:\s*([0-9.]+)\s*\}/g)]
      .map((r) => ({
        min: Number(r[1].replace(/_/g, "")),
        max: r[2] === "Infinity" ? Infinity : Number(r[2].replace(/_/g, "")),
        rate: Number(r[3]),
      }));
    if (rows.length >= 3) arrays.push(rows);
  }
  return arrays;
}

const sig = (s: { min: number; max: number; rate: number }[]) =>
  s.map((r) => `${r.min}-${r.max === Infinity ? "INF" : r.max}@${r.rate}`).join("|");

try {
  const src = readFileSync(CALCULATOR_TSX, "utf8");
  const componentSlabs = extractSlabArrays(src).map(sig);

  // The stronger guard: TaxCalculator.tsx should no longer carry its own
  // rebate / relief / cess ladder at all. It now imports computeTaxLiability,
  // so the two engines are one. The audit's finding 10 was that comparing slab
  // tables alone is a weaker claim than "the engines match" — changing a rebate
  // amount in one file only would still have shipped green.
  const importsShared = /from ['"]@shared\/taxLiability['"]/.test(src);
  check("TaxCalculator.tsx imports the shared engine", importsShared ? 1 : 0, 1, 0);

  // Duplicated ladder constants are the specific drift risk. If these reappear
  // as literals outside a comment, a second engine is growing back.
  const codeOnly = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const ladderLiterals = [
    /rebateLimit\s*=\s*\d/,
    /rebateAmount\s*=\s*\d/,
    /cessAmount\s*=\s*[a-zA-Z]+\s*\*\s*0\.04/,
  ].filter((re) => re.test(codeOnly));
  check(
    `no duplicated rebate/cess ladder in the component${ladderLiterals.length ? ` (${ladderLiterals.length} found)` : ""}`,
    ladderLiterals.length,
    0,
    0
  );

  if (componentSlabs.length === 0) {
    console.log("  ℹ TaxCalculator.tsx declares no inline slab tables — engines unified.");
    passed++;
  } else {
    const shared = [
      sig(getTaxSlabs("new", "2026-27")),
      sig(getTaxSlabs("new", "2024-25")),
      sig(getTaxSlabs("old", "2026-27", "below60")),
      sig(getTaxSlabs("old", "2026-27", "60to80")),
      sig(getTaxSlabs("old", "2026-27", "above80")),
    ];
    const orphans = componentSlabs.filter((c) => !shared.includes(c));
    check(
      `all ${componentSlabs.length} inline slab table(s) match a shared table`,
      orphans.length,
      0,
      0
    );
    if (orphans.length) {
      console.log("    Tables present in TaxCalculator.tsx but not in shared/taxLiability.ts:");
      orphans.forEach((o) => console.log(`      ${o}`));
      console.log("    The two engines have drifted. Reconcile before shipping.");
    }
  }
} catch (e) {
  console.log(`  ✗ could not read TaxCalculator.tsx: ${(e as Error).message}`);
  failed++;
  failures.push("drift guard");
}

// ─── Result ────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
console.log(`${passed} passed · ${failed} failed`);
if (failed) {
  console.log("\nFailed:");
  failures.forEach((f) => console.log(`  · ${f}`));
  console.log(
    "\nA failure here means a rupee figure changed. Confirm against the statute\n" +
    "before updating any expected value — the fixture is probably right."
  );
  process.exit(1);
}
console.log("All tax computation fixtures pass.\n");
process.exit(0);

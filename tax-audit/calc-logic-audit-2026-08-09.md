# Calculator & tax-logic audit — 9 Aug 2026

Scope: slab maths, rebate, marginal relief, cess, surcharge, capital gains, HRA,
Chapter VI-A caps, the NRI calculator, and the dual-engine drift guard.

Every figure below was produced by a Bash-executed script that implements the
statutory ladder from scratch (`/tmp/indep/statute.mjs`, `nri.mjs`, `hra.mjs`).
No expected value was derived by calling the application's own functions.

## Baseline (workflow step 1)

- `npm run test:calc` — **could not run as-scripted.** `node_modules` contains
  `@esbuild/win32-x64`; this Linux sandbox needs `@esbuild/linux-x64`, so `tsx`
  aborts before loading the test. Re-run under `node --experimental-strip-types`
  on a copy: **32 passed · 0 failed.** The engine's own fixtures are green.
- `npm run test:parsers` — **RED, 2 assertions failing:**
  - `papa-ais.pdf` `interestFromSavings`: got 5,745, expected 3,507
  - `rohit-ais.pdf` `mutualFundTransactions`: got 55,324, expected ≥ 95,000

Per the stated workflow I have **made no code changes** and added no fixtures —
the parser baseline is red, and the request was for analysis. Findings only.

---

## What the code gets right (checked, not assumed)

Worth stating plainly, because several of these look like bugs and are not:

- Rebate is applied **before** cess, and cess is levied on the net figure —
  `shared/taxLiability.ts:209-214`. Correct sequencing.
- The old-regime ₹5,00,000 cliff has no marginal relief and loses the whole
  ₹12,500. Verified as real law, deliberately preserved (`taxLiability.ts:205`).
  Independent check: peak take-home ₹5,00,000 → ₹4,87,000.79 at ₹5,00,001, a
  ₹12,999.21 drop, recovering at ₹5,16,415. Matches the fixture exactly.
- Marginal relief exists at **both** new-regime thresholds (₹12L and the ₹7L
  branch for FY ≤ 2024-25) and caps tax at the excess. Correct.
- Standard deduction is gated on salary income and capped at the salary figure
  (`TaxCalculator.tsx:295-304`). A freelancer with no salary correctly gets nil.
- The empty-extract guard works: `taxReconcileService.ts:2137` tests
  `Object.values(aisFinal).some(v => v != null)` and `:2285-2298` raises
  "could not be read — figures are missing, not zero". The July 2026 trap is shut.
- The drift guard passes: all 5 inline slab tables in `TaxCalculator.tsx` match a
  shared table.

---

## FINDING 1 — Surcharge is not computed anywhere in the main calculator

```text
CLAIM     Tax payable for taxable income above ₹50,00,000.
AUTHORITY Finance Act rate schedule (unchanged by ITA 2025): 10% >₹50L,
          15% >₹1Cr, 25% >₹2Cr, 37% >₹5Cr (old regime); capped at 25% under
          s.202 / erstwhile 115BAC. Marginal relief at each threshold.
EXPECTED  taxable ₹60,00,000  new regime
            slab            13,80,000
            surcharge @10%    1,38,000
            cess 4%             60,720
            total           15,78,720
          taxable ₹1,20,00,000 → 38,03,280
          taxable ₹2,50,00,000 → 92,04,000
ACTUAL    14,35,200 / 33,07,200 / 73,63,200
          (client/src/components/calculators/TaxCalculator.tsx — grep for
           "surcharge" returns only literals: `surcharge: 0` at :755, :781, :808)
VERDICT   MISMATCH — understates by ₹1,43,520 (9.1%) at ₹60L,
          ₹4,96,080 (13.0%) at ₹1.2Cr, ₹18,40,800 (20.0%) at ₹2.5Cr.
```

`shared/taxLiability.ts` has no surcharge code either, so the reconciliation
engine inherits the same gap. Note `server/seedTaxRates.ts` *does* carry
`surchargeSlabsNew` / `surchargeSlabsOld` — the data exists and nothing consumes it.

**This is worse than a silent bug because the product asserts the opposite:**

- `client/src/pages/Calculators.tsx:52` — "Includes Section 87A rebate, marginal
  relief, and **surcharge at all thresholds**."
- `client/src/pages/IncomeTaxCalculator.tsx:35` — "Our calculator automatically
  computes marginal relief for all these scenarios" (listing ₹50L/₹1Cr/₹2Cr/₹5Cr).
- `client/src/data/blogPosts.ts:1669` — "AiTaxBot's calculator applies marginal
  relief automatically at all thresholds: ₹12L, ₹50L, ₹1Cr, ₹2Cr, ₹5Cr."

FIX Implement surcharge + threshold marginal relief in `shared/taxLiability.ts`
and have `TaxCalculator.tsx` import it. Until then, pull the three marketing
claims above — a user at ₹60L is being told the number includes surcharge when
it cannot.

## FINDING 2 — Capital gains are pooled into slab income

```text
CLAIM     Tax on salary ₹11,00,000 + listed-equity LTCG ₹3,00,000, new regime.
AUTHORITY s.112A — LTCG on equity: first ₹1,25,000 exempt, balance @12.5%,
          charged separately from slab income. s.111A — STCG @20%.
EXPECTED  normal 10,25,000 → 42,500 ; LTCG (3,00,000−1,25,000)@12.5% = 21,875
          + 4% cess = 66,950
ACTUAL    81,900 — capitalGainsIncome is summed into totalIncome at
          TaxCalculator.tsx:282 and taxed at slab rates
VERDICT   MISMATCH — overstates by ₹14,950.
```

FIX Segregate special-rate income before the slab call. There is no separate
LTCG/STCG field in the form at all, so the input itself needs splitting.

## FINDING 3 — s.87A/156 rebate is extended to LTCG

```text
CLAIM     Tax on salary ₹9,00,000 + LTCG ₹2,50,000, new regime.
AUTHORITY Rebate is not available against tax charged under s.112A.
EXPECTED  normal tax 22,500 − rebate 22,500 = 0 ; LTCG 1,25,000@12.5% = 15,625
          + cess = 16,250
ACTUAL    0 — pooled taxable 10,75,000 ≤ ₹12L, so TaxCalculator.tsx:380 grants
          full rebate against the whole liability
VERDICT   MISMATCH — understates by ₹16,250, and reports "zero tax".
```

This is the dangerous direction: the user files on a nil-tax reading.
The product's own blog already documents the correct rule
(`blogPosts.ts:1796`: "This income is NOT eligible for the Section 87A rebate").

## FINDING 4 — HRA uses gross salary where the statute says basic + DA

```text
CLAIM     HRA exemption computed at TaxCalculator.tsx:314-316.
AUTHORITY Sch. II Sl.2 (ex s.10(13A) r/w Rule 2A): least of HRA received;
          rent − 10% of salary; 50%/40% of salary — where "salary" means
          basic + DA, not gross salary income.
EXPECTED  basic 2,00,000, gross 10,00,000, HRA 5,00,000, rent 6,00,000, metro
            min(5,00,000 ; 5,80,000 ; 1,00,000) = 1,00,000
ACTUAL    min(5,00,000 ; 5,00,000 ; 5,00,000) = 5,00,000   (:316 passes
          salaryIncome, the gross figure, as the basic)
VERDICT   MISMATCH — over-exempts by ₹4,00,000; ~₹1,24,800 of tax at 30%+cess.
          Errs the other way on basic-heavy packages: basic 6,00,000 /
          gross 12,00,000 under-exempts by ₹60,000 (₹18,720 overstated).
```

The **standalone** `HRACalculator.tsx:115-116` takes a proper `basicSalary`
input and is correct. Only the embedded copy in the main calculator is wrong.

FIX Add a basic + DA field to the main calculator, or reuse HRACalculator's logic.

## FINDING 5 — Chapter VI-A caps: three deductions are uncapped

```text
CLAIM     totalDeductions, old regime — TaxCalculator.tsx:331-334.
AUTHORITY 80D: ₹25,000 self/family (₹50,000 if senior) + ₹25,000 parents
          (₹50,000 if senior); ₹1,00,000 absolute maximum.
          80G: qualifying limit 10% of adjusted GTI for most donees, and
          50%/100% deduction rates.
          80TTB: ₹50,000 for 60+, in place of 80TTA's ₹10,000.
ACTUAL    :322 section80D  — no cap
          :326 section80G  — no cap, no adjusted-GTI limit, no 50% haircut
          :329 otherDeductions — no cap at all
          80TTB absent; a senior citizen is capped at ₹10,000 under 80TTA (:324)
VERDICT   MISMATCH. 80C (:321 ₹1.5L), 80TTA (:324 ₹10k), 80CCD(1B) (:325 ₹50k)
          and s.24(b) (:327 ₹2L) are all correctly capped — the caps were
          clearly intended and three were missed.
```

`otherDeductions` being unbounded lets any user drive taxable income to zero.

## FINDING 6 — The NRI calculator's slab ladder matches no statutory year

```text
CLAIM     calculateTaxOnSalaryAndRental — NRIIncomeTaxCalculator.tsx:42-48.
          Page is titled "NRI Income Tax Calculator FY 2026-27" (:147).
AUTHORITY FY 2026-27 (ITA 2025 s.202): 0/4L nil, 4–8L 5%, 8–12L 10%,
          12–16L 15%, 16–20L 20%, 20–24L 25%, >24L 30%.
EXPECTED / ACTUAL (independent ladder vs the code, verbatim):
          income        expected      actual      delta
          ₹5,00,000       5,000      10,000     +5,000
          ₹8,00,000      20,000      30,000    +10,000
          ₹12,00,000     60,000      70,000    +10,000
          ₹15,00,000   1,05,000    1,15,000    +10,000
          ₹20,00,000   2,00,000    2,65,000    +65,000
          ₹25,00,000   3,30,000    4,15,000    +85,000
VERDICT   MISMATCH at every income above the exemption. It is a hybrid: the
          FY 2024-25 lower bands (₹3L nil, 5% to ₹7L) grafted onto FY 2025-26
          upper bands, with a 10% band running ₹7L–₹12L that exists in neither
          Act. It has no 20% or 25% band at all, so it jumps 15% → 30% at ₹15L.
```

## FINDING 7 — NRI deductions are collected, displayed, and never applied

```text
CLAIM     80C / 80D / home-loan-interest inputs on the NRI calculator.
EXPECTED  Old regime: tax computed on income net of deductions.
ACTUAL    :78-79 compute totalDeductions and taxableIncome. taxableIncome is
          referenced exactly twice in the file — its own definition (:79) and
          a display row (:537). The tax at :51 is computed from
          totalSalaryAndRental, the GROSS figure. Entering ₹1,50,000 of 80C
          changes the displayed "Taxable Income" and changes the tax by ₹0.
VERDICT   MISMATCH — deductions are inert. Overstates tax for every old-regime
          NRI user who enters one.
```

## FINDING 8 — NRI: LTCG ₹1,25,000 exemption missing; surcharge bands wrong

```text
CLAIM     :63  ltcgEquityTax = ltcgEquity * 0.125
AUTHORITY s.112A — first ₹1,25,000 of equity LTCG is exempt.
ACTUAL    No ₹1,25,000 allowance; grep for "125000" in the file returns 0 hits.
VERDICT   MISMATCH — overstates by ₹15,625 + cess for anyone with equity LTCG.

CLAIM     :91  surcharge = totalIncome > 10000000 ? tax * 0.25 : 0
AUTHORITY 10% >₹50L, 15% >₹1Cr, 25% >₹2Cr; 15% cap on s.111A/112A gains;
          marginal relief at each threshold.
ACTUAL    Nil below ₹1Cr (misses the 10% band entirely); flat 25% above ₹1Cr
          (should be 15% until ₹2Cr); no marginal relief; no 15% gains cap.
VERDICT   MISMATCH — understates ₹50L–₹1Cr, overstates ₹1Cr–₹2Cr.
```

## FINDING 9 — Stale Firestore rebate for AY 2026-27

```text
CLAIM     server/seedTaxRates.ts, AY 2026-27 (FY 2025-26), new regime.
AUTHORITY Budget 2025 raised the rebate to ₹60,000 / ₹12,00,000 with effect
          from FY 2025-26 — i.e. AY 2026-27 is the year it first applies.
ACTUAL    rebateLimit "700000", maxRebate "25000" at :177, :191, :205 (all three
          age groups). AY 2027-28 correctly carries 1200000 at :263, :277.
          Defaults in the getter are also stale: :401-403 fall back to
          rebateLimit 700000 / maxRebate 25000.
VERDICT   MISMATCH. Currently latent — `getTaxRates` is consumed only by
          seedTaxRates.ts:391 itself and nothing in the request path. Third
          engine, wrong numbers, one import away from being live.
```

## FINDING 10 — The drift guard covers slab tables only

```text
CLAIM     scripts/test-tax-calculations.ts asserts the two engines agree.
ACTUAL    extractSlabArrays() regex-matches `{min,max,rate}` literals and
          compares slab signatures. It does not compare the rebate limits,
          the relief mechanism, the cess rate, or the branch conditions —
          all of which are independently duplicated at
          TaxCalculator.tsx:356-443 vs taxLiability.ts:140-215.
VERDICT   Guard passes and is honest about its scope, but "the engines match"
          is a stronger claim than it tests. Changing rebateAmount in one file
          only would ship green.
```

FIX Either have `TaxCalculator.tsx` import `computeTaxLiability` (the header of
the fixture file already names this as the real fix), or extend the guard to
run both implementations over a swept income range and diff the outputs.

---

## Minor

- `TaxCalculator.tsx:227-247` — `getTaxSlabs`'s old-regime branch falls through
  to the **above-80** table (₹5L exempt, the most generous) for any `ageGroup`
  that is not `'below60'` or `'60to80'`. Currently unreachable: the state is
  typed and defaults to `'below60'` (:184). One loose `updateFormData` call away
  from silently granting a ₹5L exemption.
- New regime models only the standard deduction (:337). Employer NPS under
  s.80CCD(2) / ITA 2025 s.125 is allowable in the new regime and is not
  modelled, so the new regime is shown as slightly worse than it is.
- `TradingTaxCalculator.tsx:247, :908, :1049` use 12.5% for LTCG and the slab
  rate for STCG on US stocks — correct for unlisted/foreign shares. The page
  carries an explicit "estimate only … surcharge thresholds" disclaimer (:1021),
  which is the right call given Finding 1.

## Suggested order of work

1. Finding 3 and Finding 7 — both produce an understated or wrong liability the
   user would file on. Finding 3 shows "zero tax".
2. Finding 1 — largest rupee error, and directly contradicted by shipped copy.
   Pull the marketing claims today even if the fix takes longer.
3. Findings 2, 4, 5, 6, 8.
4. Finding 10, then re-point `TaxCalculator.tsx` at `shared/`.
5. Findings 9 — delete the third engine or fix it.

Each fix needs a fixture in `scripts/test-tax-calculations.ts` and a green run
before it ships. The two red parser assertions should be resolved first so the
suite is trustworthy as a gate.

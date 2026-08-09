# Re-verification of the 9 Aug calculator audit

Commit under test: `17e39b5` "Fix ten tax-computation defects found in the 9 Aug
calculator audit". Working tree clean, no uncommitted changes.

Method: the independent statutory engine from the first pass was extended to
model special-rate gains and the surcharge proviso (`/tmp/v2/statute2.mjs` —
written from the rate schedule, importing nothing from the app), then swept
against `computeTaxLiability` over 2,810 (regime × income × gains) combinations.
Expected values are never taken from the application's own functions.

## Suites

- `npm run test:parsers` — **GREEN.** Both prior failures fixed:
  `papa-ais` `interestFromSavings` now 3,507; `rohit-ais`
  `mutualFundTransactions` now 100,041 (≥ 95,000).
- `npm run test:calc` — still cannot run as-scripted in a Linux sandbox
  (`node_modules` carries `@esbuild/win32-x64`; `tsx` aborts). Re-run via
  `node --experimental-strip-types` on a copy: **61 passed · 0 failed**, up from
  32. New fixture groups for surcharge bands, surcharge marginal relief, and
  s.112A/s.111A segregation.

Both suites passing is necessary but not sufficient — the sweep below is what
actually tests the numbers.

---

## Closed — verified against the independent engine

| # | Finding | Status |
|---|---|---|
| 1 | Surcharge not computed | **Closed** for all-slab income. Every income in the sweep with no special-rate gains matches to the paisa across both regimes and all four bands, including marginal relief at each threshold. |
| 2 | Capital gains pooled at slab rates | **Closed.** Salary ₹11L + LTCG ₹3L → ₹66,950, matching the independent figure exactly. |
| 3 | Rebate granted against LTCG | **Closed.** Salary ₹9L + LTCG ₹2.5L → ₹16,250, not zero. `taxLiability.ts:286-298` correctly makes rebate eligibility a **total-income** test including the full gain — the ₹1,25,000 is not netted off before the threshold test. That is the right reading and it was not obvious. |
| 5 | Chapter VI-A caps | **Closed.** 80D ₹50,000/₹1,00,000 by age; 80TTB ₹50,000 for 60+ replacing 80TTA's ₹10,000; 80G limited to 10% of adjusted GTI; `otherDeductions` bounded to remaining headroom so taxable income can no longer be driven below nil. |
| 6 | NRI slab ladder matched no statutory year | **Closed.** `NRIIncomeTaxCalculator.tsx:65` now delegates to `getTaxSlabs`/`calculateTaxForSlab`, and correctly takes the **pre-rebate** figure since NRIs get no s.87A/156 rebate. |
| 7 | NRI deductions inert | **Closed.** `:114` computes `slabIncomeAfterDeductions` and `:115` taxes it. Deductions are also now capped (80C ₹1.5L, 80D ₹50k, s.24(b) ₹2L) and correctly restricted to slab income rather than the special-rate heads. |
| 8a | NRI LTCG ₹1,25,000 allowance missing | **Closed** — `:85-89`. |
| 9 | Stale AY 2026-27 rebate in `seedTaxRates.ts` | **Closed** — `:177`, `:191`, `:205` now `1200000` / `60000`. |
| 10 | Drift guard covered slab tables only | **Closed.** The guard now asserts `TaxCalculator.tsx` imports the shared engine and carries no duplicated rebate/cess ladder — the structural fix the fixture header called for, not just a wider diff. |

The `computeSurcharge` marginal-relief formulation at `taxLiability.ts:190-205`
is correct, including the fiddly part: `belowRate` resolves to the rate of the
band immediately below the one crossed, so relief is measured against a real
liability at the boundary. I checked this independently at all four thresholds.

---

## FINDING A — the 15% surcharge cap on s.111A / s.112A income is not applied

```text
CLAIM     Surcharge on tax charged at the special rates.
AUTHORITY Proviso to the Finance Act surcharge schedule: where total income
          includes income chargeable under s.111A, s.112A or s.112, the rate of
          surcharge on that portion shall not exceed 15%, in either regime.
          The codebase already asserts this rule — taxLiability.ts:119-120:
          "carries a surcharge capped at 15% regardless of regime — that cap is
          applied by computeSpecialRateTax(), not here."
          computeSpecialRateTax (:235-242) contains no surcharge logic at all.
ACTUAL    :390  taxBeforeSurcharge = taxAfterRebate + sr.total
          :397  computeSurcharge(totalIncome, taxBeforeSurcharge, …)
          The full band rate is applied to the special-rate tax along with the
          slab tax. No 15% ceiling exists anywhere in the file.
EXPECTED  old regime · slab income ₹4,02,50,000 + LTCG ₹1,00,00,000
            slab tax                    1,46,62,500 → band rate 37%
            special-rate tax              12,34,375 → capped at 15%
            surcharge   1,46,62,500×37% + 12,34,375×15% = 56,05,156
            total                       1,84,13,623
ACTUAL    1,86,96,048   (surcharge 12,34,375 × 37% on the gains portion)
VERDICT   MISMATCH — overstates by ₹2,82,425 in the worst swept case.
          1,661 of 2,810 swept combinations diverge. 1,660 of them equal the
          closed form exactly:  specialTax × (bandRate − 15)% × 1.04.
          The remaining one (old · ₹4,95,00,000 + ₹2.5Cr gains) is the same
          defect entangled with ₹5Cr-band marginal relief: the inflated
          pre-relief surcharge changes the relief figure too, so the error is
          ₹45,208 rather than the ₹76,505 the closed form predicts.
```

No divergence appears below ₹2Cr of total income, because `min(bandRate, 15)`
only bites once the band rate exceeds 15% — i.e. the 25% band (both regimes) and
the 37% band (old). Small population, large per-user error.

FIX Split the surcharge base. Compute `slabTax × bandRate` and
`specialRateTax × min(bandRate, 15)` separately inside `computeSurcharge`, then
apply marginal relief to the sum. Either implement the cap in
`computeSpecialRateTax` as the comment at `:119-120` promises, or correct the
comment — right now it documents behaviour that does not exist, which is how a
future reader concludes this is already handled.

## FINDING B — the NRI calculator hardcodes `"new"` when computing surcharge

```text
CLAIM     Surcharge for an old-regime NRI above ₹5,00,00,000.
AUTHORITY Old regime tops out at 37%. The 25% ceiling is a new-regime feature
          (s.202 ITA 2025, carrying forward the erstwhile 115BAC cap).
ACTUAL    NRIIncomeTaxCalculator.tsx:130-136 —
            computeSurcharge(totalIncome, totalTaxBeforeSurcharge, "new", …)
          The regime argument is the string literal "new" regardless of the
          user's selection. Two lines below, the taxAtThreshold closure gets it
          right: getTaxSlabs(regime === "old" ? "old" : "new", …). The same
          expression was available and was not used.
EXPECTED  old-regime NRI · income ₹6,00,00,000
            slab tax 1,78,12,500 · surcharge @37% 65,90,625 · total 2,53,79,250
ACTUAL    surcharge @25% 44,53,125 · total 2,31,56,250
VERDICT   MISMATCH — understates by ₹22,23,000.
```

FIX `computeSurcharge(totalIncome, totalTaxBeforeSurcharge, regime === "old" ? "old" : "new", …)`.
Finding A applies to this page too — its surcharge base includes the STCG, LTCG
and dividend tax at the uncapped band rate.

## FINDING C — the PDF export still carries the old HRA formula

```text
CLAIM     HRA exemption shown on the downloaded computation sheet.
ACTUAL    TaxCalculator.tsx:741-746 recomputes HRA using salaryIncome — the
          gross figure — as the Rule 2A base, under a comment reading
          "same formula as calculateSingleRegime". It is no longer the same
          formula: :348-356 now uses basicPlusDA.
VERDICT   MISMATCH — the fix landed in the on-screen path only. On a basic ₹2L /
          gross ₹10L / HRA ₹5L / rent ₹6L metro package the screen exempts
          ₹1,00,000 and the PDF exempts ₹5,00,000.
```

Worse than a duplicated formula: the PDF's `netSalary` and `grossTotalIncome`
(`:752-754`) are derived from the wrong exemption, while `taxableIncome` and
`totalTax` come from the correct engine. **The generated computation sheet does
not add up** — a document a taxpayer may hand to a CA or attach to a return.

FIX Return `hraExemption` from `calculateSingleRegime` and read it here. There is
no reason for this second copy to exist.

---

## Minor / latent

- `seedTaxRates.ts:401-402` — the getter's fallback defaults are still the
  pre-Budget-2025 `"700000"` / `"25000"`. The seeded rows are now right, so this
  only fires when a row is missing a value. Harmless today, wrong if it ever fires.
- `taxLiability.ts` old-regime branch still falls through to the **above-80**
  table (₹5L exempt, the most generous) for any `ageGroup` outside the three
  known strings. Unreachable while the type holds; unchanged from the first pass.
- `taxLiability.ts:296-298` and `:389` compute the same
  `income + ltcg + stcg` sum twice under two names (`totalIncomeAll`,
  `totalIncomeForSurcharge`). Identical today; two places to update tomorrow.
- NRI page hardcodes `"below60"` in both `getTaxSlabs` calls (`:65`, `:135`)
  while maintaining an `ageGroup` state (`:16`). Defensible — the old-regime
  senior exemptions are the only thing age changes and the page is new-regime by
  default — but the state is dead and implies otherwise.

## Verdict

8 of 10 findings fully closed, and closed properly — `TaxCalculator.tsx` now
imports the shared engine rather than carrying a second copy, which was the
structural fix, and the rebate eligibility test was got right in a place it
would have been easy to get wrong.

Three defects remain, all in the same neighbourhood the first pass opened up
(surcharge and special-rate income), and one of them — Finding C — is a fix that
landed in one of two code paths. Nothing here is a regression against the
original ten.

Finding B (₹22.2L understated) should go first: understatement is the direction
that gets a taxpayer a notice. Then A, then C.

Each needs a fixture in `scripts/test-tax-calculations.ts` and a green run before
it ships. For A, the fixture should assert the surcharge on the gains portion
directly, not just the total — a total-only assertion can pass on a compensating
error.

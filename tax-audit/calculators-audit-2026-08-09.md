# Audit — the nine calculators outside the main tax engine

Commit under test: `d7bbcc4`. Working tree clean.

Scope: SIP, SWP, PF/PPF, NPS, Home Loan, Vehicle Loan, standalone HRA, Trading
Tax, DTAA. None of these were covered by the 9 Aug audit or its re-verification.

Method: every expected figure comes from a Bash-executed script implementing the
formula from its source — amortisation month by month, the PPF Scheme's
minimum-balance rule, the statutory slab ladder with rebate — with no call into
application code. Scripts in `/tmp/a3/`.

## Baseline (workflow step 1)

- `npm run test:parsers` — **GREEN**, 4 documents.
- `npm run test:calc` — **71 passed · 0 failed** (run via
  `node --experimental-strip-types` on a copy; `npm run test:calc` still cannot
  execute in a Linux sandbox because `node_modules` carries `@esbuild/win32-x64`).

Neither suite covers any file in this audit. All nine calculators are untested.

---

## Verified correct

Checked and matching, so they can be left alone:

- **SIP** — the headline maturity and the chart series are computed two different
  ways (`SIPCalculator.tsx:63` closed-form per instalment, `:64` a running
  balance) and agree **to the rupee** at every input tried, including step-up.
  Against an independently written annuity-due closed form: ₹10,000/m at 12% for
  10y → ₹23,23,391 from all three. The comment at `:44-52` claims the two are
  algebraically identical; they are.
- **HRA (standalone)** — `HRACalculator.tsx:113-118` is a correct least-of-three
  under Sch. II Sl. 2, computed on `annualBasic`, not gross.
- **PF / PPF** — `PFCalculator.tsx:80-101`. Interest accrues monthly on the
  running balance and is credited at year end, so it does not compound within the
  year: that is the PPF Scheme's method, not an approximation of it. ₹12,500/m at
  7.1% for 15y → ₹39,44,599, matching my independent implementation exactly. EPS
  at `:91` is 8.33% capped at ₹1,250/month (correct) and is excluded from the
  corpus (correct — only `employerEPF` is added at `:99`).
- **DTAA** — `DTAACalculator.tsx:40-45` implements the credit method correctly:
  relief is `min(Indian TDS, foreign liability)` and cannot go negative.
- **Vehicle Loan** — reducing-balance (`:64-65`) and flat (`:74-75`) are both
  correct by definition, and shown side by side, which is the honest way to
  present a flat-rate quote.
- **Home Loan** — the EMI at `:49-51` is the standard formula. Tax benefits are
  explicitly labelled "Tax Benefits (Old Regime Only)" with "Not available under
  New Regime" at `:252-253`. Given Finding 1 of the first audit, that label
  matters and it is there.

---

## FINDING T1 — the Trading calculator charges tax on income the statute exempts

```text
CLAIM     Tax on F&O / intraday business income.
AUTHORITY s.156 ITA 2025 (ex s.87A): new-regime rebate to ₹12,00,000, with
          marginal relief above it. Business income is ordinary slab income and
          is fully eligible.
ACTUAL    TradingTaxCalculator.tsx:114-133 — slabTax() walks the slab ladder and
          returns `tax * 1.04`. There is no rebate step anywhere in the file;
          grep for "87A" and "156" returns nothing.
EXPECTED / ACTUAL
          business income     expected      actual    overstated
          ₹6,00,000                 ₹0     ₹10,400       ₹10,400
          ₹9,00,000                 ₹0     ₹31,200       ₹31,200
          ₹12,00,000                ₹0     ₹62,400       ₹62,400
          ₹12,50,000           ₹52,000     ₹70,200       ₹18,200
          ₹15,00,000         ₹1,09,200   ₹1,09,200            ₹0
VERDICT   MISMATCH below ₹12,75,000; correct above it.
```

The error peaks at exactly ₹12,00,000 and is qualitative rather than marginal:
the tool says ₹62,400 where the answer is nil.

**The counter-argument, and why it does not hold.** `:1021` carries an explicit
disclaimer — "This is an *estimate only*. Actual tax depends on total income,
surcharge thresholds…" — and a trading calculator that ignores the user's other
income genuinely cannot produce a final figure. That is a fair defence of an
approximation. It is not a defence of this one. The disclaimer names surcharge
and total income; it does not say the rebate is omitted. And "₹0 vs ₹62,400" is
not an estimation margin — a small trader with no other income is told they owe
tax when they owe none, which is the input to a decision about whether to file
at all.

FIX Route through `computeTaxLiability` from `shared/taxLiability.ts`, as
`TaxCalculator.tsx` and the NRI page now do. It already handles rebate, marginal
relief and cess in the right order.

## FINDING T2 — a fourth slab ladder the drift guard cannot see

```text
CLAIM     scripts/test-tax-calculations.ts guards against slab tables drifting
          out of sync with shared/taxLiability.ts.
ACTUAL    The guard's regex (:413, :416) matches object literals of the shape
          { min: …, max: …, rate: … }.
          TradingTaxCalculator.tsx:118-126 declares its ladder as
          { limit: 400000, rate: 0.05 } — band WIDTHS with fractional rates,
          not min/max with percentages. The regex cannot match it.
          TradingTaxCalculator.tsx imports nothing from @shared.
VERDICT   The ladder is numerically correct for FY 2026-27 today — I checked
          all seven bands. It is unguarded: a Budget change would update
          shared/taxLiability.ts, pass every fixture, and leave this file wrong.
```

This is the same class of defect the drift guard was written for, hiding behind a
different literal shape. The guard reports "all 5 inline slab table(s) match" and
is telling the truth about the five it can see.

FIX Same as T1 — importing the shared engine removes the ladder entirely. If the
component must keep its own, the guard should search all of `client/src` rather
than one hard-coded path, and match on band semantics rather than one literal shape.

## FINDING T3 — NPS overstates the tax benefit, by construction

```text
CLAIM     "Tax saving" figures — NPSCalculator.tsx:75-78.
AUTHORITY s.80CCD(1): within the ₹1,50,000 aggregate ceiling AND capped at 10%
          of salary. s.80CCD(1B): an ADDITIONAL ₹50,000, but only out of
          contributions not already claimed under (1). s.80CCD(2) / ITA 2025
          s.125: employer contribution capped at 14% of salary (new regime).
ACTUAL    :77  tax80CCD1B = 50000 * (taxRate/100)
               — the full ₹50,000 is credited regardless of what was contributed.
          :76  tax80CCD1 = Math.min(annualContrib, 150000) * (taxRate/100)
               — combined with :77 this deducts up to ₹2,00,000 on a
                 ₹1,50,000 contribution. No 10%-of-salary cap.
          :78  tax80CCD2 = employerContribution * 12 * (taxRate/100)
               — no 14% cap.
EXPECTED / ACTUAL  (taxRate 30%, salary ₹12,00,000, old regime)
          contribution              expected    actual   overstated
          ₹2,000/m self             ₹7,200    ₹22,200      ₹15,000
          ₹5,000/m self            ₹18,000    ₹33,000      ₹15,000
          ₹12,500/m self           ₹45,000    ₹60,000      ₹15,000
          ₹12,500/m + ₹10,000/m    ₹81,000    ₹96,000      ₹15,000
          ₹4,167/m + ₹20,000/m     ₹65,401  ₹1,02,001      ₹36,600
VERDICT   MISMATCH at every contribution level tested. At ₹2,000/month the
          figure is more than triple the real benefit.
```

The ₹15,000 floor is the flat 80CCD(1B) credit on a contribution that may not
exist. It never falls away, because it is not conditional on anything.

Also: `taxRate` is applied bare, so a user selecting 30% gets 30%, not 31.2%.
`HomeLoanCalculator.tsx:70` uses `0.312` for the same concept. One of the two is
wrong; the cess is due, so it is this one.

FIX Cap the self-contribution deduction at the amount actually contributed:
`under1 = min(annualContrib, 150000, salary*0.10)`,
`under1B = min(max(0, annualContrib - under1), 50000)`. Cap employer at 14% of
salary. Add the cess. Salary is not currently an input to this component and
would need adding for the percentage caps.

## FINDING T4 — SWP reports a depletion date for a corpus that never depletes

```text
CLAIM     "Corpus lasts Xy Ym" — SWPCalculator.tsx:76-77, :99, :114-116.
ACTUAL    :55  while (corpus > currentMonthlyWithdrawal && months < 600)
          The loop has two exit conditions and the caller cannot tell them apart:
          :76  durationYears = Math.floor(months / 12)
EXPECTED  ₹1,00,00,000 at 8% drawing ₹50,000/month is a withdrawal rate of 6%
          against an 8% return. The corpus grows without limit; there is no
          depletion date. Correct output: "never depletes".
ACTUAL    The loop hits the 600-month cap and reports "50y 0m". At that point
          the corpus stands at ₹14,21,95,458 — fourteen times the opening
          balance — and that figure is never shown.
VERDICT   MISMATCH. Not a rupee error; a categorical one. The single most
          reassuring answer this tool can give — your money outlasts you — is
          rendered as a 50-year countdown.
```

FIX Distinguish the exits. If `months === 600 && corpus > initialCorpus`, report
that the corpus is self-sustaining and show the terminal balance.

---

## Minor

- `HomeLoanCalculator.tsx:64` — `annualInterestYear1 = loanAmount * (rate/100)`
  is simple interest on the opening principal, and the comment says "≈". Measured
  against month-by-month amortisation it overstates year-1 interest by ₹725
  (₹25L/8.5%/30y) to ₹4,731 (₹1Cr/8%/25y), and understates year-1 principal by
  the same amount. Because both feed capped deductions the net effect on the tax
  figure is ₹226–₹1,476. Honestly flagged, small, worth fixing while nearby.
- `PFCalculator.tsx:84` credits interest on the current month's PPF deposit,
  i.e. it assumes every deposit lands on or before the 5th. That is the
  favourable end of the range and matches my independent "on/before 5th" figure
  exactly. A deposit after the 5th earns nothing that month: ₹39,22,125 instead
  of ₹39,44,599 over 15 years. The ₹22,475 spread is a real planning lever the
  tool could surface and currently does not mention.
- `SWPCalculator.tsx:55` — the loop stops while `corpus` still exceeds zero, so
  the final partial withdrawal is neither counted in `totalWithdrawals` nor
  reported as a residual. Immaterial next to T4, same root cause.

## Priority

1. **T1** — wrong in the direction that makes a taxpayer act, at the most common
   income band, on the page most likely to be used by someone with no other income.
2. **T3** — a savings figure inflated by a fixed ₹15,000 at 30%, presented as a
   reason to invest.
3. **T4** — cheap to fix, and the error is the opposite of the truth.
4. **T2** — latent today, but it is exactly the failure mode the drift guard exists
   to prevent, and it will not fire.

T1 and T2 close together: importing `shared/taxLiability.ts` fixes both. Each fix
needs a fixture in `scripts/test-tax-calculations.ts` and a green run before it
ships — none of these nine files has a single test today, which is why an
untouched ₹62,400 error survived two audits.

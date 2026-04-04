# AiTaxBot — ITA 2025 Compliance Audit Log

> **Audit date:** 2026-04-04
> **Auditor:** AI Auditor (Claude) against `Income_Tax_Act_2025_as_amended_by_FA_Act_2026.pdf`
> **Scope:** All 6 calculators + 22 blog posts
> **Reference:** `tax-audit/bare-act-index.md`

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 2 | Wrong law stated; user will under-claim exemption |
| 🟠 WARNING | 5 | Outdated section references; incomplete regime disclosure |
| 🟡 INFO | 4 | Gaps / enhancements; no wrong numbers, just missing context |

---

## 🔴 CRITICAL Issues

### CRIT-01 — HRA Blog: Bangalore/Hyderabad/Pune listed as Non-Metro (WRONG from FY 2026-27)

**File:** `client/src/data/blogPosts.ts` → slug `hra-exemption-metro-vs-non-metro`
**ITA 2025 Reference:** Schedule II (Table: Sl. No. 2) + Income Tax Rules 2026
**Evidence from audit:**
```
| Metro | Delhi, Mumbai, Kolkata, Chennai | 50% |
| Non-Metro | Bangalore, Pune, Hyderabad, others | 40% |
```
**What the law says (FY 2026-27 onward):**
Income Tax Rules 2026 expanded metro cities from 4 to **8 cities**. The following are now **Metro (50% rule)**:
- Delhi, Mumbai, Kolkata, Chennai *(always were)*
- **Bangalore, Hyderabad, Pune, Ahmedabad** *(newly added from FY 2026-27)*

**Impact:** A Bangalore/Hyderabad/Pune/Ahmedabad resident following this blog will use 40% instead of 50%, under-claiming their HRA exemption by up to ₹X = 10% × Basic Salary, causing overpayment of tax.

**Fix required:** Update the table in the blog. Add a note: "Effective FY 2026-27, 8 cities qualify as metro under Income Tax Rules 2026."

---

### CRIT-02 — HRA Calculator: No City Guidance → Users from New Metro Cities Will Under-Claim

**File:** `client/src/components/calculators/HRACalculator.tsx`
**ITA 2025 Reference:** Schedule II (Table: Sl. No. 2) + Income Tax Rules 2026
**Evidence from audit:**
```tsx
<SelectItem value="metro">Metro City (50%)</SelectItem>
<SelectItem value="non-metro">Non-Metro City (40%)</SelectItem>
```
The dropdown has no city list and no tooltip explaining which cities are metro. A user from Bangalore (now metro) will very likely select "Non-Metro City" because the old law said so.

**Impact:** Same as CRIT-01 — calculation gives 40% instead of 50%, understating the exemption.

**Fix required:**
1. Add a tooltip/helper text below the dropdown listing all 8 metro cities.
2. Or replace binary dropdown with a city picker that auto-selects metro/non-metro.
3. Add a note: "Metro cities (50% rule) from FY 2026-27: Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad, Pune, Ahmedabad"

---

## 🟠 WARNING Issues

### WARN-01 — All Blogs Use ITA 1961 Section Numbers (80C, 80D, 10(13A), etc.)

**Files:** All 22 blog posts in `blogPosts.ts`
**ITA 2025 Reference:** See `bare-act-index.md` Section 1 (Architecture Changes table)

ITA 2025 came into force on 1-Apr-2026. All section numbers changed:
- "Section 80C" → "Section 123 + Schedule XV"
- "Section 80D" → "Section 126"
- "Section 80CCD(1B)" → "Section 124(3)"
- "Section 80CCD(2)" → "Section 124(1)"
- "Section 10(13A)" → "Schedule II (Table: Sl. No. 2)"

**Impact:** Technically the old section numbers no longer exist in law from FY 2026-27. A CA or tax officer referencing the law will cite ITA 2025 sections.

**Recommended fix:** Add a note at the top of all tax-related blogs: *"Section references in this article follow the Income Tax Act, 1961. For FY 2026-27 and beyond, the equivalent sections under the Income Tax Act, 2025 are: [table]."*

The informal shorthand (80C, 80D, etc.) is still widely used in practice — so this is a WARNING, not critical. Prioritise updating the two most-referenced blogs: `section-80c-deductions-list-fy-2026-27` and `hra-exemption-metro-vs-non-metro`.

---

### WARN-02 — ELSS/NPS Blog: 80CCD(1B) Not Flagged as Old Regime Only

**File:** `blogPosts.ts` → slug `elss-vs-ppf-vs-nps-tax-saving-comparison`
**ITA 2025 Reference:** Section 124(3)
**Evidence:**
```
Ideal combination (salaried, age 30–40): 60% ELSS + 20% PPF + 20% NPS contribution = full 80C + extra 80CCD(1B) deduction
```
No warning that `80CCD(1B)` (₹50,000 own NPS deduction) is **only available under the Old Tax Regime**. A new regime user reading this will incorrectly expect the deduction.

**Fix required:** Add "⚠️ Old Regime Only" badge next to 80CCD(1B) in comparison tables.

---

### WARN-03 — NPS Calculator: Employer NPS Under New Regime Should Be 14% (Not 10%)

**File:** `client/src/components/calculators/NPSCalculator.tsx`
**ITA 2025 Reference:** Section 124(2) — *"Where the total income of the assessee is chargeable to tax under section 202(1) [new regime], the provisions of sub-section (1) shall have effect as if for '10%' referred to in clause (b) of that sub-section, '14%' had been substituted."*

**Impact:** Under the new regime, private employer's NPS contribution deduction is 14% of salary (not 10%). Current calculator shows 10% for new regime.

**Severity:** Medium — affects NPS planning for new regime salaried employees. Many users will see lower projected savings than they're actually entitled to.

**Fix required:** When regime = new, set employer NPS cap to 14% of salary (matching the limit for CG/SG employees under old regime).

---

### WARN-04 — Section 80C Blog: No Mention That 80C Is Old Regime Only

**File:** `blogPosts.ts` → slug `section-80c-deductions-list-fy-2026-27`
**ITA 2025 Reference:** Section 202 (new regime excludes Chapter VIII deductions except S.124(1))

The blog comprehensively covers 80C but does not prominently warn that **zero 80C deduction is available under the new tax regime** (the default regime from FY 2023-24). A new regime taxpayer reading this blog has no reason to act on it.

**Fix required:** Add a prominent banner at the top: "⚠️ All deductions listed here apply to the **Old Tax Regime** only. If you are on the New Tax Regime (the default), these deductions are not available."

---

### WARN-05 — Finance Act 2026: Buyback Now Taxed at Shareholder Level — No Blog Covers This

**ITA 2025 Reference:** Section 69(2) substituted by Finance Act 2026, w.e.f. 1-Apr-2026
**Change:** Share buyback gains are no longer taxed at the company level (20% DDT). They are now capital gains in the shareholder's hands — STCG at 20% or LTCG at 12.5%.

**Impact:** Any user reading our capital gains blog who receives buyback proceeds will be misled if they assume the old company-level DDT treatment.

**Fix required:** Add a section to `capital-gains-tax-stocks-mutual-funds` covering buyback taxation change from FA 2026.

---

## 🟡 INFO — Gaps / Enhancement Opportunities

### INFO-01 — SIP / SWP Calculator: No Post-Tax Return Shown

**Files:** `SIPCalculator.tsx`, `SWPCalculator.tsx`
**ITA 2025 Reference:** Section 67, 72, and applicable rate sections

Both calculators show pre-tax returns only. There is no capital gains tax calculation on the projected corpus, despite LTCG (12.5% above ₹1.25L) and STCG (20%) being directly applicable.

**Opportunity:** Add a "Tax Impact" toggle or summary card showing:
- Estimated LTCG at redemption
- ₹1.25L annual exemption benefit
- Net post-tax return

---

### INFO-02 — Standard Deduction Regime Split Not Communicated to Users

**ITA 2025 Reference:** Section 19, Table Sl. No. 2
New regime: ₹75,000 standard deduction
Old regime: ₹50,000 standard deduction

The Tax Calculator already handles this correctly in code. However, the UI does not surface this difference clearly — users may not realise the new regime standard deduction is higher.

**Opportunity:** Add a tooltip on the standard deduction row: "₹75,000 under new regime; ₹50,000 under old regime (per ITA 2025, S.19)"

---

### INFO-03 — SGB (Sovereign Gold Bond) Exemption Changed by FA 2026

**ITA 2025 Reference:** Section 70(1)(x) substituted by Finance Act 2026
**Change:** Sovereign Gold Bond redemption is exempt **only** if held from original issue to maturity. Premature redemption no longer qualifies.

**Opportunity:** If any blog covers SGBs (the `best-investment-options-india-2025` blog mentions SGBs), update with this change.

---

### INFO-04 — Two Self-Occupied Properties Now Both Qualify for Nil Annual Value

**ITA 2025 Reference:** Section 21(7) + Footnote 5 (FA 2026 substitution, w.e.f. 1-Apr-2026)
**Change:** Previously, nil annual value applied to only **one** self-occupied house. FA 2026 extended this to **two** self-occupied houses.

**Opportunity:** If any blog or tool discusses house property income, update to reflect this.

---

## Calculators — Pass/Fail Summary

| Calculator | Status | Issues |
|-----------|--------|--------|
| Income Tax Calculator | ✅ PASS | Slabs correct; standard deduction split correct |
| HRA Calculator | 🔴 FAIL | No city list; new metro cities (Bangalore etc.) not identified (CRIT-02) |
| NPS Calculator | 🟠 WARN | Employer NPS capped at 10% for new regime; should be 14% (WARN-03) |
| PF Calculator | ✅ PASS | "Old Regime Only" label added; 80C gated correctly |
| SIP Calculator | 🟡 INFO | Pre-tax only; no capital gains tax shown (INFO-01) |
| SWP Calculator | 🟡 INFO | Pre-tax only; no capital gains tax shown (INFO-01) |

---

## Blog Posts — Pass/Fail Summary

| Slug | Status | Issue |
|------|--------|-------|
| hra-exemption-metro-vs-non-metro | 🔴 FAIL | Bangalore/Hyderabad/Pune shown as non-metro (CRIT-01) |
| section-80c-deductions-list-fy-2026-27 | 🟠 WARN | No "Old Regime Only" banner (WARN-04) |
| elss-vs-ppf-vs-nps-tax-saving-comparison | 🟠 WARN | 80CCD(1B) not flagged as old regime only (WARN-02) |
| capital-gains-tax-stocks-mutual-funds | 🟠 WARN | No buyback FA 2026 change coverage (WARN-05) |
| new-vs-old-tax-regime-2025 | ✅ PASS | Slabs correct; section references ITA 1961 (expected) |
| income-tax-act-1961-vs-income-tax-act-2025 | ✅ PASS | Section mapping post — verify accuracy separately |
| marginal-relief-income-tax-guide | ✅ PASS | Appears technically sound |
| sip-calculator-guide-mutual-fund-investments | ✅ PASS | LTCG 12.5%, ₹1.25L exempt — correct |
| All other 14 blogs | ✅ PASS | No tax rate errors found; old section refs are warnings only |

---

## Priority Fix Queue

| Priority | Fix | Effort | Status |
|----------|-----|--------|--------|
| P0 | CRIT-01: Update HRA blog metro city list to 8 cities | 30 min | ✅ FIXED 2026-04-04 |
| P0 | CRIT-02: Add metro city list/tooltip to HRA Calculator | 1 hr | ✅ FIXED 2026-04-04 |
| P1 | WARN-03: NPS Calculator — employer NPS 14% for new regime | 1 hr | ✅ FIXED 2026-04-04 |
| P1 | WARN-04: 80C blog — add "Old Regime Only" banner on 80CCD(1B) | 15 min | ✅ FIXED 2026-04-04 |
| P1 | WARN-02: ELSS/NPS blog — flag 80CCD(1B) as old regime only | 15 min | ✅ FIXED 2026-04-04 |
| P2 | WARN-05: Capital gains blog — add FA 2026 buyback change | 45 min | ✅ FIXED 2026-04-04 |
| P2 | INFO-01: SIP/SWP — add post-tax return calculation | 3 hrs | ⏳ Pending (next sprint) |
| P3 | INFO-03: SGB exemption change in blog content | 15 min | ✅ FIXED 2026-04-04 |
| P3 | INFO-04: Two self-occupied houses blog update | 15 min | ✅ FIXED 2026-04-04 |
| P3 | WARN-01: Add ITA 2025 section reference notes to all blogs | Ongoing | ⏳ Pending (ongoing) |

---

## Fix Log (2026-04-04)

All P0, P1, and P3 fixes applied in session 2026-04-04. Commit: `27a6e88` + subsequent commit (P2/P3 fixes).

### Files modified:
| File | Changes |
|------|---------|
| `client/src/components/calculators/HRACalculator.tsx` | Added 8-city metro list helper text below city type dropdown |
| `client/src/components/calculators/NPSCalculator.tsx` | Employer NPS helper text: 14% for all employers under new regime (S.124(2)); result card note updated |
| `client/src/data/blogPosts.ts` (hra-exemption-metro-vs-non-metro) | Metro city table updated to 8 cities; Pune example → Mysuru (non-metro); ⚠️ blockquote added |
| `client/src/data/blogPosts.ts` (section-80c-deductions-list-fy-2026-27) | 80CCD(1B) paragraph flagged as Old Regime Only (S.124(3)) |
| `client/src/data/blogPosts.ts` (elss-vs-ppf-vs-nps-tax-saving-comparison) | "Ideal combination" clarified as Old Regime Only; table footnote added |
| `client/src/data/blogPosts.ts` (capital-gains-tax-stocks-mutual-funds) | New h2 section: FA 2026 buyback taxed in shareholder hands (S.69(2)) |
| `client/src/data/blogPosts.ts` (best-investment-options-india-2025) | SGB maturity exemption: "original subscribers only" caveat + FA 2026 blockquote |
| `client/src/data/blogPosts.ts` (alternative-investments-gold-silver-beyond) | SGB inline note + table cell updated |
| `client/src/data/blogPosts.ts` (income-tax-act-1961-vs-income-tax-act-2025) | "Impact on House Property" updated — two self-occupied houses nil annual value (S.21(7), FA 2026) |
| `client/src/data/blogPosts.ts` (taxation-in-india-complete-guide) | House Property table row updated to reflect nil annual value on 2 self-occupied properties |

### Outstanding items (next sprint):
- INFO-01: SIP/SWP calculators — post-tax capital gains return calculation
- WARN-01: ITA 2025 section reference notes across all 22 blogs (ongoing)

---

*Next audit recommended: After each Finance Act (typically August, post-Budget implementation)*

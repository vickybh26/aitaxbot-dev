# AiTaxBot — ITA 2025 Bare Act Index

> **Source:** Income Tax Act 2025 (as amended by Finance Act 2026), effective 1-Apr-2026
> **Built from:** PDF read — pages 1–189 (Chapters I–VIII)
> **Last updated:** 2026-04-04
> **Purpose:** Map every AiTaxBot calculator/tool/blog to its ITA 2025 section so the AI Auditor can verify correctness.

---

## 1. Architecture Changes: ITA 1961 → ITA 2025

| Concept | ITA 1961 Section | ITA 2025 Section | Notes |
|---------|-----------------|-----------------|-------|
| Tax year ("previous year") | S.3 | S.3 (renamed "tax year") | Terminology changed |
| Scope of total income | S.5 | S.5 | Unchanged |
| Residence | S.6 | S.6 | Unchanged |
| Incomes not included (exemptions) | S.10 sub-clauses | S.11 + **Schedules II–VII** | HRA, gratuity etc. now in Schedules |
| Heads of income | S.14 | S.13 | Renumbered |
| Salaries (charge) | S.15 | S.15 | Unchanged number |
| Salary definition | S.17(1) | S.16 | Renumbered |
| Perquisite definition | S.17(2) | S.17 | Renumbered |
| Profits in lieu of salary | S.17(3) | S.18 | Renumbered |
| Deductions from salary | S.16 | S.19 | Renumbered; standard deduction split by regime |
| House property charge | S.22 | S.20 | Renumbered |
| Annual value | S.23 | S.21 | Renumbered |
| HP deductions | S.24 | S.22 | Renumbered |
| PGBP charge | S.28 | S.26 | Renumbered |
| PGBP computation | S.29 | S.27 | Renumbered; covers S.28–60 excl. S.58 |
| Depreciation | S.32 | S.33 | Renumbered |
| Employee welfare (employer PF/NPS) | S.36(1)(iv)/(va) | S.29 | Renumbered |
| General conditions for deductions | S.37 | S.34 | Renumbered |
| Amounts not deductible | S.40 | S.35 | Renumbered |
| Actual payment basis | S.43B | S.37 | Renumbered; PF deposit due date = ITR filing date |
| Presumptive tax (44AD/44ADA) | S.44AD/44ADA | S.58 | Consolidated; limits updated |
| Capital gains (charge) | S.45 | S.67 | Renumbered |
| Capital asset definition | S.2(14) | S.2(22) | Renumbered |
| Mode of computation | S.48 | S.72 | Renumbered |
| Cost Inflation Index | S.48 Explanation | S.72(8) | Still 75% of CPI urban |
| Cost of acquisition | S.49 | S.73 | Renumbered |
| Transactions not regarded as transfer | S.47 | S.70 | Renumbered |
| Losses — same head | S.70 | S.108 | Renumbered |
| Losses — other heads | S.71 | S.109 | Renumbered |
| HP loss carry-forward | S.71B | S.110 | Renumbered |
| Capital gains loss c/f | S.74 | S.111 | Renumbered; 8-year limit |
| Business loss c/f | S.72 | S.112 | Renumbered; 8-year limit |
| Chapter VI-A deductions (general) | S.80A | S.122 | Renumbered |
| 80C (LIC/PF/ELSS etc.) | S.80C | S.123 + Schedule XV | Amounts via Schedule XV; limit ₹1,50,000 |
| 80CCD(1B) (own NPS) | S.80CCD(1B) | S.124(3) | ₹50,000; OLD regime only |
| 80CCD(2) (employer NPS) | S.80CCD(2) | S.124(1) | 10% salary (14% CG/SG); **also 14% under new regime** |
| 80D (health insurance) | S.80D | S.126 | Limits same; ₹25K self, ₹25K parents, ₹50K seniors |
| 80DD (disability) | S.80DD | S.127 | ₹75K / ₹1.25L for severe disability |
| New tax regime | S.115BAC | S.202 | New regime is NOW the default |
| TDS on salary | S.192 | (to be confirmed — ~S.TBD) | |
| HRA exemption | S.10(13A) | **Schedule II, Table Sl. No. 2** | 8 metro cities from FY 2026-27 |
| Gratuity exemption | S.10(10) | Schedule II, Table Sl. Nos. 3–6 | |
| VRS exemption | S.10(10C) | Schedule II Table Sl. No. 12 | |
| Leave encashment | S.10(10AA) | Schedule II Table Sl. Nos. 13–14 | |
| Dividend | S.2(22) | S.2(40) | Renumbered |
| LTCG | S.2(29A) | S.2(67) | Renumbered |
| STCG | S.2(42B) | S.2(102) | Renumbered |
| VDA (crypto) | S.2(47A) / S.115BBH | S.2(111) | Section TBC for rate |
| Buyback taxation | S.115QA (company level) | S.69 | **FA 2026: Now taxed in shareholder's hands as capital gains** |
| Sovereign Gold Bond redemption | S.47(viic) | S.70(1)(x) | **FA 2026: Exempt only if held from original issue till maturity** |

---

## 2. Calculator → ITA 2025 Section Mapping

### 2.1 Income Tax Calculator (`/calculators/income-tax`)

| Feature | ITA 2025 Section | Notes |
|---------|-----------------|-------|
| New regime default | **S.202** | Default from FY 2023-24; no deductions except S.124(1) |
| Tax slabs (new regime) | **S.202(1)** | 0/5/10/15/20/25/30% as per Finance Act 2026 |
| Tax slabs (old regime) | **S.195–200** (to confirm exact sections) | Old slab rates |
| Standard deduction (new) | **S.19, Table Sl. No. 2(a)** | ₹75,000 (new regime per S.202(1)) |
| Standard deduction (old) | **S.19, Table Sl. No. 2(b)** | ₹50,000 |
| Employer NPS (both regimes) | **S.124(1)** | 10% salary; 14% for new regime via S.124(2) |
| Surcharge | Schedule (to confirm) | |
| Marginal relief | To confirm | |
| Health & Education Cess | 4% on tax + surcharge | |

### 2.2 HRA Calculator (`/calculators/hra`)

| Feature | ITA 2025 Section | Notes |
|---------|-----------------|-------|
| HRA exemption eligibility | **Schedule II, Table Sl. No. 2** | **OLD REGIME ONLY** — not available under S.202 |
| HRA formula (min of 3) | **Schedule II, Table Sl. No. 2** | (a) Actual HRA; (b) Salary × 50%/40%; (c) Actual rent − 10% salary |
| Metro cities (50% rule) | **Income Tax Rules 2026** | **8 cities from FY 2026-27**: Delhi, Mumbai, Kolkata, Chennai + Bangalore, Hyderabad, Pune, Ahmedabad |
| Non-metro (40% rule) | **Income Tax Rules 2026** | All other cities |
| Old regime warning | S.202 | HRA exemption gate-kept by regime choice |

**⚠️ AUDIT FLAG:** Current calculator uses 4 metro cities. Must expand to 8 for FY 2026-27.

### 2.3 NPS Calculator (`/calculators/nps`)

| Feature | ITA 2025 Section | Notes |
|---------|-----------------|-------|
| Employer contribution deduction | **S.124(1)** | Max 10% of salary (14% for CG/SG employees) |
| Employer contribution — new regime | **S.124(2)** | Limit raised to 14% even for private employer under new regime (FA 2026) |
| Own contribution — old regime (80CCD(1)) | **S.123 + Schedule XV** | Included within ₹1,50,000 limit |
| Own NPS extra deduction (80CCD(1B)) | **S.124(3)** | ₹50,000 additional; **OLD REGIME ONLY** |
| Employer contribution taxable if > ₹7.5L | **S.17(1)(h)** | Aggregate of PF + NPS + SAF contributions |

**✅ AUDIT STATUS:** NPS calculator updated to be regime-aware (session 2026-04-04). 80CCD(1) and 80CCD(1B) correctly blocked under new regime. Employer 14% for new regime needs verification (see S.124(2)).

### 2.4 PF Calculator (`/calculators/pf`)

| Feature | ITA 2025 Section | Notes |
|---------|-----------------|-------|
| Employee PF contribution deduction | **S.123 + Schedule XV** | Part of 80C equivalent; OLD REGIME ONLY |
| Employer PF contribution | **S.29(a)** | Allowed deduction for employer in PGBP |
| Employer contribution taxable if > ₹7.5L | **S.17(1)(h)** | PF + NPS + SAF aggregate; excess is perquisite |
| PF interest taxable if > ₹2.5L/yr contribution | **S.16(i) + Schedule XI** | Interest on contributions > ₹2.5L/yr taxable |
| PF deposit "actual payment" rule | **S.37(2)(b)** | Due date = ITR filing deadline (FA 2026 change in S.29(e)) |

**✅ AUDIT STATUS:** PF calculator updated to show "Old Regime Only" for 80C (session 2026-04-04).

### 2.5 SIP Calculator (`/calculators/sip`)

| Feature | ITA 2025 Section | Notes |
|---------|-----------------|-------|
| Equity MF LTCG (> 1 year, > ₹1.25L) | **S.197** (to confirm) | 12.5% LTCG without indexation |
| Equity MF STCG (≤ 1 year) | **S.196** (to confirm) | 20% STCG (raised from 15% by FA 2024) |
| Debt MF taxed at slab rate | **S.67 + S.72** | No LTCG benefit for debt MF |
| ELSS lock-in | 3 years | Part of Schedule XV (80C equivalent) |
| STT offset not allowed | **S.72(3)(b)** | STT cannot be deducted in capital gains computation |

**⚠️ AUDIT FLAG:** SIP calculator does not show regime-aware capital gains tax calculation. STCG rate is 20% (not 15%) from FY 2024-25 per Finance Act 2024.

### 2.6 SWP Calculator (`/calculators/swp`)

| Feature | ITA 2025 Section | Notes |
|---------|-----------------|-------|
| Same as SIP — capital gains on withdrawals | **S.67, S.72, S.196, S.197** | Each withdrawal is a redemption/transfer |
| Debt fund returns | At slab rate | No LTCG benefit |

### 2.7 Income Tax Calculator — Key Rates (FY 2026-27)

| Regime | Slab | Rate |
|--------|------|------|
| New | 0–4L | Nil |
| New | 4–8L | 5% |
| New | 8–12L | 10% |
| New | 12–16L | 15% |
| New | 16–20L | 20% |
| New | 20–24L | 25% |
| New | 24L+ | 30% |
| Old | 0–2.5L | Nil |
| Old | 2.5–5L | 5% |
| Old | 5–10L | 20% |
| Old | 10L+ | 30% |

> Note: Exact slab ranges for ITA 2025 to be verified from Section 202(1). Above based on Finance Act 2025/2026 announcements.

---

## 3. Blog Posts → ITA 2025 Section Mapping

| Blog Slug | Primary ITA 2025 Sections | Key Facts to Audit |
|-----------|--------------------------|-------------------|
| new-vs-old-tax-regime-2025 | S.202, S.19, S.123, S.124 | Standard deduction ₹75K (new) vs ₹50K (old); new regime now default |
| section-80c-deductions-list-fy-2026-27 | S.123 + Schedule XV | References to "Section 80C" must note ITA 2025 equivalent is S.123/Schedule XV |
| hra-exemption-metro-vs-non-metro | Schedule II (Sl. No. 2) | **CRITICAL: Must show 8 metro cities, not 4** |
| elss-vs-ppf-vs-nps-tax-saving-comparison | S.123, S.124, Schedule XV | NPS 80CCD(1B) only old regime; employer NPS 14% new regime |
| capital-gains-tax-stocks-mutual-funds | S.67, S.72, S.196, S.197 | STCG 20% (not 15%); LTCG 12.5% above ₹1.25L |
| sip-calculator-guide-mutual-fund-investments | S.67, S.197 | LTCG ₹1.25L exemption; 12.5% rate |
| income-tax-act-1961-vs-income-tax-act-2025 | All | Cross-reference mapping accuracy |
| marginal-relief-income-tax-guide | S.195–202 | Marginal relief mechanics |
| taxation-in-india-complete-guide | S.13 onwards | Heads of income, rates |
| gst-filing-guide-small-businesses | GST Act (not ITA) | Not directly ITA 2025 |
| retirement-planning-by-age | S.124, S.123 | NPS, PPF, annuity |

---

## 4. Finance Act 2026 — Critical Changes

These are changes that went live **1-Apr-2026** and may not yet be reflected in AiTaxBot content:

| Change | ITA 2025 Reference | Impact on AiTaxBot |
|--------|-------------------|-------------------|
| Buyback now taxed at shareholder level | S.69(2) (substituted by FA 2026) | Blog/content if any about buyback |
| SGB redemption: exempt ONLY if held from original issue to maturity | S.70(1)(x) (substituted by FA 2026) | Any SGB content |
| Employer NPS limit raised to 14% for all employees under new regime | S.124(2) | NPS Calculator — verify employer NPS calc for new regime |
| PF employee contribution timing — due date = ITR filing date | S.29(e) (substituted by FA 2026) | PF Calculator |
| Annual value of house property: nil for up to 2 houses (not 1) | S.21(7) (FA 2026 substitution) | Any house property content |
| Section 32(e) special reserve | S.32(e) | Finance/accounting content only |
| House property vacancy: NIL annual value → was restricted, now extended | Footnote 5 to S.21(5) | House property tools |
| HP deduction cap: S.22(2) changed from sub-section (1)(b) to (b) and (c) | Footnote 6 to S.22 | HP interest calculator if any |

---

## 5. Key Definitions (ITA 2025)

| Term | ITA 2025 Section | Value/Definition |
|------|-----------------|-----------------|
| Tax year | S.3 | Replaces "previous year"; 12 months ending 31 March |
| Capital asset | S.2(22) | Was S.2(14) |
| LTCG | S.2(67) | Was S.2(29A) |
| STCG | S.2(102) | Was S.2(42B) |
| Income | S.2(49) | Was S.2(24) |
| Total income | S.2(108) | Was S.2(45) |
| VDA (crypto) | S.2(111) | Was S.2(47A) |
| Short-term capital asset | S.2(101) | Was S.2(42A) |
| Salary (for deduction purposes) | S.124(13)(b) | Includes DA if employment terms provide; excludes other allowances/perquisites |
| Standard deduction — new regime | S.19, Table Sl. No. 2(a) | ₹75,000 (where tax computed under S.202(1)) |
| Standard deduction — old regime | S.19, Table Sl. No. 2(b) | ₹50,000 |
| Cost Inflation Index | S.72(8)(a) | 75% of average CPI (urban) for preceding year |

---

## 6. Sections Still To Be Confirmed From PDF

The following sections were not yet read from the PDF and need confirmation:

- [ ] **Section 195–201**: Old regime tax rate tables
- [ ] **Section 202**: New tax regime — exact slabs and mechanics
- [ ] **Section 196**: STCG rate on equity (expected: 20%)
- [ ] **Section 197**: LTCG rate on equity (expected: 12.5% above ₹1.25L)
- [ ] **Schedule II, Table Sl. No. 2**: HRA exemption formula + 8 city list
- [ ] **Schedule XV**: 80C equivalent components (LIC, PPF, ELSS, home loan principal, etc.)
- [ ] **Section 124 complete**: 80CCD(1) limit within Schedule XV vs. S.124(3)

---

## 7. File Locations

| File | Path |
|------|------|
| ITA 2025 PDF (authoritative) | `C:\Users\Vicky\ATB\Bare Act and Study Material\Income_Tax_Act_2025_as_amended_by_FA_Act_2026.pdf` |
| ICAI Study Material | `C:\Users\Vicky\ATB\Bare Act and Study Material\ICAI Material\` |
| This index | `tax-audit/bare-act-index.md` |
| Audit log | `tax-audit/audit-log.md` |
| AI Auditor skill | `.claude/skills/tax-auditor/SKILL.md` |

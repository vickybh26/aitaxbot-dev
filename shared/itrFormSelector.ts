/**
 * shared/itrFormSelector.ts
 *
 * Deterministic ITR-1 / ITR-2 / ITR-3 / ITR-4 eligibility engine.
 *
 * Based on the "ITR Form Selector" sheet in
 * ATB/ICAI_Tax_Laws_Database.xlsx (built from ICAI reference material) --
 * these eligibility rules are structural (income ceiling, house-property
 * count, capital gains, business income, residency, director status,
 * foreign assets, VDA/crypto, agricultural income) and don't shift year to
 * year the way slab rates do, so a fixed rule table is more reliable here
 * than asking an LLM to reason it out fresh each time. Rates/exact ceilings
 * (₹50L, ₹5,000 agri, 44AD/44ADA/44AE limits) are current as of ICAI's
 * A.Y. 2025-26 guide and are the same structural limits for AY 2026-27 --
 * only due dates move, and this module doesn't compute due dates.
 *
 * Scope: ITR-1 (SAHAJ), ITR-2, ITR-3, ITR-4 (SUGAM) for individuals/HUFs.
 * ITR-5/6/7 (firms, companies, trusts, AOPs/BOIs) are out of scope for a
 * personal tax tool and collapse to a single "ITR-5+" fallback that isn't
 * otherwise produced by this engine (kept only for completeness/typing).
 */

export type ResidentialStatus = "resident" | "nonResident" | "rnor";

export interface ITRFormInput {
  residentialStatus: ResidentialStatus;
  totalIncome: number;
  /** Salary or pension income (any amount > 0). */
  hasSalaryIncome: boolean;
  /** Number of house properties owned (0 if none). */
  housePropertyCount: number;
  /** Any business or professional income at all. */
  hasBusinessIncome: boolean;
  /**
   * Only meaningful when hasBusinessIncome is true: was it declared under
   * presumptive taxation (44AD / 44ADA / 44AE)? If false, full books are
   * implied and only ITR-3 applies regardless of amount.
   */
  isPresumptiveScheme: boolean;
  /** Any capital gains (STCG/LTCG on equity, property, etc.). */
  hasCapitalGains: boolean;
  /** Crypto / Virtual Digital Asset income taxed under Section 115BBH. */
  hasVDAIncome: boolean;
  /** Interest, dividends, family pension, lottery, etc. */
  hasOtherSources: boolean;
  /** Annual agricultural income in rupees. */
  agriculturalIncome: number;
  /** Director in any company. */
  isDirectorInCompany: boolean;
  /** Any foreign income or foreign assets to report (Schedule FA). */
  hasForeignIncomeOrAssets: boolean;
}

export type RecommendedITRForm = "ITR-1" | "ITR-2" | "ITR-3" | "ITR-4" | "ITR-5+";

export interface ITRFormResult {
  form: RecommendedITRForm;
  formLabel: string;
  /** Why this specific form was recommended. */
  reasons: string[];
  /** Conditions that ruled out the simpler forms (ITR-1 / ITR-4). */
  blockers: string[];
  /** Caveats worth double-checking before relying on the recommendation. */
  warnings: string[];
}

const FORM_LABELS: Record<RecommendedITRForm, string> = {
  "ITR-1": "ITR-1 (SAHAJ)",
  "ITR-2": "ITR-2",
  "ITR-3": "ITR-3",
  "ITR-4": "ITR-4 (SUGAM)",
  "ITR-5+": "ITR-5 / ITR-6 / ITR-7",
};

const INCOME_CEILING = 5_000_000; // ₹50 lakh — ITR-1 and ITR-4 ceiling
const AGRI_INCOME_CEILING = 5_000; // ₹5,000 — ITR-1 agricultural income ceiling

export function recommendITRForm(input: ITRFormInput): ITRFormResult {
  const {
    residentialStatus,
    totalIncome,
    housePropertyCount,
    hasBusinessIncome,
    isPresumptiveScheme,
    hasCapitalGains,
    hasVDAIncome,
    agriculturalIncome,
    isDirectorInCompany,
    hasForeignIncomeOrAssets,
  } = input;

  // Conditions that rule out ITR-1 and ITR-4 (the two "simple" forms).
  // Collected up front since ITR-3 vs ITR-2 both fall back on the same list.
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (residentialStatus !== "resident") {
    blockers.push("Non-resident / RNOR status rules out ITR-1 and ITR-4 — only ordinarily resident individuals can use those forms.");
  }
  if (totalIncome > INCOME_CEILING) {
    blockers.push(`Total income above ₹50,00,000 (₹${totalIncome.toLocaleString("en-IN")}) rules out ITR-1 and ITR-4.`);
  }
  if (housePropertyCount > 1) {
    blockers.push("More than one house property rules out ITR-1 and ITR-4.");
  }
  if (isDirectorInCompany) {
    blockers.push("Being a director in a company rules out ITR-1 and ITR-4.");
  }
  if (hasForeignIncomeOrAssets) {
    blockers.push("Foreign income or foreign assets require Schedule FA, which only exists in ITR-2 and ITR-3.");
  }
  if (agriculturalIncome > AGRI_INCOME_CEILING) {
    blockers.push(`Agricultural income of ₹${agriculturalIncome.toLocaleString("en-IN")} exceeds the ₹5,000 ITR-1/ITR-4 ceiling.`);
  }
  if (hasCapitalGains) {
    blockers.push("Capital gains income rules out ITR-1 and ITR-4 entirely.");
  }
  if (hasVDAIncome) {
    blockers.push("Crypto / Virtual Digital Asset income (Section 115BBH) needs Schedule VDA, which only exists in ITR-2 and ITR-3.");
  }

  // ── Business / professional income branch ──────────────────────────────
  if (hasBusinessIncome) {
    if (!isPresumptiveScheme) {
      return {
        form: "ITR-3",
        formLabel: FORM_LABELS["ITR-3"],
        reasons: [
          "Business or professional income is present and not declared under a presumptive scheme (44AD/44ADA/44AE) — full books-of-accounts reporting is required, and only ITR-3 supports that for individuals/HUFs.",
        ],
        blockers,
        warnings,
      };
    }

    if (blockers.length > 0) {
      return {
        form: "ITR-3",
        formLabel: FORM_LABELS["ITR-3"],
        reasons: [
          "Business income is declared under a presumptive scheme, which would normally mean ITR-4 -- but at least one other condition below rules that out, so ITR-3 applies instead.",
        ],
        blockers,
        warnings,
      };
    }

    return {
      form: "ITR-4",
      formLabel: FORM_LABELS["ITR-4"],
      reasons: [
        "Business/professional income declared under a presumptive scheme (44AD/44ADA/44AE), total income within ₹50 lakh, resident, no capital gains/VDA, at most one house property, no director or foreign-asset complications, agricultural income within ₹5,000.",
      ],
      blockers: [],
      warnings: [
        "Presumptive taxation only covers turnover/receipts within the scheme limits -- 44AD: ₹3 crore (with digital receipts), 44ADA: ₹75 lakh gross receipts, 44AE: max 10 goods vehicles. Confirm you're within those limits before relying on ITR-4.",
      ],
    };
  }

  // ── No business income: ITR-1 vs ITR-2 ─────────────────────────────────
  if (blockers.length === 0) {
    return {
      form: "ITR-1",
      formLabel: FORM_LABELS["ITR-1"],
      reasons: [
        "Resident individual, total income within ₹50 lakh, at most one house property, no capital gains/crypto/business income, not a company director, no foreign income or assets, agricultural income within ₹5,000.",
      ],
      blockers: [],
      warnings: [],
    };
  }

  return {
    form: "ITR-2",
    formLabel: FORM_LABELS["ITR-2"],
    reasons: [
      "No business or professional income, but at least one condition below rules out the simpler ITR-1.",
    ],
    blockers,
    warnings,
  };
}

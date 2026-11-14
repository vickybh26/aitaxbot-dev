/**
 * Tax Reconciliation Service — v3
 *
 * Strategy: Poppler/Tesseract extract text on our server. An allowlist
 * converts it to financial observations before any Gemini request.
 * PDFs, OCR text and identifiers never go to Gemini. Extraction is partial
 * and the report always requires verification against the originals.
 *
 * Privacy boundary: logs in this module must contain fixed diagnostic messages
 * only. Never log document fields, model responses, PDF passwords, or caught
 * error objects/messages (provider errors can embed input/output payloads).
 * scripts/test-reconcile-log-privacy.mjs guards this rule without taxpayer data.
 */

import { extractPrivateTaxText, PrivateExtractionError } from "./localTaxDocument";
import { extractTaxFacts, financialFactsPrompt } from "./taxDocumentFacts";

// ─────────────────────────────────────────────────────────────────────────────
// Gemini (optional — financial facts only)
// ─────────────────────────────────────────────────────────────────────────────
import { GoogleGenAI } from "@google/genai";
import { computeTaxLiability } from "@shared/taxLiability";
import { recommendITRForm, type ITRFormInput, type ITRFormResult } from "@shared/itrFormSelector";

function buildAI(): InstanceType<typeof GoogleGenAI> | null {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    console.warn("[taxReconcileService] GOOGLE_API_KEY not set — AI analysis unavailable");
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
}

const ai = buildAI();

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HighValueTransaction {
  code: string;         // SFT code, e.g. "SFT-005", "SFT-004", "SFT-012"
  description: string;  // e.g. "Purchase of time deposits"
  amount: number;
}

/**
 * Catch-all for any income row in the AIS that does NOT map to one of the
 * named fields below.
 *
 * Why this exists: the named fields enumerate the income types we knew about
 * when the parser was written. Anything outside that list — contract receipts
 * (194C), professional fees (194J), commission (194H), rent (194I), lottery
 * winnings (194B), EPF withdrawal (192A), partner remuneration (194T), and
 * whatever the department adds next — had nowhere to be stored, so it was
 * silently dropped. A taxpayer would then see a confident report that simply
 * omitted a whole head of income.
 *
 * This bucket makes the parser fail LOUD instead of silent: anything it can't
 * classify still gets captured verbatim and surfaced to the user, who can
 * recognise their own income even when our schema doesn't.
 * Added 2026-07-26 after a real AIS carrying ₹45,500 of 194C contract
 * receipts produced a report that never mentioned them.
 */
/**
 * One declared section of the AIS, as the document itself describes it.
 *
 * The AIS states what it contains BEFORE it lists the detail: every Part B
 * section carries an information code, a description, a COUNT of rows and a
 * total AMOUNT, followed by that many itemised rows. That header is a
 * completeness oracle — it lets us check our own extraction instead of
 * asking the user to trust it.
 *
 * Two failure modes become detectable that were previously invisible:
 *   1. We mapped a section but our figure is short of the declared AMOUNT
 *      → we dropped rows, and we can say so instead of reporting a low number.
 *   2. The document declares a category we have no field for at all
 *      → we can name it and its amount even though we can't classify it,
 *        rather than omitting it silently.
 *
 * This is the answer to "what about income types we've never seen": the
 * document tells us they exist. We don't have to guess.
 */
export interface AISSectionTotal {
  code: string;         // information code as printed, e.g. "SFT-016(TD)", "TDS-194C"
  description: string;  // description as printed
  heading?: string;     // section heading, e.g. "Interest from deposit"
  count: number | null; // declared number of rows
  amount: number;       // declared total for the section
}

export interface OtherIncomeItem {
  code: string;         // information code exactly as printed, e.g. "TDS-194C"
  description: string;  // description exactly as printed
  source?: string;      // deductor / reporting entity, if shown
  amount: number;       // gross amount credited (NOT the TDS)
  tdsDeducted?: number; // TDS on it, if the row shows one
}

export interface ExtractedAIS {
  /**
   * The tax period the document itself states, read off the PDF rather than
   * assumed. See resolveTaxPeriod() for why this is extracted per-document
   * instead of being asked of the user or hardcoded.
   */
  financialYear: string | null;   // canonical "YYYY-YY", e.g. "2025-26"
  assessmentYear: string | null;  // canonical "YYYY-YY", e.g. "2026-27"
  salaryIncome: number | null;
  interestFromSavings: number | null;
  interestFromFD: number | null;
  dividendIncome: number | null;
  securitiesTransactions: number | null;  // gross sale value of listed equities
  mutualFundTransactions: number | null;  // gross sale value of MFs
  cryptoIncome: number | null;            // VDA receipts (194S)
  lrsRemittance: number | null;           // LRS remittances (206CQ TCS)
  taxPaidSelfAssessment: number | null;   // self-assessment tax in AIS Part B3
  // Specified Financial Transactions reported in Part B2 that are NOT taxable
  // income by themselves (e.g. buying a time deposit is not income) but are
  // still worth surfacing — the IT dept already has them on file, and a large
  // unexplained-looking transaction is a common scrutiny trigger. Covers
  // SFT-005 (time deposit purchase), SFT-004 (cash deposits), SFT-006 (credit
  // card payments), SFT-010/SFT-012 (immovable property), SFT-013 (cash
  // payment for goods/services), SFT-014 (cash withdrawal/deposit), etc.
  highValueTransactions: HighValueTransaction[] | null;
  /** Income rows that matched none of the named fields above — see OtherIncomeItem. */
  otherIncomeItems: OtherIncomeItem[] | null;
  /**
   * Every section heading Gemini reported seeing in the document. Used as a
   * coverage check: if the model saw a heading we have no figure for, that's
   * a signal something was missed rather than absent.
   */
  sectionsSeen: string[] | null;
  /** Declared section headers with their own COUNT/AMOUNT — see AISSectionTotal. */
  sectionTotals: AISSectionTotal[] | null;
  rawText?: string;
}

/** Per-section verdict produced by reconciling our figures against the document's own totals. */
export interface CoverageItem {
  code: string;
  description: string;
  declaredAmount: number;
  mappedAmount: number | null;   // what we actually captured for it, if we could tell
  status: "RECONCILED" | "SHORT" | "UNMAPPED";
  note: string;
}

export interface CoverageReport {
  sectionsDeclared: number;
  sectionsReconciled: number;
  totalDeclared: number;         // sum of all declared income-bearing section amounts
  totalMapped: number;           // sum of what we captured against them
  items: CoverageItem[];
  /** True only when every declared section reconciles — the claim we can defend. */
  complete: boolean;
  summary: string;
}

export interface NonSalaryTDSSection {
  section: string;   // e.g. "194A", "194C", "194J", "194Q", "194S", "194IA"
  amount: number;    // Tax Deposited for that section (aggregated across deductors)
}

export interface Extracted26AS {
  /** Tax period stated on the document itself — see resolveTaxPeriod(). */
  financialYear: string | null;
  assessmentYear: string | null;
  tdsSalary: number | null;         // Part I TDS deposited on salary (section 192)
  tdsNonSalary: number | null;      // Part I TDS on non-salary (194S etc.) — aggregate total
  nonSalarySections: NonSalaryTDSSection[] | null; // same total, broken out by section code —
                                                    // lets us infer income type (194J → professional,
                                                    // 194IA → property sale, 194S → crypto, etc.)
                                                    // for the ITR form recommendation below.
  advanceTaxPaid: number | null;    // Part C advance tax
  selfAssessmentTax: number | null; // Part D self-assessment tax
  totalTdsCredits: number | null;   // total TDS deposited across all deductors
  tcsPaid: number | null;           // Part VI TCS collected
  employerName?: string;
  employerTAN?: string;
  rawText?: string;
}

export interface ExtractedForm16 {
  /** Tax period stated on the document itself — see resolveTaxPeriod(). */
  financialYear: string | null;
  assessmentYear: string | null;
  // Part A
  employerName: string | null;
  employerTAN: string | null;
  employeePAN: string | null;
  tdsDeposited: number | null;          // total TDS deposited Part A
  // Part B
  grossSalary: number | null;           // 1(d) total gross salary
  salaryU17_1: number | null;           // 1(a) salary u/s 17(1)
  perquisites: number | null;           // 1(b) perquisites
  hraExempt: number | null;             // HRA exemption u/s 10(13A)
  standardDeduction: number | null;     // 4(a) std deduction u/s 16(ia)
  professionalTax: number | null;       // 4(c) professional tax
  netSalary: number | null;             // 6. income chargeable under salaries
  deduction80C: number | null;
  deduction80D: number | null;
  totalDeductionsVI_A: number | null;   // 11. aggregate VI-A deductions
  taxableIncome: number | null;         // 12. total taxable income
  taxOnIncome: number | null;           // 13. tax on total income
  rebate87A: number | null;             // 14. rebate u/s 87A
  cess: number | null;                  // 16. health & education cess
  totalTaxPayable: number | null;       // 17. tax payable
  totalTaxDeducted: number | null;      // total TDS per Form 16
  newRegime: boolean | null;            // true if New Tax Regime (115BAC)
  rawText?: string;
}

export interface ReconciliationMismatch {
  id: string;
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "OK";
  title: string;
  description: string;
  aisValue: number | null;
  form16Value: number | null;
  form26asValue: number | null;
  difference: number | null;
  ruleExplanation: string;
  suggestedAction: string;
}

export interface ReconciliationCheck {
  name: string;
  status: "MATCH" | "MISMATCH" | "PARTIAL" | "NOT_FOUND" | "OK";
  aisValue: number | null;
  form16Value: number | null;
  form26asValue: number | null;
  note: string;
}

export interface MultiEmployerFlags {
  employerCount: number;
  standardDeductionDoubleCounted: boolean;
  totalDeductionsVIADoubleCounted: boolean;
  deduction80DDoubleCounted: boolean;
  regimeConsistent: boolean;
  regimesSeen: (boolean | null)[];
}

export interface DocumentsProvided {
  ais: boolean;
  form26as: boolean;
  form16: boolean;
}

/**
 * Documents that were uploaded but came back with NOTHING extracted.
 *
 * This distinction is a safety requirement, not a nicety. Before this
 * existed the engine could not tell "the AIS parsed fine and the taxpayer
 * genuinely has no interest income" apart from "the AIS parse failed and we
 * read nothing at all" — both surfaced as a wall of nulls, and a wall of
 * nulls produces zero mismatches, which produced a confident
 * "CLEAN — Ready to File ITR" verdict on a return that was in fact missing
 * real income. That is the worst possible failure mode for this tool: it is
 * worse than erroring out, because the user is actively reassured.
 * Observed 2026-07-26 on a real AIS containing ~₹1.36L of interest,
 * ₹200 dividend and ₹67,992 of equity sales, all reported as "N/A".
 */
export interface ParseFailures {
  ais: boolean;
  form26as: boolean;
  form16: boolean;
}

export interface ReconciliationReport {
  extractedData: {
    ais: ExtractedAIS;
    form26as: Extracted26AS;
    form16: ExtractedForm16;          // combined/aggregated across all employers
    form16Employers: ExtractedForm16[]; // raw per-employer parses, one per uploaded Form 16
  };
  // Which of the three document types the user actually uploaded. Optional for
  // backwards compatibility with reports generated before partial uploads were
  // allowed (absent = all three were required, so all three are present).
  documentsProvided?: DocumentsProvided;
  /** Uploaded documents from which nothing could be extracted — see ParseFailures. */
  parseFailures?: ParseFailures;
  /**
   * Which tax year this report was computed for, read off the uploaded
   * documents. Optional for backwards compatibility with reports generated
   * before the year was extracted rather than hardcoded.
   */
  taxPeriod?: TaxPeriodResolution;
  /** Whether our figures account for every section the AIS declares — see CoverageReport. */
  coverage?: CoverageReport;
  checks: ReconciliationCheck[];
  mismatches: ReconciliationMismatch[];
  overallStatus: "CLEAN" | "NEEDS_ATTENTION" | "CRITICAL";
  summary: string;
  actionItems: string[];
  aiInsights: string;
  itrImpact: string;
  generatedAt: string;
  aisNote?: string;  // shown in UI when AIS parsing is limited
  multiEmployer?: {
    employerCount: number;
    regimeConsistent: boolean;
    estimatedTaxLiability: number | null;  // combined annual liability on aggregated income
    creditedTax: number | null;            // TDS + advance tax + self-assessment tax per 26AS
    estimatedShortfall: number | null;     // null when not computable (e.g. regime mismatch)
  };
  recommendedITRForm: ITRFormResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tax period (FY / AY) resolution
//
// The reconciliation tool has no year selector — by design. Asking the user
// which year their documents cover invites a self-report that contradicts the
// files they just uploaded, and the documents already state it: Form 16 Part A
// names its assessment year, 26AS is headed with one, and the AIS states its
// financial year. So we read it off each document and cross-check.
//
// This replaces a hardcoded "2025-26" that was previously passed into
// combineForm16s() and asserted in all three parser prompts. That was wrong in
// two directions: it silently mislabelled FY 2024-25 documents, and it
// computed their liability against the wrong year's slabs. It also becomes
// load-bearing from April 2026, when the FY the documents cover is what
// decides whether ITA 1961 or ITA 2025 governs at all.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise any Indian tax-year label to canonical "YYYY-YY".
 * Accepts "2025-26", "2025-2026", "FY 2025-26", "2025 – 26", "2025/26".
 * Returns null for anything that isn't two consecutive years — a label like
 * "2025-28" is a misread, and guessing at it would be worse than admitting
 * we don't know.
 *
 * Only years 2000-2099 are recognised (`20\d{2}`); a wider pattern would start
 * matching rupee amounts and PAN-adjacent digit runs, which is a worse failure
 * than not reading a year printed in the 22nd century.
 *
 * NOTE the alternation order in the end-year group: `\d{4}` MUST come before
 * `\d{2}`. Regex alternation is first-match-wins, so `\d{2}|\d{4}` matches
 * just "20" of "2026" in "2025-2026" and the consecutive-year check then
 * rejects the whole label. Verified by unit test — do not reorder.
 */
function normalizeYearLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw).match(/(20\d{2})\s*[-–—/]\s*(\d{4}|\d{2})/);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const endRaw = parseInt(m[2], 10);
  const end = endRaw < 100 ? Math.floor(start / 100) * 100 + endRaw : endRaw;
  // Handle a century rollover in the 2-digit form (e.g. "2099-00").
  const endAdjusted = end < start ? end + 100 : end;
  if (endAdjusted !== start + 1) return null;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** AY 2026-27 → FY 2025-26. The assessment year is always the FY plus one. */
function ayToFy(ay: string | null | undefined): string | null {
  const n = normalizeYearLabel(ay);
  if (!n) return null;
  const start = parseInt(n.slice(0, 4), 10) - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** FY 2025-26 → AY 2026-27. */
function fyToAy(fy: string | null | undefined): string | null {
  const n = normalizeYearLabel(fy);
  if (!n) return null;
  const start = parseInt(n.slice(0, 4), 10) + 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * Collapse one document's stated FY and/or AY into a single canonical FY.
 * Documents state one, the other, or both; when both are present and
 * disagree, we trust neither and return null rather than picking a winner.
 */
function documentFinancialYear(doc: {
  financialYear: string | null;
  assessmentYear: string | null;
}): string | null {
  const fromFy = normalizeYearLabel(doc.financialYear);
  const fromAy = ayToFy(doc.assessmentYear);
  if (fromFy && fromAy) return fromFy === fromAy ? fromFy : null;
  return fromFy ?? fromAy ?? null;
}

export interface TaxPeriodResolution {
  /** The FY the report is computed for. Never null — see `assumed`. */
  financialYear: string;
  assessmentYear: string;
  /** True when no uploaded document stated a readable year and we fell back. */
  assumed: boolean;
  /** Per-document FY as stated, for display and for the conflict message. */
  perDocument: Array<{ document: string; financialYear: string }>;
  /** True when two uploaded documents state different financial years. */
  conflict: boolean;
}

/**
 * Fallback FY used only when NO uploaded document states a readable year.
 * Deliberately a named constant rather than an inline literal: it is a guess,
 * every use of it is flagged to the user via `assumed`, and it needs to be
 * findable when the default rolls over each filing season.
 */
const FALLBACK_FINANCIAL_YEAR = "2025-26";

function resolveTaxPeriod(
  ais: { financialYear: string | null; assessmentYear: string | null },
  form26as: { financialYear: string | null; assessmentYear: string | null },
  form16Employers: Array<{ financialYear: string | null; assessmentYear: string | null }>,
  provided: DocumentsProvided,
): TaxPeriodResolution {
  const perDocument: Array<{ document: string; financialYear: string }> = [];

  const push = (label: string, doc: { financialYear: string | null; assessmentYear: string | null }) => {
    const fy = documentFinancialYear(doc);
    if (fy) perDocument.push({ document: label, financialYear: fy });
  };

  if (provided.ais) push("AIS", ais);
  if (provided.form26as) push("Form 26AS", form26as);
  form16Employers.forEach((e, i) =>
    push(form16Employers.length > 1 ? `Form 16 (${i + 1})` : "Form 16", e)
  );

  const distinct = [...new Set(perDocument.map((d) => d.financialYear))];

  if (distinct.length === 0) {
    return {
      financialYear: FALLBACK_FINANCIAL_YEAR,
      assessmentYear: fyToAy(FALLBACK_FINANCIAL_YEAR)!,
      assumed: true,
      perDocument,
      conflict: false,
    };
  }

  // On conflict, take the most frequently stated year so the report still
  // computes something sensible — but flag it HIGH so the user knows the
  // documents disagree and the figures may be mixing two tax years.
  const counts = new Map<string, number>();
  for (const d of perDocument) counts.set(d.financialYear, (counts.get(d.financialYear) ?? 0) + 1);
  const financialYear = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  return {
    financialYear,
    assessmentYear: fyToAy(financialYear)!,
    assumed: false,
    perDocument,
    conflict: distinct.length > 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ITR form recommendation, inferred from AIS + 26AS (incl. section-level TDS
// breakdown) + Form 16 — NOT from user-entered checkboxes the way the Income
// Tax Calculator's version works. Several ITRFormInput fields have no
// reliable signal in these three documents at all (house property count,
// director status, residential status, foreign assets, agricultural income)
// — those default to the "simple" case and get called out explicitly in the
// warnings, rather than silently guessed at.
// ─────────────────────────────────────────────────────────────────────────────

const BUSINESS_SIGNAL_SECTIONS = ["194C", "194J", "194Q", "194H"];

function inferITRFormRecommendation(
  ais: ExtractedAIS,
  form26as: Extracted26AS,
  form16: ExtractedForm16
): ITRFormResult {
  const sections = form26as.nonSalarySections ?? [];
  const sectionCodes = new Set(sections.map((s) => s.section));

  const businessSectionsSeen = BUSINESS_SIGNAL_SECTIONS.filter((s) => sectionCodes.has(s));
  const hasBusinessIncome = businessSectionsSeen.length > 0;
  const hasPropertySaleSignal = sectionCodes.has("194IA");
  const hasSecuritiesGains = (ais.securitiesTransactions ?? 0) > 0 || (ais.mutualFundTransactions ?? 0) > 0;
  const hasCapitalGains = hasPropertySaleSignal || hasSecuritiesGains;
  const hasVDAIncome = sectionCodes.has("194S") || (ais.cryptoIncome ?? 0) > 0;
  const hasOtherSources =
    (ais.interestFromSavings ?? 0) > 0 || (ais.interestFromFD ?? 0) > 0 || (ais.dividendIncome ?? 0) > 0;
  const hasSalaryIncome = (form16.grossSalary ?? 0) > 0 || (ais.salaryIncome ?? 0) > 0;

  // Best-effort total income: salary (Form 16, most reliable figure we have)
  // + AIS other-source amounts. Capital gains are deliberately excluded —
  // AIS shows gross transaction value, not net gain, so adding it in would
  // overstate "total income" for the ₹50L ITR-1/4 ceiling check.
  const totalIncome =
    (form16.taxableIncome ?? form16.grossSalary ?? 0) +
    (ais.interestFromSavings ?? 0) +
    (ais.interestFromFD ?? 0) +
    (ais.dividendIncome ?? 0);

  const input: ITRFormInput = {
    residentialStatus: "resident", // no reliable signal in these documents — see warnings
    totalIncome,
    hasSalaryIncome,
    housePropertyCount: 0,         // no reliable signal — see warnings
    hasBusinessIncome,
    isPresumptiveScheme: false,    // conservative default when business income is detected — see warnings
    hasCapitalGains,
    hasVDAIncome,
    hasOtherSources,
    agriculturalIncome: 0,
    isDirectorInCompany: false,    // no reliable signal — see warnings
    hasForeignIncomeOrAssets: false, // LRS remittance alone isn't proof of foreign assets/income — see warnings
  };

  const result = recommendITRForm(input);

  const documentCaveats: string[] = [
    "Inferred only from your AIS, 26AS, and Form 16 — these documents can't reliably show house property count, director status, NRI/RNOR residential status, foreign assets, or agricultural income. Confirm those yourself before relying on this recommendation.",
  ];
  if (hasBusinessIncome) {
    documentCaveats.push(
      `TDS under section(s) ${businessSectionsSeen.join(", ")} on your 26AS suggests business/professional income. If this is declared under a presumptive scheme (44AD/44ADA/44AE), ITR-4 may apply instead of ITR-3 — this tool conservatively assumes it is NOT presumptive unless you confirm otherwise.`
    );
  }
  if (hasPropertySaleSignal) {
    documentCaveats.push(
      "TDS under section 194IA on your 26AS (buyer-deducted TDS on property purchase) suggests you sold immovable property this year — treated as a capital gains signal here."
    );
  }
  if ((ais.lrsRemittance ?? 0) > 0) {
    documentCaveats.push(
      "You have LRS remittances on your AIS. If these resulted in foreign bank accounts or investments you still hold, Schedule FA disclosure is required — only available in ITR-2/ITR-3, not ITR-1/ITR-4."
    );
  }

  return { ...result, warnings: [...result.warnings, ...documentCaveats] };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF text extraction helper
// ─────────────────────────────────────────────────────────────────────────────

// Parse locally extracted financial facts; source documents never leave the server.
async function parseAISWithGemini(facts: string): Promise<Partial<ExtractedAIS>> {
  if (!ai) {
    console.warn("[parseAISWithGemini] No API key — skipping");
    return {};
  }

  // NOTE: this prompt deliberately does NOT tell the model which year the
  // document covers. It used to assert "for FY 2025-26", which both biased the
  // model on genuinely older documents and made the tool structurally unable to
  // notice it had been handed the wrong year. We ask for the year instead.
  const prompt = `This is an Annual Information Statement (AIS) from the Indian Income Tax Department Insight portal.
It shows financial data reported to the IT department for a single financial year.

Read EVERY page carefully. The document has sections:
- Part B1: TDS/TCS (salary TDS-192, contract receipts TDS-194C, interest TDS-194A, crypto VDA TDS-194S, etc.)
- Part B2: SFT — Specified Financial Transactions
- Part B3: Tax payments (advance tax, self-assessment tax)
- Part B7: Salary Annexure II

CRITICAL — DO NOT DOUBLE-COUNT. PART B1 AND PART B2 DESCRIBE THE SAME INCOME.
The AIS reports the same money twice, from two different reporters:
  • Part B1 carries the DEDUCTOR's view — e.g. "TDS-194A Interest other than
    Interest on Securities", showing the gross amount on which TDS was cut.
  • Part B2 carries the BANK's / registrar's SFT view of that same interest —
    e.g. "SFT-016(SB) Savings" and "SFT-016(TD) Term Deposit".
These are NOT two separate incomes. A taxpayer with ₹1,90,420 of deposit
interest may show ₹1,49,039 under TDS-194A and ₹1,90,420 under SFT-016(TD);
adding them reports ₹3,39,459 of income that does not exist and would make the
taxpayer over-declare.

RULE: for interest, dividend, and securities/mutual-fund sales, take the
figure from the Part B2 SFT rows ONLY. Never add the Part B1 TDS row for the
same kind of income on top.

Part B1 rows only become the source when that income has NO Part B2 SFT
counterpart at all — e.g. salary (192 / TDS Annexure II), contract receipts
(194C), professional fees (194J), commission (194H), rent (194I). Those still
belong in salaryIncome or otherIncomeItems as described below.

CRITICAL — MATCH ON THE DESCRIPTION TEXT, NOT ON EXACT CODES.
The SFT information codes vary between AIS documents and suffixes differ
(e.g. Term Deposit interest may appear as SFT-016(TD), SFT-016(FD) or plain
SFT-016; listed-share sales appear as SFT-17-LES(M), SFT-17-LS(M), SFT-017
or similar). Do NOT require an exact code match — identify each row by its
"INFORMATION DESCRIPTION" wording and its section heading, then read the
AMOUNT column. If a row's description says it is interest, treat it as
interest regardless of the code suffix. Missing a real figure because the
code didn't match exactly is the single worst failure mode here.

Extract these values. Use null ONLY if that category genuinely has no rows
in the document. Return ONLY this JSON (no markdown, no text before/after):
{
  "financialYear": "<the financial year this AIS covers, exactly as printed on the document, e.g. '2025-26'. The AIS states it near the top, often as 'Financial Year' or 'F.Y.'. Use null if genuinely not printed anywhere — do NOT guess or infer it from transaction dates>",
  "assessmentYear": "<the assessment year if the document states one, e.g. '2026-27'. Use null if not printed. Note AY is always one year after FY — do NOT compute one from the other, only report what is actually printed>",
  "salaryIncome": <total salary from TDS-192 / "Salary (TDS Annexure II)" AMOUNT column, number>,
  "interestFromSavings": <Part B2 SFT ONLY. Sum of EVERY SFT row whose description indicates savings-bank interest — heading "Interest from savings bank", description "Interest income ... Savings", typically SFT-016(SB). Sum across ALL banks. number>,
  "interestFromFD": <Part B2 SFT ONLY — never add TDS-194A from Part B1. Sum of EVERY SFT row whose description indicates term-deposit / fixed-deposit interest — heading "Interest from deposit", description "Interest income ... Term Deposit", typically SFT-016(TD) or SFT-016(FD). Sum across ALL banks. number>,
  "dividendIncome": <Part B2 SFT ONLY. Sum of every SFT row described as dividend income, typically SFT-015. Do not add a Part B1 TDS-194 dividend row on top — it is the same dividend. number>,
  "securitiesTransactions": <sum of SALES CONSIDERATION / AMOUNT for every row under a heading like "Sale of securities and units of mutual fund" describing sale of listed equity shares — codes vary (SFT-17-LES(M), SFT-17-LS(M), SFT-017). Use the total sale value, NOT the purchase value. number>,
  "mutualFundTransactions": <total sale value of mutual fund units (descriptions mentioning mutual fund sale/redemption, e.g. SFT-18 variants). Exclude purchases. number>,
  "cryptoIncome": <total from TDS-194S / VDA / virtual digital asset section, number>,
  "lrsRemittance": <total LRS remittance from TCS-206CQ section, number>,
  "taxPaidSelfAssessment": <self-assessment tax paid in Part B3, number>,
  "highValueTransactions": [{ "code": "<the code exactly as printed, e.g. SFT-005>", "description": "<the description exactly as printed, e.g. Purchase of time deposits>", "amount": <number> }, ...] — EVERY Part B2 SFT entry NOT already captured above (i.e. not interest, dividend, securities sale, or MF sale). One entry per distinct code+description, amounts summed if repeated. Commonly includes purchase of time deposits (SFT-005), purchase of securities (SFT-17(Pur) / SFT-18(Pur)), cash deposits (SFT-004), credit card payments (SFT-006), immovable property (SFT-010/SFT-012), cash payments (SFT-013), cash withdrawals (SFT-014). These are easy to miss — do not skip them. Use [] if none found.,
  "otherIncomeItems": [{ "code": "<code exactly as printed, e.g. TDS-194C>", "description": "<description exactly as printed>", "source": "<deductor/reporting entity name>", "amount": <GROSS amount paid or credited, NOT the TDS>, "tdsDeducted": <TDS on that row, or null> }, ...],
  "sectionsSeen": ["<every section/sub-heading you saw, verbatim, e.g. 'Business receipts', 'Interest from deposit', 'Sale of securities and units of mutual fund'>"],
  "sectionTotals": [{ "code": "<information code exactly as printed>", "description": "<information description exactly as printed>", "heading": "<the sub-heading above it, e.g. 'Interest from deposit'>", "count": <the COUNT column value, or null>, "amount": <the AMOUNT column value> }, ...]
}

SECTION TOTALS — this is a completeness check, treat it as seriously as the figures themselves.
Every Part B entry in an AIS is introduced by a header row of the form:
    SR.NO | INFORMATION CODE | INFORMATION DESCRIPTION | INFORMATION SOURCE | COUNT | AMOUNT
followed by COUNT itemised detail rows. Transcribe EVERY such header row into
"sectionTotals" exactly as printed — the code, the description, the count and
the total amount — for ALL of Part B1, B2, B3, B4 and B7, including:
  • sections you already reported in a named field above
  • sections you put in otherIncomeItems or highValueTransactions
  • sections you could not classify at all
  • sections whose subject matter is unfamiliar to you
Report the header's own AMOUNT, not your sum of the detail rows. If the same
code appears more than once from different sources (e.g. two registrars, two
banks), emit one entry PER header row — do not merge them.
Do not omit a section because it seems irrelevant, non-taxable, or duplicated
elsewhere in your answer. This list is used to verify that nothing in the
document was missed, so an incomplete list defeats its entire purpose.
Use [] only if Part B genuinely contains no entries at all.

MANDATORY CATCH-ALL RULE — read this twice.
"otherIncomeItems" must contain EVERY income row in the document that you did
NOT already report in one of the named fields above. This is not optional and
it is not a fallback for odd cases; it is how the system stays correct when it
meets an AIS containing something it has never seen before.

Examples that MUST land in otherIncomeItems because they have no named field:
  • TDS-194C  contract / business receipts        • TDS-194J professional or technical fees
  • TDS-194H  commission or brokerage             • TDS-194I  rent received
  • TDS-194B/194BB lottery, betting, horse race   • TDS-192A EPF withdrawal
  • TDS-194T  partner remuneration from a firm    • TDS-194D insurance commission
  • TDS-194N  large cash withdrawals              • any 'Business receipts' heading
  • ANY other income row whose type is not one of: salary, savings interest,
    term-deposit interest, dividend, listed-share sale, mutual-fund sale,
    VDA/crypto, LRS remittance, self-assessment tax.

Record the GROSS amount paid/credited for these — not the TDS. A row showing
₹45,500 credited with ₹455 TDS must be captured as amount 45500, tdsDeducted 455.

If you are unsure whether something belongs in a named field or in
otherIncomeItems, put it in otherIncomeItems. Reporting a figure twice is a
minor annoyance a human can spot; omitting it entirely means the taxpayer
under-reports income and receives a notice. Never return [] for
otherIncomeItems unless you have genuinely accounted for every row in Parts
B1, B2 and B7 in the named fields above.`;

  try {
    console.log("[parseAISWithGemini] Sending allowlisted AIS facts to Gemini...");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: facts + "\n\nInterpret these facts using the following tax schema. Any reference below to reading a PDF means interpreting ONLY these supplied facts; you cannot inspect the original.\n" + prompt },
        ],
      }],
    });

    const raw = result.text ?? (result.candidates?.[0] as any)?.content?.parts?.[0]?.text ?? "{}";

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn("[parseAISWithGemini] No JSON found in response");
      return {};
    }
    const parsed = JSON.parse(match[0]);
    console.log("[parseAISWithGemini] Response parsed");

    // Validate highValueTransactions defensively — same reasoning as
    // nonSalarySections in parse26ASWithGemini: this feeds directly into a
    // user-facing report, so a malformed entry from the model shouldn't
    // silently poison it or crash the pipeline.
    const rawHVT = Array.isArray(parsed.highValueTransactions) ? parsed.highValueTransactions : [];
    const highValueTransactions: HighValueTransaction[] = rawHVT
      .filter((t: any) => t && typeof t.code === "string" && typeof t.amount === "number" && t.amount > 0)
      .map((t: any) => ({
        code: t.code.trim().toUpperCase(),
        description: typeof t.description === "string" ? t.description.trim() : t.code.trim(),
        amount: t.amount,
      }));

    // Same defensive validation for the catch-all bucket.
    const rawOther = Array.isArray(parsed.otherIncomeItems) ? parsed.otherIncomeItems : [];
    const otherIncomeItems: OtherIncomeItem[] = rawOther
      .filter((t: any) => t && typeof t.amount === "number" && t.amount > 0 && (typeof t.code === "string" || typeof t.description === "string"))
      .map((t: any) => ({
        code: typeof t.code === "string" ? t.code.trim() : "UNKNOWN",
        description: typeof t.description === "string" ? t.description.trim() : String(t.code ?? "").trim(),
        source: typeof t.source === "string" ? t.source.trim() : undefined,
        amount: t.amount,
        tdsDeducted: typeof t.tdsDeducted === "number" ? t.tdsDeducted : undefined,
      }));

    const sectionsSeen = Array.isArray(parsed.sectionsSeen)
      ? parsed.sectionsSeen.filter((s: any) => typeof s === "string" && s.trim()).map((s: string) => s.trim())
      : [];

    if (otherIncomeItems.length) {
      console.log("[parseAISWithGemini] Unmapped income rows captured");
    }

    const rawTotals = Array.isArray(parsed.sectionTotals) ? parsed.sectionTotals : [];
    const sectionTotals: AISSectionTotal[] = rawTotals
      .filter((s: any) => s && typeof s.amount === "number" && (typeof s.code === "string" || typeof s.description === "string"))
      .map((s: any) => ({
        code: typeof s.code === "string" ? s.code.trim() : "UNKNOWN",
        description: typeof s.description === "string" ? s.description.trim() : "",
        heading: typeof s.heading === "string" ? s.heading.trim() : undefined,
        count: typeof s.count === "number" ? s.count : null,
        amount: s.amount,
      }));

    if (sectionTotals.length) {
      console.log("[parseAISWithGemini] Declared sections parsed");
    } else {
      console.warn("[parseAISWithGemini] No sectionTotals returned — coverage cannot be verified for this document");
    }

    // Normalise the year labels here rather than downstream: the model returns
    // whatever the document printed ("F.Y. 2025-26", "2025-2026"), and every
    // consumer wants the canonical form.
    const financialYear = normalizeYearLabel(parsed.financialYear);
    const assessmentYear = normalizeYearLabel(parsed.assessmentYear);

    return {
      ...parsed,
      financialYear,
      assessmentYear,
      highValueTransactions: highValueTransactions.length ? highValueTransactions : null,
      otherIncomeItems: otherIncomeItems.length ? otherIncomeItems : null,
      sectionsSeen: sectionsSeen.length ? sectionsSeen : null,
      sectionTotals: sectionTotals.length ? sectionTotals : null,
    };
  } catch (err) {
    console.error("[parseAISWithGemini] Extraction failed");
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpret allowlisted Form 26AS facts
// ─────────────────────────────────────────────────────────────────────────────

async function parse26ASWithGemini(facts: string): Promise<Extracted26AS> {
  const empty: Extracted26AS = {
    financialYear: null, assessmentYear: null,
    tdsSalary: null, tdsNonSalary: null, nonSalarySections: null, advanceTaxPaid: null,
    selfAssessmentTax: null, totalTdsCredits: null, tcsPaid: null,
  };
  if (!ai) {
    console.warn("[parse26ASWithGemini] No API key — skipping");
    return empty;
  }

  // As with the AIS prompt: no year is asserted here — it is extracted below.
  const prompt = `This is an Annual Tax Statement / Annual Information Statement (Form 26AS or ATS) downloaded from TRACES for a single assessment year.

The document has sections like:
- PART-I or PART A: TDS details. This section can appear in TWO different layouts — check for BOTH:
  (a) One row per deductor with columns Deductor Name, TAN, Section code, Amount Paid, Tax Deducted, Tax Deposited — read the section directly off that row.
  (b) A SUMMARY row per deductor (Sr. No, Name of Deductor, TAN, Total Amount Paid/Credited, Total Tax Deducted, Total TDS Deposited) with NO section column, immediately followed by an ITEMIZED sub-table of individual transactions for that same deductor, where EACH transaction row has its own "Section" column (e.g. "194A"), transaction date, amount, and tax deducted/deposited. In this layout, use the section code(s) from the itemized sub-table rows — they apply to the deductor's summary total above them. Do not skip this deductor just because the summary row itself has no section column.
  * Section 192 = salary TDS
  * Section 194A = interest TDS (bank/FD/savings account interest — very common, do not miss this)
  * Section 194S = crypto/VDA TDS
  * Section 194Q = purchase TDS
- PART-III or PART C: Advance Tax / Self-Assessment Tax payments
- PART-VI or PART D: TCS collected

Find ALL deductors and their TDS, using whichever layout (a) or (b) above applies — do not stop at the first deductor. If a deductor's summary "Total Tax Deducted" / "Total TDS Deposited" figure is available, use that figure directly rather than re-summing the itemized rows yourself (it's the authoritative total; the itemized rows are just there to show you the section code).
Section 192 entries are salary TDS. Section 194A and all other non-192 sections are non-salary TDS.
Sum up:
- tdsSalary = total Tax Deposited for all section 192 (salary) rows across all deductors
- tdsNonSalary = total Tax Deposited for all non-192 section rows (194A, 194S, etc.)
- nonSalarySections = a breakdown of tdsNonSalary BY section code — one entry per distinct
  non-192 section found (e.g. 194A, 194C, 194J, 194Q, 194S, 194IA, 194H, 194I, 194D, 194B),
  with the Tax Deposited summed across all deductors under that same section. This tells us
  what KIND of non-salary income the person has (194J = professional/technical fees, 194C =
  contractor payments, 194IA = TDS on sale of immovable property i.e. this person sold
  property, 194S = crypto/VDA, 194Q = sale of goods, 194A = interest, etc.) — needed to
  recommend the correct ITR form, not just to total up the credit.
- advanceTaxPaid = total advance tax from Part C/III (BSR code entries, not TDS)
- selfAssessmentTax = self-assessment tax paid (if any)
- tcsPaid = total TCS collected (Part VI/D, section 206CQ etc.)
- employerName = name of the deductor with section 192 (salary) TDS
- employerTAN = TAN of that salary deductor

Return ONLY this JSON (no markdown, no text before/after the JSON):
{
  "assessmentYear": "<the assessment year printed on the statement, e.g. '2026-27'. TRACES prints this prominently in the header, usually labelled 'Assessment Year'. Use null if genuinely absent — do NOT guess or derive it from transaction dates>",
  "financialYear": "<the financial year if the statement separately prints one, e.g. '2025-26'. Use null if only the assessment year is shown — do NOT compute it yourself>",
  "tdsSalary": <number or null>,
  "tdsNonSalary": <number or null>,
  "nonSalarySections": [{ "section": "<e.g. 194J>", "amount": <number> }, ...] or [],
  "advanceTaxPaid": <number or null>,
  "selfAssessmentTax": <number or null>,
  "tcsPaid": <number or null>,
  "employerName": "<string or null>",
  "employerTAN": "<string or null>"
}`;

  try {
    console.log("[parse26ASWithGemini] Sending allowlisted 26AS facts to Gemini...");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: facts + "\n\nInterpret these facts using the following tax schema. Any reference below to reading a PDF means interpreting ONLY these supplied facts; you cannot inspect the original.\n" + prompt },
        ],
      }],
    });

    const raw = result.text ?? (result.candidates?.[0] as any)?.content?.parts?.[0]?.text ?? "{}";

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) { console.warn("[parse26ASWithGemini] No JSON found"); return empty; }
    const parsed = JSON.parse(match[0]);
    console.log("[parse26ASWithGemini] Response parsed");

    // Validate nonSalarySections defensively — this feeds the ITR form
    // recommendation, so a malformed entry from the model shouldn't crash
    // the pipeline or silently poison the recommendation with garbage.
    const rawSections = Array.isArray(parsed.nonSalarySections) ? parsed.nonSalarySections : [];
    const nonSalarySections: NonSalaryTDSSection[] = rawSections
      .filter((s: any) => s && typeof s.section === "string" && typeof s.amount === "number")
      .map((s: any) => ({ section: s.section.trim().toUpperCase(), amount: s.amount }));

    // Fallback: if the model found and itemized the per-section breakdown but
    // left the tdsNonSalary total itself null (observed on real TRACES PDFs
    // with the summary-row + itemized-sub-table layout — the model
    // sometimes populates nonSalarySections correctly while dropping the
    // rollup field), derive it from the sections we DO have rather than
    // reporting "no TDS credits found" when the credit is clearly on record.
    const sectionsTotal = nonSalarySections.reduce((sum, s) => sum + s.amount, 0);
    const tdsNonSalary = parsed.tdsNonSalary ?? (nonSalarySections.length ? sectionsTotal : null);

    const financialYear = normalizeYearLabel(parsed.financialYear);
    const assessmentYear = normalizeYearLabel(parsed.assessmentYear);

    return {
      financialYear,
      assessmentYear,
      tdsSalary: parsed.tdsSalary ?? null,
      tdsNonSalary,
      nonSalarySections: nonSalarySections.length ? nonSalarySections : null,
      advanceTaxPaid: parsed.advanceTaxPaid ?? null,
      selfAssessmentTax: parsed.selfAssessmentTax ?? null,
      totalTdsCredits: (parsed.tdsSalary ?? 0) + (tdsNonSalary ?? 0) || null,
      tcsPaid: parsed.tcsPaid ?? null,
      employerName: undefined,
      employerTAN: undefined,
    };
  } catch (err) {
    console.error("[parse26ASWithGemini] Extraction failed");
    return empty;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpret allowlisted Form 16 facts
// ─────────────────────────────────────────────────────────────────────────────

async function parseForm16WithGemini(facts: string): Promise<ExtractedForm16> {
  const empty: ExtractedForm16 = {
    financialYear: null, assessmentYear: null,
    employerName: null, employerTAN: null, employeePAN: null, tdsDeposited: null,
    grossSalary: null, salaryU17_1: null, perquisites: null, hraExempt: null,
    standardDeduction: null, professionalTax: null, netSalary: null,
    deduction80C: null, deduction80D: null, totalDeductionsVI_A: null,
    taxableIncome: null, taxOnIncome: null, rebate87A: null, cess: null,
    totalTaxPayable: null, totalTaxDeducted: null, newRegime: null,
  };
  if (!ai) {
    console.warn("[parseForm16WithGemini] No API key — skipping");
    return empty;
  }

  // As with the AIS and 26AS prompts: no year is asserted here — it is
  // extracted below and cross-checked against the other documents.
  const prompt = `This is Form 16 (TDS Certificate) issued by an employer for a single financial year.

PART A contains:
- Employer name, TAN, Employee PAN
- Quarterly TDS breakdown table with a "Total" row showing: Amount Paid/Credited, Tax Deducted, Tax Deposited

PART B contains the salary computation:
1(a) Salary as per section 17(1)
1(b) Value of perquisites u/s 17(2)
1(c) Profits in lieu of salary u/s 17(3)
1(d) Total = gross salary
2. Less: Allowances exempt under section 10 (HRA u/s 10(13A), LTA u/s 10(5))
3. Balance (1-2)
4. Less: Deductions u/s 16 — (a) Standard deduction Rs.75,000, (b) Entertainment allowance, (c) Professional tax
5. Not present in new format
6. Income chargeable under Salaries
7. Other income reported by employee
8. Gross total income
9. Deductions under Chapter VI-A (80C, 80D, etc.)
10. Aggregate of deductible amount
11. Total income / Taxable income (line 8 minus 9 or 10)
12. Tax on total income (as per slab)
13. Rebate u/s 87A (if income <= 7 lakh in old, <= 12 lakh in new)
14. Surcharge (if any)
15. Health and education cess @ 4%
16. Tax payable
17. Less: Relief u/s 89
18. Net tax payable
AND: Whether opting out of sub-section (1A) of section 115BAC: YES or NO
  - If NO = New Tax Regime (115BAC applies = newRegime true)
  - If YES = Old Tax Regime (opting out = newRegime false)

Extract all values and return ONLY this JSON (no markdown):
{
  "financialYear": "<the financial year printed on the form, e.g. '2025-26'. Form 16 Part A prints both 'Financial Year' and 'Assessment Year' in its header block. Use null if genuinely absent — do NOT guess or derive it from the quarterly TDS dates>",
  "assessmentYear": "<the assessment year printed on the form, e.g. '2026-27'. Use null if absent. Report only what is printed — do NOT compute one year from the other>",
  "employerName": "<full name>",
  "employerTAN": "<TAN>",
  "employeePAN": "<PAN>",
  "tdsDeposited": <total from Part A Total row - Tax Deposited column, number>,
  "grossSalary": <line 1(d), number>,
  "salaryU17_1": <line 1(a), number>,
  "perquisites": <line 1(b), number or 0>,
  "hraExempt": <HRA exempt under 10(13A), number or 0>,
  "standardDeduction": <standard deduction u/s 16(ia), number>,
  "professionalTax": <professional tax u/s 16(iii), number or 0>,
  "netSalary": <income chargeable under Salaries, number>,
  "deduction80C": <80C deduction, number or 0>,
  "deduction80D": <80D deduction, number or 0>,
  "totalDeductionsVI_A": <total Chapter VI-A, number or 0>,
  "taxableIncome": <total taxable income, number>,
  "taxOnIncome": <tax on total income before rebate/cess, number>,
  "rebate87A": <rebate u/s 87A, number or 0>,
  "cess": <health and education cess, number>,
  "totalTaxPayable": <net tax payable, number>,
  "totalTaxDeducted": <same as tdsDeposited from Part A total, number>,
  "newRegime": <true if 115BAC opted (opting out = NO), false if old regime (opting out = YES), null if not found>
}`;

  try {
    console.log("[parseForm16WithGemini] Sending allowlisted Form 16 facts to Gemini...");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: facts + "\n\nInterpret these facts using the following tax schema. Any reference below to reading a PDF means interpreting ONLY these supplied facts; you cannot inspect the original.\n" + prompt },
        ],
      }],
    });

    const raw = result.text ?? (result.candidates?.[0] as any)?.content?.parts?.[0]?.text ?? "{}";

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) { console.warn("[parseForm16WithGemini] No JSON found"); return empty; }
    const parsed = JSON.parse(match[0]);
    console.log("[parseForm16WithGemini] Response parsed");
    const financialYear = normalizeYearLabel(parsed.financialYear);
    const assessmentYear = normalizeYearLabel(parsed.assessmentYear);

    return {
      financialYear,
      assessmentYear,
      employerName: null,
      employerTAN: null,
      employeePAN: null,
      tdsDeposited: parsed.tdsDeposited ?? null,
      grossSalary: parsed.grossSalary ?? null,
      salaryU17_1: parsed.salaryU17_1 ?? null,
      perquisites: parsed.perquisites ?? null,
      hraExempt: parsed.hraExempt ?? null,
      standardDeduction: parsed.standardDeduction ?? null,
      professionalTax: parsed.professionalTax ?? null,
      netSalary: parsed.netSalary ?? null,
      deduction80C: parsed.deduction80C ?? null,
      deduction80D: parsed.deduction80D ?? null,
      totalDeductionsVI_A: parsed.totalDeductionsVI_A ?? null,
      taxableIncome: parsed.taxableIncome ?? null,
      taxOnIncome: parsed.taxOnIncome ?? null,
      rebate87A: parsed.rebate87A ?? null,
      cess: parsed.cess ?? null,
      totalTaxPayable: parsed.totalTaxPayable ?? null,
      totalTaxDeducted: parsed.totalTaxDeducted ?? parsed.tdsDeposited ?? null,
      newRegime: parsed.newRegime ?? null,
    };
  } catch (err) {
    console.error("[parseForm16WithGemini] Extraction failed");
    return empty;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Combine multiple Form 16s (multiple employers in one FY) into one
// aggregate view. This is the core of multi-employer / mid-year job-change
// support: AIS and 26AS are already whole-PAN, whole-year documents from the
// IT department, so they need no combining — only the user-uploaded Form 16s
// are inherently per-employer.
// ─────────────────────────────────────────────────────────────────────────────

function sumField(employers: ExtractedForm16[], key: keyof ExtractedForm16): number | null {
  const vals = employers
    .map((e) => e[key])
    .filter((v): v is number => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}

function combineForm16s(
  employers: ExtractedForm16[],
  financialYear: string
): { combined: ExtractedForm16; flags: MultiEmployerFlags } {
  const n = employers.length;

  const grossSalary = sumField(employers, "grossSalary");
  const salaryU17_1 = sumField(employers, "salaryU17_1");
  const perquisites = sumField(employers, "perquisites");
  const hraExempt = sumField(employers, "hraExempt");
  const professionalTax = sumField(employers, "professionalTax");
  const totalTaxDeducted = sumField(employers, "totalTaxDeducted");
  const tdsDeposited = sumField(employers, "tdsDeposited");

  // Standard deduction is a once-per-year, per-taxpayer benefit — NOT
  // per employment. Each employer applies it independently since they only
  // see the salary they themselves paid. Take the max reported by any one
  // employer (not the sum), and flag when more than one employer applied it.
  const stdDeductions = employers
    .map((e) => e.standardDeduction)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const standardDeduction = stdDeductions.length ? Math.max(...stdDeductions) : null;
  const standardDeductionDoubleCounted = stdDeductions.length > 1;

  // 80C is capped at ₹1.5L/year regardless of how many employers separately
  // accepted investment declarations against it.
  const raw80C = sumField(employers, "deduction80C") ?? 0;
  const deduction80C = employers.some((e) => e.deduction80C != null) ? Math.min(raw80C, 150000) : null;

  // Chapter VI-A deductions (80C, 80D, and everything else in that figure)
  // are investment/expense declarations the taxpayer submits independently
  // to each employer — not something each employer computes from their own
  // payroll data the way HRA or professional tax is. A mid-year job switcher
  // who declared the SAME investments to both employers (common when the
  // new employer doesn't know what was already claimed elsewhere) would have
  // that double-declaration summed here, inflating deductions and
  // understating real tax liability — the opposite of what a reconciliation
  // tool should ever do. Take the max reported by any single employer
  // instead of the raw sum (same treatment as standardDeduction above), and
  // flag when employers disagree so it's visible rather than silently
  // averaged away.
  const deduction80DValues = employers
    .map((e) => e.deduction80D)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const deduction80D = deduction80DValues.length ? Math.max(...deduction80DValues) : null;
  const deduction80DDoubleCounted = deduction80DValues.length > 1 && new Set(deduction80DValues).size > 1;

  const viaValues = employers
    .map((e) => e.totalDeductionsVI_A)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const totalDeductionsVI_A = viaValues.length ? Math.max(...viaValues) : null;
  const totalDeductionsVIADoubleCounted = viaValues.length > 1 && new Set(viaValues).size > 1;

  const regimes = employers.map((e) => e.newRegime);
  const distinctRegimes = new Set(regimes.filter((r): r is boolean => r != null));
  const regimeConsistent = distinctRegimes.size <= 1;
  const newRegime = distinctRegimes.size === 1 ? [...distinctRegimes][0] : regimes[n - 1] ?? null;

  let taxableIncome: number | null = null;
  let taxOnIncome: number | null = null;
  let rebate87A: number | null = null;
  let cess: number | null = null;
  let totalTaxPayable: number | null = null;

  if (grossSalary != null && newRegime != null) {
    const deductions = newRegime
      ? (standardDeduction ?? 0)
      : (standardDeduction ?? 0) + (hraExempt ?? 0) + (professionalTax ?? 0) + (totalDeductionsVI_A ?? 0);
    taxableIncome = Math.max(0, grossSalary - deductions);
    const liability = computeTaxLiability(taxableIncome, newRegime ? "new" : "old", financialYear);
    taxOnIncome = liability.incomeTax;
    rebate87A = liability.rebate;
    cess = liability.cess;
    totalTaxPayable = liability.totalTax;
  }

  const combined: ExtractedForm16 = {
    // The resolved period for the whole report, not a per-employer value —
    // resolveTaxPeriod() has already cross-checked every uploaded document by
    // the time this runs, and flags any disagreement between them.
    financialYear,
    assessmentYear: fyToAy(financialYear),
    employerName: employers.map((e) => e.employerName).filter(Boolean).join("  +  ") || null,
    employerTAN: n === 1 ? employers[0]?.employerTAN ?? null : null,
    employeePAN: employers.find((e) => e.employeePAN)?.employeePAN ?? null,
    tdsDeposited,
    grossSalary,
    salaryU17_1,
    perquisites,
    hraExempt,
    standardDeduction,
    professionalTax,
    netSalary:
      grossSalary != null && standardDeduction != null
        ? grossSalary - standardDeduction - (professionalTax ?? 0)
        : null,
    deduction80C,
    deduction80D,
    totalDeductionsVI_A,
    taxableIncome,
    taxOnIncome,
    rebate87A,
    cess,
    totalTaxPayable,
    totalTaxDeducted: totalTaxDeducted ?? tdsDeposited,
    newRegime,
  };

  return {
    combined,
    flags: {
      employerCount: n,
      standardDeductionDoubleCounted,
      totalDeductionsVIADoubleCounted,
      deduction80DDoubleCounted,
      regimeConsistent,
      regimesSeen: regimes,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage verification — do our figures account for what the document says
// it contains?
//
// The AIS declares each section's total before listing its rows. By matching
// every declared section against what we actually captured, we can state
// whether the extraction is complete instead of asking the user to assume it.
// A section we cannot account for is reported by name and amount — which is
// how a category nobody has coded for still reaches the user.
// ─────────────────────────────────────────────────────────────────────────────

// Read variance on PDF+LLM extraction is real (observed ±264 on a ~₹1L
// figure across repeat reads of one file). Reconciliation therefore allows a
// small relative drift rather than demanding exact equality — tight enough to
// catch a dropped row, loose enough not to cry wolf over digit jitter.
const COVERAGE_ABS_TOLERANCE = 100;      // ₹100
const COVERAGE_REL_TOLERANCE = 0.01;     // or 1% of the declared amount

function amountsAgree(declared: number, mapped: number): boolean {
  const allowed = Math.max(COVERAGE_ABS_TOLERANCE, Math.abs(declared) * COVERAGE_REL_TOLERANCE);
  return Math.abs(declared - mapped) <= allowed;
}

/**
 * Classify a declared section by matching its description/code against the
 * named field it should have landed in. Matching is on description text for
 * the same reason the extraction prompt is: information codes vary between
 * documents, so keying off them reintroduces the exact bug this file has
 * already shipped once.
 */
/**
 * Part B1 TDS rows that restate income already reported under a Part B2 SFT
 * row. Interest appears as both TDS-194A (deductor's view) and SFT-016
 * (bank's view); dividends as both TDS-194 and SFT-015. Counting them as
 * separate income inflates the return — so the parser deliberately ignores
 * them, and coverage must not then report them as an unmapped section, or
 * every reconcile would raise a false HIGH-severity issue.
 */
function isDuplicateOfSFT(code: string, description: string, ais: ExtractedAIS): boolean {
  const c = code.toUpperCase().replace(/\s/g, "");
  const d = description.toLowerCase();

  const interestTDS = c.includes("194A") || (c.startsWith("TDS") && d.includes("interest"));
  if (interestTDS) {
    // Only a duplicate if we actually captured the SFT-side interest figure.
    return (ais.interestFromSavings ?? 0) + (ais.interestFromFD ?? 0) > 0;
  }
  const dividendTDS = (c.includes("194") && d.includes("dividend")) || (c.startsWith("TDS") && d.includes("dividend"));
  if (dividendTDS) return (ais.dividendIncome ?? 0) > 0;

  return false;
}

function mappedAmountForSection(s: AISSectionTotal, ais: ExtractedAIS): number | null {
  const t = `${s.code} ${s.description} ${s.heading ?? ""}`.toLowerCase();

  const isInterest = t.includes("interest");
  const isSavings = isInterest && (t.includes("saving") || t.includes("(sb)"));
  const isDeposit = isInterest && (t.includes("term deposit") || t.includes("deposit") || t.includes("(td)") || t.includes("(fd)"));
  const isDividend = t.includes("dividend");
  const isEquitySale = t.includes("sale") && (t.includes("equity") || t.includes("securit")) && !t.includes("mutual");
  const isMFSale = t.includes("sale") && t.includes("mutual");
  const isSalary = t.includes("salary");

  // Purchases and other non-income SFTs are accounted for by the
  // high-value bucket rather than an income field.
  const isPurchase = t.includes("purchase") || t.includes("(pur)");

  if (isSavings) return ais.interestFromSavings;
  if (isDeposit) return ais.interestFromFD;
  if (isDividend) return ais.dividendIncome;
  if (isEquitySale) return ais.securitiesTransactions;
  if (isMFSale) return ais.mutualFundTransactions;
  if (isSalary) return ais.salaryIncome;

  if (isPurchase) {
    const hv = (ais.highValueTransactions ?? []).filter(h =>
      h.code.toLowerCase() === s.code.toLowerCase() && amountsAgree(s.amount, h.amount));
    if (hv.length) return hv[0].amount;
    const anyCode = (ais.highValueTransactions ?? []).filter(h => h.code.toLowerCase() === s.code.toLowerCase());
    if (anyCode.length) return anyCode.reduce((sum, h) => sum + h.amount, 0);
  }

  // Anything else: did the catch-all pick it up?
  const other = (ais.otherIncomeItems ?? []).filter(o =>
    o.code.toLowerCase() === s.code.toLowerCase() || amountsAgree(s.amount, o.amount));
  if (other.length) return other.reduce((sum, o) => sum + o.amount, 0);

  const hvAny = (ais.highValueTransactions ?? []).filter(h =>
    h.code.toLowerCase() === s.code.toLowerCase() || amountsAgree(s.amount, h.amount));
  if (hvAny.length) return hvAny.reduce((sum, h) => sum + h.amount, 0);

  return null;
}

function buildCoverageReport(ais: ExtractedAIS): CoverageReport | null {
  const sections = ais.sectionTotals ?? [];
  if (!sections.length) return null;

  // Sections repeating the same code from different sources (two banks, two
  // registrars) are summed before comparison — a named field holds the
  // combined figure, so comparing per-source would false-positive.
  const grouped = new Map<string, AISSectionTotal[]>();
  for (const s of sections) {
    const key = `${s.code}|${s.description}`.toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  }

  const items: CoverageItem[] = [];
  for (const group of grouped.values()) {
    const declared = group.reduce((sum, g) => sum + g.amount, 0);
    const head = group[0];
    const mapped = mappedAmountForSection({ ...head, amount: declared }, ais);

    // A Part B1 TDS row restating income already taken from its Part B2 SFT
    // counterpart is intentionally excluded from the totals, not missed.
    if (mapped == null && isDuplicateOfSFT(head.code, head.description, ais)) {
      items.push({
        code: head.code, description: head.description, declaredAmount: declared, mappedAmount: declared,
        status: "RECONCILED",
        note: `${head.description || head.code}: ${fmt(declared)} — same income already counted from the SFT entry reported by the bank/registrar, so it is not added again.`,
      });
      continue;
    }

    if (mapped == null) {
      items.push({
        code: head.code, description: head.description, declaredAmount: declared, mappedAmount: null,
        status: "UNMAPPED",
        note: `The AIS reports ${head.description || head.code} of ${fmt(declared)}, which this tool could not classify into any known category. It is NOT included in the figures above — check it manually and declare it under the correct head.`,
      });
    } else if (amountsAgree(declared, mapped)) {
      items.push({
        code: head.code, description: head.description, declaredAmount: declared, mappedAmount: mapped,
        status: "RECONCILED",
        note: `${head.description || head.code}: ${fmt(declared)} declared, ${fmt(mapped)} captured ✓`,
      });
    } else {
      items.push({
        code: head.code, description: head.description, declaredAmount: declared, mappedAmount: mapped,
        status: "SHORT",
        note: `${head.description || head.code}: the AIS declares ${fmt(declared)} but only ${fmt(mapped)} was captured — a shortfall of ${fmt(Math.abs(declared - mapped))}. Some rows were not read. Verify this figure against your AIS directly before filing.`,
      });
    }
  }

  const reconciled = items.filter(i => i.status === "RECONCILED").length;
  const complete = items.every(i => i.status === "RECONCILED");
  const totalDeclared = items.reduce((s, i) => s + i.declaredAmount, 0);
  const totalMapped = items.reduce((s, i) => s + (i.mappedAmount ?? 0), 0);

  const problems = items.filter(i => i.status !== "RECONCILED");
  const summary = complete
    ? `All ${items.length} sections declared in your AIS reconcile against the figures in this report — every amount the document says it contains has been accounted for.`
    : `${reconciled} of ${items.length} AIS sections reconcile. ${problems.length} need manual checking: ${problems.map(p => `${p.description || p.code} (${fmt(p.declaredAmount)})`).join("; ")}.`;

  return { sectionsDeclared: items.length, sectionsReconciled: reconciled, totalDeclared, totalMapped, items, complete, summary };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule-based reconciliation engine
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD = 500; // ₹500 rounding tolerance

function absDiff(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return Math.abs(a - b);
}

function fmt(n: number | null): string {
  if (n == null) return "N/A";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function buildChecks(
  ais: ExtractedAIS,
  f26as: Extracted26AS,
  f16: ExtractedForm16,
  provided: DocumentsProvided = { ais: true, form26as: true, form16: true },
): ReconciliationCheck[] {
  const checks: ReconciliationCheck[] = [];

  // Cross-document checks are only meaningful when BOTH sides were uploaded —
  // otherwise they'd all read NOT_FOUND and bury the real, per-document
  // findings in noise. Single-document checks run whenever their document
  // is present.

  // ── 1. Gross Salary: AIS vs Form 16 ──────────────────────────────────────
  if (provided.ais && provided.form16) {
    const salaryDiff = absDiff(ais.salaryIncome, f16.grossSalary);
    checks.push({
      name: "Gross Salary",
      status: salaryDiff == null ? "NOT_FOUND" : salaryDiff <= THRESHOLD ? "MATCH" : "MISMATCH",
      aisValue: ais.salaryIncome,
      form16Value: f16.grossSalary,
      form26asValue: null,
      note: salaryDiff == null
        ? "Could not compare — ensure all documents are uploaded"
        : salaryDiff <= THRESHOLD
        ? `Salary matches ✓ (${fmt(f16.grossSalary)} in Form 16)`
        : `Difference of ${fmt(salaryDiff)} between AIS and Form 16`,
    });
  }

  // ── 2. TDS on Salary: Form 16 vs 26AS ────────────────────────────────────
  if (provided.form16 && provided.form26as) {
    const tdsDiff = absDiff(f16.totalTaxDeducted, f26as.tdsSalary);
    checks.push({
      name: "TDS on Salary",
      status: tdsDiff == null ? "NOT_FOUND" : tdsDiff <= THRESHOLD ? "MATCH" : "MISMATCH",
      aisValue: null,
      form16Value: f16.totalTaxDeducted,
      form26asValue: f26as.tdsSalary,
      note: tdsDiff == null
        ? "Could not compare — check 26AS and Form 16 uploads"
        : tdsDiff <= THRESHOLD
        ? `TDS matches ✓ (${fmt(f16.totalTaxDeducted)} confirmed in 26AS)`
        : `⚠ TDS mismatch of ${fmt(tdsDiff)} — critical issue!`,
    });
  }

  // ── 3. Tax Regime ─────────────────────────────────────────────────────────
  if (provided.form16) checks.push({
    name: "Tax Regime",
    status: f16.newRegime != null ? "OK" : "NOT_FOUND",
    aisValue: null,
    form16Value: null,
    form26asValue: null,
    note: f16.newRegime === true
      ? "New Tax Regime (Section 115BAC) — HRA, LTA, 80C deductions not applicable"
      : f16.newRegime === false
      ? "Old Tax Regime — standard deductions (HRA, 80C, etc.) apply"
      : "Tax regime not identified in Form 16",
  });

  // ── 4. Standard Deduction ─────────────────────────────────────────────────
  if (provided.form16) checks.push({
    name: "Standard Deduction",
    status: f16.standardDeduction != null ? "OK" : "NOT_FOUND",
    aisValue: null,
    form16Value: f16.standardDeduction,
    form26asValue: null,
    note: f16.standardDeduction
      ? `${fmt(f16.standardDeduction)} standard deduction applied u/s 16(ia) ✓`
      : "Standard deduction not found in Form 16",
  });

  // ── 5. Savings / FD Interest (AIS) ───────────────────────────────────────
  const totalInterest = (ais.interestFromSavings ?? 0) + (ais.interestFromFD ?? 0);
  if (provided.ais) checks.push({
    name: "Interest Income (AIS)",
    status: ais.interestFromSavings == null && ais.interestFromFD == null ? "NOT_FOUND" : "OK",
    aisValue: totalInterest || null,
    form16Value: null,
    form26asValue: null,
    note: totalInterest > 0
      ? `${fmt(totalInterest)} interest income in AIS — must declare in ITR under Other Sources`
      : "No interest income in AIS (or AIS not parsed)",
  });

  // ── 6. Dividend Income (AIS) ──────────────────────────────────────────────
  if (provided.ais) checks.push({
    name: "Dividend Income (AIS)",
    status: ais.dividendIncome == null ? "NOT_FOUND" : ais.dividendIncome > 0 ? "OK" : "OK",
    aisValue: ais.dividendIncome,
    form16Value: null,
    form26asValue: null,
    note: ais.dividendIncome
      ? `${fmt(ais.dividendIncome)} dividend income — taxable, declare in Schedule OS`
      : "No dividend income in AIS (or AIS not parsed)",
  });

  // ── 7. Capital Gains (AIS) ────────────────────────────────────────────────
  const cgGross = (ais.securitiesTransactions ?? 0) + (ais.mutualFundTransactions ?? 0);
  if (provided.ais) checks.push({
    name: "Capital Gains Transactions",
    status: ais.securitiesTransactions == null && ais.mutualFundTransactions == null ? "NOT_FOUND" : "OK",
    aisValue: cgGross || null,
    form16Value: null,
    form26asValue: null,
    note: cgGross > 0
      // Deliberately does NOT name a form. Capital gains rule ITR-1/ITR-4 out,
      // but they do not imply ITR-2 — a taxpayer with business income as well
      // needs ITR-3. Only inferITRFormRecommendation() sees the whole picture,
      // so static strings must defer to it rather than contradict it.
      ? `${fmt(cgGross)} gross securities/MF sales — compute STCG/LTCG and report in Schedule CG (see Recommended ITR Form above)`
      : "No securities/MF transactions in AIS (or AIS not parsed)",
  });

  // ── 8. Advance Tax / SAT ──────────────────────────────────────────────────
  const totalTaxPaid = (f26as.advanceTaxPaid ?? 0) + (f26as.selfAssessmentTax ?? 0);
  if (provided.form26as) checks.push({
    name: "Advance / Self-Assessment Tax",
    status: f26as.advanceTaxPaid == null && f26as.selfAssessmentTax == null ? "NOT_FOUND" : "OK",
    aisValue: null,
    form16Value: null,
    form26asValue: totalTaxPaid || null,
    note: totalTaxPaid > 0
      ? `${fmt(totalTaxPaid)} paid — include in ITR Schedule Taxes Paid`
      : "No advance tax or self-assessment tax in 26AS",
  });

  // ── 9. High-Value Transactions (AIS) ──────────────────────────────────────
  // Not taxable income by itself (e.g. buying a time deposit), but the IT
  // dept already has it on file (SFT-005 etc.), and it's exactly the kind of
  // thing a taxpayer should know is being tracked — flag it for awareness,
  // not as an "issue."
  if (provided.ais) {
    const hvt = ais.highValueTransactions ?? [];
    const hvtTotal = hvt.reduce((sum, t) => sum + t.amount, 0);
    checks.push({
      name: "High-Value Transactions (AIS)",
      status: "OK",
      aisValue: hvt.length ? hvtTotal : null,
      form16Value: null,
      form26asValue: null,
      note: hvt.length
        ? hvt.map(t => `${t.code} (${t.description}): ${fmt(t.amount)}`).join("; ") +
          " — not taxable income by itself, but reported to the IT dept under Part B2 (SFT); be ready to explain the source of funds if asked."
        : "No high-value SFT transactions (e.g. large deposits, property, time deposits) found in AIS",
    });
  }

  // ── 9b. Other income the parser could not classify ───────────────────────
  // These are real income rows the AIS reported that don't fit any named
  // field. They're shown verbatim precisely because the taxpayer will
  // recognise their own income even when our schema doesn't have a slot
  // for it — this is the guard against a future AIS carrying something
  // this tool has never seen.
  if (provided.ais) {
    const other = ais.otherIncomeItems ?? [];
    const otherTotal = other.reduce((sum, o) => sum + o.amount, 0);
    if (other.length > 0) {
      checks.push({
        name: "Other Income Reported in AIS",
        status: "OK",
        aisValue: otherTotal || null,
        form16Value: null,
        form26asValue: null,
        note:
          other.map(o => `${o.description || o.code}${o.source ? ` (${o.source})` : ""}: ${fmt(o.amount)}`).join("; ") +
          ` — total ${fmt(otherTotal)}. This income is on record with the IT department and must be declared under the correct head; it is NOT covered by the salary/interest/dividend lines above.`,
      });
    }
  }

  // ── 10. TDS Credits (26AS) — single-document summary line ────────────────
  // Especially useful when 26AS is the only document uploaded: it tells the
  // user exactly how much tax credit they're entitled to claim in the ITR.
  if (provided.form26as) checks.push({
    name: "TDS Credits (26AS)",
    status: f26as.totalTdsCredits == null && f26as.tdsSalary == null ? "NOT_FOUND" : "OK",
    aisValue: null,
    form16Value: null,
    form26asValue: f26as.totalTdsCredits ?? ((f26as.tdsSalary ?? 0) + (f26as.tdsNonSalary ?? 0) || null),
    note: (f26as.totalTdsCredits ?? f26as.tdsSalary)
      ? `${fmt(f26as.totalTdsCredits ?? ((f26as.tdsSalary ?? 0) + (f26as.tdsNonSalary ?? 0)))} total TDS deposited against your PAN — this is the tax credit you can claim in your ITR`
      : "No TDS credits found in 26AS",
  });

  return checks;
}

function buildMismatches(
  ais: ExtractedAIS,
  f26as: Extracted26AS,
  f16: ExtractedForm16,
  checks: ReconciliationCheck[],
  multiEmployerFlags?: MultiEmployerFlags,
): ReconciliationMismatch[] {
  const mismatches: ReconciliationMismatch[] = [];
  let id = 1;

  // 1. Salary mismatch
  const salaryCheck = checks.find(c => c.name === "Gross Salary");
  if (salaryCheck?.status === "MISMATCH") {
    const diff = absDiff(ais.salaryIncome, f16.grossSalary);
    mismatches.push({
      id: String(id++),
      category: "Income Mismatch",
      severity: diff != null && diff > 10000 ? "HIGH" : "MEDIUM",
      title: "Salary differs between AIS and Form 16",
      description: `AIS: ${fmt(ais.salaryIncome)}, Form 16: ${fmt(f16.grossSalary)} — gap of ${fmt(diff)}`,
      aisValue: ais.salaryIncome, form16Value: f16.grossSalary, form26asValue: null, difference: diff,
      ruleExplanation: "AIS shows all income reported by your employer to the IT dept. Form 16 is your employer's TDS certificate. They should match.",
      suggestedAction: "Contact HR/Payroll to reconcile. Check if perquisites, ESOPs, or arrears are captured differently in each document.",
    });
  }

  // 2. TDS mismatch (critical)
  const tdsCheck = checks.find(c => c.name === "TDS on Salary");
  if (tdsCheck?.status === "MISMATCH") {
    const diff = absDiff(f16.totalTaxDeducted, f26as.tdsSalary);
    mismatches.push({
      id: String(id++),
      category: "TDS Mismatch",
      severity: "HIGH",
      title: "TDS mismatch between Form 16 and 26AS",
      description: `Form 16: ${fmt(f16.totalTaxDeducted)}, 26AS: ${fmt(f26as.tdsSalary)} — gap of ${fmt(diff)}`,
      aisValue: null, form16Value: f16.totalTaxDeducted, form26asValue: f26as.tdsSalary, difference: diff,
      ruleExplanation: "You can only claim TDS credit as per 26AS in your ITR. If 26AS < Form 16, the employer has not deposited the full TDS.",
      suggestedAction: "Immediately contact your employer. File ITR only after 26AS reflects the correct TDS. ITR credit is limited to 26AS amount.",
    });
  }

  // 3. Crypto/VDA income — must be separately declared
  if (ais.cryptoIncome != null && ais.cryptoIncome > 0) {
    mismatches.push({
      id: String(id++),
      category: "Virtual Digital Asset",
      severity: "MEDIUM",
      title: "VDA / Cryptocurrency income found in AIS",
      description: `AIS shows ${fmt(ais.cryptoIncome)} in VDA receipts (Section 194S) from Bitcipher Labs or exchange`,
      aisValue: ais.cryptoIncome, form16Value: null, form26asValue: null, difference: null,
      ruleExplanation: "VDA income is taxed at flat 30% u/s 115BBH (ITA 2025). TDS of 1% was deducted by exchange u/s 194S. No set-off of losses allowed.",
      suggestedAction: "Declare VDA income in ITR Schedule VDA / Special Rates. Claim TDS credit of 1%. Use ITR-2 (not ITR-1). Compute 30% tax on gains.",
    });
  }

  // 4. Interest income — must declare in ITR
  const totalInterest = (ais.interestFromSavings ?? 0) + (ais.interestFromFD ?? 0);
  if (totalInterest > 0) {
    mismatches.push({
      id: String(id++),
      category: "Income to Declare",
      severity: totalInterest > 10000 ? "MEDIUM" : "LOW",
      title: "Interest income from savings/FD must be declared",
      description: `AIS shows ${fmt(ais.interestFromSavings)} savings interest + ${fmt(ais.interestFromFD)} FD interest = ${fmt(totalInterest)} total`,
      aisValue: totalInterest, form16Value: null, form26asValue: null, difference: null,
      ruleExplanation: "Bank interest is taxable under 'Income from Other Sources'. Under New Regime, Section 80TTA deduction on savings interest is NOT available.",
      suggestedAction: "Add all interest income under Schedule OS in your ITR. Under New Regime, full amount is taxable at slab rate.",
    });
  }

  // 5. Dividend income
  if (ais.dividendIncome != null && ais.dividendIncome > 0) {
    mismatches.push({
      id: String(id++),
      category: "Income to Declare",
      severity: "LOW",
      title: "Dividend income must be reported in ITR",
      description: `AIS shows ${fmt(ais.dividendIncome)} in dividends from companies/mutual funds`,
      aisValue: ais.dividendIncome, form16Value: null, form26asValue: null, difference: null,
      ruleExplanation: "Since FY 2020-21, dividends are fully taxable in shareholders' hands at slab rate. Companies may deduct TDS @10% if dividend > ₹5,000.",
      suggestedAction: "Report all dividends under Schedule OS (Other Sources) in ITR. Check 26AS for any TDS deducted on dividends.",
    });
  }

  // 6. Capital gains
  const cgGross = (ais.securitiesTransactions ?? 0) + (ais.mutualFundTransactions ?? 0);
  if (cgGross > 0) {
    mismatches.push({
      id: String(id++),
      category: "Capital Gains",
      severity: "MEDIUM",
      title: "Securities/MF transactions found — compute capital gains",
      description: `AIS shows ${fmt(ais.securitiesTransactions)} equity sales + ${fmt(ais.mutualFundTransactions)} MF redemptions = ${fmt(cgGross)} gross`,
      aisValue: cgGross, form16Value: null, form26asValue: null, difference: null,
      ruleExplanation: "AIS shows gross sale value, not capital gains. Under ITA 2025/IT Rules 2026: STCG on equity at 20%, LTCG (>12 months, >₹1.25L gain) at 12.5%.",
      // No form named here — capital gains rule out ITR-1/ITR-4, but whether
      // ITR-2 or ITR-3 applies depends on whether business income also exists.
      // The Recommended ITR Form section is the single source of truth.
      suggestedAction: "Get your capital gains statement from your broker (Zerodha/Groww) and CAMS/KFintech for mutual funds, then compute the actual gain. AIS often also shows cost of acquisition per transaction — cross-check it. Report in Schedule CG; see the Recommended ITR Form section for which return to file.",
    });
  }

  // 7. New Regime — HRA received but not exempt
  if (f16.newRegime === true && f16.hraExempt === 0) {
    mismatches.push({
      id: String(id++),
      category: "Tax Regime Note",
      severity: "LOW",
      title: "New Regime: HRA and LTA are taxable",
      description: "You are in New Tax Regime. HRA (₹2,04,375) and LTA (₹80,000) received from employer are fully taxable — no exemptions available.",
      aisValue: null, form16Value: null, form26asValue: null, difference: null,
      ruleExplanation: "Under New Tax Regime (Section 115BAC), HRA u/s 10(13A) and LTA u/s 10(5) exemptions are not available. Standard deduction ₹75,000 is still available.",
      suggestedAction: "If you pay substantial rent, calculate whether switching to Old Regime saves more tax. Use AiTaxBot's Income Tax Calculator to compare regimes before filing.",
    });
  }

  // ── Multiple employers (mid-year job change) ────────────────────────────
  if (multiEmployerFlags && multiEmployerFlags.employerCount > 1) {
    if (multiEmployerFlags.standardDeductionDoubleCounted) {
      mismatches.push({
        id: String(id++),
        category: "Multiple Employers",
        severity: "MEDIUM",
        title: "Standard deduction was applied by more than one employer",
        description: `You uploaded ${multiEmployerFlags.employerCount} Form 16s, and more than one shows a standard deduction. Only ONE standard deduction is allowed per year across all employers combined.`,
        aisValue: null, form16Value: f16.standardDeduction, form26asValue: null, difference: null,
        ruleExplanation: "Standard deduction u/s 16(ia) is a per-taxpayer, per-year benefit, not per employment. Each employer applies it independently against only the salary they themselves paid, since they can't see your other Form 16s.",
        suggestedAction: "The combined figures below already count the standard deduction once — use those, not the sum of each employer's individually-reported numbers.",
      });
    }

    if (multiEmployerFlags.totalDeductionsVIADoubleCounted) {
      mismatches.push({
        id: String(id++),
        category: "Multiple Employers",
        severity: "MEDIUM",
        title: "Chapter VI-A deductions differ across employers",
        description: `Your Form 16s report different total Chapter VI-A deduction figures (80C, 80D, and others) across employers. If you declared the same investments (e.g. the same PPF/LIC/insurance premium) to more than one employer, only claim it once — it is not per-employment.`,
        aisValue: null, form16Value: f16.totalDeductionsVI_A, form26asValue: null, difference: null,
        ruleExplanation: "Chapter VI-A deductions (80C up to ₹1,50,000, 80D, and others) are personal, per-year benefits based on investments/expenses you declare — not something each employer computes independently the way HRA is. A taxpayer who declared the same investments to both employers around a mid-year job change risks double-counting.",
        suggestedAction: "The combined figure shown uses the higher of what any single employer reported, not the sum — verify against your actual investment proofs before filing, especially if the two employers' figures differ substantially.",
      });
    }

    if (!multiEmployerFlags.regimeConsistent) {
      mismatches.push({
        id: String(id++),
        category: "Multiple Employers",
        severity: "HIGH",
        title: "Employers used different tax regimes",
        description: `Your Form 16s show different regime elections across employers (${multiEmployerFlags.regimesSeen.map(r => r === true ? "New" : r === false ? "Old" : "Unknown").join(", ")}).`,
        aisValue: null, form16Value: null, form26asValue: null, difference: null,
        ruleExplanation: "Employers withhold TDS based on whatever regime you (or their default) selected with them individually. At ITR filing time you choose ONE regime for salary income for the whole year — it doesn't have to match what any single employer assumed.",
        suggestedAction: "We could not estimate a combined shortfall automatically because the regime is ambiguous. Add your combined gross salary into the Income Tax Calculator under both regimes to see which is more beneficial before filing.",
      });
    } else if (f16.totalTaxPayable != null) {
      const creditedTax = (f26as.tdsSalary ?? 0) + (f26as.tdsNonSalary ?? 0) + (f26as.advanceTaxPaid ?? 0) + (f26as.selfAssessmentTax ?? 0);
      const shortfall = f16.totalTaxPayable - creditedTax;
      if (shortfall > 1000) {
        mismatches.push({
          id: String(id++),
          category: "Multiple Employers",
          severity: "HIGH",
          title: "Estimated tax shortfall across employers",
          description: `Combined salary across ${multiEmployerFlags.employerCount} employers gives an estimated annual tax liability of ${fmt(f16.totalTaxPayable)}, versus ${fmt(creditedTax)} credited via TDS/advance tax in your 26AS — an estimated shortfall of ${fmt(shortfall)}.`,
          aisValue: null, form16Value: f16.totalTaxPayable, form26asValue: creditedTax, difference: shortfall,
          ruleExplanation: "Each employer applies slab rates and the standard deduction independently to only what they paid you. Combined, your true income can sit in a higher bracket than either employer withheld for — very common when Form 12B (previous employment declaration) isn't filed with the new employer. This is an AI-extracted estimate using standard slab math, not an exact computation.",
          suggestedAction: `Consider paying the estimated shortfall of ${fmt(shortfall)} as self-assessment tax before filing to limit further interest under Sections 234B/234C. This tool does not compute exact interest — use the Income Tax Calculator or a CA for the precise figure, since it depends on payment dates.`,
        });
      }
    }
  }

  return mismatches;
}

function determineOverallStatus(mismatches: ReconciliationMismatch[]): "CLEAN" | "NEEDS_ATTENTION" | "CRITICAL" {
  if (mismatches.some(m => m.severity === "HIGH")) return "CRITICAL";
  if (mismatches.some(m => m.severity === "MEDIUM")) return "NEEDS_ATTENTION";
  if (mismatches.length === 0) return "CLEAN";
  return "NEEDS_ATTENTION";
}

function generateSummary(
  status: "CLEAN" | "NEEDS_ATTENTION" | "CRITICAL",
  mismatches: ReconciliationMismatch[],
  f16: ExtractedForm16,
  provided: DocumentsProvided = { ais: true, form26as: true, form16: true },
): string {
  const emp = f16.employerName ? ` (${f16.employerName.replace(/\s+/g, " ").trim()})` : "";
  const itrNote = f16.taxableIncome
    ? ` Taxable salary income: ${fmt(f16.taxableIncome)}.`
    : "";

  const providedNames = [
    provided.ais && "AIS",
    provided.form26as && "Form 26AS",
    provided.form16 && "Form 16",
  ].filter(Boolean) as string[];
  const missingNames = [
    !provided.ais && "AIS",
    !provided.form26as && "Form 26AS",
    !provided.form16 && "Form 16",
  ].filter(Boolean) as string[];
  const partialNote = missingNames.length > 0
    ? ` Based on ${providedNames.join(" + ")} only — upload ${missingNames.join(" and ")} for a full cross-document check.`
    : "";

  if (status === "CLEAN") {
    if (missingNames.length > 0) {
      return `✅ No issues found in ${providedNames.join(" + ")}${emp}.${itrNote}${partialNote}`;
    }
    return `No mismatches found in the recognized figures${emp}.${itrNote} Extraction may be incomplete. Verify all figures and missing fields against the originals before filing.`;
  }
  if (status === "CRITICAL") {
    return `⚠️ Critical issues found${emp}. ${mismatches.filter(m => m.severity === "HIGH").length} high-severity item(s) must be resolved before filing ITR.${itrNote}${partialNote}`;
  }
  return `${mismatches.length} item(s) need attention${emp}.${itrNote}${partialNote} Review all items before filing and check the applicable filing deadline for your assessment year and taxpayer category.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights (text prompt — no PDF needed)
// ─────────────────────────────────────────────────────────────────────────────

async function generateAIInsights(
  ais: ExtractedAIS,
  f26as: Extracted26AS,
  f16: ExtractedForm16,
  mismatches: ReconciliationMismatch[],
  multiEmployerFlags?: MultiEmployerFlags,
  provided: DocumentsProvided = { ais: true, form26as: true, form16: true },
  taxPeriod: TaxPeriodResolution = {
    financialYear: FALLBACK_FINANCIAL_YEAR,
    assessmentYear: fyToAy(FALLBACK_FINANCIAL_YEAR)!,
    assumed: true, perDocument: [], conflict: false,
  },
): Promise<{ insights: string; actionItems: string[]; itrImpact: string }> {
  // Two distinct fallback reasons — do not conflate them. Reusing one message for
  // both "no API key" and "the API call itself failed" is what caused the live
  // bug where users with AIS/26AS/Form16 successfully parsed by this exact same
  // `ai` client still saw "ensure Google API key is configured", which is simply
  // false in that case and just confuses/alarms users.
  const noKeyFallback = {
    insights: "AI-powered insights are unavailable. Cross-check the recognized figures and missing fields against your original documents before relying on this report.",
    actionItems: [
      "Cross-check Form 16, 26AS, and AIS figures manually",
      "Declare all interest income, dividends, and capital gains in ITR",
      "Check the applicable filing deadline for your assessment year and taxpayer category",
    ],
    itrImpact: "Review all extracted data above and resolve mismatches before filing your Income Tax Return.",
  };
  const tempErrorFallback = {
    ...noKeyFallback,
    insights: "AI-powered insights are temporarily unavailable — please try again in a moment. The extracted document data and mismatches above are unaffected.",
  };

  if (!ai) return noKeyFallback;

  const fields = ["salaryIncome", "interestFromSavings", "interestFromFD", "dividendIncome",
    "securitiesTransactions", "mutualFundTransactions", "cryptoIncome", "lrsRemittance",
    "taxPaidSelfAssessment", "tdsSalary", "tdsNonSalary", "advanceTaxPaid", "selfAssessmentTax",
    "totalTdsCredits", "tcsPaid", "tdsDeposited", "grossSalary", "salaryU17_1", "perquisites",
    "hraExempt", "standardDeduction", "professionalTax", "netSalary", "deduction80C",
    "deduction80D", "totalDeductionsVI_A", "taxableIncome", "taxOnIncome", "rebate87A",
    "cess", "totalTaxPayable", "totalTaxDeducted", "newRegime"] as const;
  const project = (input: object) => Object.fromEntries(fields.flatMap(key => {
    const value = (input as Record<string, unknown>)[key];
    return (typeof value === "number" && Number.isFinite(value)) || (key === "newRegime" && typeof value === "boolean")
      ? [[key, value]] : [];
  }));
  const safeYear = (value: string) => /^20\d{2}-\d{2}$/.test(value) ? value : null;
  const facts = {
    financialYear: safeYear(taxPeriod.financialYear), assessmentYear: safeYear(taxPeriod.assessmentYear),
    yearAssumed: taxPeriod.assumed, documentsProvided: provided,
    ais: project(ais), form26as: project(f26as), form16: project(f16),
    employerCount: multiEmployerFlags?.employerCount ?? 1,
    extractionComplete: false,
  };
  const prompt = `Explain these locally extracted Indian tax figures. Missing fields are unknown, never zero.
Extraction is partial and OCR can misread numbers: do not say the return is complete or ready to file.
Use only the stated tax year; if assumed, ask the taxpayer to confirm it. Never invent identifiers or income.
Return JSON with insights (2 short paragraphs), actionItems (array of specific checks), and itrImpact (string).
Financial facts: ${JSON.stringify(facts)}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = result.text ?? "{}";
    // Match the same robust extraction parseAISWithGemini/26AS/Form16 parsers
    // use below: strip code fences, then pull out just the {...} block instead
    // of assuming the entire response is clean JSON. Gemini frequently adds a
    // sentence of preamble even when told "respond ONLY in JSON", which broke
    // JSON.parse on the raw response and silently fell back every time.
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn("[generateAIInsights] No JSON found in response");
      return tempErrorFallback;
    }
    const parsed = JSON.parse(match[0]);
    return {
      insights: parsed.insights || tempErrorFallback.insights,
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : tempErrorFallback.actionItems,
      itrImpact: parsed.itrImpact || tempErrorFallback.itrImpact,
    };
  } catch (err) {
    console.error("[generateAIInsights] Insight generation failed");
    return tempErrorFallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_AIS: ExtractedAIS = {
  financialYear: null, assessmentYear: null,
  salaryIncome: null, interestFromSavings: null, interestFromFD: null,
  dividendIncome: null, securitiesTransactions: null, mutualFundTransactions: null,
  cryptoIncome: null, lrsRemittance: null, taxPaidSelfAssessment: null,
  highValueTransactions: null,
  otherIncomeItems: null,
  sectionsSeen: null,
  sectionTotals: null,
};

const EMPTY_26AS: Extracted26AS = {
  financialYear: null, assessmentYear: null,
  tdsSalary: null, tdsNonSalary: null, nonSalarySections: null,
  advanceTaxPaid: null, selfAssessmentTax: null, totalTdsCredits: null, tcsPaid: null,
};

export async function reconcileTaxDocuments(
  aisPdfBuffer: Buffer | null,
  form26asPdfBuffer: Buffer | null,
  form16PdfBuffers: Buffer[],
  passwords?: { ais?: string; form26as?: string; form16?: string[] },
): Promise<ReconciliationReport> {
  const provided: DocumentsProvided = {
    ais: aisPdfBuffer != null,
    form26as: form26asPdfBuffer != null,
    form16: form16PdfBuffers.length > 0,
  };
  if (!provided.ais && !provided.form26as && !provided.form16) {
    throw new Error("At least one document (AIS, Form 26AS, or Form 16) is required");
  }
  console.log("[reconcileTaxDocuments] Starting reconciliation");

  // Finish ALL local extraction before the first provider request. One unreadable
  // upload aborts the request; there is no fallback that sends PDFs/OCR text.
  const localFacts = async (buffer: Buffer, password?: string) => {
    const text = await extractPrivateTaxText(buffer, password);
    try { return financialFactsPrompt(extractTaxFacts(text)); }
    catch { throw new PrivateExtractionError(); }
  };
  // Bound simultaneous OCR processes per request; document contents stay local.
  const aisFacts = aisPdfBuffer ? await localFacts(aisPdfBuffer, passwords?.ais) : null;
  const form26asFacts = form26asPdfBuffer ? await localFacts(form26asPdfBuffer, passwords?.form26as) : null;
  const form16Facts: string[] = [];
  for (let i = 0; i < form16PdfBuffers.length; i++) {
    form16Facts.push(await localFacts(form16PdfBuffers[i], passwords?.form16?.[i]));
  }
  const [aisPartial, form26as, form16Employers] = await Promise.all([
    aisFacts ? parseAISWithGemini(aisFacts) : Promise.resolve({ ...EMPTY_AIS }),
    form26asFacts ? parse26ASWithGemini(form26asFacts) : Promise.resolve({ ...EMPTY_26AS }),
    Promise.all(form16Facts.map(facts => parseForm16WithGemini(facts))),
  ]);

  // ── Step 2.5: Resolve which tax year these documents actually cover ───────
  // Read off the documents themselves rather than assumed — see
  // resolveTaxPeriod(). Must run before combineForm16s, which needs the FY to
  // pick the right slab table for its liability estimate.
  const taxPeriod = resolveTaxPeriod(aisPartial as ExtractedAIS, form26as, form16Employers, provided);
  console.log("[reconcileTaxDocuments] Tax period resolved");

  const { combined: form16, flags: multiEmployerFlags } = combineForm16s(
    form16Employers,
    taxPeriod.financialYear
  );

  const aisFinal = aisPartial;

  const ais: ExtractedAIS = {
    financialYear: aisFinal.financialYear ?? null,
    assessmentYear: aisFinal.assessmentYear ?? null,
    salaryIncome: aisFinal.salaryIncome ?? null,
    interestFromSavings: aisFinal.interestFromSavings ?? null,
    interestFromFD: aisFinal.interestFromFD ?? null,
    dividendIncome: aisFinal.dividendIncome ?? null,
    securitiesTransactions: aisFinal.securitiesTransactions ?? null,
    mutualFundTransactions: aisFinal.mutualFundTransactions ?? null,
    cryptoIncome: aisFinal.cryptoIncome ?? null,
    lrsRemittance: aisFinal.lrsRemittance ?? null,
    taxPaidSelfAssessment: aisFinal.taxPaidSelfAssessment ?? null,
    highValueTransactions: aisFinal.highValueTransactions ?? null,
    otherIncomeItems: aisFinal.otherIncomeItems ?? null,
    sectionsSeen: aisFinal.sectionsSeen ?? null,
    sectionTotals: aisFinal.sectionTotals ?? null,
  };

  // ── Step 4: Supplement AIS salary from 26AS if still missing ─────────────
  // 26AS Part-I shows salary paid by each deductor — use as fallback
  if (!ais.salaryIncome && form26as.tdsSalary) {
    // We know total TDS = 136374.78; we can't directly get salary from 26AS
    // unless we extract transaction rows. Leave null — it'll show PARTIAL in UI.
  }


  console.log("[reconcileTaxDocuments] Extraction completed");

  // ── Step 4.5: Detect documents that yielded nothing ──────────────────────
  // A document that was uploaded but produced an all-null extract almost
  // certainly failed to parse rather than being genuinely empty — a real AIS
  // always carries at least one figure. Treat it as a parse failure so the
  // verdict below can't come back "CLEAN" off the back of missing data.
  const aisFieldsRead = [
    ais.salaryIncome, ais.interestFromSavings, ais.interestFromFD,
    ais.dividendIncome, ais.securitiesTransactions, ais.mutualFundTransactions,
    ais.cryptoIncome, ais.lrsRemittance, ais.taxPaidSelfAssessment,
  ].some(v => v != null)
    || (ais.highValueTransactions?.length ?? 0) > 0
    || (ais.otherIncomeItems?.length ?? 0) > 0;

  const f26asFieldsRead = [
    form26as.tdsSalary, form26as.tdsNonSalary, form26as.advanceTaxPaid,
    form26as.selfAssessmentTax, form26as.totalTdsCredits, form26as.tcsPaid,
  ].some(v => v != null) || (form26as.nonSalarySections?.length ?? 0) > 0;

  const f16FieldsRead = [
    form16.grossSalary, form16.taxableIncome, form16.totalTaxDeducted,
    form16.standardDeduction, form16.netSalary, form16.newRegime,
  ].some(v => v != null);

  const parseFailures: ParseFailures = {
    ais: provided.ais && !aisFieldsRead,
    form26as: provided.form26as && !f26asFieldsRead,
    form16: provided.form16 && !f16FieldsRead,
  };
  const anyParseFailure = parseFailures.ais || parseFailures.form26as || parseFailures.form16;
  if (anyParseFailure) {
    console.error("[reconcileTaxDocuments] PARSE FAILURE — uploaded document(s) yielded no data");
  }

  // ── Step 5: Build reconciliation ─────────────────────────────────────────
  const checks = buildChecks(ais, form26as, form16, provided);
  if (multiEmployerFlags.employerCount > 1) {
    checks.push({
      name: "Multiple Employers Detected",
      status: multiEmployerFlags.regimeConsistent ? "OK" : "PARTIAL",
      aisValue: null,
      form16Value: form16.grossSalary,
      form26asValue: null,
      note: `${multiEmployerFlags.employerCount} Form 16s uploaded — combined gross salary ${fmt(form16.grossSalary)}. ${
        multiEmployerFlags.regimeConsistent
          ? "Regime elections were consistent across employers."
          : "Regime elections differed across employers — see Issues Found below."
      }`,
    });
  }

  // Recommended ITR form gets its own dedicated section in the PDF report
  // and frontend (both render report.recommendedITRForm directly with full
  // reasons/blockers/warnings) rather than a one-line entry in the generic
  // checks grid, which would just duplicate it with less detail.
  const recommendedITRForm = inferITRFormRecommendation(ais, form26as, form16);

  // ── Coverage: does what we extracted account for what the AIS declares? ──
  const coverage = provided.ais ? buildCoverageReport(ais) : null;
  if (coverage) {
    if (!coverage.complete) console.warn("[reconcileTaxDocuments] Coverage incomplete");
    // The claim this tool can actually defend: not "these numbers are right",
    // but "these numbers account for everything the document says it contains".
    checks.push({
      name: "AIS Coverage Check",
      status: coverage.complete ? "OK" : "PARTIAL",
      aisValue: coverage.totalDeclared || null,
      form16Value: null,
      form26asValue: null,
      note: coverage.summary,
    });
  }

  const mismatches = buildMismatches(ais, form26as, form16, checks, multiEmployerFlags);
  // A locally recognized subset is not proof that every source row was read.
  // Keep this visible even when the extracted figures happen to reconcile.
  mismatches.unshift({
    id: "private-extraction-review", category: "Extraction coverage", severity: "MEDIUM",
    title: "Verify the extracted figures against your originals",
    description: "Private extraction includes only recognized financial fields. Other rows may be omitted, and OCR can misread amounts.",
    aisValue: null, form16Value: null, form26asValue: null, difference: null,
    ruleExplanation: "Matching extracted figures does not establish complete document coverage.",
    suggestedAction: "Compare all income, deductions and tax credits with every page of the original documents before filing.",
  });

  // An unaccounted-for section is a real filing risk, not a footnote: the
  // department already holds that figure. Surface it as an issue so it
  // reaches the user's action list rather than sitting in a coverage panel
  // they might scroll past.
  for (const item of coverage?.items ?? []) {
    if (item.status === "RECONCILED") continue;
    mismatches.push({
      id: `coverage-${item.code.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
      category: "Unverified AIS Section",
      severity: item.status === "UNMAPPED" ? "HIGH" : "MEDIUM",
      title: item.status === "UNMAPPED"
        ? `AIS reports ${item.description || item.code} — not included in this report`
        : `${item.description || item.code} may be incomplete in this report`,
      description: item.note,
      aisValue: item.declaredAmount,
      form16Value: null,
      form26asValue: null,
      difference: item.mappedAmount == null ? null : Math.abs(item.declaredAmount - item.mappedAmount),
      ruleExplanation: "Your AIS states a total for each category before listing the individual entries. This tool compares its own extracted figures against those stated totals, so any gap means something in your AIS was not fully read — the Income Tax Department still has that information on record regardless.",
      suggestedAction: `Open your AIS on the income tax portal, find "${item.description || item.code}" (${fmt(item.declaredAmount)}), and declare it under the appropriate head yourself. Do not assume it is nil just because it is absent from the figures above.`,
    });
  }

  // Surface parse failures as HIGH-severity issues. They must appear in the
  // user-facing issue list, not just server logs — the user is the only one
  // who can act on it (re-download the document, upload a different copy).
  const failedDocNames = [
    parseFailures.ais && "AIS",
    parseFailures.form26as && "Form 26AS",
    parseFailures.form16 && "Form 16",
  ].filter(Boolean) as string[];

  for (const docName of failedDocNames) {
    mismatches.unshift({
      id: `parse-fail-${docName.replace(/\s+/g, "-").toLowerCase()}`,
      category: "Document Not Readable",
      severity: "HIGH",
      title: `${docName} could not be read — figures are missing, not zero`,
      description: `You uploaded your ${docName}, but no data could be extracted from it. Every ${docName} figure shown as "N/A" in this report is UNKNOWN, not nil.`,
      aisValue: null, form16Value: null, form26asValue: null, difference: null,
      ruleExplanation: `A genuine ${docName} always contains at least one figure, so an empty extract means the file could not be read — it may be password-protected, a scanned image, an incomplete download, or the wrong document.`,
      suggestedAction: `Do NOT treat this report as complete. Re-download your ${docName} from the income tax portal as a PDF and upload it again. If it still fails, check the figures manually before filing.`,
    });
  }

  // Documents that disagree about which year they cover are a HIGH-severity
  // issue for the same reason parse failures are: the report still computes a
  // plausible-looking number, but it is silently mixing two tax years, and the
  // user is the only one who can fix it by uploading the right files. Reported
  // via the same unshift-before-determineOverallStatus route so it also forces
  // the verdict away from CLEAN.
  if (taxPeriod.conflict) {
    const stated = taxPeriod.perDocument
      .map((d) => `${d.document} covers FY ${d.financialYear}`)
      .join("; ");
    mismatches.unshift({
      id: "tax-year-conflict",
      category: "Mismatched Tax Years",
      severity: "HIGH",
      title: "Your documents are from different tax years",
      description:
        `${stated}. This report has been computed for FY ${taxPeriod.financialYear} ` +
        `(AY ${taxPeriod.assessmentYear}), so any figure taken from a document covering a ` +
        `different year is being compared against the wrong year's income.`,
      aisValue: null, form16Value: null, form26asValue: null, difference: null,
      ruleExplanation:
        "AIS, Form 26AS and Form 16 are each issued for one specific financial year. Reconciling " +
        "documents from different years compares unrelated income and TDS, and the tax slabs, " +
        "rebate thresholds and standard deduction can all differ between those years.",
      suggestedAction:
        `Re-download every document for the SAME year from the income tax portal and upload them ` +
        `again. If you meant to file for FY ${taxPeriod.financialYear}, replace any document above ` +
        `that covers a different year.`,
    });
  }

  // determineOverallStatus only looks at mismatches, so unshifting the
  // parse-failure and tax-year issues above is what actually forces the
  // verdict away from CLEAN — it can no longer report "Ready to File" on
  // unread data, or on documents that cover different years.
  const overallStatus = determineOverallStatus(mismatches);
  const summary = anyParseFailure
    ? `⚠️ ${failedDocNames.join(" and ")} could not be read — this report is INCOMPLETE. Figures shown as "N/A" for ${failedDocNames.join(" / ")} are unknown, not zero. Re-upload before relying on this.`
    : generateSummary(overallStatus, mismatches, form16, provided);

  // ── Step 6: AI insights ───────────────────────────────────────────────────
  const { insights, actionItems, itrImpact } = await generateAIInsights(
    ais, form26as, form16, mismatches, multiEmployerFlags, provided, taxPeriod
  );

  // No shadow evaluation or internal review logging for document analysis.
  // Only the requested provider analysis receives the financial facts.
  const aisNote = "Documents are read locally, including scanned pages. Only recognized financial facts are sent to Gemini. Extraction may omit fields: verify every figure against the originals before filing.";

  const creditedTax = multiEmployerFlags.employerCount > 1
    ? (form26as.tdsSalary ?? 0) + (form26as.tdsNonSalary ?? 0) + (form26as.advanceTaxPaid ?? 0) + (form26as.selfAssessmentTax ?? 0)
    : null;
  const estimatedShortfall =
    multiEmployerFlags.employerCount > 1 && multiEmployerFlags.regimeConsistent && form16.totalTaxPayable != null && creditedTax != null
      ? form16.totalTaxPayable - creditedTax
      : null;

  return {
    extractedData: { ais, form26as, form16, form16Employers },
    documentsProvided: provided,
    parseFailures,
    taxPeriod,
    ...(coverage && { coverage }),
    checks,
    mismatches,
    overallStatus,
    summary,
    actionItems,
    aiInsights: insights,
    itrImpact,
    generatedAt: new Date().toISOString(),
    ...(aisNote && { aisNote }),
    ...(multiEmployerFlags.employerCount > 1 && {
      multiEmployer: {
        employerCount: multiEmployerFlags.employerCount,
        regimeConsistent: multiEmployerFlags.regimeConsistent,
        estimatedTaxLiability: form16.totalTaxPayable,
        creditedTax,
        estimatedShortfall,
      },
    }),
    recommendedITRForm,
  };
}

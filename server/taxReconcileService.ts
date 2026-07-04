/**
 * Tax Reconciliation Service — v3
 *
 * Strategy: All three PDFs are parsed via Gemini 2.5 Flash inline PDF.
 *  • AIS     → Gemini inline (image-heavy IT-portal PDF — no text layer)
 *  • 26AS    → Gemini inline (TRACES PDF — text encoding is unreliable for regex)
 *  • Form 16 → Gemini inline (TRACES PDF — same reason)
 *
 * All three calls run in parallel (Promise.all).
 * If GOOGLE_API_KEY is absent, all three gracefully return empty objects.
 * Text regex (parse26ASFromText, parseForm16FromText) kept as dead code for reference.
 */

import { createRequire } from "module";
const _require = createRequire(import.meta.url);

// pdf-parse is CJS-only — must load via createRequire in an ESM bundle
let pdfParse: ((buf: Buffer) => Promise<{ text: string }>) | null = null;
try {
  pdfParse = _require("pdf-parse");
  console.log("[taxReconcileService] pdf-parse loaded OK");
} catch (e) {
  console.warn("[taxReconcileService] pdf-parse not available:", e);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini (optional — for AIS image-PDF reading)
// ─────────────────────────────────────────────────────────────────────────────
import { GoogleGenAI } from "@google/genai";
import { computeTaxLiability } from "@shared/taxLiability";
import { recommendITRForm, type ITRFormInput, type ITRFormResult } from "@shared/itrFormSelector";

function buildAI(): InstanceType<typeof GoogleGenAI> | null {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    console.warn("[taxReconcileService] GOOGLE_API_KEY not set — AIS will not be parsed");
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
}

const ai = buildAI();

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedAIS {
  salaryIncome: number | null;
  interestFromSavings: number | null;
  interestFromFD: number | null;
  dividendIncome: number | null;
  securitiesTransactions: number | null;  // gross sale value of listed equities
  mutualFundTransactions: number | null;  // gross sale value of MFs
  cryptoIncome: number | null;            // VDA receipts (194S)
  lrsRemittance: number | null;           // LRS remittances (206CQ TCS)
  taxPaidSelfAssessment: number | null;   // self-assessment tax in AIS Part B3
  rawText?: string;
}

export interface NonSalaryTDSSection {
  section: string;   // e.g. "194A", "194C", "194J", "194Q", "194S", "194IA"
  amount: number;    // Tax Deposited for that section (aggregated across deductors)
}

export interface Extracted26AS {
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

export interface ReconciliationReport {
  extractedData: {
    ais: ExtractedAIS;
    form26as: Extracted26AS;
    form16: ExtractedForm16;          // combined/aggregated across all employers
    form16Employers: ExtractedForm16[]; // raw per-employer parses, one per uploaded Form 16
  };
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

async function extractText(buffer: Buffer, label: string): Promise<string> {
  if (!pdfParse) {
    console.warn(`[extractText] pdf-parse unavailable for ${label}`);
    return "";
  }
  try {
    const result = await pdfParse(buffer);
    const text = result.text || "";
    console.log(`[extractText] ${label}: extracted ${text.length} chars`);
    if (text.length < 50) {
      console.warn(`[extractText] ${label}: very short text — may be image PDF`);
    }
    return text;
  } catch (err) {
    console.error(`[extractText] ${label} error:`, err);
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeric helpers
// ─────────────────────────────────────────────────────────────────────────────

function numOrNull(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function firstNum(text: string, ...patterns: RegExp[]): number | null {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      // find first capture group that's a number string
      for (let i = 1; i < m.length; i++) {
        if (m[i]) return numOrNull(m[i]);
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse Form 26AS from extracted text
// TRACES PDFs are plain-text and very consistently formatted
// ─────────────────────────────────────────────────────────────────────────────

function parse26ASFromText(text: string): Extracted26AS {
  console.log("[parse26AS] Parsing TRACES 26AS from text");

  const result: Extracted26AS = {
    tdsSalary: null,
    tdsNonSalary: null,
    nonSalarySections: null, // dead-code path (see file header) — not extended, live parsing is parse26ASWithGemini below
    advanceTaxPaid: null,
    selfAssessmentTax: null,
    totalTdsCredits: null,
    tcsPaid: null,
  };

  if (!text || text.length < 100) {
    console.warn("[parse26AS] Text too short — possible image PDF");
    return result;
  }

  // ── Salary TDS (Section 192) ──────────────────────────────────────────────
  // Strategy: find all "192" transaction rows, sum up TDS deposited column
  // Row format: "1  192  31-Mar-2026  F  22-Apr-2026  -  221266.67  39847.78  39847.78"
  const sec192Rows = Array.from(text.matchAll(/\b192\b\s+\d{2}-\w{3}-\d{4}\s+[A-Z]\s+\d{2}-\w{3}-\d{4}\s+-\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)/g));
  if (sec192Rows.length > 0) {
    let totalPaid = 0;
    let totalTDS = 0;
    for (const row of sec192Rows) {
      totalPaid += numOrNull(row[1]) ?? 0;
      totalTDS += numOrNull(row[3]) ?? 0;  // deposited (3rd number)
    }
    result.tdsSalary = totalTDS;
    console.log(`[parse26AS] Section 192: ${sec192Rows.length} rows, paid=${totalPaid.toFixed(2)}, TDS deposited=${totalTDS.toFixed(2)}`);
  } else {
    // Fallback: look for employer summary line with large TDS amounts
    // Typical line: "2 J P MORGAN SERVICES INDIA PRIVATE LIMITED MUMJ05980C 1730648.49 136374.78 136374.78"
    const employerTDSMatch = text.match(/(?:SERVICES|PRIVATE)\s+LIMITED\s+[A-Z]{4}\d{5}[A-Z]\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
    if (employerTDSMatch) {
      result.tdsSalary = numOrNull(employerTDSMatch[3]);
      console.log(`[parse26AS] Employer TDS (fallback): ${result.tdsSalary}`);
    }
  }

  // ── Non-salary TDS (194S crypto, 194A interest, etc.) ────────────────────
  // Find 194S / 194A / 194 rows
  const nonSalaryRows = Array.from(text.matchAll(/\b194[A-Z0-9]*\b\s+\d{2}-\w{3}-\d{4}\s+[A-Z]\s+\d{2}-\w{3}-\d{4}\s+-\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)/g));
  if (nonSalaryRows.length > 0) {
    let totalNonSalary = 0;
    for (const row of nonSalaryRows) {
      totalNonSalary += numOrNull(row[3]) ?? 0;
    }
    result.tdsNonSalary = totalNonSalary;
    console.log(`[parse26AS] Non-salary TDS: ${totalNonSalary.toFixed(2)}`);
  }

  // ── TCS (Part VI — LRS, remittances) ─────────────────────────────────────
  // Kotak / bank TCS rows: "206CQ 21-Mar-2026 F ... 1153.09 0.00 0.00"
  const tcsRows = Array.from(text.matchAll(/\b206[A-Z]+\b\s+\d{2}-\w{3}-\d{4}\s+[A-Z]\s+\d{2}-\w{3}-\d{4}\s+-\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)/g));
  if (tcsRows.length > 0) {
    let totalTCS = 0;
    for (const row of tcsRows) {
      totalTCS += numOrNull(row[3]) ?? 0;
    }
    result.tcsPaid = totalTCS;
    console.log(`[parse26AS] TCS collected: ${totalTCS.toFixed(2)}`);
  }

  // ── Advance Tax (Part C) ──────────────────────────────────────────────────
  // Pattern: "PART-III" or "PART C" section with challan amounts
  const advTaxMatch = text.match(/(?:PART[\s-]*III|Advance Tax)[\s\S]{0,2000}?(?:Major Head|0021)[^\d]*([\d,]+\.\d+)/);
  if (advTaxMatch) {
    result.advanceTaxPaid = numOrNull(advTaxMatch[1]);
    console.log(`[parse26AS] Advance tax: ${result.advanceTaxPaid}`);
  } else {
    // Try simpler pattern
    const atMatch = text.match(/Advance\s+Tax[\s\S]{0,500}?([\d,]+\.\d+)/i);
    if (atMatch) result.advanceTaxPaid = numOrNull(atMatch[1]);
  }

  // ── Self-Assessment Tax ───────────────────────────────────────────────────
  const satMatch = text.match(/Self.?Assessment\s*Tax[\s\S]{0,500}?([\d,]+\.\d+)/i);
  if (satMatch) {
    result.selfAssessmentTax = numOrNull(satMatch[1]);
    console.log(`[parse26AS] Self-assessment tax: ${result.selfAssessmentTax}`);
  }

  // ── Total TDS credits ─────────────────────────────────────────────────────
  result.totalTdsCredits =
    (result.tdsSalary ?? 0) + (result.tdsNonSalary ?? 0);

  // ── Employer name from first 192-deductor ─────────────────────────────────
  const empMatch = text.match(/([A-Z][A-Z\s&.'-]{5,50}(?:LIMITED|LLP|PVT\.?\s*LTD|BANK|PVTLTD))\s+([A-Z]{4}\d{5}[A-Z])\s+[\d,]+\.\d+\s+[\d,]+\.\d+/i);
  if (empMatch) {
    result.employerName = empMatch[1].trim();
    result.employerTAN = empMatch[2];
    console.log(`[parse26AS] Employer: ${result.employerName}, TAN: ${result.employerTAN}`);
  }

  result.rawText = text.slice(0, 500);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse Form 16 from extracted text
// TRACES-generated Form 16 PDFs are consistently structured
// ─────────────────────────────────────────────────────────────────────────────

function parseForm16FromText(text: string): ExtractedForm16 {
  console.log("[parseForm16] Parsing Form 16 from text");

  const result: ExtractedForm16 = {
    employerName: null, employerTAN: null, employeePAN: null,
    tdsDeposited: null, grossSalary: null, salaryU17_1: null,
    perquisites: null, hraExempt: null, standardDeduction: null,
    professionalTax: null, netSalary: null, deduction80C: null,
    deduction80D: null, totalDeductionsVI_A: null, taxableIncome: null,
    taxOnIncome: null, rebate87A: null, cess: null,
    totalTaxPayable: null, totalTaxDeducted: null, newRegime: null,
  };

  if (!text || text.length < 100) {
    console.warn("[parseForm16] Text too short — possible image PDF");
    return result;
  }

  // ── Employer / Employee identifiers ──────────────────────────────────────
  // TAN pattern
  const tanMatch = text.match(/TAN of (?:the )?Deductor\s*[:\s]*([A-Z]{4}\d{5}[A-Z])/i)
    || text.match(/\b([A-Z]{4}\d{5}[A-Z])\b/);
  if (tanMatch) result.employerTAN = tanMatch[1];

  // Employer name — look for name before TAN
  const empMatch = text.match(/(?:Name.*?Employer[^A-Z]*)(J\s*P\s*MORGAN|[A-Z][A-Z\s]+(?:LIMITED|LLP|BANK|PVT))/i)
    || text.match(/(J\s*P\s*MORGAN[\w\s]+(?:LIMITED|LLP))/i)
    || text.match(/([\w\s]+(?:PRIVATE LIMITED|PVT LTD|LLP))/);
  if (empMatch) result.employerName = empMatch[1].trim();

  // Employee PAN
  const panMatch = text.match(/PAN of (?:the )?Employee[^A-Z]*([A-Z]{5}\d{4}[A-Z])/i)
    || text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
  if (panMatch) result.employeePAN = panMatch[1];

  // ── Part A: Total TDS deposited ───────────────────────────────────────────
  // Form 16 Part A has a summary table:
  // "Total (Rs.) 1730648.49 136374.78 136374.78"
  // The 3rd number is TDS deposited
  const partATotalMatch = text.match(/Total\s*\(Rs\.\)\s*([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/);
  if (partATotalMatch) {
    result.tdsDeposited = numOrNull(partATotalMatch[3]);
    result.totalTaxDeducted = numOrNull(partATotalMatch[2]);
    console.log(`[parseForm16] Part A total: paid=${partATotalMatch[1]}, TDS deducted=${partATotalMatch[2]}, deposited=${partATotalMatch[3]}`);
  }

  // ── Part B: Salary details ────────────────────────────────────────────────
  // 1(a) Salary u/s 17(1)
  result.salaryU17_1 = firstNum(text,
    /17\s*\(1\)\s*([\d,]+\.?\d*)/,
    /section\s+17\s*\(1\)\s*([\d,]+\.?\d*)/i,
  );

  // 1(b) Perquisites u/s 17(2)
  result.perquisites = firstNum(text,
    /17\s*\(2\)[^\d]*([\d,]+\.?\d*)/,
    /perquisite[^(]*17\s*\(2\)[^\d]*([\d,]+\.?\d*)/i,
  );

  // 1(d) Gross Total Salary
  // Look for "Total" line in Gross Salary section = 1(d) value
  result.grossSalary = firstNum(text,
    /\(d\)\s+Total\s+([\d,]+\.?\d*)/,
    /1\s*\(d\)\s*\n?\s*Total\s*([\d,]+\.?\d*)/i,
    // fallback: Part A "Total (Rs.)" first number = amount paid = gross salary
    /Total\s*\(Rs\.\)\s*([\d,]+\.\d{2})/,
  );

  // 2. HRA exemption u/s 10(13A)
  result.hraExempt = firstNum(text,
    /10\s*\(13A\)[^\d]*([\d,]+\.?\d*)/,
    /House rent allowance[^\d]*([\d,]+\.?\d*)/i,
  );

  // 4(a) Standard deduction u/s 16(ia)
  result.standardDeduction = firstNum(text,
    /16\s*\(ia\)[^\d]*([\d,]+\.?\d*)/,
    /Standard deduction[^\d]*([\d,]+\.?\d*)/i,
  );

  // 4(c) Professional tax u/s 16(iii)
  result.professionalTax = firstNum(text,
    /16\s*\(iii\)[^\d]*([\d,]+\.?\d*)/,
    /Tax on employment[^\d]*([\d,]+\.?\d*)/i,
  );

  // 6. Income chargeable under salaries (net salary after deductions)
  result.netSalary = firstNum(text,
    /Income chargeable[^¶]*Salaries[^¶]*\[(3\+1|3.1)[^\d]*([\d,]+\.?\d*)/i,
    // "6. 1655648.00"
    /6\.\s+([\d,]+\.\d{2})\s*\n/,
  );
  // Extra fallback: (grossSalary - standardDeduction)
  if (!result.netSalary && result.grossSalary && result.standardDeduction) {
    result.netSalary = result.grossSalary - result.standardDeduction;
  }

  // 10(a) 80C deductions
  result.deduction80C = firstNum(text,
    /80C[^\d]*([\d,]+\.?\d*)/i,
  );

  // 10(g) 80D deductions
  result.deduction80D = firstNum(text,
    /80D[^\d]*([\d,]+\.?\d*)/i,
  );

  // 11. Total VI-A deductions
  result.totalDeductionsVI_A = firstNum(text,
    /Aggregate of deductible[^\d]*([\d,]+\.?\d*)/i,
    /(?:11\.|total.*VI.?A)[^\d]*([\d,]+\.?\d*)/i,
  );

  // 12. Total taxable income
  result.taxableIncome = firstNum(text,
    /Total taxable income[^¶]*\(9-11\)[^\d]*([\d,]+\.?\d*)/i,
    /12\.\s+Total taxable income[^\d]*([\d,]+\.?\d*)/i,
    // fallback: net salary if no VI-A deductions
  );
  if (!result.taxableIncome && result.netSalary) {
    result.taxableIncome = result.netSalary - (result.totalDeductionsVI_A ?? 0);
  }

  // 13. Tax on total income (before cess)
  result.taxOnIncome = firstNum(text,
    /13\.\s+Tax on total income\s+([\d,]+\.?\d*)/i,
    /Tax on total income[^\d]*([\d,]+\.\d{2})/,
  );

  // 14. Rebate u/s 87A
  result.rebate87A = firstNum(text,
    /87A[^\d]*([\d,]+\.?\d*)/i,
    /Rebate[^\d]*([\d,]+\.?\d*)/i,
  );

  // 16. Cess
  result.cess = firstNum(text,
    /(?:Health and education|education)\s+cess[^\d]*([\d,]+\.?\d*)/i,
    /16\.[^\d]*([\d,]+\.?\d*)/,
  );

  // 17. Tax payable
  result.totalTaxPayable = firstNum(text,
    /Tax payable[^\d]*([\d,]+\.?\d*)/i,
    /17\.[^\d]*([\d,]+\.?\d*)/,
  );

  // 21. Net tax payable = total TDS (same as totalTaxDeducted normally)
  const netTaxMatch = text.match(/(?:Net tax payable|21\.)[^\d]*([\d,]+\.\d{2})/i);
  if (netTaxMatch && !result.totalTaxDeducted) {
    result.totalTaxDeducted = numOrNull(netTaxMatch[1]);
  }

  // Tax Regime — Form 16 Part B has: "Whether opting out of taxation u/s 115BAC(1A)? No"
  // "No" = NOT opting out = New Regime
  // "Yes" = opting out = Old Regime
  if (text.match(/115BAC\s*\(1A\).*?No/i)) result.newRegime = true;
  else if (text.match(/115BAC\s*\(1A\).*?Yes/i)) result.newRegime = false;

  console.log(`[parseForm16] Extracted: grossSalary=${result.grossSalary}, stdDeduction=${result.standardDeduction}, taxableIncome=${result.taxableIncome}, TDS=${result.totalTaxDeducted}, regime=${result.newRegime ? "New" : "Old"}`);

  result.rawText = text.slice(0, 500);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse AIS from text (regex fallback — works if text is extractable)
// ─────────────────────────────────────────────────────────────────────────────

function parseAISFromText(text: string): Partial<ExtractedAIS> {
  const result: Partial<ExtractedAIS> = {};
  if (!text || text.length < 100) return result;

  // Salary (TDS-192)
  result.salaryIncome = firstNum(text,
    /TDS-192[^\d]*([\d,]+)/,
    /Salary received.*?192[^\d]*([\d,]+)/i,
  );

  // Savings interest (SFT-016(SB))
  const savingsRows = Array.from(text.matchAll(/SFT-016\(SB\)[^\d]*([\d,]+)/gi));
  if (savingsRows.length > 0) {
    result.interestFromSavings = savingsRows.reduce((s, m) => s + (numOrNull(m[1]) ?? 0), 0);
  }

  // FD interest (SFT-016(FD))
  const fdRows = Array.from(text.matchAll(/SFT-016\(FD\)[^\d]*([\d,]+)/gi));
  if (fdRows.length > 0) {
    result.interestFromFD = fdRows.reduce((s, m) => s + (numOrNull(m[1]) ?? 0), 0);
  }

  // Dividend (SFT-015)
  const divRows = Array.from(text.matchAll(/SFT-015[^\d]*([\d,]+)/gi));
  if (divRows.length > 0) {
    result.dividendIncome = divRows.reduce((s, m) => s + (numOrNull(m[1]) ?? 0), 0);
  }

  // Securities (SFT-17-LS(M))
  result.securitiesTransactions = firstNum(text, /SFT-17-LS[^\d]*([\d,]+)/i);

  // Mutual Fund (SFT-18-4MF)
  result.mutualFundTransactions = firstNum(text, /SFT-18-4MF[^\d]*([\d,]+)/i);

  // Crypto VDA (TDS-194S)
  result.cryptoIncome = firstNum(text, /TDS-194S[^\d]*([\d,]+)/i);

  // LRS (TCS-206CQ)
  result.lrsRemittance = firstNum(text, /TCS-206CQ[^\d]*([\d,]+)/i);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse AIS via Gemini inline PDF (image-heavy IT-portal PDF)
// ─────────────────────────────────────────────────────────────────────────────

async function parseAISWithGemini(pdfBuffer: Buffer): Promise<Partial<ExtractedAIS>> {
  if (!ai) {
    console.warn("[parseAISWithGemini] No API key — skipping");
    return {};
  }

  const prompt = `This is an Annual Information Statement (AIS) from the Indian Income Tax Department Insight portal.
It shows financial data reported to the IT department for FY 2025-26.

Read EVERY page carefully. The document has sections:
- Part B1: TDS/TCS (salary TDS-192, crypto VDA TDS-194S, etc.)
- Part B2: SFT (dividends SFT-015, savings interest SFT-016(SB), FD interest SFT-016(FD), securities sale SFT-17-LS, mutual fund sale SFT-18-4MF, MF purchase SFT-18-Pur)
- Part B3: Tax payments (advance tax, self-assessment tax)
- Part B7: Salary Annexure II

Extract these values. Use null if not found. Return ONLY this JSON (no markdown, no text before/after):
{
  "salaryIncome": <total salary from TDS-192 section AMOUNT column, number>,
  "interestFromSavings": <sum of all SFT-016(SB) savings bank interest amounts, number>,
  "interestFromFD": <sum of all SFT-016(FD) fixed deposit interest amounts, number>,
  "dividendIncome": <sum of all SFT-015 dividend amounts, number>,
  "securitiesTransactions": <total from SFT-17-LS(M) — sale of listed equity shares, number>,
  "mutualFundTransactions": <total from SFT-18-4MF(M) — sale of mutual fund units, number>,
  "cryptoIncome": <total from TDS-194S / VDA / virtual digital asset section, number>,
  "lrsRemittance": <total LRS remittance from TCS-206CQ section, number>,
  "taxPaidSelfAssessment": <self-assessment tax paid in Part B3, number>
}`;

  try {
    console.log("[parseAISWithGemini] Sending AIS PDF to Gemini...");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBuffer.toString("base64"),
            },
          },
          { text: prompt },
        ],
      }],
    });

    const raw = result.text ?? (result.candidates?.[0] as any)?.content?.parts?.[0]?.text ?? "{}";
    console.log("[parseAISWithGemini] Raw response:", raw.slice(0, 300));

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn("[parseAISWithGemini] No JSON found in response");
      return {};
    }
    const parsed = JSON.parse(match[0]);
    console.log("[parseAISWithGemini] Parsed:", JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    console.error("[parseAISWithGemini] Error:", err);
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse Form 26AS via Gemini inline PDF
// ─────────────────────────────────────────────────────────────────────────────

async function parse26ASWithGemini(pdfBuffer: Buffer): Promise<Extracted26AS> {
  const empty: Extracted26AS = {
    tdsSalary: null, tdsNonSalary: null, nonSalarySections: null, advanceTaxPaid: null,
    selfAssessmentTax: null, totalTdsCredits: null, tcsPaid: null,
  };
  if (!ai) {
    console.warn("[parse26ASWithGemini] No API key — skipping");
    return empty;
  }

  const prompt = `This is an Annual Tax Statement / Annual Information Statement (Form 26AS or ATS) downloaded from TRACES for FY 2025-26 / AY 2026-27.

The document has sections like:
- PART-I or PART A: TDS details — each row shows Deductor Name, TAN, Section code, Amount Paid, Tax Deducted, Tax Deposited
  * Section 192 = salary TDS
  * Section 194A = interest TDS
  * Section 194S = crypto/VDA TDS
  * Section 194Q = purchase TDS
- PART-III or PART C: Advance Tax / Self-Assessment Tax payments
- PART-VI or PART D: TCS collected

Find ALL deductors and their TDS. Section 192 entries are salary TDS.
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
    console.log("[parse26ASWithGemini] Sending 26AS PDF to Gemini...");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBuffer.toString("base64") } },
          { text: prompt },
        ],
      }],
    });

    const raw = result.text ?? (result.candidates?.[0] as any)?.content?.parts?.[0]?.text ?? "{}";
    console.log("[parse26ASWithGemini] Raw response:", raw.slice(0, 400));

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) { console.warn("[parse26ASWithGemini] No JSON found"); return empty; }
    const parsed = JSON.parse(match[0]);
    console.log("[parse26ASWithGemini] Parsed:", JSON.stringify(parsed));

    // Validate nonSalarySections defensively — this feeds the ITR form
    // recommendation, so a malformed entry from the model shouldn't crash
    // the pipeline or silently poison the recommendation with garbage.
    const rawSections = Array.isArray(parsed.nonSalarySections) ? parsed.nonSalarySections : [];
    const nonSalarySections: NonSalaryTDSSection[] = rawSections
      .filter((s: any) => s && typeof s.section === "string" && typeof s.amount === "number")
      .map((s: any) => ({ section: s.section.trim().toUpperCase(), amount: s.amount }));

    return {
      tdsSalary: parsed.tdsSalary ?? null,
      tdsNonSalary: parsed.tdsNonSalary ?? null,
      nonSalarySections: nonSalarySections.length ? nonSalarySections : null,
      advanceTaxPaid: parsed.advanceTaxPaid ?? null,
      selfAssessmentTax: parsed.selfAssessmentTax ?? null,
      totalTdsCredits: (parsed.tdsSalary ?? 0) + (parsed.tdsNonSalary ?? 0) || null,
      tcsPaid: parsed.tcsPaid ?? null,
      employerName: parsed.employerName ?? undefined,
      employerTAN: parsed.employerTAN ?? undefined,
    };
  } catch (err) {
    console.error("[parse26ASWithGemini] Error:", err);
    return empty;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse Form 16 via Gemini inline PDF
// ─────────────────────────────────────────────────────────────────────────────

async function parseForm16WithGemini(pdfBuffer: Buffer): Promise<ExtractedForm16> {
  const empty: ExtractedForm16 = {
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

  const prompt = `This is Form 16 (TDS Certificate) issued by an employer for FY 2025-26 / AY 2026-27.

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
    console.log("[parseForm16WithGemini] Sending Form 16 PDF to Gemini...");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBuffer.toString("base64") } },
          { text: prompt },
        ],
      }],
    });

    const raw = result.text ?? (result.candidates?.[0] as any)?.content?.parts?.[0]?.text ?? "{}";
    console.log("[parseForm16WithGemini] Raw response:", raw.slice(0, 400));

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) { console.warn("[parseForm16WithGemini] No JSON found"); return empty; }
    const parsed = JSON.parse(match[0]);
    console.log("[parseForm16WithGemini] Parsed:", JSON.stringify(parsed));
    return {
      employerName: parsed.employerName ?? null,
      employerTAN: parsed.employerTAN ?? null,
      employeePAN: parsed.employeePAN ?? null,
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
    console.error("[parseForm16WithGemini] Error:", err);
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
): ReconciliationCheck[] {
  const checks: ReconciliationCheck[] = [];

  // ── 1. Gross Salary: AIS vs Form 16 ──────────────────────────────────────
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

  // ── 2. TDS on Salary: Form 16 vs 26AS ────────────────────────────────────
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

  // ── 3. Tax Regime ─────────────────────────────────────────────────────────
  checks.push({
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
  checks.push({
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
  checks.push({
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
  checks.push({
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
  checks.push({
    name: "Capital Gains Transactions",
    status: ais.securitiesTransactions == null && ais.mutualFundTransactions == null ? "NOT_FOUND" : "OK",
    aisValue: cgGross || null,
    form16Value: null,
    form26asValue: null,
    note: cgGross > 0
      ? `${fmt(cgGross)} gross securities/MF sales — compute STCG/LTCG, use ITR-2`
      : "No securities/MF transactions in AIS (or AIS not parsed)",
  });

  // ── 8. Advance Tax / SAT ──────────────────────────────────────────────────
  const totalTaxPaid = (f26as.advanceTaxPaid ?? 0) + (f26as.selfAssessmentTax ?? 0);
  checks.push({
    name: "Advance / Self-Assessment Tax",
    status: f26as.advanceTaxPaid == null && f26as.selfAssessmentTax == null ? "NOT_FOUND" : "OK",
    aisValue: null,
    form16Value: null,
    form26asValue: totalTaxPaid || null,
    note: totalTaxPaid > 0
      ? `${fmt(totalTaxPaid)} paid — include in ITR Schedule Taxes Paid`
      : "No advance tax or self-assessment tax in 26AS",
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
      ruleExplanation: "AIS shows gross sale value, not capital gains. Under ITA 2025/IT Rules 2026: STCG on equity at 20%, LTCG (>12 months, >₹1.25L gain) at 12.5%. Use ITR-2.",
      suggestedAction: "Get capital gains statement from broker (Zerodha/Groww) and CAMS/KFintech for MFs. Compute actual gains. Use ITR-2 (not ITR-1) if capital gains exist.",
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
): string {
  const emp = f16.employerName ? ` (${f16.employerName.replace(/\s+/g, " ").trim()})` : "";
  const itrNote = f16.taxableIncome
    ? ` Taxable salary income: ${fmt(f16.taxableIncome)}.`
    : "";
  if (status === "CLEAN") {
    return `✅ Tax documents look clean${emp}.${itrNote} Form 16, 26AS, and AIS are consistent. You can proceed to file ITR.`;
  }
  if (status === "CRITICAL") {
    return `⚠️ Critical issues found${emp}. ${mismatches.filter(m => m.severity === "HIGH").length} high-severity item(s) must be resolved before filing ITR.${itrNote}`;
  }
  return `${mismatches.length} item(s) need attention${emp}.${itrNote} Review all items and resolve before filing ITR by July 31, 2026.`;
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
): Promise<{ insights: string; actionItems: string[]; itrImpact: string }> {
  const fallback = {
    insights: "Upload all three documents and ensure Google API key is configured for AI-powered insights.",
    actionItems: [
      "Cross-check Form 16, 26AS, and AIS figures manually",
      "Declare all interest income, dividends, and capital gains in ITR",
      "File ITR by July 31, 2026",
    ],
    itrImpact: "Review all extracted data above and resolve mismatches before filing your Income Tax Return.",
  };

  if (!ai) return fallback;

  const mismatchText = mismatches.filter(m => m.severity !== "OK")
    .map(m => `- [${m.severity}] ${m.title}: ${m.description}`)
    .join("\n");

  const prompt = `You are an expert Indian Chartered Accountant helping taxpayer file ITR for FY 2025-26 (AY 2026-27).

GROUND TRUTH — CURRENT LAW (do not contradict these, even if your training data suggests otherwise; tax rules changed in recent Budgets and your recollection may be out of date):
- Standard deduction u/s 16(ia), New Tax Regime (115BAC), FY 2024-25 AND FY 2025-26: ₹75,000 (raised from ₹50,000 by Budget 2024, effective FY 2024-25 onwards — this is NOT an error to flag or correct).
- Standard deduction, Old Tax Regime, all these years: ₹50,000 (unchanged).
- Do NOT tell the taxpayer to "add back" or "rectify" a standard deduction amount that matches one of the figures above — it is already correct.
- New Regime Section 87A rebate: full rebate (tax = nil) up to ₹12,00,000 total income for FY 2025-26/2026-27 (with marginal relief above that up to ~₹12.7L); up to ₹7,00,000 for FY 2023-24/2024-25 (also with marginal relief).
- HRA exemption u/s 10(13A) and LTA u/s 10(5) are NOT available under the New Regime — do not suggest claiming them there.
- If the Form 16 standard deduction figure conflicts with the rule above for its stated regime and year, flag it as a specific numeric mismatch (state both numbers) rather than a generic "rectify" instruction — but for FY 2024-25/2025-26 New Regime, ₹75,000 is the correct, current figure.

Tax Document Summary:
- Gross Salary (Form 16): ${fmt(f16.grossSalary)}
- Standard Deduction (Form 16): ${fmt(f16.standardDeduction)}
- Taxable Income (Form 16): ${fmt(f16.taxableIncome)}
- Total TDS (Form 16 = 26AS): ${fmt(f16.totalTaxDeducted)}
- Tax Regime: ${f16.newRegime === true ? "New Tax Regime (115BAC)" : f16.newRegime === false ? "Old Tax Regime" : "Unknown"}
- Savings Interest (AIS): ${fmt(ais.interestFromSavings)}
- FD Interest (AIS): ${fmt(ais.interestFromFD)}
- Dividend Income (AIS): ${fmt(ais.dividendIncome)}
- VDA/Crypto Income (AIS): ${fmt(ais.cryptoIncome)}
- Securities Sold (AIS): ${fmt(ais.securitiesTransactions)}
- Mutual Fund Sold (AIS): ${fmt(ais.mutualFundTransactions)}
- LRS Remittance (AIS): ${fmt(ais.lrsRemittance)}

Issues Found:
${mismatchText || "No major mismatches — documents appear consistent."}
${multiEmployerFlags && multiEmployerFlags.employerCount > 1
  ? `\nNote: The taxpayer had ${multiEmployerFlags.employerCount} employers this FY (mid-year job change). The figures above are already combined across employers with the standard deduction counted once. ${multiEmployerFlags.regimeConsistent ? "" : "Their employers used inconsistent tax regimes, so treat any regime-specific advice as provisional."} Specifically mention that job-changers are commonly under-withheld because each employer applies slabs independently, and that Form 12B could have prevented this at the new employer.`
  : ""}

Respond ONLY in this JSON (no markdown, no leading/trailing text):
{
  "insights": "<2-3 paragraphs explaining what the numbers mean, key ITR filing points, and whether ITR-1 or ITR-2 is needed. Mention specific Indian tax laws and AY 2026-27 context.>",
  "actionItems": ["<specific action 1>", "<specific action 2>", "<specific action 3>", "<specific action 4>"],
  "itrImpact": "<1 paragraph on which ITR form to use, which schedules to fill, and the key things to declare>"
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = result.text ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      insights: parsed.insights || fallback.insights,
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : fallback.actionItems,
      itrImpact: parsed.itrImpact || fallback.itrImpact,
    };
  } catch (err) {
    console.error("[generateAIInsights] Error:", err);
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function reconcileTaxDocuments(
  aisPdfBuffer: Buffer,
  form26asPdfBuffer: Buffer,
  form16PdfBuffers: Buffer[],
  _passwords?: { ais?: string; form26as?: string; form16?: string[] },
): Promise<ReconciliationReport> {
  console.log(`[reconcileTaxDocuments] Starting reconciliation with ${form16PdfBuffers.length} Form 16(s)...`);

  // ── Step 1: Extract text (for logging/debugging only) ─────────────────────
  const aisText = await extractText(aisPdfBuffer, "AIS");

  // ── Step 2: Parse all documents with Gemini inline PDF ─────────────────────
  //    AIS is an image PDF (IT portal) — always needs Gemini
  //    26AS and Form 16 are TRACES PDFs — Gemini is more reliable than regex
  //    Form 16 may be multiple files (mid-year job change) — parsed in parallel
  //    Everything runs in parallel for speed
  console.log("[reconcileTaxDocuments] Parsing all PDFs with Gemini...");
  const [aisPartial, form26as, form16Employers] = await Promise.all([
    parseAISWithGemini(aisPdfBuffer),
    parse26ASWithGemini(form26asPdfBuffer),
    Promise.all(form16PdfBuffers.map((buf) => parseForm16WithGemini(buf))),
  ]);

  const { combined: form16, flags: multiEmployerFlags } = combineForm16s(form16Employers, "2025-26");

  // ── Step 3: Fallback — try text regex for AIS if Gemini returned nothing ──
  let aisFinal = aisPartial;
  const aisHasData = Object.values(aisFinal).some(v => v != null);
  if (!aisHasData && aisText.length > 200) {
    console.log("[reconcileTaxDocuments] AIS Gemini returned empty — trying text regex");
    aisFinal = parseAISFromText(aisText);
  }

  const ais: ExtractedAIS = {
    salaryIncome: aisFinal.salaryIncome ?? null,
    interestFromSavings: aisFinal.interestFromSavings ?? null,
    interestFromFD: aisFinal.interestFromFD ?? null,
    dividendIncome: aisFinal.dividendIncome ?? null,
    securitiesTransactions: aisFinal.securitiesTransactions ?? null,
    mutualFundTransactions: aisFinal.mutualFundTransactions ?? null,
    cryptoIncome: aisFinal.cryptoIncome ?? null,
    lrsRemittance: aisFinal.lrsRemittance ?? null,
    taxPaidSelfAssessment: aisFinal.taxPaidSelfAssessment ?? null,
    rawText: aisText.slice(0, 300),
  };

  // ── Step 4: Supplement AIS salary from 26AS if still missing ─────────────
  // 26AS Part-I shows salary paid by each deductor — use as fallback
  if (!ais.salaryIncome && form26as.tdsSalary) {
    // We know total TDS = 136374.78; we can't directly get salary from 26AS
    // unless we extract transaction rows. Leave null — it'll show PARTIAL in UI.
  }


  console.log("[reconcileTaxDocuments] Final extracted data:", {
    ais: { salary: ais.salaryIncome, interest: ais.interestFromSavings, div: ais.dividendIncome },
    form26as: { tdsSalary: form26as.tdsSalary, advTax: form26as.advanceTaxPaid },
    form16: { gross: form16.grossSalary, taxable: form16.taxableIncome, tds: form16.totalTaxDeducted },
  });

  // ── Step 5: Build reconciliation ─────────────────────────────────────────
  const checks = buildChecks(ais, form26as, form16);
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

  const mismatches = buildMismatches(ais, form26as, form16, checks, multiEmployerFlags);
  const overallStatus = determineOverallStatus(mismatches);
  const summary = generateSummary(overallStatus, mismatches, form16);

  // ── Step 6: AI insights ───────────────────────────────────────────────────
  const { insights, actionItems, itrImpact } = await generateAIInsights(
    ais, form26as, form16, mismatches, multiEmployerFlags
  );

  const aisNote = !process.env.GOOGLE_API_KEY
    ? "AIS data (dividends, interest, capital gains) requires a Google Gemini API key to parse. Form 16 and 26AS data shown above is complete. Add GOOGLE_API_KEY to your server .env to enable AIS parsing."
    : undefined;

  const creditedTax = multiEmployerFlags.employerCount > 1
    ? (form26as.tdsSalary ?? 0) + (form26as.tdsNonSalary ?? 0) + (form26as.advanceTaxPaid ?? 0) + (form26as.selfAssessmentTax ?? 0)
    : null;
  const estimatedShortfall =
    multiEmployerFlags.employerCount > 1 && multiEmployerFlags.regimeConsistent && form16.totalTaxPayable != null && creditedTax != null
      ? form16.totalTaxPayable - creditedTax
      : null;

  return {
    extractedData: { ais, form26as, form16, form16Employers },
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

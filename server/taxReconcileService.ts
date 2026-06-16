/**
 * Tax Reconciliation Service
 * Compares AIS vs 26AS vs Form 16 and generates a reconciliation report.
 * Uses pdf-parse for text extraction and Gemini for AI explanations.
 */
import { GoogleGenAI } from "@google/genai";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
// pdf-parse is CJS-only; use createRequire so esbuild (ESM output) doesn't shim it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buffer: Buffer, options?: { password?: string }) => Promise<{ text: string }> = _require("pdf-parse");

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedAIS {
  salaryIncome: number | null;
  interestFromSavings: number | null;
  interestFromFD: number | null;
  dividendIncome: number | null;
  securitiesTransactions: number | null;
  mutualFundTransactions: number | null;
  otherIncome: number | null;
  rawText?: string;
}

export interface Extracted26AS {
  tdsSalary: number | null;           // Part A: TDS on salary
  tdsNonSalary: number | null;        // Part B: TDS on other payments (interest, etc.)
  advanceTaxPaid: number | null;      // Part C
  selfAssessmentTax: number | null;   // Part D
  totalTdsCredits: number | null;
  employerName?: string;
  employerTAN?: string;
  rawText?: string;
}

export interface ExtractedForm16 {
  // Part A
  employerName: string | null;
  employerTAN: string | null;
  employeePAN: string | null;
  tdsDeposited: number | null;        // TDS actually deposited (Part A)
  // Part B
  grossSalary: number | null;
  hraReceived: number | null;
  standardDeduction: number | null;
  professionalTax: number | null;
  netSalary: number | null;
  totalDeductions80C: number | null;
  totalDeductions80D: number | null;
  otherDeductions: number | null;
  taxableIncome: number | null;
  taxPayable: number | null;
  rebate87A: number | null;
  totalTaxDeducted: number | null;    // Total TDS per Form 16
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

export interface ReconciliationReport {
  extractedData: {
    ais: ExtractedAIS;
    form26as: Extracted26AS;
    form16: ExtractedForm16;
  };
  checks: ReconciliationCheck[];
  mismatches: ReconciliationMismatch[];
  overallStatus: "CLEAN" | "NEEDS_ATTENTION" | "CRITICAL";
  summary: string;
  actionItems: string[];
  aiInsights: string;
  itrImpact: string;
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF text extraction
// ─────────────────────────────────────────────────────────────────────────────

async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  // Try with password first (if provided), then without as fallback
  const attempts = password ? [password, undefined] : [undefined];
  for (const pwd of attempts) {
    try {
      const data = await pdfParse(buffer, pwd ? { password: pwd } : undefined);
      if (data.text && data.text.trim().length > 10) return data.text;
    } catch {
      // continue to next attempt
    }
  }
  return "";
}

/**
 * Exposed for the route layer to call independently —
 * validates that a given password can unlock a PDF.
 */
export async function tryExtractPdfText(buffer: Buffer, password?: string): Promise<{ success: boolean; text: string }> {
  const text = await extractPdfText(buffer, password);
  return { success: text.trim().length > 10, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini: parse structured data from raw PDF text
// ─────────────────────────────────────────────────────────────────────────────

async function parseAISWithGemini(text: string): Promise<ExtractedAIS> {
  const fallback: ExtractedAIS = {
    salaryIncome: null, interestFromSavings: null, interestFromFD: null,
    dividendIncome: null, securitiesTransactions: null,
    mutualFundTransactions: null, otherIncome: null,
  };
  if (!process.env.GOOGLE_API_KEY) return fallback;

  const prompt = `You are a tax document parser. Extract financial figures from this Annual Information Statement (AIS) text.
Return ONLY valid JSON (no markdown, no explanation).

Text:
${text.slice(0, 8000)}

Return this exact JSON structure (use null for fields not found, numbers without commas or symbols):
{
  "salaryIncome": <number or null>,
  "interestFromSavings": <number or null>,
  "interestFromFD": <number or null>,
  "dividendIncome": <number or null>,
  "securitiesTransactions": <number or null>,
  "mutualFundTransactions": <number or null>,
  "otherIncome": <number or null>
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return { ...fallback, ...JSON.parse(cleaned) };
  } catch {
    return fallback;
  }
}

async function parse26ASWithGemini(text: string): Promise<Extracted26AS> {
  const fallback: Extracted26AS = {
    tdsSalary: null, tdsNonSalary: null, advanceTaxPaid: null,
    selfAssessmentTax: null, totalTdsCredits: null,
  };
  if (!process.env.GOOGLE_API_KEY) return fallback;

  const prompt = `You are a tax document parser. Extract financial figures from this Form 26AS / Annual Tax Statement text.
Return ONLY valid JSON (no markdown, no explanation).

Text:
${text.slice(0, 8000)}

Return this exact JSON structure (numbers without commas or symbols, null if not found):
{
  "tdsSalary": <TDS deducted on salary from Part A, number or null>,
  "tdsNonSalary": <TDS deducted on non-salary payments like interest from Part B, number or null>,
  "advanceTaxPaid": <advance tax paid from Part C, number or null>,
  "selfAssessmentTax": <self-assessment tax from Part D, number or null>,
  "totalTdsCredits": <total TDS credits, number or null>,
  "employerName": <employer name from Part A if found, string or null>,
  "employerTAN": <employer TAN number if found, string or null>
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return { ...fallback, ...JSON.parse(cleaned) };
  } catch {
    return fallback;
  }
}

async function parseForm16WithGemini(text: string): Promise<ExtractedForm16> {
  const fallback: ExtractedForm16 = {
    employerName: null, employerTAN: null, employeePAN: null,
    tdsDeposited: null, grossSalary: null, hraReceived: null,
    standardDeduction: null, professionalTax: null, netSalary: null,
    totalDeductions80C: null, totalDeductions80D: null,
    otherDeductions: null, taxableIncome: null, taxPayable: null,
    rebate87A: null, totalTaxDeducted: null,
  };
  if (!process.env.GOOGLE_API_KEY) return fallback;

  const prompt = `You are a tax document parser. Extract financial figures from this Form 16 (TDS certificate) text.
Return ONLY valid JSON (no markdown, no explanation).

Text:
${text.slice(0, 8000)}

Return this exact JSON (numbers without commas or symbols, null if not found):
{
  "employerName": <string or null>,
  "employerTAN": <TAN number string or null>,
  "employeePAN": <PAN number string or null>,
  "tdsDeposited": <total TDS deposited from Part A, number or null>,
  "grossSalary": <gross salary from Part B, number or null>,
  "hraReceived": <HRA received, number or null>,
  "standardDeduction": <standard deduction amount (usually 50000 or 75000), number or null>,
  "professionalTax": <professional tax deducted, number or null>,
  "netSalary": <net taxable salary after exemptions, number or null>,
  "totalDeductions80C": <total deductions under section 80C, number or null>,
  "totalDeductions80D": <deductions under section 80D, number or null>,
  "otherDeductions": <other deductions total, number or null>,
  "taxableIncome": <total taxable income, number or null>,
  "taxPayable": <income tax computed, number or null>,
  "rebate87A": <rebate under section 87A, number or null>,
  "totalTaxDeducted": <total tax deducted at source, number or null>
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return { ...fallback, ...JSON.parse(cleaned) };
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini: Generate AI insights on the reconciliation
// ─────────────────────────────────────────────────────────────────────────────

async function generateAIInsights(
  ais: ExtractedAIS,
  form26as: Extracted26AS,
  form16: ExtractedForm16,
  mismatches: ReconciliationMismatch[]
): Promise<{ insights: string; actionItems: string[]; itrImpact: string }> {
  const fallback = {
    insights: "Complete your documents upload for AI-powered insights.",
    actionItems: ["Cross-check all three documents manually before filing ITR."],
    itrImpact: "Review all mismatches before filing your Income Tax Return.",
  };
  if (!process.env.GOOGLE_API_KEY) return fallback;

  const mismatchSummary = mismatches
    .filter((m) => m.severity !== "OK")
    .map((m) => `- ${m.title}: ${m.description}`)
    .join("\n");

  const prompt = `You are an expert Indian Chartered Accountant helping a taxpayer reconcile their tax documents for ITR filing (FY 2025-26, AY 2026-27).

Here's the reconciliation summary:

AIS Data: Salary: ₹${ais.salaryIncome ?? "N/A"}, FD Interest: ₹${ais.interestFromFD ?? "N/A"}, Savings Interest: ₹${ais.interestFromSavings ?? "N/A"}, Dividend: ₹${ais.dividendIncome ?? "N/A"}

Form 16 Data: Gross Salary: ₹${form16.grossSalary ?? "N/A"}, Total TDS: ₹${form16.totalTaxDeducted ?? "N/A"}, Taxable Income: ₹${form16.taxableIncome ?? "N/A"}

26AS Data: TDS on Salary: ₹${form26as.tdsSalary ?? "N/A"}, TDS Non-salary: ₹${form26as.tdsNonSalary ?? "N/A"}, Advance Tax: ₹${form26as.advanceTaxPaid ?? "N/A"}

Mismatches found:
${mismatchSummary || "No significant mismatches detected."}

Please respond ONLY in this JSON format (no markdown):
{
  "insights": "<2-3 paragraph plain English explanation of what these numbers mean and what the taxpayer should know. Be specific about Indian tax law.>",
  "actionItems": [
    "<specific action 1>",
    "<specific action 2>",
    "<specific action 3>"
  ],
  "itrImpact": "<1 paragraph on how these documents should be used when filling ITR-1 or ITR-2, what schedule to look at, etc.>"
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      insights: parsed.insights || fallback.insights,
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : fallback.actionItems,
      itrImpact: parsed.itrImpact || fallback.itrImpact,
    };
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule-based reconciliation engine
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD = 500; // ₹500 tolerance for rounding differences

function absDiff(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return Math.abs(a - b);
}

function buildChecks(
  ais: ExtractedAIS,
  form26as: Extracted26AS,
  form16: ExtractedForm16
): ReconciliationCheck[] {
  const checks: ReconciliationCheck[] = [];

  // 1. Salary: AIS vs Form 16
  const salaryDiff = absDiff(ais.salaryIncome, form16.grossSalary);
  checks.push({
    name: "Salary Income",
    status:
      salaryDiff == null
        ? "NOT_FOUND"
        : salaryDiff <= THRESHOLD
        ? "MATCH"
        : "MISMATCH",
    aisValue: ais.salaryIncome,
    form16Value: form16.grossSalary,
    form26asValue: null,
    note:
      salaryDiff == null
        ? "Could not compare — check uploaded documents"
        : salaryDiff <= THRESHOLD
        ? "Salary matches across AIS and Form 16 ✓"
        : `Difference of ₹${salaryDiff.toLocaleString("en-IN")}`,
  });

  // 2. TDS: Form 16 vs 26AS
  const tdsDiff = absDiff(form16.totalTaxDeducted, form26as.tdsSalary);
  checks.push({
    name: "TDS on Salary",
    status:
      tdsDiff == null
        ? "NOT_FOUND"
        : tdsDiff <= THRESHOLD
        ? "MATCH"
        : "MISMATCH",
    aisValue: null,
    form16Value: form16.totalTaxDeducted,
    form26asValue: form26as.tdsSalary,
    note:
      tdsDiff == null
        ? "Could not compare — check uploaded documents"
        : tdsDiff <= THRESHOLD
        ? "TDS amount matches Form 16 and 26AS ✓"
        : `TDS mismatch of ₹${tdsDiff.toLocaleString("en-IN")} — critical!`,
  });

  // 3. Interest Income in AIS
  const totalAISInterest =
    (ais.interestFromFD ?? 0) + (ais.interestFromSavings ?? 0);
  checks.push({
    name: "Interest Income (AIS)",
    status:
      ais.interestFromFD == null && ais.interestFromSavings == null
        ? "NOT_FOUND"
        : "OK",
    aisValue: totalAISInterest || null,
    form16Value: null,
    form26asValue: form26as.tdsNonSalary,
    note:
      totalAISInterest > 0
        ? `AIS shows ₹${totalAISInterest.toLocaleString("en-IN")} interest — must declare in ITR`
        : "No interest income found in AIS",
  });

  // 4. Dividend Income in AIS
  checks.push({
    name: "Dividend Income (AIS)",
    status: ais.dividendIncome == null ? "NOT_FOUND" : "OK",
    aisValue: ais.dividendIncome,
    form16Value: null,
    form26asValue: null,
    note:
      ais.dividendIncome != null && ais.dividendIncome > 0
        ? `₹${ais.dividendIncome.toLocaleString("en-IN")} dividend income — declare under 'Income from Other Sources'`
        : "No dividend income in AIS",
  });

  // 5. Advance Tax / Self-Assessment Tax in 26AS
  const totalOtherTax =
    (form26as.advanceTaxPaid ?? 0) + (form26as.selfAssessmentTax ?? 0);
  checks.push({
    name: "Advance / Self-Assessment Tax",
    status: form26as.advanceTaxPaid == null && form26as.selfAssessmentTax == null ? "NOT_FOUND" : "OK",
    aisValue: null,
    form16Value: null,
    form26asValue: totalOtherTax || null,
    note:
      totalOtherTax > 0
        ? `₹${totalOtherTax.toLocaleString("en-IN")} paid as advance/self-assessment tax — include in ITR tax paid schedule`
        : "No advance tax or self-assessment tax recorded in 26AS",
  });

  return checks;
}

function buildMismatches(
  ais: ExtractedAIS,
  form26as: Extracted26AS,
  form16: ExtractedForm16,
  checks: ReconciliationCheck[]
): ReconciliationMismatch[] {
  const mismatches: ReconciliationMismatch[] = [];
  let id = 1;

  // 1. Salary mismatch (HIGH)
  const salaryCheck = checks.find((c) => c.name === "Salary Income");
  if (salaryCheck?.status === "MISMATCH") {
    const diff = absDiff(ais.salaryIncome, form16.grossSalary);
    mismatches.push({
      id: String(id++),
      category: "Income Mismatch",
      severity: diff != null && diff > 10000 ? "HIGH" : "MEDIUM",
      title: "Salary differs between AIS and Form 16",
      description: `AIS shows ₹${(ais.salaryIncome ?? 0).toLocaleString("en-IN")} but Form 16 shows ₹${(form16.grossSalary ?? 0).toLocaleString("en-IN")} (difference: ₹${(diff ?? 0).toLocaleString("en-IN")})`,
      aisValue: ais.salaryIncome,
      form16Value: form16.grossSalary,
      form26asValue: null,
      difference: diff,
      ruleExplanation:
        "AIS includes all income reported to the IT department by your employer. Form 16 is your employer's TDS certificate. These should match for the same FY.",
      suggestedAction:
        "Contact your employer/HR to reconcile. Check if any perquisites, arrears, or ESOPs are included in AIS but not in Form 16 Part B. Do not file ITR until this is resolved.",
    });
  }

  // 2. TDS mismatch (CRITICAL)
  const tdsCheck = checks.find((c) => c.name === "TDS on Salary");
  if (tdsCheck?.status === "MISMATCH") {
    const diff = absDiff(form16.totalTaxDeducted, form26as.tdsSalary);
    mismatches.push({
      id: String(id++),
      category: "TDS Mismatch",
      severity: "HIGH",
      title: "TDS amount differs between Form 16 and 26AS",
      description: `Form 16 shows TDS of ₹${(form16.totalTaxDeducted ?? 0).toLocaleString("en-IN")} but 26AS reflects ₹${(form26as.tdsSalary ?? 0).toLocaleString("en-IN")} (difference: ₹${(diff ?? 0).toLocaleString("en-IN")})`,
      aisValue: null,
      form16Value: form16.totalTaxDeducted,
      form26asValue: form26as.tdsSalary,
      difference: diff,
      ruleExplanation:
        "TDS deducted by your employer and deposited with the government must reflect exactly in 26AS. A mismatch means either the employer deposited less than deducted, or there's a PAN mismatch.",
      suggestedAction:
        "Immediately inform your employer — this is a critical issue. You can only claim TDS credit as per 26AS in your ITR. If 26AS < Form 16, contact employer to deposit the shortfall.",
    });
  }

  // 3. Interest income not covered by 26AS TDS
  const aisInterest = (ais.interestFromFD ?? 0) + (ais.interestFromSavings ?? 0);
  if (aisInterest > 40000 && (form26as.tdsNonSalary ?? 0) === 0) {
    mismatches.push({
      id: String(id++),
      category: "Undeclared TDS",
      severity: "MEDIUM",
      title: "Interest income in AIS has no TDS in 26AS",
      description: `AIS shows ₹${aisInterest.toLocaleString("en-IN")} interest income but 26AS shows no TDS deducted on it`,
      aisValue: aisInterest,
      form16Value: null,
      form26asValue: form26as.tdsNonSalary,
      difference: null,
      ruleExplanation:
        "Banks deduct TDS on FD interest >₹40,000/year (₹50,000 for senior citizens effective FY 2025-26). If no TDS is shown, the bank may have not deducted or you submitted Form 15G/15H.",
      suggestedAction:
        "If you submitted Form 15G/15H, no action needed. Otherwise check with your bank. Either way, declare this interest income in ITR under 'Income from Other Sources'.",
    });
  }

  // 4. Dividend income needs declaration
  if (ais.dividendIncome != null && ais.dividendIncome > 0) {
    mismatches.push({
      id: String(id++),
      category: "Income to Declare",
      severity: "LOW",
      title: "Dividend income must be declared in ITR",
      description: `AIS shows ₹${ais.dividendIncome.toLocaleString("en-IN")} dividend income — this must be reported`,
      aisValue: ais.dividendIncome,
      form16Value: null,
      form26asValue: null,
      difference: null,
      ruleExplanation:
        "Since April 2020, dividends are taxable in the hands of shareholders at their slab rate. AIS captures all dividends reported by companies/MFs.",
      suggestedAction:
        "Report dividend income under Schedule OS (Other Sources) in your ITR. TDS of 10% may have been deducted by the company — check 26AS for TDS credits.",
    });
  }

  // 5. Securities/MF transactions (capital gains)
  const cgIncome = (ais.securitiesTransactions ?? 0) + (ais.mutualFundTransactions ?? 0);
  if (cgIncome > 0) {
    mismatches.push({
      id: String(id++),
      category: "Capital Gains",
      severity: "MEDIUM",
      title: "Securities/MF transactions found in AIS — capital gains may apply",
      description: `AIS shows ₹${cgIncome.toLocaleString("en-IN")} in securities/MF transactions. Compute actual gains separately.`,
      aisValue: cgIncome,
      form16Value: null,
      form26asValue: null,
      difference: null,
      ruleExplanation:
        "AIS shows gross transaction value, not gains. You need to compute STCG/LTCG based on purchase price and date. Use ITR-2 (not ITR-1) if you have capital gains.",
      suggestedAction:
        "Download your capital gains statement from broker/MF platforms (Zerodha, Groww, CAMS, KFintech). Compute STCG at 20% (equity/MF <12 months) and LTCG at 12.5% (>12 months above ₹1.25L). Use ITR-2.",
    });
  }

  return mismatches;
}

function determineOverallStatus(
  mismatches: ReconciliationMismatch[]
): "CLEAN" | "NEEDS_ATTENTION" | "CRITICAL" {
  if (mismatches.some((m) => m.severity === "HIGH")) return "CRITICAL";
  if (mismatches.some((m) => m.severity === "MEDIUM")) return "NEEDS_ATTENTION";
  if (mismatches.length === 0) return "CLEAN";
  return "NEEDS_ATTENTION";
}

function generateSummary(
  status: "CLEAN" | "NEEDS_ATTENTION" | "CRITICAL",
  mismatches: ReconciliationMismatch[],
  form16: ExtractedForm16
): string {
  const name = form16.employerName ? ` from ${form16.employerName}` : "";
  if (status === "CLEAN") {
    return `Your tax documents are clean${name}. Form 16, 26AS, and AIS are broadly consistent. You can proceed to file your ITR with confidence.`;
  }
  if (status === "CRITICAL") {
    return `Critical mismatches found${name}. ${mismatches.filter((m) => m.severity === "HIGH").length} high-severity issue(s) require immediate attention before you file your ITR.`;
  }
  return `${mismatches.length} reconciliation item(s) found${name}. Review each item and resolve before filing your ITR by July 31, 2026.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function reconcileTaxDocuments(
  aisPdfBuffer: Buffer,
  form26asPdfBuffer: Buffer,
  form16PdfBuffer: Buffer,
  passwords?: { ais?: string; form26as?: string; form16?: string }
): Promise<ReconciliationReport> {
  // 1. Extract text from all PDFs in parallel (with optional per-document passwords)
  const [aisText, form26asText, form16Text] = await Promise.all([
    extractPdfText(aisPdfBuffer, passwords?.ais),
    extractPdfText(form26asPdfBuffer, passwords?.form26as),
    extractPdfText(form16PdfBuffer, passwords?.form16),
  ]);

  // 2. Parse structured data with Gemini in parallel
  const [ais, form26as, form16] = await Promise.all([
    parseAISWithGemini(aisText),
    parse26ASWithGemini(form26asText),
    parseForm16WithGemini(form16Text),
  ]);

  // 3. Run rule-based reconciliation
  const checks = buildChecks(ais, form26as, form16);
  const mismatches = buildMismatches(ais, form26as, form16, checks);
  const overallStatus = determineOverallStatus(mismatches);

  // 4. Generate AI insights
  const { insights, actionItems, itrImpact } = await generateAIInsights(
    ais, form26as, form16, mismatches
  );

  const summary = generateSummary(overallStatus, mismatches, form16);

  return {
    extractedData: { ais, form26as, form16 },
    checks,
    mismatches,
    overallStatus,
    summary,
    actionItems,
    aiInsights: insights,
    itrImpact,
    generatedAt: new Date().toISOString(),
  };
}

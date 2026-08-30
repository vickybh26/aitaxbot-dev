import PDFDocument from "pdfkit";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// NOT import.meta.dirname: esbuild bundles this whole file into dist/index.js
// (see package.json's build script — "esbuild server/index.ts --bundle
// --outdir=dist"), so import.meta.dirname there resolves to dist/, not
// server/, and dist/fonts/ doesn't exist. Both "npm run dev" (tsx
// server/index.ts) and "npm start" (node dist/index.js) are run via npm
// scripts from the repo root, so process.cwd() reliably points there in
// both dev and production — checked against a real `node dist/index.js`
// run, not just tsc --noEmit, before relying on it (see this fix's commit
// message for that verification).
const FONT_DIR = path.resolve(process.cwd(), "server", "fonts");

/**
 * pdfkit's built-in "Helvetica"/"Helvetica-Bold" standard fonts have no
 * glyph for the Indian Rupee sign (₹, U+20B9) and silently substitute a
 * wrong character (a superscript "1") wherever ₹ appears — confirmed by
 * reproducing it in isolation with plain pdfkit before this fix. Every PDF
 * generated in this file prints rupee amounts, so this was a real, live
 * bug affecting every downloaded tax computation and rent receipt PDF, not
 * a hypothetical one.
 *
 * Fix: register Noto Sans (SIL Open Font License — safe to bundle and
 * redistribute in a deployed app, unlike Arial, which is proprietary and
 * was only used for local one-off verification, never checked into this
 * repo) as "NotoSans"/"NotoSans-Bold", and use those names everywhere below
 * instead of "Helvetica"/"Helvetica-Bold". Re-registering Noto Sans under
 * the literal names "Helvetica"/"Helvetica-Bold" was tried first and does
 * NOT reliably work — pdfkit appears to treat "Helvetica" as already
 * resolved to its own built-in font from PDFDocument's construction, so a
 * later .font("Helvetica") call keeps using the built-in one even after
 * re-registering that name; genuinely new font names avoid that ambiguity
 * entirely. Call once per PDFDocument instance, immediately after
 * construction.
 */
function registerRupeeSafeFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont("NotoSans", path.join(FONT_DIR, "NotoSans-Regular.ttf"));
  doc.registerFont("NotoSans-Bold", path.join(FONT_DIR, "NotoSans-Bold.ttf"));
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface RegimePDFData {
  // Salary
  grossSalary: number;
  basicDA?: number;
  hraReceived?: number;
  hraExemption?: number;
  ltaReceived?: number;
  ltaExemption?: number;
  otherAllowances?: number;
  otherAllowancesExemption?: number;
  bonus?: number;
  specialAllowances?: number;
  // Deductions u/s 16
  standardDeduction: number;
  professionalTax?: number;
  netSalary: number;
  // Other Income
  rentalIncome?: number;
  capitalGainsLTCG?: number;
  capitalGainsSTC?: number;
  dividendIncome?: number;
  otherIncome?: number;
  grossTotalIncome: number;
  // Chapter VI-A Deductions (only applicable in old regime)
  sec80C?: number;
  sec80D?: number;
  sec80E?: number;
  sec80TTA?: number;
  sec80CCD1B?: number;
  sec80G?: number;
  homeLoanInterest?: number;
  totalChapterVIA: number;
  // Tax computation
  taxableIncome: number;
  incomeTax: number;
  rebate87A: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  monthlyTDS: number;
}

export interface TaxComputationData {
  personalInfo: {
    name: string;
    fatherName?: string;
    pan?: string;
    aadhaar?: string;
    address?: string;
    dateOfBirth?: string;
    status: string;
    ageGroup: string;
    residencyStatus?: string;
  };
  assessmentYear: string;
  financialYear: string;
  // New detailed both-regime data
  oldRegimeData?: RegimePDFData;
  newRegimeData?: RegimePDFData;
  recommendedRegime?: "old" | "new";
  savings?: number;
  // Legacy single-regime fields (kept for backward compat)
  regime?: "old" | "new";
  employer?: { name: string; tan?: string; address?: string };
  salary?: { grossSalary: number; standardDeduction: number; netSalary: number };
  otherIncome?: {
    interestIncome?: number;
    dividendIncome?: number;
    rentalIncome?: number;
    capitalGains?: { shortTerm?: number; longTerm?: number };
    otherSources?: number;
    total: number;
  };
  deductions?: {
    section80C?: number;
    section80D?: number;
    section80E?: number;
    section80TTA?: number;
    section80CCD1B?: number;
    nps80CCD1B?: number;
    section80G?: number;
    homeLoanInterest?: number;
    lta?: number;
    otherDeductions?: number;
    totalDeductions: number;
  };
  taxBreakdown: {
    taxableIncome: number;
    taxOnIncome: number;
    surcharge: number;
    cess: number;
    totalTax: number;
    tdsDeducted?: number;
    advanceTaxPaid?: number;
    selfAssessmentTax?: number;
    refundDue?: number;
    taxPayable?: number;
  };
  bankDetails?: { bankName: string; accountNumber: string; ifscCode: string };
  computationDate: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return "-";
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function fmtNeg(n: number | undefined | null): string {
  if (!n || n === 0) return "-";
  return `(${fmt(n)})`;
}

function fmtCur(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return "-";
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PDF GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export function generateTaxComputationPDF(data: TaxComputationData): Promise<Buffer> {
  // Route to the detailed generator if both-regime data is present
  if (data.oldRegimeData && data.newRegimeData) {
    return generateDetailedComparisonPDF(data);
  }
  return generateLegacyPDF(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAILED COMPARISON PDF (new format — ITR-style)
// ─────────────────────────────────────────────────────────────────────────────

function generateDetailedComparisonPDF(data: TaxComputationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      margin: 36,
      size: "A4",
      info: {
        Title: `Income Tax Computation - AY ${data.assessmentYear}`,
        Author: "AiTaxBot",
        Subject: "Income Tax Comparison Statement",
      },
    });
    registerRupeeSafeFonts(doc);

    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const OLD = data.oldRegimeData!;
    const NEW = data.newRegimeData!;
    const rec = data.recommendedRegime || "new";
    const savings = data.savings || Math.abs(OLD.totalTax - NEW.totalTax);

    const L = 36;           // left margin
    const PW = 523;         // usable page width (595 - 2×36)
    const C1 = 220;         // particulars column width
    const C2 = 140;         // old regime column width
    const C3 = 140;         // new regime column width
    const COL_OLD = L + C1 + 10;
    const COL_NEW = L + C1 + C2 + 15;
    const DARK_BLUE = "#1E3A8A";
    const MID_BLUE = "#2563EB";
    const LIGHT_BLUE = "#DBEAFE";
    const GREEN = "#166534";
    const GREEN_BG = "#DCFCE7";
    const AMBER = "#92400E";
    const AMBER_BG = "#FEF3C7";
    const GRAY = "#6B7280";
    const ROW_H = 16;

    let y = 36;

    // ── HEADER ──────────────────────────────────────────────────────────────
    doc.rect(L, y, PW, 52).fill(DARK_BLUE);
    doc.fillColor("#FFFFFF").font("NotoSans-Bold").fontSize(20)
       .text("AiTaxBot", L + 10, y + 8);
    doc.font("NotoSans").fontSize(9).fillColor("#93C5FD")
       .text("www.aitaxbot.co.in  |  AI-Powered Tax Calculator", L + 10, y + 32);

    const compDate = new Date(data.computationDate);
    const dateStr = compDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    doc.fillColor("#FFFFFF").font("NotoSans-Bold").fontSize(11)
       .text("INCOME TAX COMPARISON STATEMENT", L + 140, y + 10, { width: PW - 150, align: "right" });
    doc.font("NotoSans").fontSize(9).fillColor("#93C5FD")
       .text(`AY ${data.assessmentYear}  |  FY ${data.financialYear}  |  Date: ${dateStr}`, L + 140, y + 28, { width: PW - 150, align: "right" });
    y += 62;

    // ── CLIENT INFO + TAX SUMMARY STRIP ─────────────────────────────────────
    doc.rect(L, y, PW, 28).fill("#F0F9FF");
    doc.fillColor(DARK_BLUE).font("NotoSans-Bold").fontSize(10)
       .text(`Name: `, L + 8, y + 9, { continued: true })
       .font("NotoSans").fillColor("#111827")
       .text(data.personalInfo.name, { continued: true })
       .font("NotoSans-Bold").fillColor(DARK_BLUE)
       .text(`   Age Group: `, { continued: true })
       .font("NotoSans").fillColor("#111827")
       .text(data.personalInfo.ageGroup === "below60" ? "Below 60" : data.personalInfo.ageGroup === "60to80" ? "Senior (60-80)" : "Super Senior (80+)", { continued: true });
    if (data.personalInfo.pan) {
      doc.font("NotoSans-Bold").fillColor(DARK_BLUE)
         .text(`   PAN: `, { continued: true })
         .font("NotoSans").fillColor("#111827")
         .text(data.personalInfo.pan);
    } else {
      doc.text("");
    }
    y += 36;

    // ── REGIME RECOMMENDATION BOX ─────────────────────────────────────────
    const recBg = rec === "new" ? GREEN_BG : AMBER_BG;
    const recFg = rec === "new" ? GREEN : AMBER;
    doc.rect(L, y, PW, 30).fill(recBg);
    doc.fillColor(recFg).font("NotoSans-Bold").fontSize(11)
       .text(`✅  RECOMMENDED: ${rec === "new" ? "NEW REGIME" : "OLD REGIME"}`, L + 10, y + 9, { continued: true });
    doc.font("NotoSans").fontSize(10).fillColor(recFg)
       .text(`   |   Potential Tax Savings: ${fmtCur(savings)}   |   Monthly TDS Savings: ${fmtCur(savings / 12)}`);
    y += 38;

    // ── QUICK COMPARISON TABLE ────────────────────────────────────────────
    // Header
    doc.rect(L, y, PW, 20).fill(DARK_BLUE);
    doc.fillColor("#FFFFFF").font("NotoSans-Bold").fontSize(9)
       .text("TAX STATISTICS", L + 6, y + 6)
       .text("OLD REGIME", COL_OLD, y + 6, { width: C2, align: "center" })
       .text("NEW REGIME", COL_NEW, y + 6, { width: C3, align: "center" });
    y += 20;

    // True gross income = salary + all other income sources (BEFORE any deductions)
    // This is the same for both regimes — the regime only affects which deductions are allowed
    const trueGrossOld = OLD.grossSalary
      + (OLD.rentalIncome     || 0)
      + (OLD.capitalGainsLTCG || 0)
      + (OLD.capitalGainsSTC  || 0)
      + (OLD.dividendIncome   || 0)
      + (OLD.otherIncome      || 0);
    const trueGrossNew = NEW.grossSalary
      + (NEW.rentalIncome     || 0)
      + (NEW.capitalGainsLTCG || 0)
      + (NEW.capitalGainsSTC  || 0)
      + (NEW.dividendIncome   || 0)
      + (NEW.otherIncome      || 0);

    // All deductions per regime (Sec 16 exemptions + Chapter VI-A)
    const totalDeductionsOld = OLD.standardDeduction
      + (OLD.hraExemption  || 0)
      + (OLD.ltaExemption  || 0)
      + (OLD.professionalTax || 0)
      + OLD.totalChapterVIA;
    const totalDeductionsNew = NEW.standardDeduction;   // new regime: only Sec 16 std deduction

    const summaryRows: Array<[string, number, number, boolean?]> = [
      ["Gross Income",                       trueGrossOld,       trueGrossNew],
      ["Total Deductions",                   totalDeductionsOld, totalDeductionsNew],
      ["Taxable Income",                     OLD.taxableIncome,  NEW.taxableIncome],
      ["Income Tax (Before Cess)",           OLD.incomeTax,      NEW.incomeTax],
      ["Less: Rebate u/s 87A",               OLD.rebate87A,      NEW.rebate87A],
      ["Add: Health & Education Cess (4%)",  OLD.cess,           NEW.cess],
      ["NET TAX PAYABLE",                    OLD.totalTax,       NEW.totalTax,    true],
      ["Monthly TDS (÷ 12)",                 OLD.monthlyTDS,     NEW.monthlyTDS,  true],
    ];

    summaryRows.forEach(([label, oldVal, newVal, bold], i) => {
      const bg = i % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      doc.rect(L, y, PW, ROW_H).fill(bg);
      doc.rect(L, y, 1, ROW_H).fill("#E2E8F0");
      doc.rect(L + PW, y, 1, ROW_H).fill("#E2E8F0");

      const fnt = bold ? "NotoSans-Bold" : "NotoSans";
      const oldColor = bold ? (rec === "old" ? GREEN : "#DC2626") : "#111827";
      const newColor = bold ? (rec === "new" ? GREEN : "#DC2626") : "#111827";

      doc.font(fnt).fontSize(9).fillColor("#374151")
         .text(label as string, L + 6, y + 4, { width: C1 - 6 });
      doc.fillColor(oldColor).font(fnt).fontSize(9)
         .text(fmt(oldVal as number), COL_OLD, y + 4, { width: C2, align: "right" });

      // For NET TAX PAYABLE: squeeze "✓ Best" into the recommended column
      // to avoid text overflowing outside the table boundary
      if (bold && label === "NET TAX PAYABLE" && rec === "new") {
        // Draw value left-aligned with a small gap, then "✓" badge at right edge
        doc.fillColor(newColor).font(fnt).fontSize(9)
           .text(fmt(newVal as number), COL_NEW, y + 4, { width: C3 - 28, align: "right" });
        doc.fillColor(GREEN).font("NotoSans-Bold").fontSize(7.5)
           .text("✓ Best", COL_NEW + C3 - 26, y + 5, { width: 26, align: "right" });
      } else if (bold && label === "NET TAX PAYABLE" && rec === "old") {
        doc.fillColor(newColor).font(fnt).fontSize(9)
           .text(fmt(newVal as number), COL_NEW, y + 4, { width: C3, align: "right" });
        doc.fillColor(GREEN).font("NotoSans-Bold").fontSize(7.5)
           .text("✓ Best", COL_OLD + C2 - 26, y + 5, { width: 26, align: "right" });
      } else {
        doc.fillColor(newColor).font(fnt).fontSize(9)
           .text(fmt(newVal as number), COL_NEW, y + 4, { width: C3, align: "right" });
      }

      y += ROW_H;
    });

    // Bottom border
    doc.rect(L, y, PW, 1).fill("#1E3A8A");
    y += 16;

    // ── PAGE BREAK CHECK ─────────────────────────────────────────────────────
    if (y > 700) {
      doc.addPage();
      y = 36;
    }

    // ── DETAILED COMPUTATION TABLE ────────────────────────────────────────────
    // Section header
    doc.rect(L, y, PW, 20).fill(DARK_BLUE);
    doc.fillColor("#FFFFFF").font("NotoSans-Bold").fontSize(9)
       .text("DETAILED TAX COMPUTATION", L + 6, y + 6)
       .text("OLD REGIME", COL_OLD, y + 6, { width: C2, align: "center" })
       .text("NEW REGIME", COL_NEW, y + 6, { width: C3, align: "center" });
    y += 20;

    // Sub-header
    doc.rect(L, y, PW, 14).fill("#E2E8F0");
    doc.fillColor(GRAY).font("NotoSans").fontSize(7.5)
       .text("Particulars", L + 6, y + 3)
       .text("Amount (₹)", COL_OLD, y + 3, { width: C2, align: "right" })
       .text("Amount (₹)", COL_NEW, y + 3, { width: C3, align: "right" });
    y += 14;

    let rowIndex = 0;

    const detailRow = (
      label: string,
      oldVal: number | string | null,
      newVal: number | string | null,
      options: { bold?: boolean; sectionHeader?: boolean; indent?: number; highlight?: "green" | "blue" | "amber" } = {}
    ) => {
      // Page break check
      if (y > 770) {
        doc.addPage();
        y = 36;
        // Re-draw column headers on new page
        doc.rect(L, y, PW, 14).fill(DARK_BLUE);
        doc.fillColor("#FFFFFF").font("NotoSans-Bold").fontSize(8)
           .text("Particulars (continued)", L + 6, y + 3)
           .text("Old Regime", COL_OLD, y + 3, { width: C2, align: "center" })
           .text("New Regime", COL_NEW, y + 3, { width: C3, align: "center" });
        y += 14;
        rowIndex = 0;
      }

      let bg = rowIndex % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      if (options.sectionHeader) bg = LIGHT_BLUE;
      if (options.highlight === "green") bg = GREEN_BG;
      if (options.highlight === "blue") bg = "#EFF6FF";
      if (options.highlight === "amber") bg = AMBER_BG;

      doc.rect(L, y, PW, ROW_H).fill(bg);
      doc.rect(L, y, 1, ROW_H).fill("#E2E8F0");
      doc.rect(L + PW, y, 1, ROW_H).fill("#E2E8F0");
      doc.rect(L + C1 + 5, y, 1, ROW_H).fill("#E2E8F0");
      doc.rect(L + C1 + C2 + 10, y, 1, ROW_H).fill("#E2E8F0");

      const indent = (options.indent || 0) * 10;
      const fnt = options.bold || options.sectionHeader ? "NotoSans-Bold" : "NotoSans";
      const labelColor = options.sectionHeader ? DARK_BLUE : "#374151";

      doc.font(fnt).fontSize(8.5).fillColor(labelColor)
         .text(label, L + 6 + indent, y + 4, { width: C1 - 6 - indent });

      const renderVal = (val: number | string | null, xStart: number, width: number, isOld: boolean) => {
        if (val === null || val === undefined) return;
        const sVal = typeof val === "string" ? val : fmt(val);
        const isNegative = typeof val === "number" && val < 0;
        let color = "#374151";
        if (options.bold) color = "#111827";
        if (options.highlight === "green") color = GREEN;
        if (options.sectionHeader) color = DARK_BLUE;
        if (isNegative) color = "#DC2626";
        // For recommended column, use green for final tax
        if (options.highlight === "green") {
          color = isOld && rec !== "old" ? "#DC2626" : GREEN;
          if (!isOld && rec === "new") color = GREEN;
          if (isOld && rec === "old") color = GREEN;
        }
        doc.font(fnt).fontSize(8.5).fillColor(color)
           .text(sVal === "-" ? "-" : sVal, xStart, y + 4, { width, align: "right" });
      };

      renderVal(oldVal, COL_OLD, C2, true);
      renderVal(newVal, COL_NEW, C3, false);

      y += ROW_H;
      if (!options.sectionHeader) rowIndex++;
    };

    const neg = (n: number) => n > 0 ? -n : n;

    // ── SALARY SECTION ─────────────────────────────────────────────────────
    detailRow("Gross Salary", OLD.grossSalary, NEW.grossSalary, { bold: true });

    if (OLD.basicDA || NEW.basicDA) {
      detailRow("Basic + Dearness Allowance", OLD.basicDA || null, NEW.basicDA || null, { indent: 1 });
    }

    // Exemptions
    detailRow("EXEMPTIONS  [Chapter III]", null, null, { sectionHeader: true });

    if (OLD.hraReceived || OLD.hraExemption) {
      detailRow(
        "House Rent Allowance (HRA) — Sec 10(13A)",
        OLD.hraExemption ? neg(OLD.hraExemption) : null,
        "-",
        { indent: 1 }
      );
    }
    if (OLD.ltaReceived || OLD.ltaExemption) {
      detailRow(
        "Leave Travel Allowance (LTA) — Sec 10(5)",
        OLD.ltaExemption ? neg(OLD.ltaExemption) : null,
        "-",
        { indent: 1 }
      );
    }
    if (OLD.otherAllowancesExemption) {
      detailRow(
        "Other Allowances — Sec 10(14)",
        neg(OLD.otherAllowancesExemption),
        neg(NEW.otherAllowancesExemption || 0),
        { indent: 1 }
      );
    }

    // Deductions u/s 16
    detailRow("DEDUCTIONS UNDER SECTION 16", null, null, { sectionHeader: true });
    detailRow("Standard Deduction u/s 16(ia)", neg(OLD.standardDeduction), neg(NEW.standardDeduction), { indent: 1 });
    if (OLD.professionalTax) {
      detailRow("Professional Tax u/s 16(iii)", neg(OLD.professionalTax), neg(NEW.professionalTax || 0), { indent: 1 });
    }

    detailRow("Net Income from Salary", OLD.netSalary, NEW.netSalary, { bold: true });

    // Other income
    if ((OLD.rentalIncome || 0) + (OLD.capitalGainsLTCG || 0) + (OLD.capitalGainsSTC || 0) + (OLD.otherIncome || 0) > 0) {
      detailRow("OTHER INCOME", null, null, { sectionHeader: true });
      if (OLD.rentalIncome) detailRow("Income from House Property — Sec 24", OLD.rentalIncome, NEW.rentalIncome || 0, { indent: 1 });
      if (OLD.dividendIncome) detailRow("Dividend Income", OLD.dividendIncome, NEW.dividendIncome || 0, { indent: 1 });
      if (OLD.capitalGainsLTCG) detailRow("Long-term Capital Gains (LTCG @ 12.5%)", OLD.capitalGainsLTCG, NEW.capitalGainsLTCG || 0, { indent: 1 });
      if (OLD.capitalGainsSTC) detailRow("Short-term Capital Gains (STCG @ 20%)", OLD.capitalGainsSTC, NEW.capitalGainsSTC || 0, { indent: 1 });
      if (OLD.otherIncome) detailRow("Income from Other Sources (Interest etc.)", OLD.otherIncome, NEW.otherIncome || 0, { indent: 1 });
    }

    detailRow("GROSS TOTAL INCOME", OLD.grossTotalIncome, NEW.grossTotalIncome, { bold: true, highlight: "blue" });

    // Chapter VI-A
    detailRow("DEDUCTIONS UNDER CHAPTER VI-A", null, null, { sectionHeader: true });
    if (OLD.sec80C) detailRow("Sec 80C — PPF / ELSS / LIC / EPF (Max ₹1,50,000)", neg(OLD.sec80C), "NIL", { indent: 1 });
    if (OLD.sec80D) detailRow("Sec 80D — Health Insurance Premium", neg(OLD.sec80D), "NIL", { indent: 1 });
    if (OLD.sec80CCD1B) detailRow("Sec 80CCD(1B) — NPS Additional (Max ₹50,000)", neg(OLD.sec80CCD1B), "NIL", { indent: 1 });
    if (OLD.sec80E) detailRow("Sec 80E — Education Loan Interest", neg(OLD.sec80E), "NIL", { indent: 1 });
    if (OLD.sec80TTA) detailRow("Sec 80TTA — Savings Bank Interest (Max ₹10,000)", neg(OLD.sec80TTA), "NIL", { indent: 1 });
    if (OLD.sec80G) detailRow("Sec 80G — Donations to NGO / Charitable Trusts", neg(OLD.sec80G), "NIL", { indent: 1 });
    if (OLD.homeLoanInterest) detailRow("Sec 24(b) — Home Loan Interest (Max ₹2,00,000)", neg(OLD.homeLoanInterest), "NIL", { indent: 1 });
    detailRow("Total Deductions under Chapter VI-A", OLD.totalChapterVIA > 0 ? neg(OLD.totalChapterVIA) : "-", "NIL", { bold: true, indent: 1 });

    // Taxable income
    detailRow("TOTAL TAXABLE INCOME", OLD.taxableIncome, NEW.taxableIncome, { bold: true, highlight: "blue" });

    // Tax computation
    detailRow("TAX COMPUTATION", null, null, { sectionHeader: true });
    detailRow("Tax at Normal Rates (as per slab)", OLD.incomeTax, NEW.incomeTax, { indent: 1 });
    detailRow("Tax at Special Rates (LTCG / STCG)", OLD.capitalGainsLTCG ? Math.round((OLD.capitalGainsLTCG) * 0.125) : "-", NEW.capitalGainsLTCG ? Math.round((NEW.capitalGainsLTCG) * 0.125) : "-", { indent: 1 });
    detailRow("Tax Payable (before rebate)", OLD.incomeTax, NEW.incomeTax, { indent: 1 });
    detailRow("Less: Rebate u/s 87A", OLD.rebate87A > 0 ? neg(OLD.rebate87A) : "-", NEW.rebate87A > 0 ? neg(NEW.rebate87A) : "-", { indent: 1 });
    detailRow("Tax Payable (after rebate)", OLD.taxAfterRebate, NEW.taxAfterRebate, { indent: 1, bold: true });
    detailRow("Add: Surcharge", OLD.surcharge > 0 ? OLD.surcharge : "-", NEW.surcharge > 0 ? NEW.surcharge : "-", { indent: 1 });
    detailRow("Total Tax Including Surcharge", OLD.taxAfterRebate + OLD.surcharge, NEW.taxAfterRebate + NEW.surcharge, { indent: 1 });
    detailRow("Add: Health & Education Cess @ 4%", OLD.cess, NEW.cess, { indent: 1 });

    detailRow("NET TAX PAYABLE", OLD.totalTax, NEW.totalTax, { bold: true, highlight: "green" });
    detailRow("Monthly TDS Deduction (÷ 12)", OLD.monthlyTDS, NEW.monthlyTDS, { bold: true });

    y += 6;
    doc.rect(L, y, PW, 1).fill(DARK_BLUE);
    y += 14;

    // ── ACTIONABLE SUGGESTIONS ──────────────────────────────────────────────
    if (y > 650) { doc.addPage(); y = 36; }

    doc.rect(L, y, PW, 18).fill(DARK_BLUE);
    doc.fillColor("#FFFFFF").font("NotoSans-Bold").fontSize(9)
       .text("ACTIONABLE SUGGESTIONS  (Old Regime Optimisation)", L + 6, y + 5);
    y += 22;

    const suggestions: Array<{ section: string; desc: string; limit: string }> = [];
    if ((OLD.sec80C || 0) < 150000) suggestions.push({ section: "80C", desc: "Invest in PPF / ELSS / LIC / EPF to maximise the ₹1,50,000 deduction limit", limit: `Unclaimed: ₹${fmt(150000 - (OLD.sec80C || 0))}` });
    if (!(OLD.sec80CCD1B)) suggestions.push({ section: "80CCD(1B)", desc: "Invest in NPS for an additional ₹50,000 deduction over and above 80C", limit: "Max: ₹50,000" });
    if (!(OLD.sec80D)) suggestions.push({ section: "80D", desc: "Buy health insurance for self, family and parents to claim medical deduction", limit: "Max: ₹25,000–₹1,00,000" });
    if (!(OLD.hraExemption) && OLD.grossSalary > 0) suggestions.push({ section: "HRA", desc: "If you are paying rent, declare it to claim HRA exemption under Sec 10(13A)", limit: "Based on salary & rent paid" });
    if (!(OLD.sec80TTA)) suggestions.push({ section: "80TTA", desc: "Claim savings bank interest (up to ₹10,000) under Section 80TTA", limit: "Max: ₹10,000" });

    suggestions.slice(0, 5).forEach((s, i) => {
      const bg = i % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      doc.rect(L, y, PW, 22).fill(bg);
      doc.font("NotoSans-Bold").fontSize(8.5).fillColor(MID_BLUE).text(`Sec ${s.section}`, L + 6, y + 4, { width: 55 });
      doc.font("NotoSans").fontSize(8.5).fillColor("#374151").text(s.desc, L + 65, y + 4, { width: PW - 130 });
      doc.font("NotoSans-Bold").fontSize(8).fillColor(GREEN).text(s.limit, L + PW - 120, y + 8, { width: 115, align: "right" });
      y += 22;
    });

    y += 10;

    // ── FOOTER ────────────────────────────────────────────────────────────────
    doc.rect(L, y, PW, 1).fill(DARK_BLUE);
    y += 8;
    doc.font("NotoSans-Bold").fontSize(8).fillColor(DARK_BLUE)
       .text("Generated by AiTaxBot  |  www.aitaxbot.co.in", L, y, { width: PW, align: "center" });
    y += 12;
    doc.font("NotoSans").fontSize(7).fillColor(GRAY)
       .text("Disclaimer: This computation is for informational purposes only. Please consult a qualified tax professional before filing your ITR. All figures are rounded to the nearest rupee.", L, y, { width: PW, align: "center" });

    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY SINGLE-REGIME PDF (backward compat — used when only one regime is sent)
// ─────────────────────────────────────────────────────────────────────────────

function generateLegacyPDF(data: TaxComputationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    registerRupeeSafeFonts(doc);
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = 50;
    const PW = doc.page.width - 100;
    let y = 40;

    doc.fontSize(22).font("NotoSans-Bold").fillColor("#1E40AF")
       .text("AiTaxBot", { align: "center" });
    y += 30;
    doc.fontSize(10).font("NotoSans").fillColor("#666666")
       .text("www.aitaxbot.co.in | AI-Powered Tax Calculator", { align: "center" });
    y += 25;
    doc.moveTo(50, y).lineTo(545, y).strokeColor("#1E40AF").lineWidth(2).stroke();
    y += 20;
    doc.fillColor("#000000").lineWidth(1);
    doc.fontSize(14).font("NotoSans-Bold").text("INCOME TAX COMPUTATION STATEMENT", { align: "center" });
    y += 30;
    doc.fontSize(12).font("NotoSans-Bold").text(`Assessment Year: ${data.assessmentYear}`, { align: "center" });
    y += 30;

    const colR = 350;
    doc.fontSize(10).font("NotoSans");
    doc.text("Name", L, y); doc.text(`: ${data.personalInfo.name}`, L + 100, y);
    doc.text("Previous Year", colR, y); doc.text(`: ${data.financialYear}`, colR + 100, y); y += 15;
    doc.text("Age Group", L, y);
    doc.text(`: ${data.personalInfo.ageGroup === "below60" ? "Below 60" : data.personalInfo.ageGroup === "60to80" ? "60-80 (Senior)" : "Above 80 (Super Senior)"}`, L + 100, y);
    doc.text("Tax Regime", colR, y);
    doc.text(`: ${(data.regime || "new") === "new" ? "New Regime (115BAC)" : "Old Regime"}`, colR + 100, y); y += 30;

    doc.moveTo(L, y).lineTo(L + PW, y).stroke(); y += 10;
    doc.fontSize(10).font("NotoSans");

    const colA = L + PW - 150;

    if (data.salary) {
      doc.font("NotoSans-Bold").text("▶ Income from Salaries", L, y); y += 18;
      doc.font("NotoSans").text("Gross Salary", L + 15, y);
      doc.text(fmt(data.salary.grossSalary), colA, y, { width: 80, align: "right" }); y += 15;
      doc.text(`Less: Standard Deduction u/s 16(ia)`, L + 15, y);
      doc.text(`(${fmt(data.salary.standardDeduction)})`, colA, y, { width: 80, align: "right" }); y += 15;
      doc.font("NotoSans-Bold").text("Net Income from Salary", L + 15, y);
      doc.text(fmt(data.salary.netSalary), colA, y, { width: 80, align: "right" }); y += 25;
    }

    if (data.deductions && data.deductions.totalDeductions > 0 && data.regime === "old") {
      doc.font("NotoSans-Bold").text("▶ Deductions under Chapter VI-A", L, y); y += 18;
      const d = data.deductions;
      const sections: Array<[string, number | undefined]> = [
        ["Section 80C (PPF, ELSS, LIC, etc.)", d.section80C],
        ["Section 80D (Health Insurance)", d.section80D],
        ["Section 80CCD(1B) — NPS", d.section80CCD1B || d.nps80CCD1B],
        ["Section 80TTA (Savings Interest)", d.section80TTA],
        ["Section 80E (Education Loan)", d.section80E],
        ["Section 80G (Donations)", d.section80G],
        ["Section 24(b) (Home Loan Interest)", d.homeLoanInterest],
        ["LTA Exemption", d.lta],
        ["Other Deductions", d.otherDeductions],
      ];
      sections.forEach(([label, val]) => {
        if (val && val > 0) {
          doc.font("NotoSans").text(label, L + 15, y);
          doc.text(fmt(val), colA, y, { width: 80, align: "right" }); y += 15;
        }
      });
      doc.font("NotoSans-Bold").text("Total Deductions under Chapter VI-A", L + 15, y);
      doc.text(fmt(d.totalDeductions), colA, y, { width: 80, align: "right" }); y += 25;
    }

    doc.moveTo(L, y).lineTo(L + PW, y).stroke(); y += 10;
    doc.font("NotoSans-Bold").fontSize(11).text("▶ Total Taxable Income", L, y);
    doc.text(fmt(data.taxBreakdown.taxableIncome), colA, y, { width: 80, align: "right" }); y += 25;

    doc.font("NotoSans").fontSize(10);
    doc.text("Tax on Total Income", L, y);
    doc.text(fmt(data.taxBreakdown.taxOnIncome), colA, y, { width: 80, align: "right" }); y += 15;
    if (data.taxBreakdown.surcharge > 0) {
      doc.text("Add: Surcharge", L + 15, y);
      doc.text(fmt(data.taxBreakdown.surcharge), colA, y, { width: 80, align: "right" }); y += 15;
    }
    doc.text("Add: Health & Education Cess (4%)", L + 15, y);
    doc.text(fmt(data.taxBreakdown.cess), colA, y, { width: 80, align: "right" }); y += 15;
    doc.font("NotoSans-Bold").text("Net Tax Payable", L + 15, y);
    doc.text(fmt(data.taxBreakdown.totalTax), colA, y, { width: 80, align: "right" }); y += 30;

    const compDate = new Date(data.computationDate);
    doc.fontSize(9).font("NotoSans").fillColor("#333333")
       .text(`Date: ${compDate.toLocaleDateString("en-IN")}`, L, y);
    y += 50;
    doc.moveTo(L, y).lineTo(L + PW, y).strokeColor("#1E40AF").lineWidth(1).stroke(); y += 12;
    doc.fontSize(9).font("NotoSans-Bold").fillColor("#1E40AF").text("Generated by AiTaxBot | www.aitaxbot.co.in", { align: "center" });
    y += 10;
    doc.fontSize(7).font("NotoSans").fillColor("#999999").text("Disclaimer: This computation is for informational purposes only. Please consult a qualified tax professional for ITR filing.", { align: "center" });

    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE PDF HELPER
// Writes to a short-lived temp file, returns the path, and schedules
// automatic deletion after 60 seconds so disk never accumulates stale PDFs.
// Also runs a startup sweep that removes files older than 5 minutes.
// ─────────────────────────────────────────────────────────────────────────────

/** Remove any temp PDFs that are older than `maxAgeMs` milliseconds. */
export function cleanStalePdfs(maxAgeMs = 5 * 60 * 1000): void {
  const uploadDir = path.join(process.cwd(), "temp-pdfs");
  if (!fs.existsSync(uploadDir)) return;
  const now = Date.now();
  try {
    for (const file of fs.readdirSync(uploadDir)) {
      const fp = path.join(uploadDir, file);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fp);
      }
    }
  } catch {
    // Non-fatal: log but don't crash
    console.warn("[PDF] Could not clean temp-pdfs directory");
  }
}

export async function savePDFToStorage(pdfBuffer: Buffer, userId: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), "temp-pdfs");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const fileName = `tax-computation-${randomUUID()}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, pdfBuffer);

  // Schedule deletion after 60 seconds — files are single-use for the HTTP response
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Non-fatal
    }
  }, 60_000);

  return `/temp-pdfs/${fileName}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENT RECEIPT PDF
// ─────────────────────────────────────────────────────────────────────────────

export interface RentReceiptData {
  receiptNumber: string;          // e.g. "RR-2025-001"
  receiptDate: string;            // formatted date string
  tenantName: string;
  tenantAddress?: string;
  landlordName: string;
  landlordAddress?: string;
  landlordPan?: string;           // required if annual rent > ₹1L
  propertyAddress: string;
  rentAmount: number;             // monthly rent in ₹
  rentPeriodFrom: string;         // e.g. "1 April 2025"
  rentPeriodTo: string;           // e.g. "30 April 2025"
  paymentMode: string;            // Cash / Bank Transfer / UPI / Cheque / NEFT
  chequeDetails?: string;         // cheque no + bank (if mode = Cheque)
}

// ── Number to Indian words ────────────────────────────────────────────────────
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + convert(num % 100000) : "");
    return convert(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + convert(num % 10000000) : "");
  }

  const int = Math.floor(n);
  const paise = Math.round((n - int) * 100);
  let result = convert(int) + " Rupees";
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  return result + " Only";
}

// ── Generate a single receipt page ───────────────────────────────────────────
function drawReceiptPage(doc: PDFKit.PDFDocument, data: RentReceiptData, pageIndex: number): void {
  const PW = doc.page.width;
  const M = 50; // margin
  const W = PW - M * 2;
  let y = M;

  // ── Header ───────────────────────────────────────────────────────────────
  doc.fontSize(14).font("NotoSans-Bold").fillColor("#1E3A8A")
     .text("RENT RECEIPT", M, y, { width: W, align: "center" });
  y += 22;
  doc.moveTo(M, y).lineTo(M + W, y).strokeColor("#1E3A8A").lineWidth(1).stroke();
  y += 16;

  // ── Receipt meta row ─────────────────────────────────────────────────────
  doc.roundedRect(M, y, W, 30, 4).fill("#F1F5F9");
  doc.fontSize(9).font("NotoSans-Bold").fillColor("#1E3A8A")
     .text(`Receipt No: ${data.receiptNumber}`, M + 10, y + 10);
  doc.fontSize(9).font("NotoSans-Bold").fillColor("#1E3A8A")
     .text(`Date: ${data.receiptDate}`, PW - M - 170, y + 10, { width: 160, align: "right" });
  y += 42;

  // ── Main receipt body text ────────────────────────────────────────────────
  const amtWords = numberToWords(data.rentAmount);
  const amtFmt = `₹${data.rentAmount.toLocaleString("en-IN")}`;

  doc.roundedRect(M, y, W, 72, 4).fill("#EFF6FF").stroke("#BFDBFE");
  y += 12;
  doc.fontSize(10).font("NotoSans").fillColor("#1e293b")
     .text("Received with thanks from", M + 12, y);
  doc.font("NotoSans-Bold").fillColor("#1E3A8A")
     .text(` ${data.tenantName}`, M + 12 + 148, y, { continued: false });
  y += 16;
  doc.font("NotoSans").fillColor("#1e293b")
     .text("the sum of ", M + 12, y, { continued: true })
     .font("NotoSans-Bold").fillColor("#1E3A8A")
     .text(`${amtFmt} (${amtWords})`, { continued: true })
     .font("NotoSans").fillColor("#1e293b")
     .text(" towards rent for the period ", { continued: true })
     .font("NotoSans-Bold").fillColor("#1E3A8A")
     .text(`${data.rentPeriodFrom} to ${data.rentPeriodTo}.`, { continued: false });
  y += 30;

  // ── Details grid ─────────────────────────────────────────────────────────
  y += 10;
  const col1 = M;
  const col2 = M + W / 2 + 10;
  const colW = W / 2 - 10;

  const drawField = (label: string, value: string, x: number, cy: number, w: number): number => {
    doc.fontSize(7.5).font("NotoSans-Bold").fillColor("#64748B")
       .text(label.toUpperCase(), x, cy);
    cy += 11;
    doc.fontSize(9.5).font("NotoSans").fillColor("#1e293b")
       .text(value || "—", x, cy, { width: w, lineBreak: false });
    return cy + 18;
  };

  let leftY = y;
  let rightY = y;

  leftY = drawField("Property Address", data.propertyAddress, col1, leftY, colW);
  leftY = drawField("Tenant Name", data.tenantName, col1, leftY + 4, colW);
  if (data.tenantAddress) leftY = drawField("Tenant Address", data.tenantAddress, col1, leftY + 4, colW);

  rightY = drawField("Landlord Name", data.landlordName, col2, rightY, colW);
  if (data.landlordAddress) rightY = drawField("Landlord Address", data.landlordAddress, col2, rightY + 4, colW);
  if (data.landlordPan) rightY = drawField("Landlord PAN", data.landlordPan.toUpperCase(), col2, rightY + 4, colW);
  rightY = drawField("Payment Mode", data.paymentMode, col2, rightY + 4, colW);
  if (data.chequeDetails) rightY = drawField("Cheque Details", data.chequeDetails, col2, rightY + 4, colW);

  y = Math.max(leftY, rightY) + 20;

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.moveTo(M, y).lineTo(M + W, y).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
  y += 18;

  // ── Signature block ───────────────────────────────────────────────────────
  const sigX = PW - M - 180;
  doc.fontSize(9).font("NotoSans").fillColor("#64748B")
     .text("Landlord Signature", sigX, y, { width: 170, align: "center" });
  y += 14;
  doc.moveTo(sigX, y).lineTo(sigX + 170, y).strokeColor("#94A3B8").lineWidth(0.5).stroke();
  y += 8;
  doc.fontSize(9).font("NotoSans-Bold").fillColor("#1e293b")
     .text(data.landlordName, sigX, y, { width: 170, align: "center" });
  y += 30;

  // ── Stamp duty note ───────────────────────────────────────────────────────
  if (data.rentAmount > 5000) {
    doc.roundedRect(M, y, W, 26, 3).fill("#FFFBEB").stroke("#FDE68A");
    doc.fontSize(7.5).font("NotoSans").fillColor("#92400E")
       .text("⚠  Revenue Stamp: A ₹1 revenue stamp is required on the physical copy of this receipt as rent exceeds ₹5,000/month (per Indian Stamp Act).", M + 10, y + 8, { width: W - 20 });
    y += 34;
  }

  if (data.landlordPan) {
    doc.roundedRect(M, y, W, 22, 3).fill("#F0FDF4").stroke("#BBF7D0");
    doc.fontSize(7.5).font("NotoSans").fillColor("#166534")
       .text("✓  Landlord PAN included as required for HRA documentation when annual rent exceeds ₹1,00,000 (Income Tax Rule 26C).", M + 10, y + 7, { width: W - 20 });
    y += 30;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.moveTo(M, y + 6).lineTo(M + W, y + 6).strokeColor("#CBD5E1").lineWidth(0.5).stroke();
  y += 14;
  doc.fontSize(6.5).font("NotoSans").fillColor("#CBD5E1")
     .text("This receipt is a computer-generated document. It is not affiliated with any government body.", M, y, { width: W, align: "center" });
}

export async function generateRentReceiptPDF(receipts: RentReceiptData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    registerRupeeSafeFonts(doc);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    receipts.forEach((receipt, i) => {
      if (i > 0) doc.addPage();
      drawReceiptPage(doc, receipt, i);
    });

    doc.end();
  });
}

/**
 * Tax Reconciliation API Routes
 * POST /api/tools/tax-reconcile       — analyse 3 PDFs, return JSON report
 * POST /api/tools/tax-reconcile/pdf   — generate downloadable PDF summary
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import PDFDocument from "pdfkit";
import { reconcileTaxDocuments, type ReconciliationReport } from "./taxReconcileService.js";
import { authenticateFirebaseToken, type AuthenticatedRequest } from "./middleware/auth.js";

// ─── Multer: memory storage, 3 PDFs, 10 MB each ──────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Rate limiter — this hits Gemini 4× per request
const reconcileLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit reached. Please wait a minute." },
});

// Verify PDF magic bytes
function looksLikePdf(buf: Buffer): boolean {
  return buf.length >= 5 && buf.slice(0, 5).toString("ascii") === "%PDF-";
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "N/A";
  return `₹${n.toLocaleString("en-IN")}`;
}

// ─── PDF report generator using PDFKit ───────────────────────────────────────
function generatePDFReport(report: ReconciliationReport): Promise<Buffer> {
  return new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const PAGE_W = doc.page.width;   // 595
    const M = 50;                    // margin
    const CW = PAGE_W - 2 * M;      // content width = 495

    const BLUE  = "#1B4FD8";
    const GREEN = "#16A34A";
    const RED   = "#DC2626";
    const ORANGE = "#EA580C";
    const GRAY  = "#6B7280";
    const LGRAY = "#F3F4F6";
    const BLACK = "#111827";

    // PDFKit's built-in Helvetica uses WinAnsi encoding — the Rs symbol
    // (U+20B9) is not supported and renders as the superscript-1 glyph.
    // Replace with "Rs." throughout the PDF.
    const pdfSafe = (s: string): string =>
      s.replace(/₹/g, "Rs.").replace(/✓/g, "(OK)").replace(/✗/g, "(X)")
       .replace(/✅/g, "(done)").replace(/⚠️?/g, "(!)").replace(/❌/g, "(X)");

    const fmtRs = (n: number | null | undefined): string =>
      n == null ? "N/A" : "Rs." + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

    const statusColor = report.overallStatus === "CLEAN" ? GREEN
      : report.overallStatus === "CRITICAL" ? RED : ORANGE;
    const statusLabel = report.overallStatus === "CLEAN"
      ? "CLEAN - Ready to File ITR"
      : report.overallStatus === "CRITICAL"
      ? "CRITICAL - Resolve Issues Before Filing"
      : "NEEDS ATTENTION - Review Items Below";

    // ── ensure space or add page ─────────────────────────────────────────────
    const ensureSpace = (needed: number) => {
      if (doc.y + needed > doc.page.height - 60) doc.addPage();
    };

    // ── section header ───────────────────────────────────────────────────────
    const sectionHeader = (title: string) => {
      ensureSpace(30);
      doc.moveDown(0.5);
      const y = doc.y;
      doc.rect(M, y, CW, 20).fill(BLUE);
      doc.fillColor("white").font("Helvetica-Bold").fontSize(11)
         .text(title, M + 8, y + 5, { width: CW - 16, lineBreak: false });
      doc.y = y + 24;
    };

    // ────────────────────────────────────────────────────────────────────────
    // HEADER
    // ────────────────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 65).fill(BLUE);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(16)
       .text("AiTaxBot - Tax Document Reconciliation Report", M, 14, { width: CW });
    doc.fillColor("white").font("Helvetica").fontSize(9)
       .text(
         "AIS + Form 26AS + Form 16  |  FY 2025-26 / AY 2026-27  |  Generated: " +
         new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
         M, 40, { width: CW }
       );
    doc.y = 75;

    // ────────────────────────────────────────────────────────────────────────
    // STATUS BOX
    // ────────────────────────────────────────────────────────────────────────
    const sy = doc.y;
    doc.rect(M, sy, CW, 50).fill(LGRAY);
    doc.fillColor(statusColor).font("Helvetica-Bold").fontSize(13)
       .text("Status: " + statusLabel, M + 10, sy + 8, { width: CW - 20, lineBreak: false });
    const summaryLine = pdfSafe((report.summary || "").replace(/\n/g, " "));
    doc.fillColor(BLACK).font("Helvetica").fontSize(8)
       .text(summaryLine, M + 10, sy + 28, { width: CW - 20, lineBreak: false });
    doc.y = sy + 58;

    // ────────────────────────────────────────────────────────────────────────
    // EXTRACTED DATA SUMMARY TABLE
    // ────────────────────────────────────────────────────────────────────────
    sectionHeader("Extracted Data Summary");

    const W0 = CW * 0.43, W1 = CW * 0.19, W2 = CW * 0.19, W3 = CW - W0 - W1 - W2;
    const C0 = M, C1 = M + W0, C2 = M + W0 + W1, C3 = M + W0 + W1 + W2;
    const ROW_H = 17;

    // header row
    {
      const y = doc.y;
      doc.rect(M, y, CW, ROW_H).fill(BLUE);
      const hdr = ["Metric", "AIS", "Form 16", "26AS"];
      const xs  = [C0, C1, C2, C3];
      const ws  = [W0, W1, W2, W3];
      hdr.forEach((h, i) => {
        doc.fillColor("white").font("Helvetica-Bold").fontSize(8.5)
           .text(h, xs[i] + 4, y + 5, { width: ws[i] - 8, lineBreak: false });
      });
      doc.y = y + ROW_H + 2;
    }

    const tableRows: [string, string, string, string][] = [
      ["Gross Salary / Salary Income",  fmtRs(report.extractedData.ais.salaryIncome),          fmtRs(report.extractedData.form16.grossSalary),       "—"],
      ["TDS on Salary",                 "—",                                                    fmtRs(report.extractedData.form16.totalTaxDeducted),   fmtRs(report.extractedData.form26as.tdsSalary)],
      ["Taxable Income",                "—",                                                    fmtRs(report.extractedData.form16.taxableIncome),      "—"],
      ["Standard Deduction",            "—",                                                    fmtRs(report.extractedData.form16.standardDeduction),  "—"],
      ["Savings Interest (AIS)",        fmtRs(report.extractedData.ais.interestFromSavings),   "—",                                                   "—"],
      ["FD Interest (AIS)",             fmtRs(report.extractedData.ais.interestFromFD),        "—",                                                   "—"],
      ["Dividend Income (AIS)",         fmtRs(report.extractedData.ais.dividendIncome),        "—",                                                   "—"],
      ["TDS Non-Salary (26AS)",         "—",                                                    "—",                                                   fmtRs(report.extractedData.form26as.tdsNonSalary)],
      ["Advance Tax Paid (26AS)",       "—",                                                    "—",                                                   fmtRs(report.extractedData.form26as.advanceTaxPaid)],
    ];

    tableRows.forEach((row, ri) => {
      const y = doc.y;
      if (ri % 2 === 0) doc.rect(M, y, CW, ROW_H).fill(LGRAY);
      const xs = [C0, C1, C2, C3];
      const ws = [W0, W1, W2, W3];
      row.forEach((cell, ci) => {
        doc.fillColor(BLACK).font("Helvetica").fontSize(8.5)
           .text(cell, xs[ci] + 4, y + 5, { width: ws[ci] - 8, lineBreak: false });
      });
      doc.y = y + ROW_H + 1;
    });

    // employer info line
    const empParts = [
      report.extractedData.form16.employerName ? `Employer: ${report.extractedData.form16.employerName}` : "",
      report.extractedData.form16.employerTAN  ? `TAN: ${report.extractedData.form16.employerTAN}` : "",
      report.extractedData.form16.newRegime != null
        ? `Regime: ${report.extractedData.form16.newRegime ? "New Tax Regime (115BAC)" : "Old Tax Regime"}`
        : "",
    ].filter(Boolean);
    if (empParts.length) {
      doc.moveDown(0.3);
      doc.fillColor(GRAY).font("Helvetica").fontSize(7.5)
         .text(empParts.join("   |   "), M, doc.y, { width: CW });
    }

    // ────────────────────────────────────────────────────────────────────────
    // RECONCILIATION CHECKS
    // ────────────────────────────────────────────────────────────────────────
    sectionHeader("Reconciliation Checks");
    report.checks.forEach((check) => {
      ensureSpace(18);
      const checkColor = (check.status === "MATCH" || check.status === "OK") ? GREEN
        : check.status === "MISMATCH" ? RED : GRAY;
      const icon = (check.status === "MATCH" || check.status === "OK") ? "[OK]"
        : check.status === "MISMATCH" ? "[!!]" : "[?]";
      const label = `${icon} ${check.name}: `;
      doc.fillColor(checkColor).font("Helvetica-Bold").fontSize(8.5)
         .text(label, M, doc.y, { continued: true, width: CW });
      doc.fillColor(BLACK).font("Helvetica").fontSize(8.5)
         .text(pdfSafe(check.note), { width: CW - doc.widthOfString(label) });
      doc.moveDown(0.2);
    });

    // ────────────────────────────────────────────────────────────────────────
    // ISSUES FOUND
    // ────────────────────────────────────────────────────────────────────────
    if (report.mismatches.length > 0) {
      sectionHeader(`Issues Found (${report.mismatches.length})`);
      report.mismatches.forEach((m, i) => {
        ensureSpace(80);
        const mColor = m.severity === "HIGH" ? RED : m.severity === "MEDIUM" ? ORANGE : GRAY;
        doc.fillColor(mColor).font("Helvetica-Bold").fontSize(9)
           .text(`${i + 1}. [${m.severity}] ${pdfSafe(m.title)}`, M, doc.y, { width: CW });
        doc.moveDown(0.15);
        doc.fillColor(BLACK).font("Helvetica").fontSize(8.5)
           .text(pdfSafe(m.description), M + 12, doc.y, { width: CW - 12 });
        doc.moveDown(0.1);
        doc.fillColor(GRAY).font("Helvetica").fontSize(8)
           .text("Rule: " + pdfSafe(m.ruleExplanation), M + 12, doc.y, { width: CW - 12 });
        doc.moveDown(0.1);
        doc.fillColor(BLUE).font("Helvetica").fontSize(8)
           .text("Action: " + pdfSafe(m.suggestedAction), M + 12, doc.y, { width: CW - 12 });
        doc.moveDown(0.5);
      });
    } else {
      doc.moveDown(0.3);
      doc.fillColor(GREEN).font("Helvetica").fontSize(9)
         .text("(OK) No significant mismatches found. Documents appear consistent.", M, doc.y, { width: CW });
      doc.moveDown(0.5);
    }

    // ────────────────────────────────────────────────────────────────────────
    // AI ANALYSIS
    // ────────────────────────────────────────────────────────────────────────
    if (report.aiInsights) {
      sectionHeader("AI Analysis");
      doc.fillColor(BLACK).font("Helvetica").fontSize(8.5)
         .text(pdfSafe(report.aiInsights), M, doc.y, { width: CW });
      doc.moveDown(0.5);
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION ITEMS
    // ────────────────────────────────────────────────────────────────────────
    if (report.actionItems && report.actionItems.length > 0) {
      sectionHeader("Action Items Before Filing ITR");
      report.actionItems.forEach((item, i) => {
        ensureSpace(20);
        doc.fillColor(BLACK).font("Helvetica").fontSize(8.5)
           .text(`${i + 1}. ${pdfSafe(item)}`, M + 6, doc.y, { width: CW - 6 });
        doc.moveDown(0.2);
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ITR FILING IMPACT
    // ────────────────────────────────────────────────────────────────────────
    if (report.itrImpact) {
      sectionHeader("ITR Filing Impact");
      doc.fillColor(BLACK).font("Helvetica").fontSize(8.5)
         .text(pdfSafe(report.itrImpact), M, doc.y, { width: CW });
      doc.moveDown(0.5);
    }

    // ────────────────────────────────────────────────────────────────────────
    // FOOTER
    // ────────────────────────────────────────────────────────────────────────
    ensureSpace(45);
    doc.moveDown(1);
    doc.moveTo(M, doc.y).lineTo(PAGE_W - M, doc.y).strokeColor(GRAY).lineWidth(0.5).stroke();
    doc.moveDown(0.4);
    doc.fillColor(GRAY).font("Helvetica").fontSize(7.5)
       .text(
         "Disclaimer: This report is for informational purposes only. Not a substitute for professional CA advice. " +
         "Always consult a qualified Chartered Accountant before filing your ITR.",
         M, doc.y, { width: CW, align: "center" }
       );
    doc.moveDown(0.3);
    doc.fillColor(GRAY).fontSize(7.5)
       .text("www.aitaxbot.co.in  |  ITR Filing Deadline: July 31, 2026", { align: "center" });

    doc.end();
  });
}

// ─── Register routes ──────────────────────────────────────────────────────────
export function registerTaxReconcileRoutes(app: Express): void {
  // POST /api/tools/tax-reconcile — main analysis endpoint
  app.post(
    "/api/tools/tax-reconcile",
    reconcileLimiter,
    authenticateFirebaseToken,
    upload.fields([
      { name: "ais", maxCount: 1 },
      { name: "form26as", maxCount: 1 },
      { name: "form16", maxCount: 1 },
    ]),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        const aisBuf = files?.["ais"]?.[0]?.buffer;
        const form26asBuf = files?.["form26as"]?.[0]?.buffer;
        const form16Buf = files?.["form16"]?.[0]?.buffer;

        if (!aisBuf || !form26asBuf || !form16Buf) {
          return res.status(400).json({ error: "Please upload all three files: AIS, 26AS, and Form 16" });
        }

        // Verify PDF magic bytes
        for (const [name, buf] of [["AIS", aisBuf], ["26AS", form26asBuf], ["Form 16", form16Buf]] as [string, Buffer][]) {
          if (!looksLikePdf(buf)) {
            return res.status(400).json({ error: `${name} file does not appear to be a valid PDF` });
          }
        }

        // Optional per-document passwords (for password-protected PDFs)
        const passwords = {
          ais: req.body?.aisPassword as string | undefined,
          form26as: req.body?.form26asPassword as string | undefined,
          form16: req.body?.form16Password as string | undefined,
        };

        const report = await reconcileTaxDocuments(aisBuf, form26asBuf, form16Buf, passwords);
        return res.json({ success: true, report });
      } catch (err) {
        console.error("[tax-reconcile] Error:", err);
        return res.status(500).json({ error: "Failed to process documents. Please try again." });
      }
    }
  );

  // POST /api/tools/tax-reconcile/pdf — generate downloadable PDF
  app.post(
    "/api/tools/tax-reconcile/pdf",
    reconcileLimiter,
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const report = req.body?.report as ReconciliationReport;
        if (!report || !report.extractedData) {
          return res.status(400).json({ error: "Invalid report data" });
        }

        const pdfBuffer = await generatePDFReport(report);
        const filename = `AiTaxBot-Reconciliation-${new Date().toISOString().slice(0, 10)}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
      } catch (err) {
        console.error("[tax-reconcile/pdf] Error:", err);
        return res.status(500).json({ error: "Failed to generate PDF report." });
      }
    }
  );
}

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
function generatePDFReport(report: ReconciliationReport): Buffer {
  return new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const BLUE = "#1B4FD8";
    const GREEN = "#16A34A";
    const RED = "#DC2626";
    const ORANGE = "#EA580C";
    const GRAY = "#6B7280";
    const LIGHT = "#F3F4F6";

    const statusColor =
      report.overallStatus === "CLEAN"
        ? GREEN
        : report.overallStatus === "CRITICAL"
        ? RED
        : ORANGE;

    // ── Header ────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill(BLUE);
    doc.fillColor("white").fontSize(20).font("Helvetica-Bold")
       .text("AiTaxBot — Tax Document Reconciliation Report", 50, 22);
    doc.fontSize(10).font("Helvetica")
       .text(`FY 2025-26 | AY 2026-27 | Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 50, 50);
    doc.fillColor("black");
    doc.y = 100;

    // ── Overall Status ────────────────────────────────────────────────────────
    doc.rect(50, doc.y, doc.page.width - 100, 50).fill(LIGHT);
    doc.fillColor(statusColor).fontSize(16).font("Helvetica-Bold")
       .text(`Status: ${report.overallStatus.replace("_", " ")}`, 65, doc.y - 38);
    doc.fillColor(GRAY).fontSize(10).font("Helvetica")
       .text(report.summary, 65, doc.y - 20, { width: doc.page.width - 130 });
    doc.fillColor("black");
    doc.moveDown(1);

    // ── Extracted Data Summary ────────────────────────────────────────────────
    doc.fontSize(13).font("Helvetica-Bold").fillColor(BLUE).text("Extracted Data Summary");
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica").fillColor("black");

    const tableX = 50;
    const colW = (doc.page.width - 100) / 4;
    const headers = ["Metric", "AIS", "Form 16", "26AS"];
    const rows = [
      ["Gross Salary / Salary Income",
        fmt(report.extractedData.ais.salaryIncome),
        fmt(report.extractedData.form16.grossSalary),
        "—"],
      ["TDS (Salary)",
        "—",
        fmt(report.extractedData.form16.totalTaxDeducted),
        fmt(report.extractedData.form26as.tdsSalary)],
      ["FD Interest",
        fmt(report.extractedData.ais.interestFromFD),
        "—",
        "—"],
      ["Savings Interest",
        fmt(report.extractedData.ais.interestFromSavings),
        "—",
        "—"],
      ["Dividend Income",
        fmt(report.extractedData.ais.dividendIncome),
        "—",
        "—"],
      ["Advance Tax Paid",
        "—",
        "—",
        fmt(report.extractedData.form26as.advanceTaxPaid)],
      ["Taxable Income (Form 16)",
        "—",
        fmt(report.extractedData.form16.taxableIncome),
        "—"],
    ];

    // Header row
    doc.rect(tableX, doc.y, doc.page.width - 100, 18).fill(BLUE);
    headers.forEach((h, i) =>
      doc.fillColor("white").font("Helvetica-Bold").fontSize(9)
         .text(h, tableX + i * colW + 4, doc.y - 15, { width: colW - 8 })
    );
    doc.fillColor("black");
    doc.moveDown(0.1);

    rows.forEach((row, ri) => {
      if (ri % 2 === 0) doc.rect(tableX, doc.y, doc.page.width - 100, 16).fill(LIGHT);
      row.forEach((cell, ci) =>
        doc.fillColor("black").font("Helvetica").fontSize(8)
           .text(cell, tableX + ci * colW + 4, doc.y - 13, { width: colW - 8 })
      );
      doc.moveDown(0.05);
    });
    doc.moveDown(1);

    // ── Reconciliation Checks ─────────────────────────────────────────────────
    doc.fontSize(13).font("Helvetica-Bold").fillColor(BLUE).text("Reconciliation Checks");
    doc.moveDown(0.3);

    report.checks.forEach((check) => {
      const colour =
        check.status === "MATCH" || check.status === "OK" ? GREEN
        : check.status === "MISMATCH" ? RED
        : ORANGE;
      const icon = check.status === "MATCH" || check.status === "OK" ? "✓" : check.status === "MISMATCH" ? "✗" : "?";
      doc.fillColor(colour).font("Helvetica-Bold").fontSize(10).text(`${icon} ${check.name}`, { continued: true });
      doc.fillColor(GRAY).font("Helvetica").fontSize(9).text(`  ${check.note}`);
      doc.moveDown(0.2);
    });
    doc.moveDown(0.5);

    // ── Mismatches ────────────────────────────────────────────────────────────
    if (report.mismatches.length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").fillColor(BLUE).text("Issues Found");
      doc.moveDown(0.3);

      report.mismatches.forEach((m, i) => {
        const mColor = m.severity === "HIGH" ? RED : m.severity === "MEDIUM" ? ORANGE : GRAY;
        doc.fillColor(mColor).font("Helvetica-Bold").fontSize(10)
           .text(`${i + 1}. [${m.severity}] ${m.title}`);
        doc.fillColor("black").font("Helvetica").fontSize(9)
           .text(m.description, { indent: 12 });
        doc.fillColor(GRAY).fontSize(8)
           .text(`Why: ${m.ruleExplanation}`, { indent: 12 });
        doc.fillColor(BLUE).fontSize(8)
           .text(`Action: ${m.suggestedAction}`, { indent: 12 });
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(10).fillColor(GREEN).font("Helvetica")
         .text("✓ No significant mismatches found.");
      doc.moveDown(0.5);
    }

    // ── AI Insights ───────────────────────────────────────────────────────────
    if (report.aiInsights) {
      doc.fontSize(13).font("Helvetica-Bold").fillColor(BLUE).text("AI Analysis");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica").fillColor("black").text(report.aiInsights, { width: doc.page.width - 100 });
      doc.moveDown(0.5);
    }

    // ── Action Items ──────────────────────────────────────────────────────────
    if (report.actionItems.length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").fillColor(BLUE).text("Action Items Before Filing ITR");
      doc.moveDown(0.3);
      report.actionItems.forEach((item, i) => {
        doc.fillColor("black").font("Helvetica").fontSize(9).text(`${i + 1}. ${item}`, { indent: 8 });
        doc.moveDown(0.15);
      });
      doc.moveDown(0.5);
    }

    // ── ITR Impact ────────────────────────────────────────────────────────────
    if (report.itrImpact) {
      doc.fontSize(13).font("Helvetica-Bold").fillColor(BLUE).text("ITR Filing Impact");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica").fillColor("black").text(report.itrImpact, { width: doc.page.width - 100 });
      doc.moveDown(1);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.rect(50, doc.y, doc.page.width - 100, 1).fill(GRAY);
    doc.moveDown(0.3);
    doc.fillColor(GRAY).fontSize(8).font("Helvetica")
       .text("Disclaimer: This report is generated by AiTaxBot for informational purposes only. It is not a substitute for professional CA advice. Always verify with a qualified tax professional before filing your ITR.", { width: doc.page.width - 100, align: "center" });
    doc.fontSize(8).text("www.aitaxbot.co.in | ITR Filing Deadline: July 31, 2026", { align: "center" });

    doc.end();
  }) as unknown as Buffer;
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

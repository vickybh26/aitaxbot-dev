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
import { logoWhiteBuffer, watermarkBuffer } from "./assets/logoAssets.js";
import { fontRegular, fontBold } from "./assets/pdfFonts.js";
import { saveLastResult } from "./savedResults.js";
import { buildSummaryRows, type SummaryRow } from "@shared/reconcileSummaryRows";

// ─── Multer: memory storage, up to 5 PDFs (AIS + 26AS + up to 3 Form 16s), 10 MB each ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
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
    const doc = new PDFDocument({ margin: 50, size: "A4", autoFirstPage: true, bufferPages: true });
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
    const RULE  = "#E5E7EB";   // hairline dividers
    const INK   = "#374151";   // body copy — softer than BLACK for long prose

    // Embedded DejaVu subset. Registered under short names so every call site
    // can use "S"/"SB" instead of Helvetica. This is what makes the rupee sign
    // render — see server/assets/pdfFonts.ts for why it has to be embedded.
    doc.registerFont("S", fontRegular());
    doc.registerFont("SB", fontBold());
    const FONT = "S";
    const FONT_B = "SB";

    // The embedded font carries U+20B9, so the rupee sign is preserved rather
    // than downgraded to "Rs." as it was under Helvetica. Emoji still have no
    // glyph in the subset and are mapped to plain-text equivalents.
    const pdfSafe = (s: string): string =>
      s.replace(/✅/g, "\u2713").replace(/❌/g, "\u2717").replace(/⚠️?/g, "!")
       .replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim();

    const fmtRs = (n: number | null | undefined): string =>
      n == null ? "N/A" : "\u20b9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

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

    // ── watermark — faint logo centred on every page, drawn before content ──
    const WM_BUF = watermarkBuffer();
    const drawWatermark = () => {
      const size = 340;
      const x = (PAGE_W - size) / 2;
      const y = (doc.page.height - size) / 2;
      doc.image(WM_BUF, x, y, { width: size, height: size });
    };
    // `pageAdded` does not fire for the automatically-created first page, only
    // for later doc.addPage() calls (e.g. from ensureSpace) — so draw the
    // first page's watermark manually, then hook the rest.
    drawWatermark();
    doc.on("pageAdded", drawWatermark);

    // ── section header ───────────────────────────────────────────────────────
    // Editorial-style heading: small caps-ish label over a hairline rule.
    // The previous solid blue slabs stacked up into heavy bands that made the
    // report look like a form dump rather than a document.
    const sectionHeader = (title: string) => {
      ensureSpace(34);
      doc.moveDown(0.8);
      const y = doc.y;
      doc.fillColor(BLUE).font(FONT_B).fontSize(9.5)
         .text(title.toUpperCase(), M, y, { width: CW, characterSpacing: 0.8, lineBreak: false });
      const ry = y + 14;
      doc.save().lineWidth(1.2).strokeColor(BLUE).opacity(0.85)
         .moveTo(M, ry).lineTo(M + 44, ry).stroke().restore();
      doc.save().lineWidth(0.6).strokeColor(RULE)
         .moveTo(M + 44, ry).lineTo(M + CW, ry).stroke().restore();
      doc.y = ry + 10;
    };

    // ────────────────────────────────────────────────────────────────────────
    // HEADER
    // ────────────────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 78).fill(BLUE);
    // Thin lighter keyline under the banner — gives the masthead an edge
    // instead of ending in a flat colour break.
    doc.rect(0, 78, PAGE_W, 3).fill("#3B6BE8");
    // Logo (white silhouette — the full-colour blue mark would disappear
    // against this banner) at top-left, title/subtitle shifted right of it.
    const LOGO_H = 34;
    const LOGO_W = LOGO_H * (328 / 200); // source asset aspect ratio
    doc.image(logoWhiteBuffer(), M, 16, { height: LOGO_H, width: LOGO_W });
    const TEXT_X = M + LOGO_W + 12;
    const TEXT_W = CW - LOGO_W - 12;
    doc.fillColor("white").font(FONT_B).fontSize(15)
       .text("Tax Document Reconciliation", TEXT_X, 18, { width: TEXT_W, lineBreak: false });
    doc.fillColor("#C7D6FF").font(FONT).fontSize(8.5)
       .text("AIS  \u00b7  Form 26AS  \u00b7  Form 16", TEXT_X, 37, { width: TEXT_W, lineBreak: false });
    doc.fillColor("#C7D6FF").font(FONT).fontSize(8.5)
       .text(
         "FY 2025-26 / AY 2026-27  \u00b7  Generated " +
         new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
         TEXT_X, 51, { width: TEXT_W, lineBreak: false }
       );
    doc.y = 96;

    // ────────────────────────────────────────────────────────────────────────
    // STATUS BOX
    // ────────────────────────────────────────────────────────────────────────
    const summaryLine = pdfSafe((report.summary || "").replace(/\n/g, " "));
    const sy = doc.y;
    // Measure first so the panel wraps the text instead of clipping it — the
    // old fixed 50pt box with lineBreak:false truncated longer summaries,
    // which is precisely where parse-failure warnings now live.
    const sumH = doc.font(FONT).fontSize(8.5).heightOfString(summaryLine, { width: CW - 34 });
    const boxH = Math.max(46, 26 + sumH + 10);
    doc.roundedRect(M, sy, CW, boxH, 4).fill("#FAFBFC");
    doc.rect(M, sy, 3.5, boxH).fill(statusColor);
    doc.fillColor(statusColor).font(FONT_B).fontSize(11.5)
       .text(statusLabel, M + 14, sy + 10, { width: CW - 28, lineBreak: false });
    doc.fillColor(INK).font(FONT).fontSize(8.5)
       .text(summaryLine, M + 14, sy + 26, { width: CW - 34 });
    doc.y = sy + boxH + 12;

    // ────────────────────────────────────────────────────────────────────────
    // EXTRACTED DATA SUMMARY TABLE
    // ────────────────────────────────────────────────────────────────────────
    sectionHeader("Extracted Data Summary");

    const W0 = CW * 0.43, W1 = CW * 0.19, W2 = CW * 0.19, W3 = CW - W0 - W1 - W2;
    const C0 = M, C1 = M + W0, C2 = M + W0 + W1, C3 = M + W0 + W1 + W2;
    const ROW_H = 17;

    // Header row — light tint with a rule beneath, rather than a saturated
    // blue band. Numeric columns are right-aligned from here down: currency
    // that isn't decimal-aligned is the fastest way to make a financial table
    // look amateur, and it makes magnitudes genuinely harder to compare.
    {
      const y = doc.y;
      doc.rect(M, y, CW, ROW_H).fill("#EEF2FB");
      const hdr = ["Metric", "AIS", "Form 16", "26AS"];
      const xs  = [C0, C1, C2, C3];
      const ws  = [W0, W1, W2, W3];
      hdr.forEach((h, i) => {
        doc.fillColor(BLUE).font(FONT_B).fontSize(7.5)
           .text(h.toUpperCase(), xs[i] + 5, y + 5.5, {
             width: ws[i] - 10, lineBreak: false, characterSpacing: 0.4,
             align: i === 0 ? "left" : "right",
           });
      });
      doc.save().lineWidth(0.7).strokeColor("#C9D6F5")
         .moveTo(M, y + ROW_H).lineTo(M + CW, y + ROW_H).stroke().restore();
      doc.y = y + ROW_H + 2;
    }

    // Rows come from shared/reconcileSummaryRows — the same definition the
    // on-screen report renders. Previously this array was maintained by hand
    // alongside a second one in AIS26ASForm16Tool.tsx; they held identical
    // data but had drifted in row order and labelling, so the PDF looked like
    // a different report from the one the user had just been reading.
    // Do not reintroduce a local array here.
    const tableRows: [string, string, string, string][] = buildSummaryRows(
      report.extractedData,
      fmtRs, // PDFKit's standard fonts have no ₹ glyph, so this formatter uses "Rs."
    ).map((r: SummaryRow) => [r.label, r.ais, r.form16, r.form26as] as [string, string, string, string]);

    tableRows.forEach((row, ri) => {
      const y = doc.y;
      if (ri % 2 === 1) doc.rect(M, y, CW, ROW_H).fill("#FAFAFB");
      const xs = [C0, C1, C2, C3];
      const ws = [W0, W1, W2, W3];
      row.forEach((cell, ci) => {
        const isLabel = ci === 0;
        const isEmpty = cell === "\u2014" || cell === "N/A";
        doc.fillColor(isLabel ? INK : isEmpty ? "#B6BCC6" : BLACK)
           .font(isLabel ? FONT : FONT_B).fontSize(8.5)
           .text(cell, xs[ci] + 5, y + 5, {
             width: ws[ci] - 10, lineBreak: false, align: isLabel ? "left" : "right",
           });
      });
      doc.y = y + ROW_H + 1;
    });
    doc.save().lineWidth(0.7).strokeColor(RULE)
       .moveTo(M, doc.y + 1).lineTo(M + CW, doc.y + 1).stroke().restore();
    doc.y += 4;

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
      doc.fillColor(GRAY).font(FONT).fontSize(7.5)
         .text(empParts.join("   |   "), M, doc.y, { width: CW });
    }

    // ────────────────────────────────────────────────────────────────────────
    // MULTIPLE EMPLOYERS — per-employer breakdown + combined estimate
    // ────────────────────────────────────────────────────────────────────────
    if (report.multiEmployer && report.multiEmployer.employerCount > 1) {
      sectionHeader(`Multiple Employers This Year (${report.multiEmployer.employerCount})`);

      report.extractedData.form16Employers.forEach((emp, i) => {
        ensureSpace(16);
        doc.fillColor(BLACK).font(FONT_B).fontSize(8.5)
           .text(`Employer ${i + 1}: ${pdfSafe(emp.employerName || "Unknown")}`, M, doc.y, { continued: true, width: CW });
        doc.font(FONT).fillColor(GRAY)
           .text(`   Gross: ${fmtRs(emp.grossSalary)}   TDS: ${fmtRs(emp.totalTaxDeducted)}   Regime: ${emp.newRegime == null ? "Unknown" : emp.newRegime ? "New" : "Old"}`);
        doc.moveDown(0.15);
      });

      doc.moveDown(0.2);
      if (report.multiEmployer.regimeConsistent && report.multiEmployer.estimatedTaxLiability != null) {
        doc.fillColor(BLACK).font(FONT_B).fontSize(8.5)
           .text(`Combined estimated tax liability: ${fmtRs(report.multiEmployer.estimatedTaxLiability)}`, M, doc.y, { width: CW });
        doc.font(FONT).fillColor(GRAY).fontSize(8)
           .text(`Credited via TDS + advance tax (26AS): ${fmtRs(report.multiEmployer.creditedTax)}`, M, doc.y, { width: CW });
        if (report.multiEmployer.estimatedShortfall != null && report.multiEmployer.estimatedShortfall > 1000) {
          doc.fillColor(RED).font(FONT_B)
             .text(`Estimated shortfall: ${fmtRs(report.multiEmployer.estimatedShortfall)} — see Issues Found below`, M, doc.y, { width: CW });
        }
      } else if (!report.multiEmployer.regimeConsistent) {
        doc.fillColor(ORANGE).font(FONT).fontSize(8.5)
           .text("Employers used different tax regimes — combined shortfall could not be estimated. See Issues Found below.", M, doc.y, { width: CW });
      }
      doc.moveDown(0.4);
    }

    // ────────────────────────────────────────────────────────────────────────
    // RECOMMENDED ITR FORM
    // ────────────────────────────────────────────────────────────────────────
    if (report.recommendedITRForm) {
      const itr = report.recommendedITRForm;
      sectionHeader("Recommended ITR Form");
      doc.fillColor(BLACK).font(FONT_B).fontSize(10)
         .text(itr.formLabel, M, doc.y, { width: CW });
      doc.moveDown(0.15);
      itr.reasons.forEach((r) => {
        ensureSpace(14);
        doc.font(FONT).fillColor(GRAY).fontSize(8)
           .text(`- ${pdfSafe(r)}`, M, doc.y, { width: CW });
      });
      if (itr.blockers.length > 0) {
        doc.moveDown(0.15);
        doc.font(FONT_B).fillColor(BLACK).fontSize(8)
           .text("Why not the simpler form:", M, doc.y, { width: CW });
        itr.blockers.forEach((b) => {
          ensureSpace(14);
          doc.font(FONT).fillColor(GRAY).fontSize(8)
             .text(`- ${pdfSafe(b)}`, M, doc.y, { width: CW });
        });
      }
      if (itr.warnings.length > 0) {
        doc.moveDown(0.15);
        itr.warnings.forEach((w) => {
          ensureSpace(14);
          doc.font(FONT).fillColor(ORANGE).fontSize(7.5)
             .text(pdfSafe(w), M, doc.y, { width: CW });
        });
      }
      doc.moveDown(0.4);
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
      doc.fillColor(checkColor).font(FONT_B).fontSize(8.5)
         .text(label, M, doc.y, { continued: true, width: CW });
      doc.fillColor(BLACK).font(FONT).fontSize(8.5)
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
        doc.fillColor(mColor).font(FONT_B).fontSize(9)
           .text(`${i + 1}. [${m.severity}] ${pdfSafe(m.title)}`, M, doc.y, { width: CW });
        doc.moveDown(0.15);
        doc.fillColor(BLACK).font(FONT).fontSize(8.5)
           .text(pdfSafe(m.description), M + 12, doc.y, { width: CW - 12 });
        doc.moveDown(0.1);
        doc.fillColor(GRAY).font(FONT).fontSize(8)
           .text("Rule: " + pdfSafe(m.ruleExplanation), M + 12, doc.y, { width: CW - 12 });
        doc.moveDown(0.1);
        doc.fillColor(BLUE).font(FONT).fontSize(8)
           .text("Action: " + pdfSafe(m.suggestedAction), M + 12, doc.y, { width: CW - 12 });
        doc.moveDown(0.5);
      });
    } else {
      doc.moveDown(0.3);
      doc.fillColor(GREEN).font(FONT).fontSize(9)
         .text("(OK) No significant mismatches found. Documents appear consistent.", M, doc.y, { width: CW });
      doc.moveDown(0.5);
    }

    // ────────────────────────────────────────────────────────────────────────
    // AI ANALYSIS
    // ────────────────────────────────────────────────────────────────────────
    if (report.aiInsights) {
      sectionHeader("AI Analysis");
      doc.fillColor(BLACK).font(FONT).fontSize(8.5)
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
        doc.fillColor(BLACK).font(FONT).fontSize(8.5)
           .text(`${i + 1}. ${pdfSafe(item)}`, M + 6, doc.y, { width: CW - 6 });
        doc.moveDown(0.2);
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ITR FILING IMPACT
    // ────────────────────────────────────────────────────────────────────────
    if (report.itrImpact) {
      sectionHeader("ITR Filing Impact");
      doc.fillColor(BLACK).font(FONT).fontSize(8.5)
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
    doc.fillColor(GRAY).font(FONT).fontSize(7.5)
       .text(
         "Disclaimer: This report is for informational purposes only. Not a substitute for professional CA advice. " +
         "Always consult a qualified Chartered Accountant before filing your ITR.",
         M, doc.y, { width: CW, align: "center" }
       );
    doc.moveDown(0.3);
    doc.fillColor(GRAY).fontSize(7.5)
       .text("www.aitaxbot.co.in  \u00b7  ITR Filing Deadline: July 31, 2026", { align: "center" });

    // ── Page numbers ────────────────────────────────────────────────────────
    // Added last, once the total page count is known. A multi-page financial
    // document without "Page x of y" looks unfinished, and a CA reviewing a
    // printed copy has no way to tell whether a sheet is missing.
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const fy = doc.page.height - 32;
      doc.save();
      doc.fillColor("#9AA1AC").font(FONT).fontSize(7)
         .text(`Page ${i + 1} of ${range.count}`, M, fy, { width: CW, align: "right", lineBreak: false });
      doc.fillColor("#9AA1AC").font(FONT).fontSize(7)
         .text("AiTaxBot \u00b7 Reconciliation Report", M, fy, { width: CW, align: "left", lineBreak: false });
      doc.restore();
    }

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
      { name: "form16", maxCount: 3 }, // up to 3 employers — mid-year job changes
    ]),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        const aisBuf = files?.["ais"]?.[0]?.buffer ?? null;
        const form26asBuf = files?.["form26as"]?.[0]?.buffer ?? null;
        const form16Files = files?.["form16"] ?? [];
        const form16Bufs = form16Files.map((f) => f.buffer);

        // Partial uploads are allowed: any single document produces a summary
        // report, two or more produce a cross-document comparison. At least
        // one document is still required.
        if (!aisBuf && !form26asBuf && form16Bufs.length === 0) {
          return res.status(400).json({ error: "Please upload at least one document (AIS, Form 26AS, or Form 16)" });
        }
        if (form16Bufs.length > 3) {
          return res.status(400).json({ error: "You can upload up to 3 Form 16s (one per employer)" });
        }

        // Verify PDF magic bytes (only for files actually uploaded)
        const allFiles: [string, Buffer][] = [
          ...(aisBuf ? [["AIS", aisBuf] as [string, Buffer]] : []),
          ...(form26asBuf ? [["26AS", form26asBuf] as [string, Buffer]] : []),
          ...form16Bufs.map((buf, i): [string, Buffer] => [`Form 16 #${i + 1}`, buf]),
        ];
        for (const [name, buf] of allFiles) {
          if (!looksLikePdf(buf)) {
            return res.status(400).json({ error: `${name} file does not appear to be a valid PDF` });
          }
        }

        // Optional per-document passwords (for password-protected PDFs).
        // Form 16 passwords are indexed to match upload order: form16Password_0, form16Password_1, ...
        const form16Passwords: string[] = form16Bufs.map((_, i) => req.body?.[`form16Password_${i}`] as string | undefined ?? "");
        const passwords = {
          ais: req.body?.aisPassword as string | undefined,
          form26as: req.body?.form26asPassword as string | undefined,
          form16: form16Passwords,
        };

        const report = await reconcileTaxDocuments(aisBuf, form26asBuf, form16Bufs, passwords);

        // Persist a summary card for the dashboard.
        //
        // What goes to Firestore: the status, how many issues were found, and
        // the first few action items as plain sentences. What does NOT: the
        // uploaded PDFs (already discarded — they only ever existed in memory
        // via multer), the extracted figure set, or the AI narrative. The
        // tool's promise that documents are not stored therefore still holds
        // exactly as written.
        //
        // Awaited rather than fire-and-forget so a returning user never lands
        // on the dashboard microseconds later and sees a stale card, but it
        // cannot fail the request — saveLastResult() catches internally.

        // Label and value are both derived from the SAME source (the mismatch
        // count), with overallStatus only setting the tone. Deriving them
        // independently allowed a self-contradicting card — "No issues found"
        // sitting directly above "3 items to resolve" — whenever the status
        // came back CLEAN but low-severity mismatches existed. On a tax tool
        // that reads as a bug in the reconciliation itself.
        const issueCount = report.mismatches.length;
        const statusLabel =
          issueCount === 0
            ? "No issues found"
            : report.overallStatus === "CRITICAL"
            ? "Needs urgent attention"
            : "Needs attention";

        await saveLastResult(req.userId!, {
          toolKey: "ais",
          toolName: "AIS / 26AS / Form 16 Check",
          route: "/tools/ais-26as-form16",
          kind: "reconciliation",
          headline: {
            label: statusLabel,
            value:
              issueCount === 0
                ? "Ready to file"
                : `${issueCount} item${issueCount === 1 ? "" : "s"} to resolve`,
            hint: `Checked ${[
              report.documentsProvided?.ais && "AIS",
              report.documentsProvided?.form26as && "26AS",
              report.documentsProvided?.form16 && "Form 16",
            ]
              .filter(Boolean)
              .join(" · ") || "your documents"}`,
          },
          details: report.actionItems.slice(0, 4).map((item) => ({
            label: "",
            value: item,
          })),
        });

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

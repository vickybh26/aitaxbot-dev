import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMutualFundSchema, insertMarketDataSchema, insertNewsArticleSchema, insertIPODataSchema, insertTaxDocumentSchema, insertExtractedTaxDataSchema, contactInquirySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import accountingRoutes from "./accountingRoutes";
import adminRoutes, { verifyUnsubToken } from "./adminRoutes";
import whatsappRoutes from "./whatsapp/whatsappRoutes";
import caRoutes from "./caRoutes";
import leadRoutes from "./leadRoutes";
import toolUsageRoutes from "./toolUsageRoutes";
import savedResultsRoutes from "./savedResultsRoutes";
import { deleteAllSavedResults } from "./savedResults";
import { registerTaxReconcileRoutes } from "./taxReconcileRoutes.js";
import ragRoutes from "./ragRoutes";
import { getFirestore, verifyFirebaseToken, admin } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import { seedTaxRates, getTaxSlabsForCalculation } from "./seedTaxRates";
import { generateTaxComputationPDF, savePDFToStorage, generateRentReceiptPDF, type TaxComputationData, type RentReceiptData } from "./pdfGenerator";
import { geminiTaxService, type TaxAdviceInput } from "./geminiTaxService";
import { runProductionShadowComparison } from "./ragService";
import { authenticateFirebaseToken, appCheckGuard, type AuthenticatedRequest } from "./middleware/auth.js";

// ─────────────────────────────────────────────────────────────────────
// Security helpers
// ─────────────────────────────────────────────────────────────────────

/** Escape user-supplied text before inserting into HTML (email bodies, etc.). */
function escapeHtml(input: unknown): string {
  return String(input ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

/** Produce a safe filename for disk storage — never include user input. */
function safeUploadFilename(fileId: string, originalname: string): string {
  const ext = path.extname(originalname || "").toLowerCase();
  const allowed = ext === ".pdf" ? ".pdf" : ".bin";
  return `${fileId}${allowed}`;
}

/** Ensure a path stays inside a base directory (prevents traversal). */
function ensureWithin(baseDir: string, candidate: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(candidate);
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + path.sep);
}

/** Verify PDF magic bytes (`%PDF-`) — multer's MIME check is client-supplied. */
function looksLikePdf(buf: Buffer): boolean {
  return buf.length >= 5 && buf.slice(0, 5).toString("ascii") === "%PDF-";
}

// ─────────────────────────────────────────────────────────────────────
// Rate limiters — stricter on expensive / abuse-prone endpoints.
// (A general /api limiter is applied in server/index.ts.)
// ─────────────────────────────────────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit — try again in a minute." },
});
const emailLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many email sends. Please wait." },
});
const externalProxyLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "External API rate limit reached." },
});
const uploadLimiter = rateLimit({
  windowMs: 60_000 * 10,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload rate limit reached." },
});

// Configure multer — memory storage + MIME check (magic-byte check happens after).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed') as any, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {

  // ─── Request ID middleware ────────────────────────────────────────────────
  // Stamps every request with a unique ID so errors can be traced in logs.
  // • Reuses X-Request-ID if the client/proxy already set one (Cloudflare, etc.)
  // • Echoes the ID back in the response header so clients can log it
  // • Every console.error in route handlers should include req.requestId
  app.use((req: any, res, next) => {
    const existing = req.headers["x-request-id"];
    const id = (typeof existing === "string" && existing.length <= 64)
      ? existing
      : crypto.randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-ID", id);
    next();
  });

  // ─── Global error-shape helper ─────────────────────────────────────────────
  // Attach to res so any route can call res.apiError(status, code, message)
  // Response shape: { error: { code, message, requestId } }
  // This is the ONLY place we define the error contract — change once, applies everywhere.
  app.use((req: any, res: any, next) => {
    res.apiError = (status: number, code: string, message: string) => {
      console.error(`[${code}] ${message} — requestId=${req.requestId} path=${req.path}`);
      return res.status(status).json({
        error: { code, message, requestId: req.requestId },
      });
    };
    next();
  });

  // 301 Redirects for old/deprecated URLs
  const redirects: Record<string, string> = {
    // Old calculator URLs - redirect to landing page with tax calculator
    '/ppf-calculator': '/',
    '/fd-calculator': '/',
    '/retirement-calculator': '/',
    '/emi-calculator': '/',
    '/rd-calculator': '/',
    '/sip-calculator': '/',
    '/swp-calculator': '/',
    '/calculator-comparison': '/',
    '/income-tax-calculator': '/',
    
    // Old feature pages - redirect to relevant sections
    '/mutual-fund-tracker': '/market-data',
    '/stock-screener': '/market-data',
    '/stock-chart': '/market-data',
    '/ipo-analyzer': '/market-data',
    '/indian-market': '/market-data',
    '/market-dashboard': '/market-data',
    '/market-news': '/market-data',
    '/stock-screener.html': '/market-data',
    '/stock-chart.html': '/market-data',
    
    // Old pages
    '/about-us': '/about',
    '/home': '/',
    '/faq': '/',
    '/faq.html': '/',
    // Note: /dashboard redirect is now handled client-side by ProtectedRoute to preserve returnUrl
    
    // Legacy blog structure - redirect to blog
    '/learn': '/blog',
    '/learn/blog-template': '/blog',
    '/learn/category': '/blog',
    '/learn/category/financial-planning': '/blog',
    '/learn/category/investments': '/blog',
    '/learn/category/retirement': '/blog',
    '/learn/category/taxation': '/blog',
    '/learn/tag/investments': '/blog',
    '/learn/tag/personal-finance': '/blog',
    '/learn/tag/tax-planning': '/blog',
    '/learn/tag/tax-saving': '/blog',
    '/learn/tag/investment-strategy': '/blog',
    '/learn/tag/nps': '/blog',
    '/learn/tag/ppf': '/blog',
    '/learn/tag/elss': '/blog',
    '/learn/tag/80c': '/blog',
    '/learn/tag/sip': '/blog',
    '/learn/tag/emergency-fund': '/blog',
    '/learn/tag/financial-safety': '/blog',
    '/learn/tag/mutual-funds': '/blog',
    '/learn/tag/savings': '/blog',
    '/learn/tag/tag-1': '/blog',
    '/learn/tag/tag-2': '/blog',
    '/learn/tag/tag-3': '/blog',
    '/learn/emergency-fund-planning': '/blog',
    '/learn/sip-vs-swp': '/blog',
    
    // Legal pages
    '/legal/privacy-policy': '/privacy-policy',
    '/legal/terms-of-service': '/terms-of-service',
    '/legal/cookie-policy': '/privacy-policy',
    '/legal/privacy-policy.html': '/privacy-policy',
    '/legal/terms-of-service.html': '/terms-of-service',
    '/terms-of-service.html': '/terms-of-service',
    
    // Remove .html extensions
    '/privacy-policy.html': '/privacy-policy',
    
    // Blank/test pages
    '/blank-1': '/',
    '/blank-3': '/',
    '/blank-4': '/',
    '/blank-5': '/',
    '/upload': '/',
    '/document-upload': '/',
  };
  
  // Apply redirects middleware
  app.use((req, res, next) => {
    const redirectTarget = redirects[req.path];
    if (redirectTarget) {
      return res.redirect(301, redirectTarget);
    }
    next();
  });
  
  // NOTE: Global mock-auth middleware REMOVED (security fix).
  // Every route MUST authenticate via authenticateFirebaseToken — never fall back to a
  // default user. Accounting routes already use the middleware; any other route that
  // needs req.user must derive it from the verified Firebase token.

  // Mount accounting routes
  app.use("/api/accounting", accountingRoutes);

  // WhatsApp integration is gated behind an env flag so the server can boot
  // cleanly in environments where Meta / WhatsApp Business isn't available
  // (e.g., while the WABA is under Commerce Policy appeal). To enable, set
  // WHATSAPP_ENABLED=true along with WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN,
  // and ADMIN_KEY in the runtime environment.
  if (process.env.WHATSAPP_ENABLED === "true") {
    app.use("/api", whatsappRoutes);
    console.log("[whatsapp] routes mounted (WHATSAPP_ENABLED=true)");
  } else {
    console.log("[whatsapp] routes DISABLED (set WHATSAPP_ENABLED=true to enable)");
  }

  // Mount admin routes
  app.use("/api/admin", adminRoutes);

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/email/unsubscribe — one-click opt-out from profile reminder mail
  //
  // Deliberately public and mounted OUTSIDE /api/admin: the person clicking it
  // is a recipient in their mail client with no session. The uid is therefore
  // in the URL, signed with an HMAC so nobody can unsubscribe another user (or
  // probe for valid ids) by editing the query string.
  //
  // Responds with a plain HTML page rather than JSON because it opens in a
  // browser tab, and always confirms success once the signature is valid —
  // an opt-out that appears to fail invites the user to mark the mail as spam.
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/email/unsubscribe", async (req, res) => {
    const page = (title: string, body: string, ok: boolean) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · AiTaxBot</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:60px auto;padding:24px;color:#1e293b;text-align:center">
<img src="https://www.aitaxbot.co.in/apple-touch-icon.png" alt="AiTaxBot" width="48" height="48" style="border-radius:10px"/>
<h2 style="font-size:20px;margin:20px 0 8px;color:${ok ? "#16a34a" : "#dc2626"}">${title}</h2>
<p style="color:#475569;line-height:1.6;font-size:14px">${body}</p>
<p style="margin-top:28px"><a href="https://www.aitaxbot.co.in" style="color:#2563eb;font-size:14px">Back to AiTaxBot</a></p>
</body></html>`;

    try {
      const uid = String(req.query.uid || "");
      const token = String(req.query.t || "");
      if (!uid || !token || !verifyUnsubToken(uid, token)) {
        return res.status(400).type("html").send(
          page("Invalid unsubscribe link", "This link is not valid or has been altered. Please use the link exactly as it appears in the email, or contact admin@aitaxbot.co.in.", false)
        );
      }

      const db = getFirestore();
      const ref = db.collection("users").doc(uid);
      const snap = await ref.get();
      if (!snap.exists) {
        // Still report success — the desired end state (no more mail) holds,
        // and confirming or denying that an id exists would leak information.
        return res.type("html").send(page("You're unsubscribed", "You will not receive any further profile reminder emails from AiTaxBot.", true));
      }

      await ref.update({ nudgeOptOut: true, nudgeOptOutAt: new Date() });
      return res.type("html").send(
        page("You're unsubscribed", "You will not receive any further profile reminder emails. This does not affect your account, and you'll still get essential mail such as password resets.", true)
      );
    } catch (err) {
      console.error("[Email] Unsubscribe error:", err);
      return res.status(500).type("html").send(
        page("Something went wrong", "We couldn't process that just now. Please email admin@aitaxbot.co.in and we'll remove you manually.", false)
      );
    }
  });
  app.use("/api/ca", caRoutes);
  app.use("/api/leads", leadRoutes);
  app.use("/api/tool-usage", toolUsageRoutes);
  app.use("/api/saved-results", savedResultsRoutes);
  registerTaxReconcileRoutes(app);

  // Client debug logger endpoint
  app.post("/api/logs/client", (req, res) => {
    console.error("📱 [Client Console Error]", req.body);
    res.status(200).json({ ok: true });
  });

  // RAG AI routes
  app.use("/api/ai", ragRoutes);
  
  
  // Seed tax rates on startup (only runs once if empty)
  seedTaxRates().catch(err => console.error("Tax rates seeding failed:", err));
  
  // ==========================================
  // TAX RATES API
  // ==========================================
  
  // Get all tax rates
  app.get("/api/tax-rates", async (req, res) => {
    try {
      const rates = await storage.getAllTaxRates();
      res.json(rates);
    } catch (error) {
      console.error("Error getting tax rates:", error);
      res.status(500).json({ error: "Failed to get tax rates" });
    }
  });
  
  // Get specific tax rates for calculation
  app.get("/api/tax-rates/:assessmentYear/:regime/:ageGroup", async (req, res) => {
    try {
      const { assessmentYear, regime, ageGroup } = req.params;
      const rates = await getTaxSlabsForCalculation(assessmentYear, regime, ageGroup);
      
      if (!rates) {
        return res.status(404).json({ error: "Tax rates not found for specified parameters" });
      }
      
      res.json(rates);
    } catch (error) {
      console.error("Error getting tax rates:", error);
      res.status(500).json({ error: "Failed to get tax rates" });
    }
  });
  
  // ==========================================
  // TAX COMPUTATION PDF API
  // ==========================================
  
  // Generate and download tax computation PDF
  app.post("/api/tax-computation/generate-pdf", async (req, res) => {
    try {
      const computationData: TaxComputationData = req.body;
      
      if (!computationData.personalInfo || !computationData.taxBreakdown) {
        return res.status(400).json({ error: "Missing required computation data" });
      }
      
      // Ensure computation date is set
      computationData.computationDate = new Date();
      
      const pdfBuffer = await generateTaxComputationPDF(computationData);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Tax_Computation_${computationData.assessmentYear}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
  
  // Save tax computation PDF to object storage
  app.post("/api/tax-computation/save-pdf", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const computationData: TaxComputationData = req.body;

      if (!computationData?.personalInfo || !computationData?.taxBreakdown) {
        return res.status(400).json({ error: "Missing required computation data" });
      }

      computationData.computationDate = new Date();

      const pdfBuffer = await generateTaxComputationPDF(computationData);
      const objectPath = await savePDFToStorage(pdfBuffer, req.userId!);
      
      res.json({ 
        success: true, 
        objectPath,
        message: "PDF saved successfully" 
      });
    } catch (error) {
      console.error("Error saving PDF:", error);
      res.status(500).json({ error: "Failed to save PDF" });
    }
  });
  
  // ==========================================
  // AI TAX ADVISOR API
  // ==========================================

  // POST /api/ai/tax-advice — Gemini-powered personalized tips after calculation
  // AUTH: required (prevents anonymous quota drain). Rate limited to 10/min/user.
  app.post("/api/ai/tax-advice", aiLimiter, authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const input: TaxAdviceInput = req.body;
      if (!input || typeof input.totalIncome !== 'number') {
        return res.status(400).json({ error: "Invalid input" });
      }
      const advice = await geminiTaxService.getTaxAdvice(input);
      res.json(advice);

      // Shadow-compare this production analysis against the RAG pipeline
      // (fire-and-forget, after the response is already sent — zero user
      // latency). Evidence base for eventually replacing the ad-hoc Gemini
      // advice prompt with the RAG pipeline; graded on /admin/ai-review.
      if (process.env.GOOGLE_API_KEY) {
        const q =
          `A salaried Indian taxpayer is planning taxes for FY ${input.financialYear || "2025-26"}. ` +
          `Total income ₹${(input.totalIncome || 0).toLocaleString("en-IN")}; ` +
          `80C invested ₹${(input.section80C || 0).toLocaleString("en-IN")}; ` +
          `80D ₹${(input.section80D || 0).toLocaleString("en-IN")}; ` +
          (input.hraReceived ? `HRA received ₹${input.hraReceived.toLocaleString("en-IN")}, rent paid ₹${(input.rentPaid || 0).toLocaleString("en-IN")} (${input.isMetroCity ? "metro" : "non-metro"} city); ` : "") +
          `old regime tax ₹${(input.oldRegimeTax || 0).toLocaleString("en-IN")} vs new regime tax ₹${(input.newRegimeTax || 0).toLocaleString("en-IN")}. ` +
          `Which regime should they choose and what tax-saving steps should they take before March 31?`;
        const productionText = [
          advice.summary,
          ...advice.tips.map(t => `[${t.priority}] ${t.title}: ${t.detail}${t.potentialSaving ? ` (saves ~₹${t.potentialSaving.toLocaleString("en-IN")})` : ""}`),
        ].join("\n");
        void runProductionShadowComparison({
          question: q,
          productionAnswer: productionText,
          source: "calculator-advice",
          // Same FY the question text above is built from — keep them in sync.
          financialYear: input.financialYear || "2025-26",
        });
      }
    } catch (error) {
      console.error("Error getting AI tax advice:", error);
      res.status(500).json({ error: "Failed to generate tax advice" });
    }
  });

  // POST /api/stats/track-calculation — fire-and-forget hit from any calculator on the site
  // No App Check guard — this is a vanity counter, not sensitive data. Enforcement was blocking all clients.
  app.post("/api/stats/track-calculation", async (req, res) => {
    res.json({ ok: true }); // respond immediately — don't make the client wait
    try {
      const db = getFirestore();
      await db.collection('counters').doc('taxCalculations').set(
        { count: admin.firestore.FieldValue.increment(1), updatedAt: new Date() },
        { merge: true }
      );
    } catch (err) {
      console.warn('[Stats] Failed to increment calculation counter:', err);
    }
  });

  // GET /api/stats/calculations-count — public, returns how many tax calculations have been done
  app.get("/api/stats/calculations-count", async (req, res) => {
    try {
      const db = getFirestore();
      const doc = await db.collection('counters').doc('taxCalculations').get();
      const count = doc.exists ? ((doc.data() as any)?.count ?? 0) : 0;
      res.json({ count });
    } catch (error) {
      console.error("[Stats] Error fetching calculation count:", error);
      res.json({ count: 0 }); // Fail silently — don't break the landing page
    }
  });

  // POST /api/ai/dashboard-insights — Short AI insights for the dashboard
  // AUTH: required. Rate limited to 10/min/user.
  app.post("/api/ai/dashboard-insights", aiLimiter, authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const insights = await geminiTaxService.getDashboardInsights(req.body);
      res.json({ insights });
    } catch (error) {
      console.error("Error getting dashboard insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // ==========================================
  // PUBLIC AUTH HELPERS
  // ==========================================

  // GET /api/auth/check-email?email=xxx
  // Returns { exists: boolean } — no auth required (used by lead-capture modal)
  app.get("/api/auth/check-email", async (req, res) => {
    try {
      const email = (req.query.email as string || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email" });
      }
      const db = getFirestore();
      const snap = await db
        .collection(COLLECTIONS.USERS)
        .where("email", "==", email)
        .limit(1)
        .get();
      return res.json({ exists: !snap.empty });
    } catch (err) {
      console.error("[check-email]", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ==========================================
  // USER PROFILE API
  // ==========================================

  // Sync user on login — creates or updates user record from Firebase token
  app.post("/api/user/sync", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Re-decode to get the full claims object (name, picture, provider).
      // authenticateFirebaseToken already verified the token, so this is safe.
      const authHeader = req.headers.authorization!;
      const token = authHeader.substring(7);
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Split displayName into first/last if available
      const displayName = decodedToken.name || '';
      const nameParts = displayName.trim().split(' ');
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;

      const user = await storage.upsertUser({
        id: decodedToken.uid,
        email: decodedToken.email || null,
        firstName,
        lastName,
        profileImageUrl: decodedToken.picture || null,
        authProvider: decodedToken.firebase?.sign_in_provider || 'email',
        isProfileComplete: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      res.json(user);
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // Get user profile
  app.get("/api/user/profile", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        // User not in Firestore yet (race condition on first login) —
        // return a minimal profile built from the Firebase Auth token.
        // Re-decode the token to surface name/picture for the stub response.
        const token = req.headers.authorization!.substring(7);
        const decodedToken = await verifyFirebaseToken(token);
        const nameParts = (decodedToken?.name || "").split(" ");
        return res.json({
          id: req.userId!,
          email: req.userEmail || "",
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          profileImageUrl: decodedToken?.picture || null,
          mobile: "",
          occupation: "",
          city: "",
          state: "",
          isProfileComplete: false,
          authProvider: "google",
          tags: [],
          createdAt: new Date().toISOString(),
        });
      }

      res.json(user);
    } catch (error) {
      console.error("Error getting user profile:", error);
      res.status(500).json({ error: "Failed to get user profile" });
    }
  });

  // Update user profile
  app.put("/api/user/profile", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { firstName, lastName, mobile, gender, occupation, city, state } = req.body;

      // Build update object — strip undefined values because Firestore rejects them
      const profileUpdate: Record<string, any> = {};
      if (firstName !== undefined) profileUpdate.firstName = firstName;
      if (lastName !== undefined) profileUpdate.lastName = lastName;
      if (mobile !== undefined) profileUpdate.mobile = mobile;
      if (gender !== undefined) profileUpdate.gender = gender;
      if (occupation !== undefined) profileUpdate.occupation = occupation;
      if (city !== undefined) profileUpdate.city = city;
      if (state !== undefined) profileUpdate.state = state;
      profileUpdate.isProfileComplete = !!(firstName && lastName && mobile);

      const updatedUser = await storage.updateUser(req.userId!, profileUpdate as any);

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  // Get user profile change logs
  app.get("/api/user/profile/logs", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const logs = await storage.getProfileLogs(req.userId!);
      res.json(logs);
    } catch (error) {
      console.error("Error getting profile logs:", error);
      res.status(500).json({ error: "Failed to get profile logs" });
    }
  });

  // DELETE /api/user/account — DPDP Right to Erasure, self-service.
  // A user can only ever delete their OWN account: the uid comes from the
  // verified Firebase ID token (req.userId), never from the request body or
  // params, so there's no way to point this at someone else's account.
  // Deletes: the Firestore user profile, profile change logs, saved tax
  // calculation history, the "last result" dashboard cards, per-tool usage
  // events, admin CRM notes about this user, and the actual Firebase Auth
  // account (so the person can no longer sign back in — the admin-side delete
  // at DELETE /api/admin/users/:id previously missed this last step and should
  // be reconciled to match).
  //
  // IMPORTANT: any new per-user collection must be added here as well. Erasure
  // that misses a collection is worse than no erasure feature, because we have
  // told the user in the Privacy Policy that their data is gone.
  app.delete("/api/user/account", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    const uid = req.userId!;
    try {
      const db = getFirestore();

      const logsSnap = await db.collection("userProfileLogs").where("userId", "==", uid).get();
      const calcSnap = await db.collection("taxCalculationHistory").where("userId", "==", uid).get();
      const usageSnap = await db.collection("toolUsage").where("userId", "==", uid).get();

      const batch = db.batch();
      logsSnap.docs.forEach((d) => batch.delete(d.ref));
      calcSnap.docs.forEach((d) => batch.delete(d.ref));
      usageSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection("crmNotes").doc(uid));
      batch.delete(db.collection("users").doc(uid));
      await batch.commit();

      // Saved dashboard results — includes the reconciliation summary, which
      // is the most sensitive thing we retain, so it goes in the same pass.
      await deleteAllSavedResults(uid);

      // Remove the Firebase Auth account itself last, so a failure above
      // leaves the person still able to log in (fail-safe) rather than
      // deleted-but-orphaned in a half-cleaned state.
      try {
        await admin.auth().deleteUser(uid);
      } catch (authErr: any) {
        // If the auth user is already gone (e.g. retried request), that's
        // fine — the Firestore data is what mattered and it's cleaned up.
        if (authErr?.code !== "auth/user-not-found") throw authErr;
      }

      console.log(`[User] Self-service account deletion: ${uid}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ error: "Failed to delete account. Please try again or email us." });
    }
  });


  // Contact Form API - Save to Firebase Firestore
  // Contact form — public endpoint, rate-limited to 5/min to slow spam.
  // Wrapped in App Check so scripts can't hit the form from outside our app.
  app.post("/api/contact", emailLimiter, appCheckGuard, async (req, res) => {
    try {
      const validation = contactInquirySchema.safeParse(req.body);

      if (!validation.success) {
        // Generic validation error — avoid echoing Zod's internal structure.
        return res.status(400).json({ error: "Invalid input" });
      }

      const { name, email, subject, message } = validation.data;
      const db = getFirestore();

      const contactData = {
        name,
        email,
        subject: subject || '',
        message,
        category: 'Inquiry',
        createdAt: new Date().toISOString(),
        status: 'new',
        replied: false
      };

      const docRef = await db.collection('contactInquiries').add(contactData);

      console.log(`✉️ New contact inquiry received from ${email} - ID: ${docRef.id}`);

      // Escape every user-controlled field before interpolating into HTML.
      const safeName    = escapeHtml(name);
      const safeEmail   = escapeHtml(email);
      const safeSubject = escapeHtml(subject || "");
      const safeMessage = escapeHtml(message);
      const safeRefId   = escapeHtml(docRef.id);

      // ── Send emails via Brevo ──────────────────────────────────────────────
      try {
        if (!process.env.BREVO_API_KEY) {
          console.warn('⚠️ BREVO_API_KEY not set — contact saved to Firestore only. Add it in Railway to enable emails.');
        } else {
          const apiInstance = new TransactionalEmailsApi();
          apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

          const senderEmail = process.env.BREVO_SENDER_EMAIL || 'info@aitaxbot.in';
          const senderName  = process.env.BREVO_SENDER_NAME  || 'AiTaxBot';
          const adminEmail  = process.env.BREVO_ADMIN_EMAIL  || senderEmail; // where YOU receive alerts
          const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

          // ── 1. Admin notification ────────────────────────────────────────
          await apiInstance.sendTransacEmail({
            sender:  { email: senderEmail, name: senderName },
            to:      [{ email: adminEmail, name: 'AiTaxBot Team' }],
            replyTo: { email, name },
            subject: `[AiTaxBot Contact] ${subject || 'New inquiry'} — ${name}`,
            htmlContent: `
              <!DOCTYPE html>
              <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
                <div style="background:#1E3A8A;padding:16px 20px;border-radius:8px 8px 0 0">
                  <h2 style="color:#fff;margin:0;font-size:18px">📬 New Contact Form Submission</h2>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
                  <table style="width:100%;border-collapse:collapse">
                    <tr><td style="padding:6px 0;font-weight:bold;width:100px;color:#64748b;font-size:13px">Name</td><td style="padding:6px 0;font-size:14px">${safeName}</td></tr>
                    <tr><td style="padding:6px 0;font-weight:bold;color:#64748b;font-size:13px">Email</td><td style="padding:6px 0;font-size:14px"><a href="mailto:${encodeURIComponent(email)}" style="color:#2563eb">${safeEmail}</a></td></tr>
                    ${subject ? `<tr><td style="padding:6px 0;font-weight:bold;color:#64748b;font-size:13px">Subject</td><td style="padding:6px 0;font-size:14px">${safeSubject}</td></tr>` : ''}
                    <tr><td style="padding:6px 0;font-weight:bold;color:#64748b;font-size:13px">Time</td><td style="padding:6px 0;font-size:14px">${submittedAt} IST</td></tr>
                    <tr><td style="padding:6px 0;font-weight:bold;color:#64748b;font-size:13px">Ref ID</td><td style="padding:6px 0;font-size:13px;color:#94a3b8">${safeRefId}</td></tr>
                  </table>
                  <div style="margin-top:16px">
                    <p style="font-weight:bold;color:#64748b;font-size:13px;margin:0 0 6px">Message</p>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:14px;line-height:1.6;white-space:pre-wrap">${safeMessage}</div>
                  </div>
                  <div style="margin-top:16px;text-align:center">
                    <a href="mailto:${encodeURIComponent(email)}?subject=Re: ${encodeURIComponent(subject || 'Your AiTaxBot inquiry')}" style="background:#2563eb;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold">Reply to ${safeName}</a>
                  </div>
                </div>
                <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px">AiTaxBot · aitaxbot.in</p>
              </body></html>
            `,
            textContent: `New Contact Inquiry\n\nFrom: ${name} (${email})\n${subject ? 'Subject: ' + subject + '\n' : ''}Time: ${submittedAt} IST\nRef: ${docRef.id}\n\nMessage:\n${message}`
          });

          // ── 2. Auto-reply to the user ────────────────────────────────────
          await apiInstance.sendTransacEmail({
            sender:  { email: senderEmail, name: senderName },
            to:      [{ email, name }],
            subject: `We received your message — AiTaxBot`,
            htmlContent: `
              <!DOCTYPE html>
              <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
                <div style="background:#1E3A8A;padding:20px;border-radius:8px 8px 0 0;text-align:center">
                  <h1 style="color:#fff;margin:0;font-size:22px">AiTaxBot</h1>
                  <p style="color:#93C5FD;margin:4px 0 0;font-size:13px">www.aitaxbot.in · Smart Tax Calculator for India</p>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
                  <p style="font-size:16px;margin:0 0 12px">Hi <strong>${safeName}</strong>,</p>
                  <p style="font-size:14px;line-height:1.6;color:#475569">
                    Thank you for reaching out! We have received your message and our team will get back to you within <strong>24 hours</strong> on business days.
                  </p>
                  ${subject ? `<p style="font-size:13px;color:#64748b">Your inquiry: <em>${safeSubject}</em></p>` : ''}
                  <div style="background:#EFF6FF;border-left:4px solid #2563eb;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
                    <p style="margin:0;font-size:13px;color:#1d4ed8">
                      While you wait, you can explore our free tax calculators at <a href="https://aitaxbot.in" style="color:#1d4ed8">aitaxbot.in</a> — no sign-up required!
                    </p>
                  </div>
                  <p style="font-size:13px;color:#64748b;margin:16px 0 4px">If you have an urgent query, you can also reach us directly:</p>
                  <p style="font-size:13px;margin:0">📧 <a href="mailto:info@aitaxbot.in" style="color:#2563eb">info@aitaxbot.in</a> &nbsp;|&nbsp; 📞 <a href="tel:+917899869036" style="color:#2563eb">+91 78998 69036</a></p>
                  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
                  <p style="font-size:12px;color:#94a3b8;margin:0">Reference ID: ${safeRefId}</p>
                </div>
                <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px">
                  This is an automated confirmation. Please do not reply to this email.
                  <br>AiTaxBot · Bengaluru, Karnataka, India
                </p>
              </body></html>
            `,
            textContent: `Hi ${name},\n\nThank you for contacting AiTaxBot! We have received your message and will get back to you within 24 hours on business days.\n\nFor urgent queries:\nEmail: info@aitaxbot.in\nPhone: +91 78998 69036\n\nReference ID: ${docRef.id}\n\n-- AiTaxBot Team`
          });

          console.log(`📧 Admin notification + auto-reply sent for inquiry ${docRef.id}`);
        }
      } catch (emailError: any) {
        const errDetail = (emailError as any)?.response?.text || (emailError as any)?.message || String(emailError);
        console.error('❌ Brevo email failed:', errDetail);
        console.error('ℹ️  Fix: Verify sender domain in Brevo → Senders & Domains. Set BREVO_SENDER_EMAIL to a verified sender.');
      }
      
      res.json({ 
        success: true, 
        message: "Thank you for contacting us! We'll get back to you within 24 hours.",
        inquiryId: docRef.id
      });
      
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Failed to submit contact form. Please try again." });
    }
  });
  
  // ──────────────────────────────────────────────────────────────────────────
  // RENT RECEIPT GENERATOR
  // ──────────────────────────────────────────────────────────────────────────

  // POST /api/rent-receipt/generate — returns a PDF buffer (one or more pages)
  app.post("/api/rent-receipt/generate", async (req, res) => {
    try {
      const { receipts } = req.body as { receipts: RentReceiptData[] };
      if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
        return res.status(400).json({ error: "receipts array is required" });
      }
      const pdfBuffer = await generateRentReceiptPDF(receipts);
      const filename = receipts.length === 1
        ? `Rent_Receipt_${receipts[0].receiptNumber}.pdf`
        : `Rent_Receipts_${receipts[0].rentPeriodFrom.replace(/\s/g, "_")}_to_${receipts[receipts.length - 1].rentPeriodTo.replace(/\s/g, "_")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Rent receipt PDF error:", error);
      res.status(500).json({ error: "Failed to generate rent receipt PDF" });
    }
  });

  // POST /api/rent-receipt/email — generates PDF and emails it to the provided address
  // Also checks if the email belongs to a registered user:
  //   • Registered  → PDF + link to their dashboard
  //   • Unregistered → PDF + sign-up invitation
  // Rate-limited to block email-bombing via arbitrary addresses.
  // App Check ensures the caller is actually our web app (reCAPTCHA-backed).
  app.post("/api/rent-receipt/email", emailLimiter, appCheckGuard, async (req, res) => {
    try {
      const { receipts, email, recipientName } = req.body as {
        receipts: RentReceiptData[];
        email: string;
        recipientName?: string;
      };

      if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
        return res.status(400).json({ error: "receipts array is required" });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "A valid email address is required" });
      }
      // Cap batch size — a runaway client shouldn't be able to generate
      // hundreds of receipts in a single request.
      if (receipts.length > 24) {
        return res.status(400).json({ error: "Too many receipts in a single request (max 24)" });
      }

      // 1. Generate PDF
      const pdfBuffer = await generateRentReceiptPDF(receipts);
      const filename = receipts.length === 1
        ? `Rent_Receipt_${receipts[0].receiptNumber}.pdf`
        : `Rent_Receipts_${receipts.length}_months.pdf`;

      // 2. Check if user exists in Firestore
      const existingUser = await storage.getUserByUsername(email);
      const userExists = !!existingUser;

      // 3. Send email via Brevo
      if (!process.env.BREVO_API_KEY) {
        console.warn("⚠️ BREVO_API_KEY not set — email not sent");
        return res.json({ success: true, userExists, emailSent: false, message: "PDF generated but email not sent (BREVO_API_KEY missing)" });
      }

      const apiInstance = new TransactionalEmailsApi();
      apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

      const senderEmail = process.env.BREVO_SENDER_EMAIL || "info@aitaxbot.in";
      const senderName  = process.env.BREVO_SENDER_NAME  || "AiTaxBot";

      const name = recipientName || receipts[0].tenantName || "there";
      const periodLabel = receipts.length === 1
        ? `${receipts[0].rentPeriodFrom} – ${receipts[0].rentPeriodTo}`
        : `${receipts[0].rentPeriodFrom} to ${receipts[receipts.length - 1].rentPeriodTo}`;

      // Escape every user-controlled field before interpolating into HTML.
      const safeName            = escapeHtml(name);
      const safePeriodLabel     = escapeHtml(periodLabel);
      const safePropertyAddress = escapeHtml(receipts[0].propertyAddress || "");

      const ctaHtml = userExists
        ? `<a href="https://aitaxbot.co.in/dashboard" style="background:#1E3A8A;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block">View My Dashboard</a>`
        : `<a href="https://aitaxbot.co.in/login" style="background:#1E3A8A;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block">Create Free Account →</a>`;
      const ctaText = userExists
        ? "You can view all your saved documents at: https://aitaxbot.co.in/dashboard"
        : "Create a free AiTaxBot account to save receipts, calculate HRA, and plan your taxes: https://aitaxbot.co.in/login";
      const ctaNote = userExists
        ? "Your rent receipt is attached. You can also view all your saved documents in your AiTaxBot dashboard."
        : "Your rent receipt is attached below. Create a free AiTaxBot account to save your receipts, claim HRA exemption, and access all our free tax calculators — no credit card required.";

      await apiInstance.sendTransacEmail({
        sender: { email: senderEmail, name: senderName },
        to: [{ email, name }],
        subject: `Your Rent Receipt for ${periodLabel} — AiTaxBot`,
        htmlContent: `
          <!DOCTYPE html>
          <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
            <div style="background:#1E3A8A;padding:20px;border-radius:8px 8px 0 0;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:22px">AiTaxBot</h1>
              <p style="color:#93C5FD;margin:4px 0 0;font-size:13px">www.aitaxbot.co.in · Smart Tax Tools for India</p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p style="font-size:16px;margin:0 0 12px">Hi <strong>${safeName}</strong>,</p>
              <p style="font-size:14px;line-height:1.6;color:#475569">${ctaNote}</p>
              <div style="background:#EFF6FF;border-left:4px solid #2563eb;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
                <p style="margin:0 0 4px;font-size:13px;color:#1d4ed8;font-weight:bold">📄 Receipt Details</p>
                <p style="margin:0;font-size:13px;color:#1d4ed8">Period: ${safePeriodLabel}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#1d4ed8">Property: ${safePropertyAddress}</p>
              </div>
              <div style="margin:20px 0;text-align:center">${ctaHtml}</div>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
              <p style="font-size:12px;color:#94a3b8;margin:0">
                💡 Use our <a href="https://aitaxbot.co.in/calculators/hra" style="color:#2563eb">HRA Calculator</a> to find out how much HRA exemption you can claim under Section 10(13A).
              </p>
            </div>
            <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px">
              AiTaxBot · Bengaluru, Karnataka, India · <a href="https://aitaxbot.co.in" style="color:#94a3b8">aitaxbot.co.in</a>
            </p>
          </body></html>
        `,
        textContent: `Hi ${name},\n\nYour rent receipt for ${periodLabel} is attached.\n\n${ctaText}\n\nFor HRA exemption: https://aitaxbot.co.in/calculators/hra\n\n-- AiTaxBot Team`,
        attachment: [{ content: pdfBuffer.toString("base64"), name: filename }],
      });

      console.log(`📧 Rent receipt emailed to ${email} (userExists: ${userExists})`);
      res.json({ success: true, userExists, emailSent: true });
    } catch (error: any) {
      console.error("Rent receipt email error:", error?.response?.text || error?.message || error);
      res.status(500).json({ error: "Failed to send rent receipt email" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // TAX DOCUMENTS — Form 16 / AIS / 26AS uploads
  // EVERY endpoint requires auth. userId is always derived from the
  // verified Firebase token (req.userId), never from req.body / req.query.
  // Reads and deletes re-verify document.userId === req.userId (IDOR guard).
  // ─────────────────────────────────────────────────────────────────────

  // POST /api/tax-documents/upload — authed, rate-limited, PDF magic-byte check,
  // sanitised filename on disk (no original user filename persisted on disk).
  app.post(
    "/api/tax-documents/upload",
    uploadLimiter,
    authenticateFirebaseToken,
    upload.single("document"),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // MIME was checked by multer — now verify the actual magic bytes.
        if (!looksLikePdf(req.file.buffer)) {
          return res.status(400).json({ error: "Uploaded file is not a valid PDF" });
        }

        const { documentType } = req.body;
        if (!documentType || !["form16", "ais", "26as"].includes(documentType)) {
          return res.status(400).json({ error: "Invalid document type. Must be: form16, ais, or 26as" });
        }

        const userId = req.userId!;

        const uploadDir = "uploads";
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileId = crypto.randomUUID();
        // NEVER use req.file.originalname in the on-disk name. We only store
        // a UUID with a `.pdf` extension, then belt-and-braces check that the
        // resolved path is inside uploadDir to block any path traversal.
        const localFileName = safeUploadFilename(fileId, req.file.originalname);
        const localFilePath = path.join(uploadDir, localFileName);
        if (!ensureWithin(uploadDir, localFilePath)) {
          return res.status(400).json({ error: "Invalid upload path" });
        }

        await fs.promises.writeFile(localFilePath, req.file.buffer);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // We keep the original filename in the DB (display-only) — escape it
        // if ever rendered in HTML. Never use it for filesystem operations.
        const safeOriginalName = path.basename(req.file.originalname || "document.pdf");

        const taxDocument = await storage.createTaxDocument({
          userId,
          documentType,
          fileName: safeOriginalName,
          filePath: localFilePath,
          firebaseFileId: null,
          downloadUrl: null,
          fileSize: req.file.size,
          expiresAt: expiresAt,
          processingStatus: "pending",
        });

        // Process PDF in background
        processDocumentAsync(taxDocument.id, localFilePath, documentType, undefined);

        res.json({
          success: true,
          documentId: taxDocument.id,
          message: "Document uploaded successfully. Processing started.",
          status: "pending",
        });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to upload document" });
      }
    }
  );

  // GET /api/tax-documents/:documentId/status — authed + IDOR-guarded.
  app.get(
    "/api/tax-documents/:documentId/status",
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const document = await storage.getTaxDocument(req.params.documentId);
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }
        // Ownership check — DB row must belong to the caller.
        if (document.userId !== req.userId) {
          // Return 404 (not 403) to avoid leaking existence of other users' docs.
          return res.status(404).json({ error: "Document not found" });
        }

        const extractedData = await storage.getExtractedTaxData(document.id);

        res.json({
          documentId: document.id,
          status: document.processingStatus,
          isProcessed: document.isProcessed,
          errorMessage: document.errorMessage,
          extractedData: extractedData || null,
        });
      } catch (error) {
        console.error("Status check error:", error);
        res.status(500).json({ error: "Failed to check document status" });
      }
    }
  );

  // GET /api/tax-documents — list caller's own documents only.
  app.get(
    "/api/tax-documents",
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const documents = await storage.getTaxDocuments(req.userId!);
        res.json(documents);
      } catch (error) {
        console.error("Fetch documents error:", error);
        res.status(500).json({ error: "Failed to fetch documents" });
      }
    }
  );

  // POST /api/firebase/cleanup — cleanup the *caller's* expired docs only.
  app.post(
    "/api/firebase/cleanup",
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.userId!;
        let deletedCount = 0;
        try {
          console.log("No external storage cleanup needed");
          console.log(`Cleaned up ${deletedCount} expired Firebase documents for user ${userId}`);
        } catch (firebaseError) {
          console.log("Firebase cleanup failed, continuing with local cleanup:", firebaseError);
        }

        res.json({
          success: true,
          deletedCount,
          message: `Cleaned up ${deletedCount} expired documents`,
        });
      } catch (error) {
        console.error("Cleanup error:", error);
        res.status(500).json({ error: "Failed to cleanup documents" });
      }
    }
  );

  // POST /api/firebase/cleanup-session — wipes the caller's docs (DB + disk).
  // Each file path is checked to be inside the uploads/ directory before unlink.
  app.post(
    "/api/firebase/cleanup-session",
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.userId!;
        console.log(`Starting session cleanup for user: ${userId}`);

        let firebaseDeletedCount = 0;
        let localDeletedCount = 0;

        try {
          console.log("No external storage cleanup needed");
          console.log(`Cleaned up ${firebaseDeletedCount} Firebase documents for user session ${userId}`);
        } catch (firebaseError) {
          console.log("Firebase session cleanup failed:", firebaseError);
        }

        const uploadDir = "uploads";
        let userDocuments: any[] = [];
        try {
          userDocuments = await storage.getTaxDocumentsByUserId(userId);

          for (const doc of userDocuments) {
            // Defensive: ignore docs that somehow aren't owned by the caller.
            if (doc.userId !== userId) continue;

            if (doc.filePath && !doc.filePath.startsWith("firebase:")) {
              // Only unlink files that resolve inside uploads/ — blocks any
              // stored path-traversal from ever touching system paths.
              if (ensureWithin(uploadDir, doc.filePath) && fs.existsSync(doc.filePath)) {
                try {
                  await fs.promises.unlink(doc.filePath);
                  localDeletedCount++;
                  console.log(`Deleted local file: ${doc.filePath}`);
                } catch (fileError) {
                  console.log(`Failed to delete local file ${doc.filePath}:`, fileError);
                }
              } else {
                console.warn(`Refused to unlink unsafe path: ${doc.filePath}`);
              }
            }

            await storage.deleteTaxDocument(doc.id);
          }

          console.log(`Cleaned up ${userDocuments.length} database records and ${localDeletedCount} local files for user session ${userId}`);
        } catch (localError) {
          console.log("Local storage cleanup failed:", localError);
        }

        const totalDeleted = firebaseDeletedCount + localDeletedCount + userDocuments.length;

        res.json({
          success: true,
          deletedCount: totalDeleted,
          firebaseDeleted: firebaseDeletedCount,
          localDeleted: localDeletedCount,
          databaseDeleted: userDocuments.length,
          message: `Session cleanup completed. Removed ${totalDeleted} total documents`,
        });
      } catch (error) {
        console.error("Session cleanup error:", error);
        res.status(500).json({ error: "Failed to cleanup session documents" });
      }
    }
  );

  // PDF processing pipeline status — admin-only diagnostic endpoint.
  // Returns configuration state without exposing secret values.
  app.post(
    "/api/adobe/test-access",
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        // Restrict to admin accounts only (adminLevel must be set on the token)
        const adminLevel = (req as any).adminLevel;
        if (!adminLevel) {
          return res.status(403).json({ error: "Admin access required" });
        }

        const hasGemini = !!(process.env.GOOGLE_API_KEY);
        res.json({
          success: true,
          configured: true,
          geminiAvailable: hasGemini,
          message: hasGemini
            ? 'PDF processing ready: AI extraction enabled'
            : 'PDF processing ready: basic extraction (AI extraction not configured)',
          processingMethod: hasGemini ? 'gemini_ai' : 'regex_fallback'
        });
      } catch (error) {
        res.status(500).json({ success: false, error: "Failed to check PDF processing configuration" });
      }
    }
  );

  // Test document processing pipeline — admin-only diagnostic endpoint.
  // Allows admins to verify the LLM extraction pipeline is functioning.
  app.post(
    "/api/test-document-processing",
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        // Restrict to admin accounts only
        const adminLevel = (req as any).adminLevel;
        if (!adminLevel) {
          return res.status(403).json({ error: "Admin access required" });
        }

        const { testData } = req.body;

        // Import the LLM processor
        const { structureDataWithLLM, createFallbackStructuredData } = await import('./llmProcessor');

        // Test LLM structuring
        const structuredData = await structureDataWithLLM(testData || 'Sample tax document text');

        if (structuredData) {
          res.json({
            success: true,
            message: 'Document processing pipeline working',
            processingMethod: 'llm_structured',
            data: structuredData
          });
        } else {
          // Test fallback
          const fallbackData = createFallbackStructuredData(testData || 'Sample tax document text');
          res.json({
            success: true,
            message: 'Document processing pipeline working (fallback)',
            processingMethod: 'fallback_structured',
            data: fallbackData
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: "Failed to test document processing",
          details: (error as any)?.message
        });
      }
    }
  );

  // Mutual Funds API
  app.get("/api/mutual-funds", async (req, res) => {
    try {
      const funds = await storage.getMutualFunds();
      res.json(funds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mutual funds" });
    }
  });

  app.get("/api/mutual-funds/:code", async (req, res) => {
    try {
      const fund = await storage.getMutualFundByCode(req.params.code);
      if (!fund) {
        return res.status(404).json({ error: "Mutual fund not found" });
      }
      res.json(fund);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mutual fund" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // EXTERNAL PROXIES — rate-limited, auth-required, and strictly scoped.
  // These wrap third-party APIs so browser code doesn't expose our keys
  // and so we can cap fan-out + apply a clean SSRF surface (no user-
  // controlled hostnames; only fixed templates with whitelisted values).
  // ─────────────────────────────────────────────────────────────────────

  // External MF API proxy to avoid CORS
  app.get(
    "/api/external/mutual-funds",
    externalProxyLimiter,
    authenticateFirebaseToken,
    async (_req: AuthenticatedRequest, res) => {
      try {
        const response = await fetch("https://api.mfapi.in/mf");
        const data = await response.json();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch external mutual funds data" });
      }
    }
  );

  app.get(
    "/api/external/mutual-funds/:code",
    externalProxyLimiter,
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        // MFAPI scheme codes are numeric — reject anything else to prevent
        // injection of path segments or malicious hostnames.
        if (!/^\d{1,10}$/.test(req.params.code)) {
          return res.status(400).json({ error: "Invalid mutual fund code" });
        }
        const response = await fetch(`https://api.mfapi.in/mf/${req.params.code}`);
        const data = await response.json();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch mutual fund details" });
      }
    }
  );

  // Market Data API
  app.get("/api/market-data", async (req, res) => {
    try {
      const marketData = await storage.getMarketData();
      res.json(marketData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  app.get("/api/market-data/:symbol", async (req, res) => {
    try {
      const data = await storage.getMarketDataBySymbol(req.params.symbol);
      if (!data) {
        return res.status(404).json({ error: "Market data not found" });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // External Alpha Vantage API proxy
  // - Whitelists function names so we never proxy a crafted function string.
  // - Never forwards a client-supplied apikey — always use the server key.
  const ALPHA_VANTAGE_FUNCTIONS = new Set([
    "TIME_SERIES_INTRADAY",
    "TIME_SERIES_DAILY",
    "TIME_SERIES_WEEKLY",
    "TIME_SERIES_MONTHLY",
    "GLOBAL_QUOTE",
    "SYMBOL_SEARCH",
    "OVERVIEW",
  ]);
  const ALPHA_VANTAGE_INTERVALS = new Set(["1min", "5min", "15min", "30min", "60min"]);

  app.get(
    "/api/external/alpha-vantage",
    externalProxyLimiter,
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const funcParam = String(req.query.function || "");
        const symbolParam = String(req.query.symbol || "");
        const intervalParam = String(req.query.interval || "");

        if (!funcParam || !symbolParam) {
          return res.status(400).json({ error: "Function and symbol parameters are required" });
        }
        if (!ALPHA_VANTAGE_FUNCTIONS.has(funcParam)) {
          return res.status(400).json({ error: "Unsupported function" });
        }
        if (!/^[A-Za-z0-9.:-]{1,16}$/.test(symbolParam)) {
          return res.status(400).json({ error: "Invalid symbol" });
        }
        if (intervalParam && !ALPHA_VANTAGE_INTERVALS.has(intervalParam)) {
          return res.status(400).json({ error: "Invalid interval" });
        }

        const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
        if (!API_KEY) {
          return res.status(503).json({ error: "Market data service not configured" });
        }

        const url = new URL("https://www.alphavantage.co/query");
        url.searchParams.set("function", funcParam);
        url.searchParams.set("symbol", symbolParam);
        if (intervalParam) url.searchParams.set("interval", intervalParam);
        url.searchParams.set("apikey", API_KEY);

        const response = await fetch(url.toString());
        const data = await response.json();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch Alpha Vantage data" });
      }
    }
  );

  // External Finnhub API proxy
  // - Whitelists endpoint names; path is fixed (no user-controlled host/path).
  const FINNHUB_ENDPOINTS = new Set([
    "quote",
    "stock/profile2",
    "stock/candle",
    "company-news",
    "stock/symbol",
  ]);

  app.get(
    "/api/external/finnhub",
    externalProxyLimiter,
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const endpoint = String(req.query.endpoint || "");
        const symbol = String(req.query.symbol || "");

        if (!FINNHUB_ENDPOINTS.has(endpoint)) {
          return res.status(400).json({ error: "Unsupported endpoint" });
        }
        if (!/^[A-Za-z0-9.:-]{1,16}$/.test(symbol)) {
          return res.status(400).json({ error: "Invalid symbol" });
        }
        const API_KEY = process.env.FINNHUB_API_KEY;
        if (!API_KEY) {
          return res.status(503).json({ error: "Market data service not configured" });
        }

        const url = new URL(`https://finnhub.io/api/v1/${endpoint}`);
        url.searchParams.set("symbol", symbol);
        url.searchParams.set("token", API_KEY);

        const response = await fetch(url.toString());
        const data = await response.json();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch Finnhub data" });
      }
    }
  );

  // News API
  app.get("/api/news", async (req, res) => {
    try {
      const category = req.query.category as string;
      const articles = await storage.getNewsArticles(category);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news articles" });
    }
  });

  // External News API proxy — whitelist category + country, no free-form input.
  const NEWS_CATEGORIES = new Set([
    "business", "entertainment", "general", "health",
    "science", "sports", "technology",
  ]);
  const NEWS_COUNTRIES = new Set([
    "in", "us", "gb", "ae", "sg", "au", "ca",
  ]);

  app.get(
    "/api/external/news",
    externalProxyLimiter,
    authenticateFirebaseToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const API_KEY = process.env.NEWS_API_KEY;
        if (!API_KEY) {
          return res.status(503).json({ error: "News service not configured" });
        }
        const category = String(req.query.category || "business");
        const country = String(req.query.country || "in");

        if (!NEWS_CATEGORIES.has(category)) {
          return res.status(400).json({ error: "Invalid category" });
        }
        if (!NEWS_COUNTRIES.has(country)) {
          return res.status(400).json({ error: "Invalid country" });
        }

        const url = new URL("https://newsapi.org/v2/top-headlines");
        url.searchParams.set("country", country);
        url.searchParams.set("category", category);
        url.searchParams.set("apiKey", API_KEY);

        const response = await fetch(url.toString());
        const data = await response.json();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch external news" });
      }
    }
  );

  // IPO Data API
  app.get("/api/ipo-data", async (req, res) => {
    try {
      const ipoData = await storage.getIPOData();
      res.json(ipoData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch IPO data" });
    }
  });

  // Indian Market Indices (NSE/BSE) - Enhanced with stock-market-india library
  app.get("/api/market-indices", async (req, res) => {
    try {
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      
      const indices = await stockMarket.getNSEIndices();
      
      if (indices && indices.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedIndices = indices.data.slice(0, 4).map((index: any) => ({
          symbol: index.index?.replace(/\s+/g, '').toUpperCase() || "NIFTY50",
          name: index.index || "Nifty 50",
          value: parseFloat(index.last) || 25013.15,
          change: parseFloat(index.variation) || 75.45,
          changePercent: parseFloat(index.percentChange) || 0.30,
          lastUpdated: new Date()
        }));
        
        res.json(formattedIndices);
      } else {
        // Fallback to realistic data
        res.json([
          { 
            symbol: "NIFTY50", 
            name: "Nifty 50", 
            value: 25013.15, 
            change: 75.45, 
            changePercent: 0.30,
            lastUpdated: new Date()
          }
        ]);
      }
      
    } catch (error) {
      console.error("Error fetching market indices:", error);
      res.json([
        { 
          symbol: "NIFTY50", 
          name: "Nifty 50", 
          value: 25013.15, 
          change: 75.45, 
          changePercent: 0.30,
          lastUpdated: new Date()
        }
      ]);
    }
  });

  // Indian Stock Data API - Enhanced with stock-market-india library 
  app.get("/api/indian-stocks/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      
      const quoteInfo = await stockMarket.getNSEQuoteInfo(symbol.toUpperCase());
      
      // Format the data from our fallback system which always returns data
      const formattedData = {
        symbol: symbol.toUpperCase(),
        companyName: quoteInfo.companyName || `${symbol} Limited`,
        currentPrice: parseFloat(quoteInfo.lastPrice) || 1000.00,
        change: parseFloat(quoteInfo.change) || 0.00,
        changePercent: parseFloat(quoteInfo.pChange) || 0.00,
        dayHigh: parseFloat(quoteInfo.dayHigh) || 1010.00,
        dayLow: parseFloat(quoteInfo.dayLow) || 990.00,
        volume: parseInt(quoteInfo.volume) || 100000,
        marketCap: quoteInfo.marketCap || 50000000000,
        timestamp: new Date().toISOString()
      };
      
      res.json(formattedData);
      
    } catch (error) {
      console.error("Error fetching Indian stock data:", error);
      // Even if there's an error, provide fallback data
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      const fallbackData = stockMarket.getFallbackStockData(req.params.symbol);
      
      res.json({
        symbol: req.params.symbol.toUpperCase(),
        companyName: fallbackData.companyName,
        currentPrice: fallbackData.lastPrice,
        change: fallbackData.change,
        changePercent: fallbackData.pChange,
        dayHigh: fallbackData.dayHigh,
        dayLow: fallbackData.dayLow,
        volume: fallbackData.volume,
        marketCap: fallbackData.marketCap,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Top Indian Stocks API - Enhanced with stock-market-india library
  app.get("/api/top-indian-stocks", async (req, res) => {
    try {
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      
      const topStocks = await stockMarket.getTopStocks();
      
      if (topStocks.success && topStocks.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedStocks = topStocks.data.map((stock: any) => ({
          symbol: stock.symbol || 'UNKNOWN',
          companyName: stock.companyName || `${stock.symbol} Limited`,
          currentPrice: parseFloat(stock.lastPrice) || 1000.00,
          change: parseFloat(stock.change) || 0.00,
          changePercent: parseFloat(stock.pChange) || 0.00,
          volume: parseInt(stock.volume) || 100000,
          timestamp: new Date().toISOString()
        }));
        
        res.json({ stocks: formattedStocks });
      } else {
        res.status(500).json({ error: "No data received" });
      }
      
    } catch (error) {
      console.error("Error fetching top Indian stocks:", error);
      res.status(500).json({ message: "Failed to fetch stock data" });
    }
  });

  // NSE Gainers API
  app.get("/api/nse/gainers", async (req, res) => {
    try {
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      
      const gainers = await stockMarket.getNSEGainers();
      res.json({ gainers: gainers || [] });
      
    } catch (error) {
      console.error("Error fetching NSE gainers:", error);
      // Return fallback gainers data
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      const fallbackGainers = stockMarket.getFallbackGainers();
      res.json({ gainers: fallbackGainers });
    }
  });

  // NSE Losers API
  app.get("/api/nse/losers", async (req, res) => {
    try {
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      
      const losers = await stockMarket.getNSELosers();
      res.json({ losers: losers || [] });
      
    } catch (error) {
      console.error("Error fetching NSE losers:", error);
      // Return fallback losers data
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      const fallbackLosers = stockMarket.getFallbackLosers();
      res.json({ losers: fallbackLosers });
    }
  });

  // Market Status API
  app.get("/api/market-status", async (req, res) => {
    try {
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      
      const status = await stockMarket.getMarketStatus();
      res.json(status);
      
    } catch (error) {
      console.error("Error fetching market status:", error);
      res.status(500).json({ message: "Failed to fetch market status" });
    }
  });

  // Multiple Quote Info API
  app.get("/api/nse/multiple-quotes", async (req, res) => {
    try {
      const { symbols } = req.query;
      if (!symbols) {
        return res.status(400).json({ error: "symbols parameter is required" });
      }
      
      const { default: StockMarketIndia } = await import('./stockMarketIndia.js');
      const stockMarket = new StockMarketIndia();
      
      const quotes = await stockMarket.getMultipleQuoteInfo(symbols);
      res.json({ quotes: quotes || [] });
      
    } catch (error) {
      console.error("Error fetching multiple quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes data" });
    }
  });

  // Server-side cache for news data
  let marketNewsCache: { news: any[], timestamp: number } | null = null;
  let taxNewsCache: { news: any[], timestamp: number } | null = null;
  const NEWS_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
  
  // Gold/Silver prices cache - 8 hours refresh (100 API calls/month limit)
  // 3 updates per day × 30 days = 90 API calls/month (under 100 limit)
  let metalPricesCache: {
    data: {
      gold24k: number;
      gold22k: number;
      silver: number;
      currency: string;
      lastUpdated: string;
      nextUpdateAt: string;
      source: string;
    };
    timestamp: number;
  } | null = null;
  const METAL_CACHE_DURATION = 8 * 60 * 60 * 1000; // 8 hours

  // Fallback prices (updated November 2025) - used when API fails or during initial load
  const FALLBACK_METAL_PRICES = {
    gold24k: 7850, // per gram in INR
    gold22k: 7200, // per gram in INR
    silver: 95, // per gram in INR
    currency: 'INR',
    lastUpdated: new Date().toISOString(),
    nextUpdateAt: new Date(Date.now() + METAL_CACHE_DURATION).toISOString(),
    source: 'Fallback Data (Updated Nov 2025)'
  };

  // Market News API - Using NewsData.io with caching and resilience
  app.get("/api/market-news", async (req, res) => {
    try {
      const API_KEY = process.env.NEWSDATA_API_KEY;
      
      if (!API_KEY) {
        console.warn("NEWSDATA_API_KEY not configured, using fallback");
        throw new Error("API key not configured");
      }

      // Return cached data if still fresh
      if (marketNewsCache && Date.now() - marketNewsCache.timestamp < NEWS_CACHE_DURATION) {
        return res.json({ news: marketNewsCache.news, cached: true });
      }

      // Fetch Indian business/finance news from newsdata.io
      const query = "stock market OR nifty OR sensex OR BSE OR NSE OR shares OR equity";
      const url = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&q=${encodeURIComponent(query)}&country=in&language=en&category=business`;
      
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        console.warn("NewsData.io rate limit hit, using cached data");
        if (marketNewsCache) {
          return res.json({ news: marketNewsCache.news, cached: true, rateLimited: true });
        }
        throw new Error("Rate limit exceeded and no cache available");
      }
      
      if (!response.ok) {
        console.error(`NewsData.io API error: ${response.status}`);
        if (marketNewsCache) {
          return res.json({ news: marketNewsCache.news, cached: true });
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== "success") {
        console.error("NewsData.io error:", data.message);
        if (marketNewsCache) {
          return res.json({ news: marketNewsCache.news, cached: true });
        }
        throw new Error(data.message || "Failed to fetch news");
      }
      
      const formattedNews = data.results?.slice(0, 10).map((item: any) => ({
        title: item.title || "Market Update",
        link: item.link || "#",
        source: item.source_id || item.source_name || "News Source",
        date: item.pubDate ? new Date(item.pubDate).toLocaleDateString() : new Date().toLocaleDateString(),
        snippet: item.description || item.content?.substring(0, 150) || "",
        thumbnail: item.image_url || null // Explicitly null instead of undefined
      })) || [];

      // Update cache with successful response
      marketNewsCache = {
        news: formattedNews,
        timestamp: Date.now()
      };

      res.json({ news: formattedNews });
    } catch (error) {
      console.error("Error fetching market news:", error);
      
      // Return cached data if available
      if (marketNewsCache) {
        return res.json({ news: marketNewsCache.news, cached: true, error: true });
      }
      
      // Ultimate fallback with static data
      res.json({
        news: [
          {
            title: "Nifty 50 Shows Strong Performance Amid Market Rally",
            link: "#",
            source: "Market News",
            date: new Date().toLocaleDateString(),
            snippet: "The Nifty 50 index continues to show resilience with steady gains across sectors.",
            thumbnail: null
          },
          {
            title: "Banking Sector Leads Market Gains Today",
            link: "#",
            source: "Financial Express",
            date: new Date().toLocaleDateString(),
            snippet: "Major banking stocks are driving the market higher with strong quarterly results.",
            thumbnail: null
          },
          {
            title: "IT Stocks Show Mixed Performance",
            link: "#",
            source: "Economic Times",
            date: new Date().toLocaleDateString(),
            snippet: "Technology sector shows varied performance as global trends impact Indian IT companies.",
            thumbnail: null
          }
        ],
        fallback: true
      });
    }
  });

  // Tax News API - Using NewsData.io with caching and resilience
  app.get("/api/tax-news", async (req, res) => {
    try {
      const API_KEY = process.env.NEWSDATA_API_KEY;
      
      if (!API_KEY) {
        console.warn("NEWSDATA_API_KEY not configured, using fallback");
        throw new Error("API key not configured");
      }

      // Return cached data if still fresh (4 hours for tax news)
      const TAX_NEWS_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
      if (taxNewsCache && Date.now() - taxNewsCache.timestamp < TAX_NEWS_CACHE_DURATION) {
        return res.json({ news: taxNewsCache.news, cached: true });
      }

      // Fetch Indian tax & policy news from newsdata.io
      const query = "income tax OR GST OR tax policy OR finance ministry OR ITR OR taxation OR CBDT";
      const url = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&q=${encodeURIComponent(query)}&country=in&language=en&category=business,politics`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        console.warn("NewsData.io rate limit hit for tax news, using cached data");
        if (taxNewsCache) {
          return res.json({ news: taxNewsCache.news, cached: true, rateLimited: true });
        }
        throw new Error("Rate limit exceeded and no cache available");
      }
      
      if (!response.ok) {
        console.error(`NewsData.io API error for tax news: ${response.status}`);
        if (taxNewsCache) {
          return res.json({ news: taxNewsCache.news, cached: true });
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== "success") {
        console.error("NewsData.io error for tax news:", data.message);
        if (taxNewsCache) {
          return res.json({ news: taxNewsCache.news, cached: true });
        }
        throw new Error(data.message || "Failed to fetch news");
      }
      
      // Second line of defence on relevance. newsdata's `country=in` filters by
      // PUBLISHER, not story subject, so an Indian outlet's wire copy about
      // Nasdaq, NVIDIA or the Toronto exchange still matches the query. This
      // feed sits on the homepage directly under a "CA-reviewed" trust badge,
      // where one Canadian mining headline costs more credibility than four
      // relevant ones earn — so drop anything with no Indian tax/policy term in
      // its title or snippet rather than padding the row.
      const TAX_TERMS = /\b(income[- ]tax|tax(es|ation|payer|payers)?|ITR|CBDT|GST|TDS|TCS|capital gains|deduction|exemption|rebate|surcharge|cess|budget|finance ministry|finance act|filing|refund|assessee|assessment year|80C|87A|slab)\b/i;
      const isRelevant = (item: any) =>
        TAX_TERMS.test(`${item.title ?? ""} ${item.description ?? ""}`);

      const relevant = (data.results ?? []).filter(isRelevant);
      const dropped = (data.results?.length ?? 0) - relevant.length;
      if (dropped > 0) {
        console.log(`[tax-news] Filtered out ${dropped} off-topic item(s) of ${data.results?.length}`);
      }

      const formattedNews = relevant.slice(0, 10).map((item: any) => ({
        title: item.title || "Tax Update",
        link: item.link || "#",
        source: item.source_id || item.source_name || "Tax News",
        date: item.pubDate ? new Date(item.pubDate).toLocaleDateString() : new Date().toLocaleDateString(),
        snippet: item.description || item.content?.substring(0, 150) || "",
        thumbnail: item.image_url || null // Explicitly null instead of undefined
      }));

      // Update cache with successful response
      taxNewsCache = {
        news: formattedNews,
        timestamp: Date.now()
      };

      res.json({ news: formattedNews });
    } catch (error) {
      console.error("Error fetching tax news:", error);
      
      // Return cached data if available
      if (taxNewsCache) {
        return res.json({ news: taxNewsCache.news, cached: true, error: true });
      }
      
      // Ultimate fallback with static data
      res.json({
        news: [
          {
            title: "New Income Tax Slabs for FY 2025-26 Announced",
            link: "#",
            source: "Tax Today",
            date: new Date().toLocaleDateString(),
            snippet: "Finance Ministry announces updated tax slabs with enhanced rebate limits under new regime.",
            thumbnail: null
          },
          {
            title: "GST Council Meets to Discuss Rate Rationalization",
            link: "#",
            source: "Business Standard",
            date: new Date().toLocaleDateString(),
            snippet: "GST Council considers changes to tax rates on various goods and services.",
            thumbnail: null
          },
          {
            title: "Crypto Tax Compliance Guidelines Updated",
            link: "#",
            source: "Mint",
            date: new Date().toLocaleDateString(),
            snippet: "CBDT issues fresh guidelines for cryptocurrency taxation under Section 115BBH.",
            thumbnail: null
          }
        ],
        fallback: true
      });
    }
  });

  // Gold/Silver Prices API - GoldAPI.io with 8-hour cache
  // Shared cache across all users - no per-user API calls
  app.get("/api/metal-prices", async (req, res) => {
    try {
      const now = Date.now();
      
      // Return cached data if still fresh (8 hours)
      if (metalPricesCache && now - metalPricesCache.timestamp < METAL_CACHE_DURATION) {
        console.log("Returning cached metal prices - next update at:", metalPricesCache.data.nextUpdateAt);
        return res.json({ ...metalPricesCache.data, cached: true });
      }

      const API_KEY = process.env.GOLDAPI_KEY;
      
      if (!API_KEY) {
        console.warn("GOLDAPI_KEY not configured, using fallback prices");
        throw new Error("API key not configured");
      }

      console.log("Fetching fresh gold/silver prices from GoldAPI.io");
      
      // Fetch gold price in USD (XAU = gold)
      const goldResponse = await fetch('https://www.goldapi.io/api/XAU/INR', {
        headers: {
          'x-access-token': API_KEY,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      if (!goldResponse.ok) {
        throw new Error(`GoldAPI error: ${goldResponse.status}`);
      }

      const goldData = await goldResponse.json();
      
      // Gold price from API is per troy ounce, convert to per gram
      // 1 troy ounce = 31.1035 grams
      const goldPricePerOunce = goldData.price || 0;
      const goldPricePerGram = goldPricePerOunce / 31.1035;
      
      // Calculate 22K gold price (22/24 purity)
      const gold24kPerGram = Math.round(goldPricePerGram);
      const gold22kPerGram = Math.round(goldPricePerGram * (22 / 24));
      
      // Fetch silver price (XAG = silver)
      const silverResponse = await fetch('https://www.goldapi.io/api/XAG/INR', {
        headers: {
          'x-access-token': API_KEY,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      let silverPricePerGram = 95; // fallback
      if (silverResponse.ok) {
        const silverData = await silverResponse.json();
        const silverPricePerOunce = silverData.price || 0;
        silverPricePerGram = Math.round(silverPricePerOunce / 31.1035);
      }

      const nextUpdateTime = new Date(now + METAL_CACHE_DURATION);
      
      const metalPricesData = {
        gold24k: gold24kPerGram,
        gold22k: gold22kPerGram,
        silver: silverPricePerGram,
        currency: 'INR',
        lastUpdated: new Date().toISOString(),
        nextUpdateAt: nextUpdateTime.toISOString(),
        source: 'GoldAPI.io'
      };

      // Update cache
      metalPricesCache = {
        data: metalPricesData,
        timestamp: now
      };
      
      console.log(`Metal prices cached - Gold 24K: ₹${gold24kPerGram}/g, Gold 22K: ₹${gold22kPerGram}/g, Silver: ₹${silverPricePerGram}/g`);
      console.log(`Next update scheduled at: ${nextUpdateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      
      res.json(metalPricesData);
      
    } catch (error) {
      console.error("Error fetching metal prices:", error);
      
      // Return cached data if available (even if expired)
      if (metalPricesCache) {
        console.log("GoldAPI failed, returning cached metal prices");
        return res.json({ 
          ...metalPricesCache.data, 
          cached: true, 
          cacheExpired: Date.now() - metalPricesCache.timestamp > METAL_CACHE_DURATION 
        });
      }
      
      // Use fallback prices
      console.log("Using fallback metal prices");
      const nextUpdateTime = new Date(Date.now() + METAL_CACHE_DURATION);
      const fallbackData = {
        ...FALLBACK_METAL_PRICES,
        lastUpdated: new Date().toISOString(),
        nextUpdateAt: nextUpdateTime.toISOString()
      };
      
      metalPricesCache = {
        data: fallbackData,
        timestamp: Date.now()
      };
      
      res.json(fallbackData);
    }
  });

  // Legacy endpoint for backward compatibility - redirects to metal-prices
  app.get("/api/commodities", async (req, res) => {
    res.redirect(301, '/api/metal-prices');
  });

  // ==========================================
  // PERSONAL DASHBOARD STATS
  // ==========================================
  //
  // The personal dashboard used to render its headline cards from
  // /api/accounting/dashboard/stats. That endpoint belongs to the accounting
  // module: it walks firms → invoices → clients → revenue, so a user who
  // isn't running a CA practice saw 0 / 0 / ₹0 forever. Worse, its
  // `taxCalculations` figure counted the `taxProfiles` collection, and
  // nothing in this codebase has ever called createTaxProfile() — so that
  // card read 0 even for users with hundreds of calculations sitting in
  // `toolUsage` directly below it on the same screen.
  //
  // This endpoint reads the collections that are actually written to:
  //   toolUsage             — one doc per calculator run (useTrackToolUse)
  //   taxCalculationHistory — explicit "Save Calculation" from the tax tool
  //   savedResults          — one "last result" card per tool
  // Accounting figures are still returned, but as a nested object that is
  // null when the user has no firms, so the client can omit that row rather
  // than render a wall of zeroes.
  app.get("/api/dashboard/stats", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    try {
      const db = getFirestore();

      const [usageSnap, savedCalcs, savedResultsSnap, firms] = await Promise.all([
        db.collection(COLLECTIONS.TOOL_USAGE).where("userId", "==", userId).limit(1000).get(),
        storage.getTaxCalculationHistory(userId).catch((e) => {
          console.error(`[Dashboard] taxCalculationHistory failed for ${userId} — requestId=${(req as any).requestId}`, e);
          return [];
        }),
        db.collection("savedResults").where("userId", "==", userId).get(),
        storage.getFirms(userId).catch((e) => {
          console.error(`[Dashboard] getFirms failed for ${userId} — requestId=${(req as any).requestId}`, e);
          return [];
        }),
      ]);

      // Distinct tools + distinct active days, derived from the same scan.
      const tools = new Set<string>();
      const days = new Set<string>();
      let lastActivityAt: string | null = null;

      usageSnap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.tool) tools.add(String(data.tool));
        const raw = data.createdAt;
        const dt = raw?.toDate ? raw.toDate() : new Date(raw);
        if (!isNaN(dt.getTime())) {
          days.add(dt.toISOString().slice(0, 10));
          const iso = dt.toISOString();
          if (!lastActivityAt || iso > lastActivityAt) lastActivityAt = iso;
        }
      });

      // Accounting block — only computed when the user actually has firms, so
      // the common case costs zero extra Firestore reads.
      let accounting: Record<string, any> | null = null;
      if (firms.length > 0) {
        const firmIds = firms.map((f) => f.id);
        const [invoiceArrays, clientArrays] = await Promise.all([
          Promise.all(firmIds.map((id) => storage.getInvoices(id))),
          Promise.all(firmIds.map((id) => storage.getClients(id))),
        ]);
        const allInvoices = invoiceArrays.flat();
        let totalRevenue = 0;
        let paidInvoices = 0;
        for (const inv of allInvoices) {
          totalRevenue += parseFloat((inv.grandTotal as string) || "0");
          if (inv.paymentStatus === "paid") paidInvoices++;
        }
        accounting = {
          firmsCount: firms.length,
          invoicesCount: allInvoices.length,
          clientsCount: clientArrays.flat().length,
          totalRevenue: totalRevenue.toFixed(2),
          paidInvoices,
          unpaidInvoices: allInvoices.length - paidInvoices,
        };
      }

      res.json({
        calculationsRun: usageSnap.size,
        toolsUsed: tools.size,
        savedCalculations: savedCalcs.length,
        savedResults: savedResultsSnap.size,
        activeDays: days.size,
        lastActivityAt,
        accounting,
      });
    } catch (error) {
      console.error(`Error building dashboard stats for ${userId}:`, error);
      res.status(500).json({ error: "Failed to load dashboard statistics" });
    }
  });

  // ==========================================
  // TAX CALCULATION HISTORY ENDPOINTS
  // ==========================================

  // Get user's tax calculation history
  app.get("/api/tax-calculations", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const calculations = await storage.getTaxCalculationHistory(req.userId!);
      res.json(calculations);
    } catch (error) {
      console.error("Error getting tax calculations:", error);
      res.status(500).json({ error: "Failed to get tax calculations" });
    }
  });

  // Get single tax calculation by ID — IDOR-guarded (returns 404 instead of
  // 403 on a mismatch so the endpoint doesn't leak existence of others' rows).
  app.get("/api/tax-calculations/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const calculation = await storage.getTaxCalculationById(req.params.id);
      if (!calculation || calculation.userId !== req.userId) {
        return res.status(404).json({ error: "Calculation not found" });
      }
      res.json(calculation);
    } catch (error) {
      console.error("Error getting tax calculation:", error);
      res.status(500).json({ error: "Failed to get tax calculation" });
    }
  });

  // Save a new tax calculation — userId always overridden from the token.
  app.post("/api/tax-calculations", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Spread FIRST, then overwrite — a malicious client sending `userId`
      // in the body cannot smuggle another user's id past us.
      const calculationData = {
        ...req.body,
        userId: req.userId!,
        expiresAt: thirtyDaysFromNow,
      };

      const calculation = await storage.createTaxCalculation(calculationData);
      res.status(201).json(calculation);
    } catch (error) {
      console.error("Error saving tax calculation:", error);
      res.status(500).json({ error: "Failed to save tax calculation" });
    }
  });

  // Delete a tax calculation — IDOR-guarded via ownership re-check.
  app.delete("/api/tax-calculations/:id", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const calculation = await storage.getTaxCalculationById(req.params.id);
      if (!calculation || calculation.userId !== req.userId) {
        return res.status(404).json({ error: "Calculation not found" });
      }

      await storage.deleteTaxCalculation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tax calculation:", error);
      res.status(500).json({ error: "Failed to delete tax calculation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async function to process PDF documents using pdfplumber + Gemini AI
async function processDocumentAsync(documentId: string, filePath: string, documentType: string, unusedParam?: string) {
  try {
    console.log(`Starting PDF document processing for ${documentId} (pdfplumber + Gemini)`);
    
    // Update status to processing
    await storage.updateTaxDocument(documentId, { processingStatus: 'processing' });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      await storage.updateTaxDocument(documentId, { 
        processingStatus: 'error',
        errorMessage: 'Uploaded file not found on server'
      });
      return;
    }

    // Call Python processor (pdfplumber extraction + Gemini structuring).
    // SECURITY: Pass only the specific env vars the script needs.
    // Never spread process.env — that would expose Firebase service account,
    // Adobe credentials, Brevo keys, and all other secrets to the subprocess.
    const { spawn } = await import('child_process');

    const pythonEnv: Record<string, string> = {
      // Required for Python itself to locate libraries and temp dirs
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      TMPDIR: process.env.TMPDIR ?? "/tmp",
      // Only secret the script actually reads (for Gemini AI extraction)
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ?? "",
    };

    const result = await new Promise<any>((resolve, reject) => {
      const python = spawn('python3', ['server/pdfProcessor.py', filePath, documentType], {
        env: pythonEnv,
        timeout: 120000 // 2 minute timeout
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      python.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      python.on('close', (code: number) => {
        if (stderr) {
          console.log(`[pdfProcessor stderr] ${stderr}`);
        }
        if (code !== 0 && !stdout) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout.substring(0, 200)}`));
        }
      });

      python.on('error', (err: Error) => {
        reject(new Error(`Failed to start Python processor: ${err.message}`));
      });
    });

    if (result.success && result.data) {
      await storage.updateTaxDocument(documentId, {
        processingStatus: 'completed',
        isProcessed: true,
        extractedData: JSON.stringify({
          unifiedData: result.data,
          processingMethod: result.processingMethod,
          extractedText: result.extractedText?.substring(0, 1000)
        })
      });
      console.log(`✅ Document ${documentId} processed via ${result.processingMethod}`);
    } else {
      await storage.updateTaxDocument(documentId, {
        processingStatus: 'error',
        errorMessage: result.error || 'PDF processing failed'
      });
      console.error(`❌ Document ${documentId} processing failed: ${result.error}`);
    }

  } catch (error) {
    console.error("Document processing error:", error);
    await storage.updateTaxDocument(documentId, {
      processingStatus: 'error',
      errorMessage: String(error)
    });
  }
}

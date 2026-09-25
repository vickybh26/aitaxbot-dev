import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMutualFundSchema, insertMarketDataSchema, insertNewsArticleSchema, insertIPODataSchema, contactInquirySchema } from "@shared/schema";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import accountingRoutes from "./accountingRoutes";
import adminRoutes from "./adminRoutes";
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
import { escapeHtml, verifyUnsubToken, sendWelcomeEmail, sendEmail, SENDERS } from "./emailService";
import { seedTaxRates, getTaxSlabsForCalculation } from "./seedTaxRates";
import { generateTaxComputationPDF, savePDFToStorage, generateRentReceiptPDF, type TaxComputationData, type RentReceiptData } from "./pdfGenerator";
import { geminiTaxService, type TaxAdviceInput } from "./geminiTaxService";
import { runProductionShadowComparison } from "./ragService";
import { authenticateFirebaseToken, appCheckGuard, type AuthenticatedRequest } from "./middleware/auth.js";

// ─────────────────────────────────────────────────────────────────────
// Security helpers
// ─────────────────────────────────────────────────────────────────────

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
      if (!uid || !token || !verifyUnsubToken(uid, token, "digest")) {
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
        return res.type("html").send(page("You're unsubscribed", "You will not receive the weekly digest email from AiTaxBot.", true));
      }

      await ref.update({ digestOptOut: true, digestOptOutAt: new Date() });
      return res.type("html").send(
        page("You're unsubscribed", "You will not receive the weekly digest email. This does not affect your account, and you'll still get essential mail such as calculator results and password resets.", true)
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

  // ─────────────────────────────────────────────────────────────────────
  // MARKET DATA, NEWS AND MISC ROUTES — REMOVED 2026-09-25
  //
  // 22 handlers: market-data, NSE quotes/gainers/losers, commodities, metal
  // prices, mutual funds, IPO data, news, tax-news, Finnhub, the Adobe test
  // route, calculations-count, profile/logs and dashboard-insights.
  //
  // Nothing called any of them. The client service that once did
  // (client/src/services/financialAPI.ts) was itself unimported AND pointed at
  // /api/external/mutual-funds, which never matched the route defined here.
  //
  // NOT removed for the same reason, because "no client caller" does not mean
  // unused: /api/email/unsubscribe is opened from links in sent mail
  // (emailService.ts builds the URL), and the WhatsApp webhook is called by
  // Meta. Check who calls a route before trusting a client-side grep.
  // ─────────────────────────────────────────────────────────────────────



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

      const { user, isNewUser } = await storage.upsertUser({
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

      if (isNewUser) {
        // Fire-and-forget — a slow or failed welcome email must never delay
        // or break the sync response a fresh signup is waiting on.
        sendWelcomeEmail(user).catch((err) => console.error("[Email] Welcome email failed:", err));
      }

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

      // ── Send emails ────────────────────────────────────────────────────────
      try {
        if (!process.env.SMTP_PASSWORD) {
          console.warn('⚠️ SMTP_PASSWORD not set — contact saved to Firestore only. Add it in Railway to enable emails.');
        } else {
          // Goes through emailService.sendEmail() rather than talking to the
          // provider directly — that is the only place the transport is
          // named, which is what made the 2026-09-07 Brevo→ZeptoMail swap a
          // one-file change everywhere except right here.
          const senderEmail = SENDERS.transactional.email;
          const senderName  = SENDERS.transactional.name;
          const adminEmail  = process.env.MAIL_ADMIN_EMAIL || process.env.BREVO_ADMIN_EMAIL || senderEmail; // where YOU receive alerts
          const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

          // ── 1. Admin notification ────────────────────────────────────────
          await sendEmail({
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
          await sendEmail({
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
                      While you wait, you can explore our free tax calculators at <a href="https://aitaxbot.in" style="color:#1d4ed8">aitaxbot.in</a> — free to use, with a quick sign-in to see your result.
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

      // 3. Send the receipt
      if (!process.env.SMTP_PASSWORD) {
        console.warn("⚠️ SMTP_PASSWORD not set — email not sent");
        return res.json({ success: true, userExists, emailSent: false, message: "PDF generated but email not sent (SMTP_PASSWORD missing)" });
      }

      const senderEmail = SENDERS.transactional.email;
      const senderName  = SENDERS.transactional.name;

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

      await sendEmail({
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
  // TAX DOCUMENT UPLOAD — REMOVED 2026-09-25
  //
  // Five endpoints (/api/tax-documents/upload, /:id/status, the list route,
  // /api/firebase/cleanup and /cleanup-session) plus processDocumentAsync()
  // and its server/pdfProcessor.py child process used to live here.
  //
  // Nothing in the client called any of them — `grep -rn "tax-documents"
  // client/` returned nothing — but they were live authenticated routes that
  // wrote taxpayer PDFs to disk and stored a 1,000-character text excerpt in
  // Firestore. That directly contradicted the privacy policy's promise that
  // AIS / 26AS / Form 16 documents are never written to disk or the database.
  //
  // The `expiresAt` they recorded was decorative: it was written and never
  // read, so the files were permanent. /api/firebase/cleanup reported a
  // `deletedCount` it never computed.
  //
  // The reconciliation tool people actually use is unaffected — it lives in
  // server/taxReconcileRoutes.ts, uses multer.memoryStorage(), and writes
  // nothing to disk or Firestore. Verified 0 records in taxDocuments and
  // extractedTaxData before removal, so nothing was orphaned.
  //
  // If document persistence is ever wanted, it needs a retention design and a
  // matching privacy notice FIRST — not an endpoint with a timestamp nobody
  // acts on.
  // ─────────────────────────────────────────────────────────────────────










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


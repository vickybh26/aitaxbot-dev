import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMutualFundSchema, insertMarketDataSchema, insertNewsArticleSchema, insertIPODataSchema, insertTaxDocumentSchema, insertExtractedTaxDataSchema, contactInquirySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import accountingRoutes from "./accountingRoutes";
import adminRoutes from "./adminRoutes";
import { getFirestore, verifyFirebaseToken, admin } from "./firebase";
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import { seedTaxRates, getTaxSlabsForCalculation } from "./seedTaxRates";
import { generateTaxComputationPDF, savePDFToStorage, generateRentReceiptPDF, type TaxComputationData, type RentReceiptData } from "./pdfGenerator";
import { geminiTaxService, type TaxAdviceInput } from "./geminiTaxService";

// Configure multer for Firebase Storage uploads (store in memory)
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
  
  // Mock authentication middleware for accounting module (sets req.user for legacy routes)
  app.use((req: any, res, next) => {
    // For now, set a mock user for all requests
    // This allows the accounting module to work without full auth setup
    if (!req.user) {
      req.user = {
        id: 'default-user-id',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User'
      };
    }
    next();
  });
  
  // Mount accounting routes
  app.use("/api/accounting", accountingRoutes);

  // Mount admin routes
  app.use("/api/admin", adminRoutes);
  
  
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
  app.post("/api/tax-computation/save-pdf", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }
      
      const computationData: TaxComputationData = req.body;
      
      if (!computationData.personalInfo || !computationData.taxBreakdown) {
        return res.status(400).json({ error: "Missing required computation data" });
      }
      
      computationData.computationDate = new Date();
      
      const pdfBuffer = await generateTaxComputationPDF(computationData);
      const objectPath = await savePDFToStorage(pdfBuffer, decodedToken.uid);
      
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
  app.post("/api/ai/tax-advice", async (req, res) => {
    try {
      const input: TaxAdviceInput = req.body;
      if (!input || typeof input.totalIncome !== 'number') {
        return res.status(400).json({ error: "Invalid input" });
      }
      const advice = await geminiTaxService.getTaxAdvice(input);
      res.json(advice);

      // Fire-and-forget: increment calculation counter in Firestore
      try {
        const db = getFirestore();
        await db.collection('counters').doc('taxCalculations').set(
          { count: admin.firestore.FieldValue.increment(1), updatedAt: new Date() },
          { merge: true }
        );
      } catch (counterErr) {
        // Non-critical — don't fail the main request
        console.warn('[Stats] Failed to increment calculation counter:', counterErr);
      }
    } catch (error) {
      console.error("Error getting AI tax advice:", error);
      res.status(500).json({ error: "Failed to generate tax advice" });
    }
  });

  // GET /api/stats/calculations-count — public, returns how many tax calculations have been done
  app.get("/api/stats/calculations-count", async (req, res) => {
    try {
      const db = getFirestore();
      const doc = await db.collection('counters').doc('taxCalculations').get();
      const count = doc.exists ? (doc.data()?.count ?? 0) : 0;
      res.json({ count });
    } catch (error) {
      console.error("[Stats] Error fetching calculation count:", error);
      res.json({ count: 0 }); // Fail silently — don't break the landing page
    }
  });

  // POST /api/ai/dashboard-insights — Short AI insights for the dashboard
  app.post("/api/ai/dashboard-insights", async (req, res) => {
    try {
      const insights = await geminiTaxService.getDashboardInsights(req.body);
      res.json({ insights });
    } catch (error) {
      console.error("Error getting dashboard insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // ==========================================
  // USER PROFILE API
  // ==========================================

  // Sync user on login — creates or updates user record from Firebase token
  app.post("/api/user/sync", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.split(' ')[1];
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
  app.get("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }
      
      const user = await storage.getUser(decodedToken.uid);
      if (!user) {
        // User not in Firestore yet (race condition on first login) —
        // return a minimal profile built from the Firebase Auth token
        const nameParts = (decodedToken.name || "").split(" ");
        return res.json({
          id: decodedToken.uid,
          email: decodedToken.email || "",
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          profileImageUrl: decodedToken.picture || null,
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
  app.put("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }
      
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

      const updatedUser = await storage.updateUser(decodedToken.uid, profileUpdate as any);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });
  
  // Get user profile change logs
  app.get("/api/user/profile/logs", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }
      
      const logs = await storage.getProfileLogs(decodedToken.uid);
      res.json(logs);
    } catch (error) {
      console.error("Error getting profile logs:", error);
      res.status(500).json({ error: "Failed to get profile logs" });
    }
  });
  
  // Contact Form API - Save to Firebase Firestore
  app.post("/api/contact", async (req, res) => {
    try {
      const validation = contactInquirySchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validation.error.errors 
        });
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
                    <tr><td style="padding:6px 0;font-weight:bold;width:100px;color:#64748b;font-size:13px">Name</td><td style="padding:6px 0;font-size:14px">${name}</td></tr>
                    <tr><td style="padding:6px 0;font-weight:bold;color:#64748b;font-size:13px">Email</td><td style="padding:6px 0;font-size:14px"><a href="mailto:${email}" style="color:#2563eb">${email}</a></td></tr>
                    ${subject ? `<tr><td style="padding:6px 0;font-weight:bold;color:#64748b;font-size:13px">Subject</td><td style="padding:6px 0;font-size:14px">${subject}</td></tr>` : ''}
                    <tr><td style="padding:6px 0;font-weight:bold;color:#64748b;font-size:13px">Time</td><td style="padding:6px 0;font-size:14px">${submittedAt} IST</td></tr>
                    <tr><td style="padding:6px 0;font-weight:bold;color:#64748b;font-size:13px">Ref ID</td><td style="padding:6px 0;font-size:13px;color:#94a3b8">${docRef.id}</td></tr>
                  </table>
                  <div style="margin-top:16px">
                    <p style="font-weight:bold;color:#64748b;font-size:13px;margin:0 0 6px">Message</p>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:14px;line-height:1.6;white-space:pre-wrap">${message}</div>
                  </div>
                  <div style="margin-top:16px;text-align:center">
                    <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Your AiTaxBot inquiry')}" style="background:#2563eb;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold">Reply to ${name}</a>
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
                  <p style="font-size:16px;margin:0 0 12px">Hi <strong>${name}</strong>,</p>
                  <p style="font-size:14px;line-height:1.6;color:#475569">
                    Thank you for reaching out! We have received your message and our team will get back to you within <strong>24 hours</strong> on business days.
                  </p>
                  ${subject ? `<p style="font-size:13px;color:#64748b">Your inquiry: <em>${subject}</em></p>` : ''}
                  <div style="background:#EFF6FF;border-left:4px solid #2563eb;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
                    <p style="margin:0;font-size:13px;color:#1d4ed8">
                      While you wait, you can explore our free tax calculators at <a href="https://aitaxbot.in" style="color:#1d4ed8">aitaxbot.in</a> — no sign-up required!
                    </p>
                  </div>
                  <p style="font-size:13px;color:#64748b;margin:16px 0 4px">If you have an urgent query, you can also reach us directly:</p>
                  <p style="font-size:13px;margin:0">📧 <a href="mailto:info@aitaxbot.in" style="color:#2563eb">info@aitaxbot.in</a> &nbsp;|&nbsp; 📞 <a href="tel:+917899869036" style="color:#2563eb">+91 78998 69036</a></p>
                  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
                  <p style="font-size:12px;color:#94a3b8;margin:0">Reference ID: ${docRef.id}</p>
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
  app.post("/api/rent-receipt/email", async (req, res) => {
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
              <p style="font-size:16px;margin:0 0 12px">Hi <strong>${name}</strong>,</p>
              <p style="font-size:14px;line-height:1.6;color:#475569">${ctaNote}</p>
              <div style="background:#EFF6FF;border-left:4px solid #2563eb;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
                <p style="margin:0 0 4px;font-size:13px;color:#1d4ed8;font-weight:bold">📄 Receipt Details</p>
                <p style="margin:0;font-size:13px;color:#1d4ed8">Period: ${periodLabel}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#1d4ed8">Property: ${receipts[0].propertyAddress}</p>
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

  // Tax Document Upload API with Firebase Storage
  app.post("/api/tax-documents/upload", upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { documentType, userId = "default-user" } = req.body;
      
      if (!documentType || !['form16', 'ais', '26as'].includes(documentType)) {
        return res.status(400).json({ error: "Invalid document type. Must be: form16, ais, or 26as" });
      }

      // Use local storage
      console.log('Using local storage for document upload');
      
      const uploadDir = 'uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileId = crypto.randomUUID();
      const localFileName = `${fileId}_${req.file.originalname}`;
      const localFilePath = path.join(uploadDir, localFileName);
      
      // Write file to local storage
      await fs.promises.writeFile(localFilePath, req.file.buffer);
      const filePath = localFilePath;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      console.log('Document uploaded to local storage successfully');

      // Create tax document record
      const taxDocument = await storage.createTaxDocument({
        userId,
        documentType,
        fileName: req.file.originalname,
        filePath: filePath,
        firebaseFileId: null,
        downloadUrl: null,
        fileSize: req.file.size,
        expiresAt: expiresAt,
        processingStatus: 'pending'
      });

      // Process PDF in background
      processDocumentAsync(taxDocument.id, filePath, documentType, null);

      res.json({
        success: true,
        documentId: taxDocument.id,
        message: "Document uploaded successfully. Processing started.",
        status: "pending"
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/tax-documents/:documentId/status", async (req, res) => {
    try {
      const document = await storage.getTaxDocument(req.params.documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const extractedData = await storage.getExtractedTaxData(document.id);
      
      res.json({
        documentId: document.id,
        status: document.processingStatus,
        isProcessed: document.isProcessed,
        errorMessage: document.errorMessage,
        extractedData: extractedData || null
      });

    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({ error: "Failed to check document status" });
    }
  });

  app.get("/api/tax-documents", async (req, res) => {
    try {
      const userId = String(req.query.userId || "default-user");
      const documents = await storage.getTaxDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Fetch documents error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Firebase Storage cleanup endpoint
  app.post("/api/firebase/cleanup", async (req, res) => {
    try {
      const { userId = 'default-user' } = req.body;
      
      let deletedCount = 0;
      try {
        console.log('No external storage cleanup needed');
        console.log(`Cleaned up ${deletedCount} expired Firebase documents for user ${userId}`);
      } catch (firebaseError) {
        console.log('Firebase cleanup failed, continuing with local cleanup:', firebaseError);
      }
      
      res.json({ 
        success: true, 
        deletedCount,
        message: `Cleaned up ${deletedCount} expired documents` 
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup documents" });
    }
  });

  // Firebase Storage session cleanup endpoint with local storage cleanup
  app.post("/api/firebase/cleanup-session", async (req, res) => {
    try {
      const { userId = 'default-user' } = req.body;
      console.log(`Starting session cleanup for user: ${userId}`);
      
      let firebaseDeletedCount = 0;
      let localDeletedCount = 0;
      
      // Clean up Firebase documents
      try {
        console.log('No external storage cleanup needed');
        console.log(`Cleaned up ${firebaseDeletedCount} Firebase documents for user session ${userId}`);
      } catch (firebaseError) {
        console.log('Firebase session cleanup failed:', firebaseError);
      }
      
      // Clean up local storage documents and database records
      let userDocuments: any[] = [];
      try {
        userDocuments = await storage.getTaxDocumentsByUserId(userId);
        
        for (const doc of userDocuments) {
          // Delete local file if it exists
          if (doc.filePath && !doc.filePath.startsWith('firebase:') && fs.existsSync(doc.filePath)) {
            try {
              await fs.promises.unlink(doc.filePath);
              localDeletedCount++;
              console.log(`Deleted local file: ${doc.filePath}`);
            } catch (fileError) {
              console.log(`Failed to delete local file ${doc.filePath}:`, fileError);
            }
          }
          
          // Remove database record
          await storage.deleteTaxDocument(doc.id);
        }
        
        console.log(`Cleaned up ${userDocuments.length} database records and ${localDeletedCount} local files for user session ${userId}`);
      } catch (localError) {
        console.log('Local storage cleanup failed:', localError);
      }
      
      const totalDeleted = firebaseDeletedCount + localDeletedCount + userDocuments.length;
      
      res.json({ 
        success: true, 
        deletedCount: totalDeleted,
        firebaseDeleted: firebaseDeletedCount,
        localDeleted: localDeletedCount,
        databaseDeleted: userDocuments.length,
        message: `Session cleanup completed. Removed ${totalDeleted} total documents` 
      });
    } catch (error) {
      console.error("Session cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup session documents" });
    }
  });

  // PDF processing pipeline status endpoint
  app.post("/api/adobe/test-access", async (req, res) => {
    try {
      const hasGemini = !!(process.env.GOOGLE_API_KEY);
      res.json({
        success: true,
        configured: true,
        geminiAvailable: hasGemini,
        message: hasGemini
          ? 'PDF processing ready: pdfplumber + Gemini AI'
          : 'PDF processing ready: pdfplumber + regex fallback (set GOOGLE_API_KEY for AI extraction)',
        processingMethod: hasGemini ? 'gemini_ai' : 'regex_fallback'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to check PDF processing configuration" });
    }
  });

  // Test document processing pipeline
  app.post("/api/test-document-processing", async (req, res) => {
    try {
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
  });

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

  // External MF API proxy to avoid CORS
  app.get("/api/external/mutual-funds", async (req, res) => {
    try {
      const response = await fetch("https://api.mfapi.in/mf");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch external mutual funds data" });
    }
  });

  app.get("/api/external/mutual-funds/:code", async (req, res) => {
    try {
      const response = await fetch(`https://api.mfapi.in/mf/${req.params.code}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mutual fund details" });
    }
  });

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
  app.get("/api/external/alpha-vantage", async (req, res) => {
    try {
      const { function: func, symbol, interval, apikey } = req.query;
      const funcParam = String(func || '');
      const symbolParam = String(symbol || '');
      const intervalParam = String(interval || '');
      const apikeyParam = String(apikey || '');
      
      if (!funcParam || !symbolParam) {
        return res.status(400).json({ error: "Function and symbol parameters are required" });
      }
      const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || apikeyParam || 'demo';
      
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
  });

  // External Finnhub API proxy
  app.get("/api/external/finnhub", async (req, res) => {
    try {
      const { endpoint, symbol } = req.query;
      const API_KEY = process.env.FINNHUB_API_KEY || 'demo';
      
      const url = `https://finnhub.io/api/v1/${String(endpoint)}?symbol=${String(symbol)}&token=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Finnhub data" });
    }
  });

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

  // External News API proxy
  app.get("/api/external/news", async (req, res) => {
    try {
      const API_KEY = process.env.NEWS_API_KEY || 'demo';
      const category = String(req.query.category || 'business');
      const country = String(req.query.country || 'in');
      
      const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch external news" });
    }
  });

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
        const formattedIndices = indices.data.slice(0, 4).map(index => ({
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
        const formattedStocks = topStocks.data.map(stock => ({
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
      
      const formattedNews = data.results?.slice(0, 10).map((item: any) => ({
        title: item.title || "Tax Update",
        link: item.link || "#",
        source: item.source_id || item.source_name || "Tax News",
        date: item.pubDate ? new Date(item.pubDate).toLocaleDateString() : new Date().toLocaleDateString(),
        snippet: item.description || item.content?.substring(0, 150) || "",
        thumbnail: item.image_url || null // Explicitly null instead of undefined
      })) || [];

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
  // TAX CALCULATION HISTORY ENDPOINTS
  // ==========================================

  // Get user's tax calculation history
  app.get("/api/tax-calculations", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(' ')[1];
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const calculations = await storage.getTaxCalculationHistory(decodedToken.uid);
      res.json(calculations);
    } catch (error) {
      console.error("Error getting tax calculations:", error);
      res.status(500).json({ error: "Failed to get tax calculations" });
    }
  });

  // Get single tax calculation by ID
  app.get("/api/tax-calculations/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(' ')[1];
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const calculation = await storage.getTaxCalculationById(req.params.id);
      if (!calculation) {
        return res.status(404).json({ error: "Calculation not found" });
      }

      if (calculation.userId !== decodedToken.uid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(calculation);
    } catch (error) {
      console.error("Error getting tax calculation:", error);
      res.status(500).json({ error: "Failed to get tax calculation" });
    }
  });

  // Save a new tax calculation
  app.post("/api/tax-calculations", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(' ')[1];
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const calculationData = {
        ...req.body,
        userId: decodedToken.uid,
        expiresAt: thirtyDaysFromNow,
      };

      const calculation = await storage.createTaxCalculation(calculationData);
      res.status(201).json(calculation);
    } catch (error) {
      console.error("Error saving tax calculation:", error);
      res.status(500).json({ error: "Failed to save tax calculation" });
    }
  });

  // Delete a tax calculation
  app.delete("/api/tax-calculations/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(' ')[1];
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const calculation = await storage.getTaxCalculationById(req.params.id);
      if (!calculation) {
        return res.status(404).json({ error: "Calculation not found" });
      }

      if (calculation.userId !== decodedToken.uid) {
        return res.status(403).json({ error: "Forbidden" });
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

    // Call Python processor (pdfplumber extraction + Gemini structuring)
    const { spawn } = await import('child_process');
    
    const result = await new Promise<any>((resolve, reject) => {
      const python = spawn('python3', ['server/pdfProcessor.py', filePath, documentType], {
        env: { ...process.env },
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

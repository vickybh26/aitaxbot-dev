/**
 * leadRoutes.ts — Lead capture from calculator pages
 *
 * POST /api/leads/capture  — save lead + send welcome email
 * GET  /api/leads/list     — admin: list all leads
 */

import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { getFirestore } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";
import { insertLeadSchema, type Lead } from "@shared/schema";

const router = Router();

async function sendBrevoEmail(params: {
  to: { email: string; name: string }[];
  subject: string;
  htmlContent: string;
}) {
  const apiInstance = new TransactionalEmailsApi();
  apiInstance.setApiKey(
    TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY!
  );
  await apiInstance.sendTransacEmail({
    sender: {
      email: process.env.BREVO_SENDER_EMAIL || "noreply@aitaxbot.co.in",
      name: "AiTaxBot",
    },
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
  });
}

// ─── POST /api/leads/capture ───────────────────────────────────────────────

router.post("/capture", async (req: Request, res: Response) => {
  try {
    const parsed = insertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;
    const db = getFirestore();
    const id = randomUUID();
    const now = new Date().toISOString();

    const WINDOW_24H = 24 * 60 * 60 * 1000;
    const WINDOW_7D  =  7 * 24 * 60 * 60 * 1000;

    // ── Duplicate check 1: email (same source, 24 h) ────────────────────────
    // NOTE: two-field .where() chain — Firestore may use a merge-join on the
    // auto single-field indexes; works for small collections without a
    // composite index. If this throws in future, move to single-field + memory filter.
    const emailSnap = await db
      .collection(COLLECTIONS.LEADS)
      .where("email", "==", data.email)
      .where("source", "==", data.source)
      .limit(1)
      .get();

    if (!emailSnap.empty) {
      const age = Date.now() - new Date((emailSnap.docs[0].data() as Lead).createdAt as string).getTime();
      if (age < WINDOW_24H) {
        return res.status(200).json({ success: true, duplicate: true });
      }
    }

    // ── Duplicate check 2: WhatsApp number (same source, 7 days) ────────────
    // Single-field equality — auto-indexed, no composite index required.
    // Filter by source + window in memory after fetch.
    if (data.whatsapp) {
      const waSnap = await db
        .collection(COLLECTIONS.LEADS)
        .where("whatsapp", "==", data.whatsapp)
        .limit(20)
        .get();

      if (!waSnap.empty) {
        const sevenDaysAgo = Date.now() - WINDOW_7D;
        const sameSourceRecent = waSnap.docs.some((doc) => {
          const d = doc.data() as Lead;
          return (
            d.source === data.source &&
            new Date(d.createdAt as string).getTime() > sevenDaysAgo
          );
        });
        if (sameSourceRecent) {
          return res.status(200).json({ success: true, duplicate: true });
        }
      }
    }
    // ── End duplicate checks ─────────────────────────────────────────────────

    const lead: Lead = { id, ...data, createdAt: now };
    await db.collection(COLLECTIONS.LEADS).doc(id).set(lead);

    // Welcome email to user
    try {
      await sendBrevoEmail({
        to: [{ email: data.email, name: data.name }],
        subject: `Your ${data.source} result — AiTaxBot`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1e293b">
            <div style="text-align:center;margin-bottom:24px">
              <img src="https://aitaxbot.co.in/logo.png" alt="AiTaxBot" style="height:40px" onerror="this.style.display='none'"/>
            </div>

            <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">
              Hi ${data.name}! 👋
            </h2>
            <p style="color:#475569;margin-top:4px">
              Here's a summary of your recent calculation on AiTaxBot.
            </p>

            ${data.summaryText ? `
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;margin:20px 0">
              <p style="font-size:13px;font-weight:600;color:#0284c7;margin:0 0 8px">📊 Your Calculation Summary</p>
              <p style="font-size:15px;color:#1e293b;margin:0;line-height:1.6">${data.summaryText}</p>
              <p style="font-size:12px;color:#64748b;margin:8px 0 0">Source: ${data.source}</p>
            </div>
            ` : ""}

            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:14px;margin:20px 0">
              <p style="font-size:13px;font-weight:700;color:#92400e;margin:0">
                ⏰ ITR Filing Deadline: <strong>July 31, 2026</strong>
              </p>
              <p style="font-size:12px;color:#78350f;margin:6px 0 0">
                Don't miss the deadline. File your ITR on time to avoid a ₹5,000 penalty.
              </p>
            </div>

            <div style="margin:20px 0">
              <p style="font-size:14px;color:#475569;margin-bottom:12px">
                Need help filing your ITR? Connect with a practicing CA through our free introduction service:
              </p>
              <a href="https://aitaxbot.co.in/find-ca"
                 style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px">
                Find a CA Near You →
              </a>
            </div>

            <div style="margin:20px 0">
              <p style="font-size:14px;color:#475569;margin-bottom:12px">Explore more free tools:</p>
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:4px 8px 4px 0">
                    <a href="https://aitaxbot.co.in/calculators/income-tax" style="color:#2563eb;font-size:13px">Income Tax Calculator</a>
                  </td>
                  <td style="padding:4px 8px">
                    <a href="https://aitaxbot.co.in/calculators/hra" style="color:#2563eb;font-size:13px">HRA Calculator</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 8px 4px 0">
                    <a href="https://aitaxbot.co.in/calculators/nps" style="color:#2563eb;font-size:13px">NPS Calculator</a>
                  </td>
                  <td style="padding:4px 8px">
                    <a href="https://aitaxbot.co.in/tools/rent-receipt" style="color:#2563eb;font-size:13px">Rent Receipt Generator</a>
                  </td>
                </tr>
              </table>
            </div>

            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:11px;color:#94a3b8;text-align:center">
              AiTaxBot · aitaxbot.co.in · Free tax tools for India<br/>
              <a href="https://aitaxbot.co.in/privacy-policy" style="color:#94a3b8">Privacy Policy</a> ·
              This email was sent because you used AiTaxBot calculators.
            </p>
          </body>
          </html>
        `,
      });
    } catch (e) {
      console.error("Lead welcome email failed:", e);
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("Lead capture error:", err);
    return res.status(500).json({ error: "Could not save. Please try again." });
  }
});

// ─── GET /api/leads/list — Admin ───────────────────────────────────────────

router.get("/list", async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTIONS.LEADS)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();
    const leads = snapshot.docs.map((d) => d.data() as Lead);
    return res.json({ leads, total: leads.length });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch leads." });
  }
});

export default router;

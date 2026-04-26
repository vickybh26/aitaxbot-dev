/**
 * whatsappRoutes.ts
 * Express router for Meta WhatsApp Cloud API webhook.
 *
 * GET  /api/webhook/whatsapp  — One-time verification by Meta during setup
 * POST /api/webhook/whatsapp  — Incoming messages (real-time). HMAC-verified.
 * GET  /api/whatsapp/leads    — View CRM leads (admin, Authorization header)
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { verifyWebhook, handleIncomingMessage } from "./botLogic";
import { getAllLeads } from "./leadsStore";

const router = Router();

/**
 * Verify Meta's X-Hub-Signature-256 header with a timing-safe compare.
 * Meta signs the exact raw JSON body with HMAC-SHA256 using the app secret.
 * Without this check, anyone who finds the webhook URL can feed the bot
 * arbitrary events, harvest leads, or trigger outbound replies.
 */
function verifyMetaSignature(req: Request): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    // Fail closed — if the secret isn't configured, don't trust the caller.
    console.error("[WhatsApp] WHATSAPP_APP_SECRET not set; refusing webhook");
    return false;
  }
  const header = req.header("x-hub-signature-256") || "";
  if (!header.startsWith("sha256=")) return false;

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    console.error("[WhatsApp] rawBody missing — check express.json verify hook");
    return false;
  }

  const expected = "sha256=" + crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Webhook verification (Meta calls this once during setup) ─────────────────
router.get("/webhook/whatsapp", (req: Request, res: Response) => {
  verifyWebhook(req, res);
});

// ── Incoming messages ────────────────────────────────────────────────────────
router.post("/webhook/whatsapp", (req: Request, res: Response) => {
  // Validate Meta's HMAC signature before doing anything with the payload.
  if (!verifyMetaSignature(req)) {
    // Return 401 so obvious forgeries show up in logs. Meta sends a valid
    // signature on every legitimate delivery, so this should never trip
    // for real traffic once WHATSAPP_APP_SECRET is configured.
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Always respond 200 immediately — Meta retries if it doesn't get a quick response
  res.sendStatus(200);
  // Process async without blocking the response
  handleIncomingMessage(req.body).catch((err) =>
    console.error("[WhatsApp] Unhandled error in message handler:", err)
  );
});

/**
 * Timing-safe comparison of two string secrets (different lengths → false
 * without leaking which side is longer).
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// ── CRM: view leads (simple admin endpoint) ───────────────────────────────────
// Previously accepted the key via query string, which leaks into access logs,
// browser history, referer headers, and analytics tools. Moved to
// Authorization: Bearer header + timing-safe compare.
router.get("/whatsapp/leads", (req: Request, res: Response) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    res.status(503).json({ error: "Admin auth not configured" });
    return;
  }
  const header = req.header("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const provided = header.substring("Bearer ".length).trim();
  if (!safeEqual(provided, adminKey)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const leads = getAllLeads();
  res.json({
    total: leads.length,
    leads,
  });
});

export default router;

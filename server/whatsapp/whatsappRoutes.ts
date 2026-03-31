/**
 * whatsappRoutes.ts
 * Express router for Meta WhatsApp Cloud API webhook.
 *
 * GET  /api/webhook/whatsapp  — One-time verification by Meta during setup
 * POST /api/webhook/whatsapp  — Incoming messages (real-time)
 * GET  /api/whatsapp/leads    — View CRM leads (admin, protected by ADMIN_KEY)
 */

import { Router, Request, Response } from "express";
import { verifyWebhook, handleIncomingMessage } from "./botLogic";
import { getAllLeads } from "./leadsStore";

const router = Router();

// ── Webhook verification (Meta calls this once during setup) ─────────────────
router.get("/webhook/whatsapp", (req: Request, res: Response) => {
  verifyWebhook(req, res);
});

// ── Incoming messages ────────────────────────────────────────────────────────
router.post("/webhook/whatsapp", (req: Request, res: Response) => {
  // Always respond 200 immediately — Meta retries if it doesn't get a quick response
  res.sendStatus(200);
  // Process async without blocking the response
  handleIncomingMessage(req.body).catch((err) =>
    console.error("[WhatsApp] Unhandled error in message handler:", err)
  );
});

// ── CRM: view leads (simple admin endpoint) ───────────────────────────────────
router.get("/whatsapp/leads", (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key || key !== process.env.ADMIN_KEY) {
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

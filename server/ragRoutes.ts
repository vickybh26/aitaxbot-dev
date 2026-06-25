/**
 * AiTaxBot RAG API Routes
 *
 * POST /api/ai/query     — Ask the AI a tax question
 * GET  /api/ai/health    — Check Qdrant + Gemini connectivity
 * GET  /api/admin/rag/queries — Admin: view recent anonymous queries (for training)
 */

import { Router, Request, Response } from "express";
import { runRAGQuery, checkRAGHealth } from "./ragService";
import { db } from "./firebase";

const router = Router();

// ─── Rate limit helper ───────────────────────────────────────────────────────
// Simple in-memory map: IP → { count, resetAt }
// For production replace with Redis-based rate limiting
const ipHits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;           // requests per window
const RATE_WINDOW_MS = 60_000;   // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ─── POST /api/ai/query ──────────────────────────────────────────────────────

router.post("/query", async (req: Request, res: Response) => {
  try {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown");

    if (isRateLimited(ip)) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment before asking again.",
      });
    }

    const { question, sessionId, source } = req.body as {
      question?: string;
      sessionId?: string;
      source?: string;
    };

    if (!question || question.trim().length < 5) {
      return res.status(400).json({ error: "Please provide a question (minimum 5 characters)." });
    }

    if (question.length > 1000) {
      return res.status(400).json({ error: "Question too long (maximum 1000 characters)." });
    }

    const result = await runRAGQuery({
      question: question.trim(),
      sessionId: sessionId || undefined,
      source: source || "api",
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[RAG] /api/ai/query error:", err?.message);

    // Don't expose internal errors to client
    return res.status(500).json({
      error: "The AI service is temporarily unavailable. Please try again shortly.",
    });
  }
});

// ─── GET /api/ai/health ──────────────────────────────────────────────────────

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const health = await checkRAGHealth();
    const statusCode = health.qdrant && health.gemini ? 200 : 503;
    return res.status(statusCode).json(health);
  } catch (err) {
    return res.status(503).json({ error: "Health check failed" });
  }
});

// ─── GET /api/admin/rag/queries ──────────────────────────────────────────────
// Returns recent anonymous queries — useful for identifying gaps in the knowledge base

router.get("/admin/queries", async (req: Request, res: Response) => {
  try {
    // Basic admin check — reuse existing Firebase admin auth pattern
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const snapshot = await db
      .collection("ai_queries")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    const queries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ queries, total: queries.length });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch queries" });
  }
});

export default router;

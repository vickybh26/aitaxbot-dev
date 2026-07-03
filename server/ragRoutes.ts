/**
 * AiTaxBot RAG API Routes
 *
 * POST /api/ai/query          — Ask the AI a tax question
 * GET  /api/ai/health         — Check Qdrant + Gemini connectivity
 * GET  /api/ai/admin/queries  — Admin: view recent anonymous queries (for training)
 *
 * Error shape (all routes): { error: { code, message, requestId } }
 * Timeout errors return 504; auth errors 401/403; bad input 400; server 500.
 */

import { Router, Request, Response } from "express";
import { runRAGQuery, checkRAGHealth } from "./ragService";
import { verifyFirebaseToken, getFirestore } from "./firebase";

const router = Router();

// ─── Rate limit helper ───────────────────────────────────────────────────────
// Simple in-memory map: IP → { count, resetAt }
// For production replace with Redis-based rate limiting
const ipHits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;          // requests per window
const RATE_WINDOW_MS = 60_000;  // 1 minute

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
  const r = res as any;
  try {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown");

    if (isRateLimited(ip)) {
      return r.apiError(429, "RATE_LIMITED", "Too many requests. Please wait a moment before asking again.");
    }

    const { question, sessionId, source } = req.body as {
      question?: string;
      sessionId?: string;
      source?: string;
    };

    if (!question || question.trim().length < 5) {
      return r.apiError(400, "QUESTION_TOO_SHORT", "Please provide a question (minimum 5 characters).");
    }

    if (question.length > 1000) {
      return r.apiError(400, "QUESTION_TOO_LONG", "Question too long (maximum 1000 characters).");
    }

    const result = await runRAGQuery({
      question: question.trim(),
      sessionId: sessionId || undefined,
      source: source || "api",
    });
    // Per-step timeouts: embed 10s + search 8s + generate 25s (in ragService.ts)

    return res.json(result);
  } catch (err: any) {
    const msg = err?.message || "";

    // Log the real error so Railway logs show exactly what failed
    console.error("[RAG] Query pipeline error:", msg, err?.stack || "");

    if (msg.includes("timed out")) {
      // 504 = upstream (Gemini/Qdrant) too slow — distinct from 500 (our bug)
      return r.apiError(504, "AI_TIMEOUT", "The AI is taking too long to respond. Please try a shorter or simpler question.");
    }

    // Return actual error message in requestId field so we can debug without Railway access
    return r.apiError(500, "AI_UNAVAILABLE", `The AI service is temporarily unavailable. (${msg})`);
  }
});

// ─── GET /api/ai/health ──────────────────────────────────────────────────────

router.get("/health", async (_req: Request, res: Response) => {
  try {
    const health = await checkRAGHealth();
    const statusCode = health.qdrant && health.gemini ? 200 : 503;
    return res.status(statusCode).json(health);
  } catch (err) {
    return (res as any).apiError(503, "HEALTH_CHECK_FAILED", "Health check failed");
  }
});

// ─── Admin auth middleware ────────────────────────────────────────────────────
// Mirrors requireAdmin in adminRoutes.ts:
//   1. Verify Firebase ID token (not just "is there a Bearer header?")
//   2. Check Firestore admin collection for adminLevel ≥ 1
//   3. Fail-closed: any missing/invalid field → 401/403

async function requireAdminL1(req: Request, res: Response, next: any): Promise<any> {
  const r = res as any;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return r.apiError(401, "UNAUTHORIZED", "No token provided.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return r.apiError(401, "INVALID_TOKEN", "Token is invalid or expired.");
    }

    const firestoreDb = getFirestore();
    const adminDoc = await firestoreDb.collection("admin").doc(decoded.uid).get();
    if (!adminDoc.exists) {
      return r.apiError(403, "NOT_ADMIN", "This account does not have admin access.");
    }

    const level = Number((adminDoc.data()! as any).level);
    if (!Number.isInteger(level) || level < 1 || level > 3) {
      return r.apiError(403, "INVALID_ADMIN_LEVEL", "Admin level is missing or invalid.");
    }

    (req as any).adminUid = decoded.uid;
    (req as any).adminLevel = level;
    next();
  } catch (err) {
    console.error("[RAG] Admin auth error:", err);
    return (res as any).apiError(500, "AUTH_CHECK_FAILED", "Auth check failed.");
  }
}

// ─── GET /api/ai/admin/queries ───────────────────────────────────────────────
// Returns recent anonymous queries — useful for identifying gaps in the knowledge base
// Requires: Firebase ID token with adminLevel ≥ 1 in Firestore

router.get("/admin/queries", requireAdminL1, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const snapshot = await getFirestore()
      .collection("ai_queries")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const queries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ queries, total: queries.length });
  } catch (err) {
    return (res as any).apiError(500, "QUERY_FETCH_FAILED", "Failed to fetch queries.");
  }
});

export default router;

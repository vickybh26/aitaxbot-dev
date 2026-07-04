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
    const onlyGraphAvailable = req.query.graph_available === "true";

    let queries: any[];

    if (onlyGraphAvailable) {
      // Firestore requires a manually-provisioned composite index to combine
      // an equality filter (graph_available == true) with orderBy on a
      // different field (timestamp) — and nothing in our deploy flow
      // (plain `git push` to Railway) provisions Firestore indexes, so that
      // combined query throws FAILED_PRECONDITION on every call. Filter
      // server-side, then sort/limit in memory instead — timestamp is
      // stored as an ISO string (see logComparison in ragService.ts), which
      // sorts correctly as a plain string. ai_queries is a low-volume,
      // admin-only collection, so this is cheap.
      const snapshot = await getFirestore()
        .collection("ai_queries")
        .where("graph_available", "==", true)
        .limit(2000)
        .get();
      queries = snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
        .slice(0, limit);
    } else {
      // No equality filter here, so ordering by a single field works fine
      // with Firestore's automatic single-field indexes.
      const snapshot = await getFirestore()
        .collection("ai_queries")
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();
      queries = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    }

    return res.json({ queries, total: queries.length });
  } catch (err) {
    console.error("[RAG] Admin queries fetch error:", err);
    return (res as any).apiError(500, "QUERY_FETCH_FAILED", "Failed to fetch queries.");
  }
});

// ─── POST /api/ai/admin/queries/:id/grade ────────────────────────────────────
// Admin-level grading for the shadow-mode Gemini-vs-graph-answer comparison.
// Records whether the graph (deterministic) answer was as good as Gemini's
// for a given question — the evidence base for eventually trusting the
// graph path to answer users directly without an AI-vendor call.

const VALID_MATCH_STATUSES = new Set(["match", "partial", "mismatch", "pending"]);

router.post("/admin/queries/:id/grade", requireAdminL1, async (req: Request, res: Response) => {
  const r = res as any;
  try {
    const { match_status, notes } = req.body as { match_status?: string; notes?: string };

    if (!match_status || !VALID_MATCH_STATUSES.has(match_status)) {
      return r.apiError(400, "INVALID_MATCH_STATUS", `match_status must be one of: ${[...VALID_MATCH_STATUSES].join(", ")}`);
    }

    const docRef = getFirestore().collection("ai_queries").doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return r.apiError(404, "QUERY_NOT_FOUND", "No query found with that ID.");
    }

    await docRef.update({
      match_status,
      notes: notes?.trim() || null,
      graded_at: new Date().toISOString(),
      graded_by: (req as any).adminUid || null,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[RAG] Grade query error:", err);
    return r.apiError(500, "GRADE_FAILED", "Failed to save grade.");
  }
});

// ─── GET /api/ai/admin/eval-stats ────────────────────────────────────────────
// Quick aggregate view of how the graph path is doing against Gemini —
// counts by match_status among graded, graph-available comparisons.

router.get("/admin/eval-stats", requireAdminL1, async (_req: Request, res: Response) => {
  try {
    const snapshot = await getFirestore()
      .collection("ai_queries")
      .where("graph_available", "==", true)
      .limit(2000)
      .get();

    const stats = { total: 0, pending: 0, match: 0, partial: 0, mismatch: 0 };
    snapshot.docs.forEach(doc => {
      const status = ((doc.data() as any).match_status as string) || "pending";
      stats.total++;
      if (status in stats) (stats as any)[status]++;
    });

    return res.json(stats);
  } catch (err) {
    return (res as any).apiError(500, "STATS_FETCH_FAILED", "Failed to fetch eval stats.");
  }
});

export default router;

/**
 * toolUsageRoutes.ts — Per-user calculator activity tracking
 *
 * POST /api/tool-usage        — log one tool-use event (authenticated)
 * GET  /api/tool-usage        — fetch last 50 events for the current user
 *
 * POST additionally upserts the user's "last result" card for the dashboard
 * when the client sends a `saved` payload. Piggy-backing on this endpoint is
 * deliberate: every calculator already calls it through useTrackToolUse(), so
 * persistence arrives everywhere at once instead of needing a separate save
 * call bolted onto nine different components (and forgotten in one of them).
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import { getFirestore } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { saveLastResult, type SavedResultInput } from "./savedResults";
import { authenticateFirebaseToken, type AuthenticatedRequest } from "./middleware/auth.js";

const router = Router();

// ─── POST /api/tool-usage ──────────────────────────────────────────────────
// Body: { tool: string, route?: string, summary?: string, saved?: SavedResultInput }
router.post("/", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { tool, route, summary, saved } = req.body;
    if (!tool || typeof tool !== "string") {
      return res.status(400).json({ error: "tool name required" });
    }

    const db = getFirestore();
    const id = randomUUID();
    const now = new Date().toISOString();

    await db.collection(COLLECTIONS.TOOL_USAGE).doc(id).set({
      id,
      userId: req.userId!,
      tool: String(tool).slice(0, 80),
      route: route ? String(route).slice(0, 100) : null,
      summary: summary ? String(summary).slice(0, 300) : null,
      createdAt: now,
    });

    // Upsert the dashboard card. saveLastResult() sanitises the payload and
    // swallows its own errors, so a malformed or oversized `saved` object can
    // never turn a successful calculation into a failed request.
    if (saved && typeof saved === "object" && typeof saved.toolKey === "string") {
      await saveLastResult(req.userId!, {
        ...(saved as SavedResultInput),
        route: saved.route || (route ? String(route) : ""),
        toolName: saved.toolName || String(tool),
      });
    }

    return res.status(201).json({ success: true, id });
  } catch (err) {
    console.error("[ToolUsage] POST error:", err);
    return res.status(500).json({ error: "Failed to log tool usage" });
  }
});

// ─── GET /api/tool-usage ───────────────────────────────────────────────────
// Returns last 50 events for the authenticated user, ordered by date desc.
router.get("/", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getFirestore();
    // Use single-field .where() only — no .orderBy() on a different field (that would
    // require a composite index).  Sort the results in memory instead.
    const snap = await db
      .collection(COLLECTIONS.TOOL_USAGE)
      .where("userId", "==", req.userId!)
      .limit(200)           // fetch more than we need so the in-memory sort is accurate
      .get();

    const events = snap.docs
      .map((d) => d.data())
      .sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 50);        // return last 50
    return res.json(events);
  } catch (err) {
    console.error("[ToolUsage] GET error:", err);
    return res.status(500).json({ error: "Failed to fetch tool usage" });
  }
});

export default router;

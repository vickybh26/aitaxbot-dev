/**
 * savedResultsRoutes.ts — read/clear the user's "last result" cards
 *
 * GET    /api/saved-results          — all saved results for the current user
 * DELETE /api/saved-results/:toolKey — forget one tool's saved result
 * DELETE /api/saved-results          — forget all of them
 *
 * Writes happen elsewhere, as a side effect of the work the user was already
 * doing (POST /api/tool-usage for calculators, the reconcile endpoint for
 * AIS), so there is no public "save" endpoint to abuse.
 *
 * Every handler scopes to req.userId from the verified Firebase token, never
 * to anything in the URL or body, so one user can never read or clear
 * another's results.
 */

import { Router } from "express";
import {
  getSavedResults,
  deleteSavedResult,
  deleteAllSavedResults,
} from "./savedResults";
import { authenticateFirebaseToken, type AuthenticatedRequest } from "./middleware/auth.js";

const router = Router();

router.get("/", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const results = await getSavedResults(req.userId!);
    return res.json(results);
  } catch (err) {
    console.error("[SavedResults] GET error:", err);
    return res.status(500).json({ error: "Failed to load your saved results" });
  }
});

router.delete("/:toolKey", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const toolKey = String(req.params.toolKey || "").slice(0, 40);
    if (!toolKey) return res.status(400).json({ error: "toolKey required" });
    await deleteSavedResult(req.userId!, toolKey);
    return res.json({ success: true });
  } catch (err) {
    console.error("[SavedResults] DELETE error:", err);
    return res.status(500).json({ error: "Failed to clear that result" });
  }
});

router.delete("/", authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const removed = await deleteAllSavedResults(req.userId!);
    return res.json({ success: true, removed });
  } catch (err) {
    console.error("[SavedResults] DELETE-all error:", err);
    return res.status(500).json({ error: "Failed to clear your saved results" });
  }
});

export default router;

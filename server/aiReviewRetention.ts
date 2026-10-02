import type { firestore } from "firebase-admin";

export const AI_REVIEW_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const AI_REVIEW_COLLECTION = "ai_queries";

export function aiReviewLoggingEnabled(): boolean {
  return process.env.AI_REVIEW_LOGGING_ENABLED !== "false";
}

export function aiReviewRetentionFields(now = new Date()) {
  return { timestamp: now.toISOString(), expiresAt: new Date(now.getTime() + AI_REVIEW_RETENTION_MS) };
}

/** Creation time is authoritative: grading must never restart retention.
 * Missing/malformed dates are not safe to expose or send to an evaluator.
 */
export function isAIReviewCurrent(row: { timestamp?: unknown }, now = Date.now()): boolean {
  if (typeof row.timestamp !== "string") return false;
  const created = Date.parse(row.timestamp);
  return Number.isFinite(created) && created <= now && created > now - AI_REVIEW_RETENTION_MS;
}

/** Covers legacy rows without expiresAt. Single-field query needs no composite
 * index. Bounded batches avoid monopolising the server; subsequent sweeps drain
 * a large backlog. Only ai_queries is ever touched, never savedResults.
 */
export async function purgeExpiredAIReviews(db: firestore.Firestore, now = Date.now()): Promise<number> {
  const cutoff = new Date(now - AI_REVIEW_RETENTION_MS).toISOString();
  let deleted = 0;
  for (let page = 0; page < 20; page++) {
    const snapshot = await db.collection(AI_REVIEW_COLLECTION)
      .where("timestamp", "<=", cutoff).limit(400).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < 400) break;
  }
  return deleted;
}

export function startAIReviewCleanup(getDb: () => firestore.Firestore): () => void {
  let running = false;
  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      const count = await purgeExpiredAIReviews(getDb());
      console.info(`[AI review retention] Removed ${count} expired records`);
    } catch {
      // No provider error payloads or taxpayer content in infrastructure logs.
      console.error("[AI review retention] Cleanup failed; retrying next hour");
    } finally { running = false; }
  };
  void sweep();
  const timer = setInterval(() => { void sweep(); }, 60 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
}

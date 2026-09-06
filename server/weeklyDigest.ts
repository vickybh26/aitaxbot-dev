/**
 * weeklyDigest.ts — the recurring "deadlines + usage summary" email.
 *
 * Triggered two ways: the cron schedule in server/index.ts (every Monday,
 * see there for the schedule), and POST /api/admin/weekly-digest/trigger
 * (adminRoutes.ts) for testing without waiting for Monday.
 *
 * Every registered user with an email and `digestOptOut !== true` gets one.
 * The user base is small (low hundreds as of 2026-09) so this loops
 * sequentially rather than batching — if it ever needs to scale past a few
 * thousand users, batch the sends instead of adding concurrency, to stay
 * well under Brevo's rate limits.
 */

import { getFirestore } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { getUpcomingKeyDates } from "@shared/keyDates";
import { getSavedResults } from "./savedResults";
import { sendWeeklyDigestEmail } from "./emailService";
import type { User } from "@shared/schema";

export interface WeeklyDigestRunResult {
  sent: number;
  skipped: number;
  failed: number;
}

export async function sendWeeklyDigests(): Promise<WeeklyDigestRunResult> {
  const db = getFirestore();
  const snap = await db.collection(COLLECTIONS.USERS).get();
  const dates = getUpcomingKeyDates();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const user = { id: doc.id, ...doc.data() } as unknown as User;
    if (!user.email || user.digestOptOut) {
      skipped++;
      continue;
    }
    try {
      const usage = await getSavedResults(user.id);
      const { sent: ok } = await sendWeeklyDigestEmail(user, {
        dates,
        usage: usage.slice(0, 5),
      });
      if (ok) sent++;
      else failed++;
    } catch (err) {
      console.error(`[WeeklyDigest] failed for user ${user.id}:`, err);
      failed++;
    }
  }

  console.log(`[WeeklyDigest] done — sent ${sent}, skipped ${skipped}, failed ${failed}`);
  return { sent, skipped, failed };
}

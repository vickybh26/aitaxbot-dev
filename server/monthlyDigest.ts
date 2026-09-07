/**
 * monthlyDigest.ts — the manually-sent monthly newsletter.
 *
 * Replaces weeklyDigest.ts (2026-09-07). Two changes, both deliberate:
 *
 * 1. NOTHING HERE RUNS ON A SCHEDULE. The old version was wired to a
 *    `cron.schedule("0 9 * * 1", ...)` in server/index.ts, so 146 emails went
 *    out unreviewed and the problems in them — an unlabelled ₹1.59 crore PF
 *    projection sitting under a ₹3,51,000 tax bill — were only discovered
 *    afterwards, by reading the copy that landed in the founder's own inbox.
 *    The cron is gone. Sending is an explicit POST from /admin/digest by a
 *    level-1 admin, against an issue somebody has read.
 *
 *    If you are reintroducing automation here, don't. The whole point of the
 *    monthly cadence is that a person writes and checks each issue; a cron
 *    would send whatever draft happened to be sitting in Firestore.
 *
 * 2. It sends an authored DigestIssue rather than generating its own content.
 *    Dates are still computed from shared/keyDates.ts — never hardcode a tax
 *    date — but the substance is written per issue.
 *
 * Sends are sequential on purpose. The user base is in the low hundreds; a
 * concurrent fan-out would buy nothing and would risk tripping provider rate
 * limits mid-broadcast, which is a far worse failure than a slow request
 * because it lands the run half-finished with no clean way to resume.
 */

import { getFirestore } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { getUpcomingKeyDates } from "@shared/keyDates";
import { getSavedResults } from "./savedResults";
import { sendMonthlyDigestEmail } from "./emailService";
import type { DigestIssue, DigestIssueStats } from "@shared/digest";
import type { User } from "@shared/schema";

export const DIGEST_ISSUES_COLLECTION = "digestIssues";

export interface DigestRunResult extends DigestIssueStats {
  /** Reasons for the failures, deduplicated — surfaced in the admin UI. */
  failures: { email: string; reason: string }[];
}

/**
 * Who would receive an issue right now. Exposed separately from the send so
 * the admin screen can show a real recipient count on the confirm dialog
 * rather than the total user count — those differ by however many people
 * have opted out or have no email on file, and "send to 146" when it is
 * really 138 is the kind of small lie that erodes trust in the panel.
 */
export async function getDigestRecipients(): Promise<User[]> {
  const db = getFirestore();
  const snap = await db.collection(COLLECTIONS.USERS).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as User)
    .filter((u) => !!u.email && !u.digestOptOut);
}

/**
 * Send one issue.
 *
 * `onlyTo` restricts the run to specific email addresses — that is how the
 * "send a test to myself" button works, so a test exercises this exact code
 * path (real template, real personalisation, real transport) instead of a
 * parallel one that could drift out of sync with it.
 */
export async function sendMonthlyDigests(
  issue: DigestIssue,
  opts: { onlyTo?: string[] } = {}
): Promise<DigestRunResult> {
  const dates = getUpcomingKeyDates();
  const onlyTo = opts.onlyTo?.map((e) => e.toLowerCase().trim());

  let recipients = await getDigestRecipients();
  if (onlyTo?.length) {
    recipients = recipients.filter((u) => onlyTo.includes(String(u.email).toLowerCase()));
  }

  const result: DigestRunResult = { sent: 0, skipped: 0, failed: 0, failures: [] };

  for (const user of recipients) {
    try {
      // Per-user, so each reader's recap reflects their own saved results and
      // the promo cards suppress correctly for tools they already use.
      const usage = issue.includeUsage ? (await getSavedResults(user.id)).slice(0, 5) : [];
      const { sent, reason } = await sendMonthlyDigestEmail(user, { issue, dates, usage });
      if (sent) {
        result.sent++;
      } else {
        result.failed++;
        result.failures.push({ email: String(user.email), reason: reason || "unknown" });
      }
    } catch (err) {
      // Never let one bad user document abort a broadcast mid-way.
      console.error(`[MonthlyDigest] failed for user ${user.id}:`, err);
      result.failed++;
      result.failures.push({ email: String(user.email), reason: String(err) });
    }
  }

  console.log(
    `[MonthlyDigest] issue ${issue.id}${onlyTo ? " (test)" : ""} — sent ${result.sent}, failed ${result.failed}`
  );
  return result;
}

// ─── Issue storage ─────────────────────────────────────────────────────────
// One document per calendar month, id = "2026-09". Deterministic ids mean
// "this month's issue" is a direct get() with no query and no index, and it
// is structurally impossible to end up with two drafts for the same month.

export async function getIssue(id: string): Promise<DigestIssue | null> {
  const db = getFirestore();
  const snap = await db.collection(DIGEST_ISSUES_COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as DigestIssue) : null;
}

export async function listIssues(limit = 24): Promise<DigestIssue[]> {
  const db = getFirestore();
  const snap = await db.collection(DIGEST_ISSUES_COLLECTION).limit(limit).get();
  // Sorted in memory — the id is "YYYY-MM", so a plain string sort is
  // chronological, and this avoids a composite index for no benefit at this
  // collection size (one document per month).
  return snap.docs
    .map((d) => d.data() as DigestIssue)
    .sort((a, b) => (b.id || "").localeCompare(a.id || ""));
}

export async function saveIssue(issue: DigestIssue): Promise<DigestIssue> {
  const db = getFirestore();
  const now = new Date().toISOString();
  const existing = await getIssue(issue.id);
  const record: DigestIssue = {
    ...issue,
    // A sent issue keeps its status and stats — saving edits afterwards must
    // not silently reset it to "draft" and invite a second send to everyone.
    status: existing?.status === "sent" ? "sent" : "draft",
    ...(existing?.sentAt ? { sentAt: existing.sentAt } : {}),
    ...(existing?.stats ? { stats: existing.stats } : {}),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await db.collection(DIGEST_ISSUES_COLLECTION).doc(issue.id).set(record);
  return record;
}

export async function markIssueSent(id: string, stats: DigestIssueStats): Promise<void> {
  const db = getFirestore();
  await db.collection(DIGEST_ISSUES_COLLECTION).doc(id).update({
    status: "sent",
    sentAt: new Date().toISOString(),
    stats,
  });
}

export async function deleteIssue(id: string): Promise<void> {
  const db = getFirestore();
  await db.collection(DIGEST_ISSUES_COLLECTION).doc(id).delete();
}

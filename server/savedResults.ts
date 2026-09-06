/**
 * savedResults.ts — "your last result" storage
 *
 * WHY THIS EXISTS
 * ---------------
 * Until now every calculation was thrown away the moment the user navigated
 * off the page, and the reconciliation tool was entirely stateless. That made
 * the product purely seasonal: a person worked out their tax once, closed the
 * tab, and had no reason to ever come back. Firestore bore this out — 123
 * registered users, only 22 who ever completed a calculation, and exactly 1
 * who came back on a second day.
 *
 * Keeping the last result per tool gives a returning user something of their
 * own waiting on the dashboard, and gives the AIS report the "unfinished
 * business" quality that actually pulls people back ("3 items to resolve
 * before filing").
 *
 * WHAT IS AND IS NOT STORED — read before extending
 * ------------------------------------------------
 * We store the DERIVED SUMMARY ONLY: the headline figure, a short breakdown,
 * and the inputs needed to re-open the calculation. We never store uploaded
 * documents. The AIS/26AS/Form 16 PDFs continue to be processed in memory and
 * discarded, exactly as the tool's own copy promises — so persisting a
 * reconciliation summary does not turn us into a document store.
 *
 * That distinction is deliberate and load-bearing under the DPDP Act: a
 * handful of computed figures is a far smaller footprint (and a far smaller
 * breach liability) than a library of taxpayers' source documents. If you are
 * tempted to stash the PDF "just for convenience", don't — it changes the
 * privacy position of the whole product and the privacy policy no longer
 * matches.
 *
 * ONE DOC PER USER PER TOOL
 * -------------------------
 * The document id is deterministic (`${uid}__${toolKey}`), so each write
 * overwrites the previous one. "Last result only" is therefore a property of
 * the data model rather than something a cleanup job has to enforce, and
 * reading the dashboard is a single cheap query with no composite index.
 */

import { getFirestore } from "./firebase";
import { sendCalculatorResultEmail } from "./emailService";

export const SAVED_RESULTS_COLLECTION = "savedResults";

/** A single label/value line in the small breakdown shown on the card. */
export interface SavedResultDetail {
  label: string;
  value: string;
}

export interface SavedResultInput {
  /** Stable key for the tool, e.g. "income-tax", "sip", "ais". */
  toolKey: string;
  /** Display name, e.g. "Income Tax Calculator". */
  toolName: string;
  /** Route to send the user back to when they tap the card. */
  route: string;
  /**
   * "calculator" cards show a headline figure; "reconciliation" cards show a
   * status plus a list of outstanding items. They render differently, so the
   * dashboard needs to tell them apart without sniffing at the fields.
   */
  kind: "calculator" | "reconciliation";
  /** Primary figure or status shown large on the card. */
  headline: { label: string; value: string; hint?: string };
  /** Up to 5 supporting lines. Trimmed defensively below. */
  details?: SavedResultDetail[];
  /**
   * Raw inputs, so "Update" can re-open the tool pre-filled instead of making
   * the person type everything again. Values are primitives only — this is
   * not a place to smuggle in file contents.
   */
  inputs?: Record<string, string | number | boolean | null>;
}

export interface SavedResult extends SavedResultInput {
  id: string;
  userId: string;
  updatedAt: string;
  /** Set only when a result email actually went out — see maybeSendResultEmail(). */
  lastEmailedAt?: string;
}

const MAX_DETAILS = 5;
const MAX_STR = 120;
const MAX_INPUT_KEYS = 25;

function clip(v: unknown, max = MAX_STR): string {
  return String(v ?? "").slice(0, max);
}

/**
 * Strip anything that isn't a primitive. Guards against a caller accidentally
 * passing a whole report object (or a file buffer) through to Firestore, which
 * would both blow the 1 MiB document limit and store far more than we've told
 * users we store.
 */
function sanitiseInputs(
  inputs: SavedResultInput["inputs"]
): Record<string, string | number | boolean | null> {
  if (!inputs || typeof inputs !== "object") return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(inputs).slice(0, MAX_INPUT_KEYS)) {
    if (v === null) out[clip(k, 40)] = null;
    else if (typeof v === "number" && Number.isFinite(v)) out[clip(k, 40)] = v;
    else if (typeof v === "boolean") out[clip(k, 40)] = v;
    else if (typeof v === "string") out[clip(k, 40)] = v.slice(0, 200);
    // anything else (objects, arrays, buffers) is dropped on purpose
  }
  return out;
}

export function docIdFor(userId: string, toolKey: string): string {
  return `${userId}__${toolKey}`;
}

/**
 * Upsert the user's latest result for one tool.
 *
 * Deliberately swallows its own errors: this is a convenience feature layered
 * on top of the real work. If saving the summary fails we do not want the
 * user's calculation — or worse, their reconciliation run, which costs real
 * Gemini spend — to fail with it.
 */
export async function saveLastResult(
  userId: string,
  input: SavedResultInput
): Promise<void> {
  try {
    if (!userId || !input?.toolKey) return;
    const db = getFirestore();
    const id = docIdFor(userId, input.toolKey);
    const ref = db.collection(SAVED_RESULTS_COLLECTION).doc(id);

    // This is a full-document .set(), not a merge — every field below is
    // explicit so a shrinking `details`/`inputs` array actually shrinks in
    // Firestore too. lastEmailedAt has to be carried forward by hand for
    // that reason: it isn't part of SavedResultInput, so without this it
    // would be silently wiped on every recalculation, and
    // maybeSendResultEmail()'s throttle would never actually throttle.
    const existing = await ref.get();
    const lastEmailedAt = existing.exists ? (existing.data() as SavedResult).lastEmailedAt : undefined;

    const record: SavedResult = {
      id,
      userId,
      toolKey: clip(input.toolKey, 40),
      toolName: clip(input.toolName, 80),
      route: clip(input.route, 120),
      kind: input.kind === "reconciliation" ? "reconciliation" : "calculator",
      headline: {
        label: clip(input.headline?.label, 60),
        value: clip(input.headline?.value, 60),
        ...(input.headline?.hint ? { hint: clip(input.headline.hint, 140) } : {}),
      },
      // Detail values are generous (200 chars) because reconciliation action
      // items are full sentences, not figures. Labels stay short — they're
      // captions like "Total tax" and are blank for action-item lists.
      details: (input.details ?? []).slice(0, MAX_DETAILS).map((d) => ({
        label: clip(d.label, 60),
        value: clip(d.value, 200),
      })),
      inputs: sanitiseInputs(input.inputs),
      updatedAt: new Date().toISOString(),
      ...(lastEmailedAt ? { lastEmailedAt } : {}),
    };

    await ref.set(record);
  } catch (err) {
    console.error("[SavedResults] save failed (non-fatal):", err);
  }
}

/**
 * Throttle window for the "your result" email per (user, tool). Without
 * this, dragging a slider on e.g. the SIP calculator — which calls
 * saveLastResult() on every settled change via useTrackToolUse()'s 1.2s
 * debounce — would fire an email every ~1.2 seconds. 30 minutes is long
 * enough to cover one active session without spamming the inbox, short
 * enough that coming back tomorrow and recalculating gets a fresh email.
 */
const RESULT_EMAIL_THROTTLE_MS = 30 * 60 * 1000;

/**
 * Fire the "your result" email for one (user, tool), unless one was already
 * sent for this tool within the throttle window. Called after
 * saveLastResult() has already written the fresh headline/details — reads
 * them back off the doc rather than taking them as a parameter, so this
 * stays a thin wrapper instead of a second copy of the save call's shape.
 *
 * Deliberately swallows its own errors, same as saveLastResult() — a failed
 * or throttled email must never affect the calculation the user just ran.
 */
export async function maybeSendResultEmail(userId: string, toolKey: string): Promise<void> {
  try {
    const db = getFirestore();
    const ref = db.collection(SAVED_RESULTS_COLLECTION).doc(docIdFor(userId, toolKey));
    const snap = await ref.get();
    if (!snap.exists) return;

    const data = snap.data() as SavedResult;
    const lastSent = data.lastEmailedAt ? new Date(data.lastEmailedAt).getTime() : 0;
    if (Date.now() - lastSent < RESULT_EMAIL_THROTTLE_MS) return;

    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) return;
    const user = userSnap.data() as { email?: string | null; firstName?: string | null };
    if (!user.email) return;

    const { sent } = await sendCalculatorResultEmail(user, data);
    if (sent) await ref.update({ lastEmailedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[SavedResults] result email failed (non-fatal):", err);
  }
}

/** Every saved result for one user, newest first. Single-field query — no index needed. */
export async function getSavedResults(userId: string): Promise<SavedResult[]> {
  const db = getFirestore();
  const snap = await db
    .collection(SAVED_RESULTS_COLLECTION)
    .where("userId", "==", userId)
    .limit(40)
    .get();

  return snap.docs
    .map((d) => d.data() as SavedResult)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function deleteSavedResult(userId: string, toolKey: string): Promise<void> {
  const db = getFirestore();
  await db.collection(SAVED_RESULTS_COLLECTION).doc(docIdFor(userId, toolKey)).delete();
}

/**
 * Wipe every saved result for a user.
 *
 * Called from DELETE /api/user/account. Adding a new collection without
 * wiring it into account deletion would quietly break the DPDP erasure
 * guarantee we already ship — if you add another per-user collection later,
 * add it there too.
 */
export async function deleteAllSavedResults(userId: string): Promise<number> {
  const db = getFirestore();
  const snap = await db
    .collection(SAVED_RESULTS_COLLECTION)
    .where("userId", "==", userId)
    .get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

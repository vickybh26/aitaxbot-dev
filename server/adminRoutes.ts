/**
 * Admin Routes — AiTaxBot Admin Dashboard & CRM
 *
 * Access levels:
 *   Level 1 (Super Admin) — full access: users, analytics, CRM, export, admin setup instructions
 *   Level 2 (Manager)     — users, CRM notes/tags, analytics; no export
 *   Level 3 (Viewer)      — read-only: users list + analytics; no CRM writes
 *
 * Admin accounts are created MANUALLY in Firestore:
 *   Collection: admin / Doc ID: Firebase UID
 *   { level: 1|2|3, name: "...", email: "...", createdAt: Timestamp }
 *
 * Admin UIDs must NOT exist in the `users` collection (separate accounts).
 */

import { Router } from "express";
import { getFirestore, verifyFirebaseToken, admin } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";
import { createHmac, timingSafeEqual } from "crypto";

const router = Router();

// ─────────────────────────────────────────────
// Simple in-memory cache (avoids re-scanning Firestore on every admin page load)
// ─────────────────────────────────────────────
const cache = new Map<string, { data: any; expiresAt: number }>();
function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data as T;
}
function setCache(key: string, data: any, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─────────────────────────────────────────────
// Middleware — verify Firebase token + admin level
// ─────────────────────────────────────────────

async function requireAdmin(req: any, res: any, next: any, minLevel = 1) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });

    const db = getFirestore();
    const adminDoc = await db.collection("admin").doc(decoded.uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ error: "Not an admin account" });
    }
    const adminData = adminDoc.data()!;
    // Coerce + validate level strictly. A missing/invalid `level` must FAIL CLOSED,
    // not pass through as undefined (undefined > 1 === false → previous bypass).
    const level = Number((adminData as any).level);
    if (!Number.isInteger(level) || level < 1 || level > 3) {
      return res.status(403).json({ error: "Invalid admin level" });
    }
    if (level > minLevel) {
      return res.status(403).json({ error: `Requires admin level ${minLevel} or higher` });
    }

    req.adminUid = decoded.uid;
    req.adminLevel = level;
    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    console.error("[Admin] Auth error:", err);
    res.status(500).json({ error: "Auth check failed" });
  }
}

const adminL1 = (req: any, res: any, next: any) => requireAdmin(req, res, next, 1);
const adminL2 = (req: any, res: any, next: any) => requireAdmin(req, res, next, 2);
const adminL3 = (req: any, res: any, next: any) => requireAdmin(req, res, next, 3);

// ─────────────────────────────────────────────
// GET /api/admin/me  — check own admin level
// ─────────────────────────────────────────────

router.get("/me", adminL3, async (req: any, res) => {
  res.json({ uid: req.adminUid, level: req.adminLevel, email: req.adminEmail });
});

// ─────────────────────────────────────────────
// GET /api/admin/stats — overview numbers
// ─────────────────────────────────────────────

router.get("/stats", adminL3, async (req: any, res) => {
  try {
    // Cache stats for 5 minutes — avoids re-running 6 Firestore queries on every dashboard load
    const cached = getCache<object>("admin:stats");
    if (cached) return res.json(cached);

    const db = getFirestore();
    const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Run all count queries in parallel — each uses Firestore count aggregation (no doc reads)
    const [
      usersSnap,
      newUsersWeekSnap,
      newUsersMonthSnap,
      completedSnap,
      counterDoc,
      trendSnap,
      toolUsageSnap,
    ] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("users").where("createdAt", ">=", sevenDaysAgo).count().get(),
      db.collection("users").where("createdAt", ">=", thirtyDaysAgo).count().get(),
      db.collection("users").where("isProfileComplete", "==", true).count().get(),
      db.collection("counters").doc("taxCalculations").get(),
      // Fetch only createdAt field for trend — minimises bytes transferred
      db.collection("users")
        .where("createdAt", ">=", thirtyDaysAgo)
        .orderBy("createdAt", "asc")
        .select("createdAt")
        .get(),
      // Fetch only userId + createdAt for retention calc — capped for safety
      db.collection(COLLECTIONS.TOOL_USAGE).select("userId", "createdAt").limit(5000).get(),
    ]);

    const totalUsers         = usersSnap.data().count;
    const newUsersWeek       = newUsersWeekSnap.data().count;
    const newUsersMonth      = newUsersMonthSnap.data().count;
    const completedProfiles  = completedSnap.data().count;
    const totalCalculations  = counterDoc.exists ? (counterDoc.data()?.count ?? 0) : 0;
    const profileCompletionRate = totalUsers > 0
      ? Math.round((completedProfiles / totalUsers) * 100) : 0;

    // Returning users = signed-in users with calculator activity on 2+ distinct
    // calendar days. Now that sign-in is required to view any calculator result,
    // toolUsage reliably captures every calculation by every registered user —
    // this is the funding/traction metric (real users, real repeat usage).
    const daysByUser: Record<string, Set<string>> = {};
    toolUsageSnap.docs.forEach((doc: any) => {
      const d = doc.data();
      const uid = d.userId;
      if (!uid) return;
      const raw = d.createdAt;
      const dt = raw?.toDate ? raw.toDate() : new Date(raw);
      if (isNaN(dt.getTime())) return;
      const dayKey = dt.toISOString().split("T")[0];
      if (!daysByUser[uid]) daysByUser[uid] = new Set();
      daysByUser[uid].add(dayKey);
    });
    const activeUsers = Object.keys(daysByUser).length;
    const returningUsers = Object.values(daysByUser).filter((days) => days.size >= 2).length;
    const returningUserRate = activeUsers > 0
      ? Math.round((returningUsers / activeUsers) * 100) : 0;

    // Build 30-day trend
    const signupsByDay: Record<string, number> = {};
    trendSnap.docs.forEach((doc: any) => {
      const raw = doc.data().createdAt;
      const createdAt = raw?.toDate?.() ?? new Date(raw);
      const dateKey = createdAt.toISOString().split("T")[0];
      signupsByDay[dateKey] = (signupsByDay[dateKey] ?? 0) + 1;
    });
    const signupTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split("T")[0];
      signupTrend.push({ date: dateKey, signups: signupsByDay[dateKey] ?? 0 });
    }

    const result = {
      totalUsers, newUsersWeek, newUsersMonth, totalCalculations,
      completedProfiles, profileCompletionRate, signupTrend,
      activeUsers, returningUsers, returningUserRate,
    };
    setCache("admin:stats", result, 5 * 60 * 1000); // 5 min TTL
    res.json(result);
  } catch (err) {
    console.error("[Admin] Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/analytics — occupation, state, auth provider distribution
// ─────────────────────────────────────────────

router.get("/analytics", adminL3, async (req: any, res) => {
  try {
    // Cache for 1 hour — analytics don't need to be real-time
    const cached = getCache<object>("admin:analytics");
    if (cached) return res.json(cached);

    const db = getFirestore();

    // Only fetch the 3 fields we need — dramatically reduces bytes read from Firestore
    const usersSnap = await db
      .collection("users")
      .select("occupation", "state", "authProvider")
      .get();

    const occupationCount: Record<string, number> = {};
    const stateCount: Record<string, number> = {};
    const providerCount: Record<string, number> = {};

    usersSnap.docs.forEach((doc) => {
      const d = doc.data();
      const occ      = (d as any).occupation  || "Not specified";
      const state    = (d as any).state       || "Not specified";
      const provider = (d as any).authProvider || "google";
      occupationCount[occ]   = (occupationCount[occ]   ?? 0) + 1;
      stateCount[state]       = (stateCount[state]       ?? 0) + 1;
      providerCount[provider] = (providerCount[provider] ?? 0) + 1;
    });

    const toChartArr = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    const result = {
      occupation:    toChartArr(occupationCount),
      states:        toChartArr(stateCount),
      authProviders: toChartArr(providerCount),
    };
    setCache("admin:analytics", result, 60 * 60 * 1000); // 1 hr TTL
    res.json(result);
  } catch (err) {
    console.error("[Admin] Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/users — paginated list with filters
// Query params: page, limit, search, occupation, state, tag, complete
// ─────────────────────────────────────────────

router.get("/users", adminL3, async (req: any, res) => {
  try {
    const db = getFirestore();
    const page = parseInt((req.query.page as string) ?? "1");
    const pageSize = parseInt((req.query.limit as string) ?? "20");
    const search = ((req.query.search as string) ?? "").toLowerCase().trim();
    const occupationFilter = (req.query.occupation as string) ?? "";
    const stateFilter = (req.query.state as string) ?? "";
    const tagFilter = (req.query.tag as string) ?? "";
    const completeFilter = req.query.complete as string;

    // Build filters first — then sort in memory to avoid composite index requirements.
    // Chaining .orderBy(fieldA) + .where(fieldB) on DIFFERENT fields requires a
    // Firestore composite index; we avoid that by doing the sort client-side.
    let query: any = db.collection("users");

    if (occupationFilter) query = query.where("occupation", "==", occupationFilter);
    if (stateFilter) query = query.where("state", "==", stateFilter);
    if (completeFilter !== undefined && completeFilter !== "") {
      query = query.where("isProfileComplete", "==", completeFilter === "true");
    }

    const snap = await query.get();
    // Sort newest first — createdAt can be a Firestore Timestamp or an ISO string
    const toMs = (v: any): number => {
      if (!v) return 0;
      if (v._seconds) return v._seconds * 1000;
      if (typeof v.toMillis === "function") return v.toMillis();
      return new Date(v).getTime() || 0;
    };
    let docs = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => toMs(b.createdAt) - toMs(a.createdAt));

    // Client-side filtering for search and tags (Firestore doesn't support full-text)
    if (search) {
      docs = docs.filter(
        (u: any) =>
          u.email?.toLowerCase().includes(search) ||
          u.firstName?.toLowerCase().includes(search) ||
          u.lastName?.toLowerCase().includes(search) ||
          u.mobile?.includes(search)
      );
    }
    if (tagFilter) {
      docs = docs.filter((u: any) => Array.isArray(u.tags) && u.tags.includes(tagFilter));
    }

    const total = docs.length;
    const start = (page - 1) * pageSize;
    const paged = docs.slice(start, start + pageSize);

    // Sanitise — remove sensitive fields before sending
    const sanitised = paged.map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImageUrl: u.profileImageUrl,
      mobile: u.mobile,
      occupation: u.occupation,
      city: u.city,
      state: u.state,
      authProvider: u.authProvider,
      isProfileComplete: u.isProfileComplete,
      tags: u.tags ?? [],
      lastNudgedAt: u.lastNudgedAt ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    res.json({ users: sanitised, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error("[Admin] Users list error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/users/:id — single user + notes
// ─────────────────────────────────────────────

router.get("/users/:id", adminL3, async (req: any, res) => {
  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(req.params.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const notesSnap = await db
      .collection("crmNotes")
      .doc(req.params.id)
      .collection("notes")
      .orderBy("createdAt", "desc")
      .get();

    const notes = notesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const u: any = { id: userDoc.id, ...userDoc.data() };
    res.json({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImageUrl: u.profileImageUrl,
      mobile: u.mobile,
      gender: u.gender,
      occupation: u.occupation,
      city: u.city,
      state: u.state,
      authProvider: u.authProvider,
      isProfileComplete: u.isProfileComplete,
      tags: u.tags ?? [],
      lastNudgedAt: u.lastNudgedAt ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      notes,
    });
  } catch (err) {
    console.error("[Admin] User detail error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/users/:id/tags — update tags (L2+)
// Body: { tags: string[] }
// ─────────────────────────────────────────────

router.patch("/users/:id/tags", adminL2, async (req: any, res) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) return res.status(400).json({ error: "tags must be an array" });
    const db = getFirestore();
    await db.collection("users").doc(req.params.id).update({ tags, updatedAt: new Date() });
    res.json({ success: true, tags });
  } catch (err) {
    console.error("[Admin] Tag update error:", err);
    res.status(500).json({ error: "Failed to update tags" });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/users/:id/notes — add CRM note (L2+)
// Body: { text: string }
// ─────────────────────────────────────────────

router.post("/users/:id/notes", adminL2, async (req: any, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Note text required" });
    }
    const db = getFirestore();
    const noteRef = await db
      .collection("crmNotes")
      .doc(req.params.id)
      .collection("notes")
      .add({
        text: text.trim(),
        createdAt: new Date(),
        adminEmail: req.adminEmail,
        adminLevel: req.adminLevel,
      });
    res.json({ id: noteRef.id, text: text.trim(), adminEmail: req.adminEmail });
  } catch (err) {
    console.error("[Admin] Note create error:", err);
    res.status(500).json({ error: "Failed to add note" });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/admin/users/:id/notes/:noteId — delete note (L1 only)
// ─────────────────────────────────────────────

router.delete("/users/:id/notes/:noteId", adminL1, async (req: any, res) => {
  try {
    const db = getFirestore();
    await db
      .collection("crmNotes")
      .doc(req.params.id)
      .collection("notes")
      .doc(req.params.noteId)
      .delete();
    res.json({ success: true });
  } catch (err) {
    console.error("[Admin] Note delete error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/users/:id/nudge — email reminder to complete profile (L2+)
// Rate-limited to one nudge per user per 7 days.
// ─────────────────────────────────────────────

// The profile-completion nudge endpoint was removed on 2026-07-26.
//
// It emailed users who hadn't filled in name/mobile, promising instant PDF
// downloads, personalised tips and saved history. None of those were real —
// `isProfileComplete` gated nothing anywhere in the codebase, so completing a
// profile changed nothing for the user, and no recipient ever completed one.
// Rather than write sharper copy for benefits that don't exist, the whole
// mechanism is gone.
//
// `lastNudgedAt` / `nudgeOptOut` are left on existing user documents rather
// than migrated away — harmless, and they preserve the record of who was
// mailed. sendBrevoEmail() stays because other routes use it, and the
// unsubscribe endpoint stays valid for anyone who received the old mail.

// ─────────────────────────────────────────────
// GET /api/admin/export/users — CSV download (L1 + L2)
// ─────────────────────────────────────────────

router.get("/export/users", adminL2, async (req: any, res) => {
  try {
    const db = getFirestore();
    // Only fetch fields written to the CSV — avoids loading profileImageUrl, large fields, etc.
    const snap = await db.collection("users")
      .orderBy("createdAt", "desc")
      .select("email","firstName","lastName","mobile","gender","occupation","city","state","authProvider","isProfileComplete","tags","createdAt")
      .get();
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    const header = [
      "ID", "Email", "First Name", "Last Name", "Mobile",
      "Gender", "Occupation", "City", "State", "Auth Provider",
      "Profile Complete", "Tags", "Joined",
    ].join(",");

    const rows = users.map((u: any) => {
      const createdAt =
        u.createdAt?.toDate?.()?.toISOString?.() ??
        new Date(u.createdAt).toISOString();
      return [
        u.id,
        u.email ?? "",
        u.firstName ?? "",
        u.lastName ?? "",
        u.mobile ?? "",
        u.gender ?? "",
        u.occupation ?? "",
        u.city ?? "",
        u.state ?? "",
        u.authProvider ?? "",
        u.isProfileComplete ? "Yes" : "No",
        (u.tags ?? []).join(";"),
        createdAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aitaxbot-users-${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error("[Admin] Export error:", err);
    res.status(500).json({ error: "Failed to export users" });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/tags — list of all unique tags in use
// ─────────────────────────────────────────────

router.get("/tags", adminL3, async (_req: any, res) => {
  // Tags are a fixed predefined set — no Firestore scan needed.
  // Custom tags added to users are surfaced in the users list directly.
  const defaults = ["High Value", "Lead", "CA Client", "Follow Up", "VIP", "Inactive", "Referred"];
  res.json({ tags: defaults.sort() });
});

// ─────────────────────────────────────────────────────────────────────────────
// CA DIRECTORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signed unsubscribe token.
 *
 * The unsubscribe link has to work from an email client with no session, so
 * the user id travels in the URL. Signing it stops anyone from unsubscribing
 * another user (or enumerating ids) by editing the query string — without a
 * valid signature the endpoint refuses.
 *
 * Falls back to the Brevo key as signing material if no dedicated secret is
 * set, purely so this cannot silently degrade to an unsigned link in an
 * environment that hasn't been given EMAIL_TOKEN_SECRET yet.
 */
export function unsubToken(uid: string): string {
  const secret = process.env.EMAIL_TOKEN_SECRET || process.env.BREVO_API_KEY || "aitaxbot-unsub";
  return createHmac("sha256", secret).update(`unsub:${uid}`).digest("hex").slice(0, 32);
}

export function verifyUnsubToken(uid: string, token: string): boolean {
  const expected = unsubToken(uid);
  if (token.length !== expected.length) return false;
  // Constant-time compare — avoids leaking the correct token through timing.
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

async function sendBrevoEmail(params: {
  to: { email: string; name: string }[];
  subject: string;
  htmlContent: string;
}) {
  const apiInstance = new TransactionalEmailsApi();
  apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);
  await apiInstance.sendTransacEmail({
    sender: { email: process.env.BREVO_SENDER_EMAIL || "noreply@aitaxbot.co.in", name: "AiTaxBot" },
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
  });
}

// GET /api/admin/ca/list — list all CA profiles, filterable by status
router.get("/ca/list", adminL3, async (req: any, res) => {
  try {
    const db = getFirestore();
    const { status, limit = "50" } = req.query as any;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // IMPORTANT: combining .where(fieldA) + .orderBy(fieldB) on DIFFERENT fields
    // requires a Firestore composite index. To avoid that, we either:
    //   a) use only .orderBy() when no status filter (relies on single-field index)
    //   b) use only .where() when filtering by status, then sort in memory
    let ref: any = db.collection(COLLECTIONS.CA_PROFILES);
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      // Single-field equality — auto-indexed, no composite index needed
      ref = ref.where("status", "==", status);
    } else {
      // No filter: fetch all ordered by date (single-field index, always exists)
      ref = ref.orderBy("createdAt", "desc");
    }

    // Fetch up to 2× limit so in-memory sort still gives correct top-N results
    const snap = await ref.limit(limitNum * 2).get();
    const toMs2 = (v: any): number => {
      if (!v) return 0;
      if (v._seconds) return v._seconds * 1000;
      if (typeof v.toMillis === "function") return v.toMillis();
      return new Date(v).getTime() || 0;
    };
    const cas = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => toMs2(b.createdAt) - toMs2(a.createdAt))
      .slice(0, limitNum);

    res.json({ cas, count: cas.length });
  } catch (err) {
    console.error("[Admin] CA list error:", err);
    res.status(500).json({ error: "Failed to fetch CA list" });
  }
});

// POST /api/admin/ca/:id/approve — approve a CA profile
router.post("/ca/:id/approve", adminL2, async (req: any, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection(COLLECTIONS.CA_PROFILES).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "CA profile not found" });

    const ca = snap.data() as any;
    const now = new Date().toISOString();
    await ref.update({ status: "approved", approvedAt: now, rejectedReason: null });

    // Email the CA
    try {
      await sendBrevoEmail({
        to: [{ email: ca.email, name: ca.fullName }],
        subject: "🎉 Your AiTaxBot CA Profile is Approved!",
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#0f172a;">Congratulations, ${ca.fullName}!</h2>
            <p>Your CA profile on <strong>AiTaxBot</strong> has been reviewed and <strong>approved</strong>. It is now live in our CA Directory.</p>
            <p>Potential clients can now discover you via our <a href="https://aitaxbot.co.in/find-ca" style="color:#3b82f6;">Find a CA</a> directory.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
            <p style="color:#64748b;font-size:13px;">AiTaxBot · Free Tax Tools for India · <a href="https://aitaxbot.co.in">aitaxbot.co.in</a></p>
          </div>`,
      });
    } catch (emailErr) {
      console.error("[Admin] CA approval email failed:", emailErr);
    }

    res.json({ success: true, status: "approved" });
  } catch (err) {
    console.error("[Admin] CA approve error:", err);
    res.status(500).json({ error: "Failed to approve CA" });
  }
});

// POST /api/admin/ca/:id/reject — reject a CA profile
router.post("/ca/:id/reject", adminL2, async (req: any, res) => {
  try {
    const db = getFirestore();
    const ref = db.collection(COLLECTIONS.CA_PROFILES).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "CA profile not found" });

    const ca = snap.data() as any;
    const { reason = "Your profile did not meet our listing requirements." } = req.body;
    await ref.update({ status: "rejected", rejectedReason: reason });

    try {
      await sendBrevoEmail({
        to: [{ email: ca.email, name: ca.fullName }],
        subject: "AiTaxBot CA Profile — Action Required",
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#0f172a;">Hi ${ca.fullName},</h2>
            <p>After reviewing your CA profile submission, we were unable to approve it at this time.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>You are welcome to re-register at <a href="https://aitaxbot.co.in/ca/register" style="color:#3b82f6;">aitaxbot.co.in/ca/register</a> after addressing the above.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
            <p style="color:#64748b;font-size:13px;">AiTaxBot · Free Tax Tools for India · <a href="https://aitaxbot.co.in">aitaxbot.co.in</a></p>
          </div>`,
      });
    } catch (emailErr) {
      console.error("[Admin] CA rejection email failed:", emailErr);
    }

    res.json({ success: true, status: "rejected" });
  } catch (err) {
    console.error("[Admin] CA reject error:", err);
    res.status(500).json({ error: "Failed to reject CA" });
  }
});

// DELETE /api/admin/ca/:id — permanently remove a CA profile (Super Admin only)
router.delete("/ca/:id", adminL1, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "id required" });

    const db = getFirestore();
    const ref = db.collection(COLLECTIONS.CA_PROFILES).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "CA profile not found" });

    const caData: any = snap.data();
    await ref.delete();

    console.log(`[Admin] CA profile deleted: ${id} (${caData?.fullName || "unknown"}) by admin ${req.adminUid}`);
    res.json({ success: true, deleted: id });
  } catch (err) {
    console.error("[Admin] CA delete error:", err);
    res.status(500).json({ error: "Failed to delete CA profile" });
  }
});

// DELETE /api/admin/users/:id — permanently delete a user account (Super Admin only)
router.delete("/users/:id", adminL1, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "id required" });

    // Prevent accidental self-deletion
    if (id === req.adminUid) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const db = getFirestore();
    const ref = db.collection("users").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "User not found" });

    const userData: any = snap.data();

    const logsSnap = await db.collection("userProfileLogs").where("userId", "==", id).get();
    const calcSnap = await db.collection("taxCalculationHistory").where("userId", "==", id).get();
    const batch = db.batch();
    logsSnap.docs.forEach((d) => batch.delete(d.ref));
    calcSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection("crmNotes").doc(id));
    batch.delete(ref);
    await batch.commit();

    // Previously this route only deleted the Firestore profile, leaving the
    // actual Firebase Auth account intact — the person could still log in
    // with a "deleted" account. Delete the Auth user too, same as the
    // self-service DELETE /api/user/account route.
    try {
      await admin.auth().deleteUser(id);
    } catch (authErr: any) {
      if (authErr?.code !== "auth/user-not-found") throw authErr;
    }

    console.log(`[Admin] User deleted: ${id} (${userData?.email || "unknown"}) by admin ${req.adminUid}`);
    res.json({ success: true, deleted: id });
  } catch (err) {
    console.error("[Admin] User delete error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/leads — list last 500 leads (also in leadRoutes, here for admin panel)
router.get("/leads", adminL3, async (_req: any, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection(COLLECTIONS.LEADS)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();
    const leads = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    res.json({ leads, count: leads.length });
  } catch (err) {
    console.error("[Admin] Leads list error:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

export default router;

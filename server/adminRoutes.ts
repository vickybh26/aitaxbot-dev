/**
 * Admin Routes — AiTaxBot Admin Dashboard & CRM
 *
 * Access levels:
 *   Level 1 (Super Admin) — full access: users, analytics, CRM, export, admin setup instructions
 *   Level 2 (Manager)     — users, CRM notes/tags, analytics; no export
 *   Level 3 (Viewer)      — read-only: users list + analytics; no CRM writes
 *
 * Admin accounts are created MANUALLY in Firestore:
 *   Collection: admins / Doc ID: Firebase UID
 *   { level: 1|2|3, name: "...", email: "...", createdAt: Timestamp }
 *
 * Admin UIDs must NOT exist in the `users` collection (separate accounts).
 */

import { Router } from "express";
import { getFirestore, verifyFirebaseToken, admin } from "./firebase";

const router = Router();

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
    const adminDoc = await db.collection("admins").doc(decoded.uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ error: "Not an admin account" });
    }
    const adminData = adminDoc.data()!;
    if (adminData.level > minLevel) {
      return res.status(403).json({ error: `Requires admin level ${minLevel} or higher` });
    }

    req.adminUid = decoded.uid;
    req.adminLevel = adminData.level as number;
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
    const db = getFirestore();

    // Total registered users
    const usersSnap = await db.collection("users").count().get();
    const totalUsers = usersSnap.data().count;

    // New users in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersSnap = await db
      .collection("users")
      .where("createdAt", ">=", sevenDaysAgo)
      .count()
      .get();
    const newUsersWeek = newUsersSnap.data().count;

    // New users in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersMonthSnap = await db
      .collection("users")
      .where("createdAt", ">=", thirtyDaysAgo)
      .count()
      .get();
    const newUsersMonth = newUsersMonthSnap.data().count;

    // Total calculation count
    const counterDoc = await db.collection("counters").doc("taxCalculations").get();
    const totalCalculations = counterDoc.exists ? (counterDoc.data()?.count ?? 0) : 0;

    // Profile completion rate
    const completeSnap = await db
      .collection("users")
      .where("isProfileComplete", "==", true)
      .count()
      .get();
    const completedProfiles = completeSnap.data().count;
    const profileCompletionRate =
      totalUsers > 0 ? Math.round((completedProfiles / totalUsers) * 100) : 0;

    // Signups per day for last 30 days (for trend chart)
    const thirtyDaysUsers = await db
      .collection("users")
      .where("createdAt", ">=", thirtyDaysAgo)
      .orderBy("createdAt", "asc")
      .get();

    const signupsByDay: Record<string, number> = {};
    thirtyDaysUsers.docs.forEach((doc) => {
      const createdAt = doc.data().createdAt?.toDate?.() ?? new Date(doc.data().createdAt);
      const dateKey = createdAt.toISOString().split("T")[0];
      signupsByDay[dateKey] = (signupsByDay[dateKey] ?? 0) + 1;
    });

    // Fill in missing days with 0
    const signupTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split("T")[0];
      signupTrend.push({ date: dateKey, signups: signupsByDay[dateKey] ?? 0 });
    }

    res.json({
      totalUsers,
      newUsersWeek,
      newUsersMonth,
      totalCalculations,
      completedProfiles,
      profileCompletionRate,
      signupTrend,
    });
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
    const db = getFirestore();
    const usersSnap = await db.collection("users").get();

    const occupationCount: Record<string, number> = {};
    const stateCount: Record<string, number> = {};
    const providerCount: Record<string, number> = {};

    usersSnap.docs.forEach((doc) => {
      const d = doc.data();
      const occ = d.occupation || "Not specified";
      const state = d.state || "Not specified";
      const provider = d.authProvider || "email";
      occupationCount[occ] = (occupationCount[occ] ?? 0) + 1;
      stateCount[state] = (stateCount[state] ?? 0) + 1;
      providerCount[provider] = (providerCount[provider] ?? 0) + 1;
    });

    const toChartArr = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    res.json({
      occupation: toChartArr(occupationCount),
      states: toChartArr(stateCount),
      authProviders: toChartArr(providerCount),
    });
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

    let query: any = db.collection("users").orderBy("createdAt", "desc");

    if (occupationFilter) query = query.where("occupation", "==", occupationFilter);
    if (stateFilter) query = query.where("state", "==", stateFilter);
    if (completeFilter !== undefined && completeFilter !== "") {
      query = query.where("isProfileComplete", "==", completeFilter === "true");
    }

    const snap = await query.get();
    let docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

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
// GET /api/admin/export/users — CSV download (L1 + L2)
// ─────────────────────────────────────────────

router.get("/export/users", adminL2, async (req: any, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("users").orderBy("createdAt", "desc").get();
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

router.get("/tags", adminL3, async (req: any, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("users").where("tags", "!=", []).get();
    const tagSet = new Set<string>();
    snap.docs.forEach((d) => {
      const tags = d.data().tags ?? [];
      tags.forEach((t: string) => tagSet.add(t));
    });
    // Always include default tag suggestions
    const defaults = ["High Value", "Lead", "CA Client", "Follow Up", "VIP", "Inactive", "Referred"];
    defaults.forEach((t) => tagSet.add(t));
    res.json({ tags: Array.from(tagSet).sort() });
  } catch (err) {
    console.error("[Admin] Tags error:", err);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

export default router;

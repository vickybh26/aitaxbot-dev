/**
 * caRoutes.ts — CA Profile & Introduction Service
 *
 * Compliant with the Chartered Accountants Act, 1949 and ICAI Code of Ethics.
 * This is a factual directory / introduction service only.
 * No ratings, rankings, endorsements, or advertising of professional services.
 */

import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { getFirestore, verifyFirebaseToken } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";
import {
  insertCAProfileSchema,
  insertCAContactRequestSchema,
  type CAProfile,
  type CAContactRequest,
} from "@shared/schema";

const router = Router();

// ─── Admin middleware ──────────────────────────────────────────────────────
// Mirrors the requireAdmin() in adminRoutes.ts. Requires Firebase ID token
// with a matching document in Firestore `admin/<uid>` with level 1–3.

async function requireAdmin(req: any, res: any, next: any): Promise<any> {
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
    const level = Number(adminDoc.data()!.level);
    if (!Number.isInteger(level) || level < 1 || level > 3) {
      return res.status(403).json({ error: "Invalid admin level" });
    }
    req.adminUid = decoded.uid;
    req.adminLevel = level;
    next();
  } catch (err) {
    console.error("[CA Admin] Auth error:", err);
    return res.status(500).json({ error: "Auth check failed" });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function sendBrevoEmail(params: {
  to: { email: string; name: string }[];
  subject: string;
  htmlContent: string;
}) {
  const apiInstance = new TransactionalEmailsApi();
  apiInstance.setApiKey(
    TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY!
  );
  await apiInstance.sendTransacEmail({
    sender: {
      email: process.env.BREVO_SENDER_EMAIL || "noreply@aitaxbot.co.in",
      name: "AiTaxBot",
    },
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
  });
}

// ─── POST /api/ca/register ─────────────────────────────────────────────────
// Public — CA submits their profile for admin approval

router.post("/register", async (req: Request, res: Response) => {
  try {
    const parsed = insertCAProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const { agreeToEthics, ...profileData } = parsed.data;

    const db = getFirestore();

    // ── Duplicate checks (run in parallel for speed) ────────────────────────
    // Each uses a single-field equality query — no composite index required.
    const [icaiSnap, emailSnap] = await Promise.all([
      db.collection(COLLECTIONS.CA_PROFILES)
        .where("icaiMembershipNumber", "==", profileData.icaiMembershipNumber)
        .limit(1).get(),
      db.collection(COLLECTIONS.CA_PROFILES)
        .where("email", "==", profileData.email)
        .limit(1).get(),
    ]);

    if (!icaiSnap.empty) {
      const ex = icaiSnap.docs[0].data();
      const statusLabel =
        ex.status === "approved"  ? "is already live in our directory" :
        ex.status === "pending"   ? "is already under review" :
                                    "was previously submitted";
      return res.status(409).json({
        error: `ICAI membership number ${profileData.icaiMembershipNumber} ${statusLabel}. To update your profile or resolve an issue, email support@aitaxbot.co.in`,
      });
    }

    if (!emailSnap.empty) {
      const ex = emailSnap.docs[0].data();
      const statusLabel =
        ex.status === "approved" ? "is already active" : "is already under review";
      return res.status(409).json({
        error: `A CA profile with this email address ${statusLabel}. To update your details, email support@aitaxbot.co.in`,
      });
    }
    // ── End duplicate checks ─────────────────────────────────────────────────

    const id = randomUUID();
    const now = new Date().toISOString();

    const profile: CAProfile = {
      id,
      ...profileData,
      status: "pending",
      createdAt: now,
    };

    await db
      .collection(COLLECTIONS.CA_PROFILES)
      .doc(id)
      .set(profile);

    // Notify admin
    try {
      await sendBrevoEmail({
        to: [{ email: "vickybh26@gmail.com", name: "AiTaxBot Admin" }],
        subject: `New CA Registration — ${profileData.fullName} (${profileData.icaiMembershipNumber})`,
        htmlContent: `
          <h2>New CA Profile Pending Approval</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Name</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.fullName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>ICAI No.</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.icaiMembershipNumber}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Firm</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.firmName || "—"}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>City</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.city}, ${profileData.state}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Email</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.email}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>WhatsApp</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.whatsappNumber || "—"}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Practice Areas</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.practiceAreas.join(", ")}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Years</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.yearsOfPractice}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Bio</b></td><td style="padding:8px;border:1px solid #ddd">${profileData.bio || "—"}</td></tr>
          </table>
          <p style="margin-top:16px">
            <a href="https://aitaxbot.co.in/admin/cas" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">
              Approve in Admin Panel
            </a>
          </p>
          <p style="color:#888;font-size:12px">Profile ID: ${id}</p>
        `,
      });
    } catch (e) {
      console.error("Admin notification email failed:", e);
    }

    // Confirm to CA
    try {
      await sendBrevoEmail({
        to: [{ email: profileData.email, name: profileData.fullName }],
        subject: "Your AiTaxBot CA profile is under review",
        htmlContent: `
          <h2>Thank you, ${profileData.fullName}!</h2>
          <p>Your profile has been submitted and is currently under review. We typically approve profiles within 1–2 business days after verifying your ICAI membership number.</p>
          <p>Once approved, your profile will appear in our <b>Find a CA</b> directory at <a href="https://aitaxbot.co.in/find-ca">aitaxbot.co.in/find-ca</a>.</p>
          <p><b>What you submitted:</b><br/>
          ICAI No.: ${profileData.icaiMembershipNumber}<br/>
          City: ${profileData.city}, ${profileData.state}</p>
          <p style="color:#888;font-size:12px">If you have questions, reply to this email or contact us at support@aitaxbot.co.in</p>
        `,
      });
    } catch (e) {
      console.error("CA confirmation email failed:", e);
    }

    return res.status(201).json({ success: true, id });
  } catch (err) {
    console.error("CA register error:", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ─── GET /api/ca/list ──────────────────────────────────────────────────────
// Public — returns approved profiles only
// Query params: city, state, practiceArea

router.get("/list", async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    let query = db
      .collection(COLLECTIONS.CA_PROFILES)
      .where("status", "==", "approved") as FirebaseFirestore.Query;

    if (req.query.state) {
      query = query.where("state", "==", req.query.state as string);
    }

    const snapshot = await query.get();
    let profiles = snapshot.docs.map((d) => d.data() as CAProfile);

    // Filter by practiceArea in-memory (Firestore array-contains only supports one value)
    if (req.query.practiceArea) {
      profiles = profiles.filter((p) =>
        p.practiceAreas.includes(req.query.practiceArea as any)
      );
    }

    // Filter by city (case-insensitive, in-memory)
    if (req.query.city) {
      const city = (req.query.city as string).toLowerCase();
      profiles = profiles.filter((p) =>
        p.city.toLowerCase().includes(city)
      );
    }

    // Alphabetical by name — no ranking, no ratings (CA Act compliance)
    profiles.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Strip sensitive fields before returning
    const safe = profiles.map(({ ...p }) => {
      // Remove any internal flags; return public-safe fields only
      return {
        id: p.id,
        fullName: p.fullName,
        firmName: p.firmName,
        city: p.city,
        state: p.state,
        practiceAreas: p.practiceAreas,
        languages: p.languages,
        yearsOfPractice: p.yearsOfPractice,
        email: p.email,
        whatsappNumber: p.whatsappNumber,
        bio: p.bio,
        icaiMembershipNumber: p.icaiMembershipNumber,
      };
    });

    return res.json({ profiles: safe });
  } catch (err) {
    console.error("CA list error:", err);
    return res.status(500).json({ error: "Could not fetch CA list." });
  }
});

// ─── POST /api/ca/contact ──────────────────────────────────────────────────
// Public — user requests introduction to a CA

router.post("/contact", async (req: Request, res: Response) => {
  try {
    const parsed = insertCAContactRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;
    const db = getFirestore();
    const id = randomUUID();
    const now = new Date().toISOString();

    const contactReq: CAContactRequest = { id, ...data, createdAt: now };
    await db
      .collection(COLLECTIONS.CA_CONTACT_REQUESTS)
      .doc(id)
      .set(contactReq);

    // Email to CA
    try {
      await sendBrevoEmail({
        to: [{ email: data.caEmail, name: data.caName }],
        subject: `New client introduction from AiTaxBot — ${data.userName}`,
        htmlContent: `
          <h2>New Introduction from AiTaxBot</h2>
          <p>A user has requested an introduction to you through <a href="https://aitaxbot.co.in">AiTaxBot</a>.</p>
          <table style="border-collapse:collapse;width:100%;max-width:500px">
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Name</b></td><td style="padding:8px;border:1px solid #ddd">${data.userName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Email</b></td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${data.userEmail}">${data.userEmail}</a></td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Phone</b></td><td style="padding:8px;border:1px solid #ddd">${data.userPhone || "Not provided"}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>Tax Issue</b></td><td style="padding:8px;border:1px solid #ddd">${data.taxIssue}</td></tr>
          </table>
          <p style="margin-top:16px">Please reach out to them directly at your earliest convenience.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <p style="color:#888;font-size:12px">
            This introduction is provided by AiTaxBot as a free technology service.<br/>
            AiTaxBot does not charge any fee for this introduction and is not party to any professional engagement between you and the client.<br/>
            Please ensure your engagement complies with the Chartered Accountants Act, 1949 and ICAI Code of Ethics.
          </p>
        `,
      });
    } catch (e) {
      console.error("CA contact email to CA failed:", e);
    }

    // Confirmation to user
    try {
      await sendBrevoEmail({
        to: [{ email: data.userEmail, name: data.userName }],
        subject: `Your introduction request to ${data.caName} has been sent`,
        htmlContent: `
          <h2>Introduction Sent!</h2>
          <p>Hi ${data.userName},</p>
          <p>We've sent your introduction request to <b>${data.caName}</b>. They will reach out to you directly at <b>${data.userEmail}</b>${data.userPhone ? ` or <b>${data.userPhone}</b>` : ""}.</p>
          <p><b>Your request summary:</b><br/>${data.taxIssue}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <p style="color:#888;font-size:12px">
            <b>Disclaimer:</b> AiTaxBot is a technology platform and not a tax practice. We do not recommend, endorse, or certify any Chartered Accountant.
            Please verify CA credentials independently at <a href="https://www.icai.org/post.html?post_id=11967">ICAI Member Search</a> before engaging professional services.
          </p>
        `,
      });
    } catch (e) {
      console.error("CA contact confirmation email failed:", e);
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("CA contact error:", err);
    return res.status(500).json({ error: "Could not send introduction. Please try again." });
  }
});

// ─── Admin: PATCH /api/ca/:id/approve ─────────────────────────────────────

router.patch("/:id/approve", requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const ref = db.collection(COLLECTIONS.CA_PROFILES).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Profile not found" });

    const profile = doc.data() as CAProfile;
    await ref.update({ status: "approved", approvedAt: new Date().toISOString() });

    // Notify CA
    try {
      await sendBrevoEmail({
        to: [{ email: profile.email, name: profile.fullName }],
        subject: "Your AiTaxBot CA profile is now live!",
        htmlContent: `
          <h2>Congratulations, ${profile.fullName}!</h2>
          <p>Your CA profile has been approved and is now live on <a href="https://aitaxbot.co.in/find-ca">AiTaxBot Find a CA</a>.</p>
          <p>Users looking for help with ${profile.practiceAreas.join(", ")} in ${profile.city} can now reach you directly.</p>
          <p style="color:#888;font-size:12px">To update or remove your profile, contact support@aitaxbot.co.in</p>
        `,
      });
    } catch (e) {
      console.error("CA approval notification failed:", e);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("CA approve error:", err);
    return res.status(500).json({ error: "Approval failed." });
  }
});

// ─── Admin: PATCH /api/ca/:id/reject ──────────────────────────────────────

router.patch("/:id/reject", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const db = getFirestore();
    const ref = db.collection(COLLECTIONS.CA_PROFILES).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Profile not found" });

    await ref.update({ status: "rejected", rejectedReason: reason || "Did not meet listing criteria" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Rejection failed." });
  }
});

// ─── Admin: GET /api/ca/pending ────────────────────────────────────────────

router.get("/pending", requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTIONS.CA_PROFILES)
      .where("status", "==", "pending")
      .get();
    const profiles = snapshot.docs.map((d) => d.data() as CAProfile);
    return res.json({ profiles });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch pending profiles." });
  }
});

// ─── POST /api/ca/my-profile/verify ───────────────────────────────────────
// CA self-update: step 1 — verify identity via ICAI no. + registered email.
// Returns the public profile fields for pre-filling the edit form.
// No Firebase auth — CAs are not registered as Firebase users.

router.post("/my-profile/verify", async (req: Request, res: Response) => {
  try {
    const { icaiMembershipNumber, email } = req.body;
    if (!icaiMembershipNumber || !email) {
      return res.status(400).json({ error: "ICAI membership number and email are required." });
    }

    const db = getFirestore();
    const snap = await db
      .collection(COLLECTIONS.CA_PROFILES)
      .where("icaiMembershipNumber", "==", String(icaiMembershipNumber).trim())
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: "No CA profile found with this ICAI membership number." });
    }

    const profile = snap.docs[0].data() as CAProfile;
    if (profile.email.toLowerCase() !== String(email).trim().toLowerCase()) {
      // Deliberate 404 — don't confirm the ICAI number is valid to a wrong email.
      return res.status(404).json({ error: "No CA profile found with this ICAI membership number." });
    }

    // Return the profile (minus internal admin fields)
    return res.json({
      id: profile.id,
      fullName: profile.fullName,
      firmName: profile.firmName,
      icaiMembershipNumber: profile.icaiMembershipNumber,
      city: profile.city,
      state: profile.state,
      email: profile.email,
      whatsappNumber: profile.whatsappNumber,
      practiceAreas: profile.practiceAreas,
      languages: profile.languages,
      yearsOfPractice: profile.yearsOfPractice,
      bio: profile.bio,
      status: profile.status,
    });
  } catch (err) {
    console.error("CA verify error:", err);
    return res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ─── PUT /api/ca/my-profile ───────────────────────────────────────────────
// CA self-update: step 2 — submit updated profile.
// Identity re-verified via icaiMembershipNumber + email in body.
// Updates allowed fields; sets status back to "pending" for admin review.

router.put("/my-profile", async (req: Request, res: Response) => {
  try {
    const { icaiMembershipNumber, email, ...updates } = req.body;
    if (!icaiMembershipNumber || !email) {
      return res.status(400).json({ error: "ICAI membership number and email are required." });
    }

    const db = getFirestore();
    const snap = await db
      .collection(COLLECTIONS.CA_PROFILES)
      .where("icaiMembershipNumber", "==", String(icaiMembershipNumber).trim())
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const existing = snap.docs[0].data() as CAProfile;
    if (existing.email.toLowerCase() !== String(email).trim().toLowerCase()) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Whitelist of fields a CA may update themselves
    const ALLOWED = [
      "fullName", "firmName", "city", "state", "whatsappNumber",
      "practiceAreas", "languages", "yearsOfPractice", "bio",
    ] as const;

    const patch: Record<string, any> = { status: "pending", updatedAt: new Date().toISOString() };
    for (const field of ALLOWED) {
      if (field in updates && updates[field] !== undefined) {
        patch[field] = updates[field];
      }
    }

    await snap.docs[0].ref.update(patch);

    // Notify admin
    try {
      await sendBrevoEmail({
        to: [{ email: "vickybh26@gmail.com", name: "AiTaxBot Admin" }],
        subject: `CA Profile Updated — ${existing.fullName} (${existing.icaiMembershipNumber})`,
        htmlContent: `
          <h2>CA Profile Updated — Pending Re-Approval</h2>
          <p><strong>${existing.fullName}</strong> (ICAI: ${existing.icaiMembershipNumber}) has updated their profile and it is now pending review.</p>
          <p>
            <a href="https://aitaxbot.co.in/admin/cas" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">
              Review in Admin Panel
            </a>
          </p>
        `,
      });
    } catch (e) {
      console.error("CA update admin notification failed:", e);
    }

    // Confirm to CA
    try {
      await sendBrevoEmail({
        to: [{ email: existing.email, name: existing.fullName }],
        subject: "Your AiTaxBot CA profile update is under review",
        htmlContent: `
          <h2>Profile update received, ${existing.fullName}!</h2>
          <p>Your updated profile has been submitted and is now under review. We typically complete re-approvals within 1–2 business days.</p>
          <p style="color:#888;font-size:12px">If you have questions, contact support@aitaxbot.co.in</p>
        `,
      });
    } catch (e) {
      console.error("CA update confirmation email failed:", e);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("CA update error:", err);
    return res.status(500).json({ error: "Update failed. Please try again." });
  }
});

export default router;

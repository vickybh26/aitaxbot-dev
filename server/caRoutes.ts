/**
 * caRoutes.ts — CA Profile & Introduction Service
 *
 * Compliant with the Chartered Accountants Act, 1949 and ICAI Code of Ethics.
 * This is a factual directory / introduction service only.
 * No ratings, rankings, endorsements, or advertising of professional services.
 */

import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { getFirestore } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";
import {
  insertCAProfileSchema,
  insertCAContactRequestSchema,
  type CAProfile,
  type CAContactRequest,
} from "@shared/schema";

const router = Router();

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

router.patch("/:id/approve", async (req: Request, res: Response) => {
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

router.patch("/:id/reject", async (req: Request, res: Response) => {
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

router.get("/pending", async (req: Request, res: Response) => {
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

export default router;

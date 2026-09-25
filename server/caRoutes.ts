/**
 * caRoutes.ts — CA Profile & Introduction Service
 *
 * Compliant with the Chartered Accountants Act, 1949 and ICAI Code of Ethics.
 * This is a factual directory / introduction service only.
 * No ratings, rankings, endorsements, or advertising of professional services.
 */

import { Router, type Request, type Response } from "express";
import { randomUUID, randomBytes, createHash, timingSafeEqual } from "crypto";
import { getFirestore, verifyFirebaseToken } from "./firebase";
import { COLLECTIONS } from "./firestoreHelper";
import { sendEmail } from "./emailService";
import {
  insertCAProfileSchema,
  insertCAContactRequestSchema,
  type CAProfile,
  type CAContactRequest,
} from "@shared/schema";

const router = Router();


// ─── CA self-edit access tokens ────────────────────────────────────────────
//
// Replaces the previous scheme, which treated `icaiMembershipNumber` + `email`
// as proof of identity. Both of those are published in the public directory
// response (see the /list handler below), so anyone who could read the
// directory could rewrite any CA's profile — and because an update also sets
// `status: "pending"`, that edit removed the victim from the approved-only
// listing. Confirmed against production on 2026-09-25: /api/ca/list returned
// both fields for all approved profiles.
//
// The fix is to make the registered email the CHANNEL rather than the
// credential. Proving you can read mail sent to the address on file is
// evidence; quoting an address back to us is not.
//
// Shape: request-access mails a one-time code, verify exchanges that code for
// an edit token, and the PUT requires the edit token. Only hashes are stored,
// so a leak of this collection does not yield a usable code.

const CA_EDIT_TOKENS = "caEditTokens";
const CODE_TTL_MS = 15 * 60 * 1000;   // time to fetch the code out of an inbox
const EDIT_TTL_MS = 30 * 60 * 1000;   // time to finish editing once verified
const MAX_CODE_ATTEMPTS = 5;

function sha256(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}

/**
 * 8 characters from an unambiguous alphabet — no O/0, I/1, so a code read off
 * a screen and typed into a form does not fail on a character the reader
 * cannot distinguish. 32^8 is ~1.1e12, and attempts are capped at
 * MAX_CODE_ATTEMPTS, so guessing is not a practical path.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

/** Constant-time compare of two hex digests of equal length. */
function hashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

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
    const level = Number((adminDoc.data()! as any).level);
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

// sendBrevoEmail() moved to emailService.ts (2026-09-06) — see sendEmail()
// there, now shared by every route that sends mail.

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
      const ex = icaiSnap.docs[0].data() as any;
      const statusLabel =
        ex.status === "approved"  ? "is already live in our directory" :
        ex.status === "pending"   ? "is already under review" :
                                    "was previously submitted";
      return res.status(409).json({
        error: `ICAI membership number ${profileData.icaiMembershipNumber} ${statusLabel}. To update your profile or resolve an issue, email support@aitaxbot.co.in`,
      });
    }

    if (!emailSnap.empty) {
      const ex = emailSnap.docs[0].data() as any;
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
      await sendEmail({
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
      await sendEmail({
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
      .where("status", "==", "approved") as FirebaseFirestore.Query<any>;

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
      await sendEmail({
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
      await sendEmail({
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
      await sendEmail({
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

// ─── POST /api/ca/my-profile/request-access ───────────────────────────────
// CA self-update: step 1 — mail a one-time code to the REGISTERED address.
//
// Deliberately returns the same response whether or not a profile matched.
// The previous handler returned 404 for an unknown ICAI number and 404 for a
// wrong email, which at least confirmed nothing; but any endpoint that reports
// "found" vs "not found" here turns the directory into a membership oracle.

router.post("/my-profile/request-access", async (req: Request, res: Response) => {
  // Always answers with a requestId, matched or not. An earlier draft returned
  // one only on a match, which meant the RESPONSE SHAPE leaked exactly what the
  // generic message was written to hide — caught in testing 2026-09-25. On a
  // non-match the id is a random UUID with no backing document, so the code
  // step then fails the same way an expired or wrong code does.
  const generic = () => ({
    ok: true,
    requestId: randomUUID(),
    message:
      "If that ICAI membership number matches a profile, we have emailed a one-time code to the address registered on it.",
  });

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

    if (snap.empty) return res.json(generic());

    const profile = snap.docs[0].data() as CAProfile;
    if (profile.email.toLowerCase() !== String(email).trim().toLowerCase()) {
      return res.json(generic());
    }

    // Opportunistic sweep: a challenge that is never completed would otherwise
    // sit in this collection forever. verify/PUT delete on expiry, but only if
    // someone comes back — an abandoned request never does. Bounded to this
    // profile's own stale rows, so it stays cheap and needs no scheduler.
    try {
      const stale = await db
        .collection(CA_EDIT_TOKENS)
        .where("profileId", "==", snap.docs[0].id)
        .get();
      const now = Date.now();
      await Promise.all(
        stale.docs
          .filter((d) => now > new Date((d.data() as any).expiresAt).getTime())
          .map((d) => d.ref.delete()),
      );
    } catch (sweepErr) {
      // A failed sweep must never block a CA from requesting a code.
      console.error("CA edit token sweep failed:", sweepErr);
    }

    const code = generateCode();
    const requestId = randomUUID();

    await db.collection(CA_EDIT_TOKENS).doc(requestId).set({
      profileId: snap.docs[0].id,
      codeHash: sha256(code),
      attempts: 0,
      verified: false,
      editTokenHash: null,
      expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Sent to profile.email — the address stored on the record — NOT to the
    // address supplied in the request. They are equal on this path today, but
    // using the stored one keeps the guarantee true if the match ever loosens.
    // Email is the ONLY channel for this code — if it does not send, the CA
    // is locked out and the generic response gives them no clue why. sendEmail
    // never throws, so check the result rather than assuming delivery.
    const mail = await sendEmail({
      to: [{ email: profile.email, name: profile.fullName }],
      subject: `Your AiTaxBot profile edit code: ${code}`,
      htmlContent: `
        <p>Hello ${profile.fullName},</p>
        <p>Use this code to edit your AiTaxBot CA directory profile:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:3px;font-family:monospace">${code}</p>
        <p>It expires in 15 minutes and can be used once.</p>
        <p style="color:#64748b;font-size:13px">If you did not ask to edit your profile, ignore this email — nothing has changed, and whoever requested it cannot proceed without this code.</p>
      `,
    });

    if (!mail.sent) {
      console.error(
        `[CA] Edit code for profile ${snap.docs[0].id} could not be emailed (${mail.reason ?? "unknown"}). ` +
        `The CA cannot complete verification until mail delivery works.`
      );
    }

    return res.json({ ...generic(), requestId });
  } catch (err) {
    console.error("CA edit access request error:", err);
    return res.status(500).json({ error: "Could not start verification. Please try again." });
  }
});

// ─── POST /api/ca/my-profile/verify ───────────────────────────────────────
// CA self-update: step 2 — exchange the emailed code for an edit token.
// The code is consumed here whether or not the CA goes on to save, so a code
// that has been used to read a profile cannot be replayed later.

router.post("/my-profile/verify", async (req: Request, res: Response) => {
  try {
    const { requestId, code } = req.body;
    if (!requestId || !code) {
      return res.status(400).json({ error: "Verification code is required." });
    }

    const db = getFirestore();
    const ref = db.collection(CA_EDIT_TOKENS).doc(String(requestId));
    const doc = await ref.get();
    if (!doc.exists) return res.status(400).json({ error: "This code is no longer valid. Request a new one." });

    const rec = doc.data() as any;
    if (rec.verified) return res.status(400).json({ error: "This code has already been used. Request a new one." });
    if (Date.now() > new Date(rec.expiresAt).getTime()) {
      await ref.delete();
      return res.status(400).json({ error: "This code has expired. Request a new one." });
    }
    if ((rec.attempts ?? 0) >= MAX_CODE_ATTEMPTS) {
      await ref.delete();
      return res.status(429).json({ error: "Too many incorrect attempts. Request a new code." });
    }

    if (!hashesEqual(sha256(String(code).trim().toUpperCase()), rec.codeHash)) {
      await ref.update({ attempts: (rec.attempts ?? 0) + 1 });
      return res.status(400).json({ error: "Incorrect code." });
    }

    const profileDoc = await db.collection(COLLECTIONS.CA_PROFILES).doc(rec.profileId).get();
    if (!profileDoc.exists) return res.status(404).json({ error: "Profile not found." });
    const profile = profileDoc.data() as CAProfile;

    const editToken = randomBytes(32).toString("hex");
    await ref.update({
      verified: true,
      editTokenHash: sha256(editToken),
      expiresAt: new Date(Date.now() + EDIT_TTL_MS).toISOString(),
    });

    return res.json({
      editToken,
      profile: {
        id: profileDoc.id,
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
      },
    });
  } catch (err) {
    console.error("CA verify error:", err);
    return res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ─── PUT /api/ca/my-profile ───────────────────────────────────────────────
// CA self-update: step 3 — apply the edit, authorised by the edit token only.

router.put("/my-profile", async (req: Request, res: Response) => {
  try {
    const { editToken, updates } = req.body;
    if (!editToken) {
      return res.status(401).json({ error: "Not verified. Request a new code and try again." });
    }

    const db = getFirestore();
    const snap = await db
      .collection(CA_EDIT_TOKENS)
      .where("editTokenHash", "==", sha256(String(editToken)))
      .limit(1)
      .get();

    if (snap.empty) return res.status(401).json({ error: "Not verified. Request a new code and try again." });

    const tokenRef = snap.docs[0].ref;
    const rec = snap.docs[0].data() as any;
    if (!rec.verified || Date.now() > new Date(rec.expiresAt).getTime()) {
      await tokenRef.delete();
      return res.status(401).json({ error: "Your editing session expired. Request a new code." });
    }

    const profileRef = db.collection(COLLECTIONS.CA_PROFILES).doc(rec.profileId);
    const profileDoc = await profileRef.get();
    if (!profileDoc.exists) return res.status(404).json({ error: "Profile not found." });
    const existing = profileDoc.data() as CAProfile;

    // Whitelist of fields a CA may update themselves. Everything else —
    // email, ICAI number, status, approval timestamps — is deliberately not
    // settable here; changing the address on file is an ownership change and
    // needs a stronger path than "you can read the current address".
    const ALLOWED = [
      "fullName", "firmName", "city", "state", "whatsappNumber",
      "practiceAreas", "languages", "yearsOfPractice", "bio",
    ] as const;

    // `updates` is read as a nested object because that is what the client
    // sends. The previous handler did `const { icai, email, ...updates } =
    // req.body`, which collected `{ updates: {...} }` — so `"fullName" in
    // updates` was always false and NOT ONE FIELD was ever written. The only
    // surviving effect was `status: "pending"`, i.e. a CA who edited their
    // profile lost their public listing and got none of their changes.
    // Demonstrated 2026-09-25 before this rewrite.
    const incoming = (updates && typeof updates === "object") ? updates as Record<string, any> : {};

    const patch: Record<string, any> = { status: "pending", updatedAt: new Date().toISOString() };
    for (const field of ALLOWED) {
      if (field in incoming && incoming[field] !== undefined) {
        patch[field] = incoming[field];
      }
    }

    // Nothing to change other than the status reset? Then don't reset it —
    // silently delisting a profile for an empty submission is the bug above
    // in a different costume.
    const changedFields = Object.keys(patch).filter((k) => k !== "status" && k !== "updatedAt");
    if (changedFields.length === 0) {
      return res.status(400).json({ error: "No changes submitted." });
    }

    await profileRef.update(patch);
    await tokenRef.delete(); // single use — the edit is done

    // Notify admin
    try {
      await sendEmail({
        to: [{ email: "vickybh26@gmail.com", name: "AiTaxBot Admin" }],
        subject: `CA Profile Updated — ${existing.fullName} (${existing.icaiMembershipNumber})`,
        htmlContent: `
          <p>A CA updated their directory profile and it is back in the pending queue for review.</p>
          <p><strong>${existing.fullName}</strong> — ICAI ${existing.icaiMembershipNumber}</p>
          <p>Changed: ${changedFields.join(", ")}</p>
          <p><a href="https://www.aitaxbot.co.in/admin/cas">Review in admin</a></p>
        `,
      });
    } catch (mailErr) {
      // A failed notification must not fail the CA's save.
      console.error("CA update admin notification failed:", mailErr);
    }

    // Confirm to the CA. This doubles as a security signal: if a profile is
    // changed, the address on file hears about it even when the CA is not the
    // one who changed it.
    try {
      await sendEmail({
        to: [{ email: existing.email, name: existing.fullName }],
        subject: "Your AiTaxBot CA profile update is under review",
        htmlContent: `
          <h2>Profile update received, ${existing.fullName}!</h2>
          <p>Your updated profile has been submitted and is now under review. We typically complete re-approvals within 1\u20132 business days.</p>
          <p>Changed: ${changedFields.join(", ")}</p>
          <p style="color:#888;font-size:12px">If you did not make this change, reply to this email straight away.</p>
        `,
      });
    } catch (e) {
      console.error("CA update confirmation email failed:", e);
    }

    return res.json({ ok: true, changed: changedFields, status: "pending" });
  } catch (err) {
    console.error("CA profile update error:", err);
    return res.status(500).json({ error: "Update failed. Please try again." });
  }
});
export default router;

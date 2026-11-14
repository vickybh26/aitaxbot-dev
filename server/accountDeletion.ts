import type { Auth } from "firebase-admin/auth";
import { FieldPath, type Firestore, type DocumentReference, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { Response } from "express";
import type { AuthenticatedRequest } from "./middleware/auth";

type Dependencies = {
  getDb: () => Firestore;
  getAuth: () => Pick<Auth, "getUser" | "deleteUser">;
  deleteSavedResults: (uid: string) => Promise<number>;
};

async function removeReferences(db: Firestore, refs: DocumentReference<any>[]) {
  for (let offset = 0; offset < refs.length; offset += 400) {
    const batch = db.batch();
    refs.slice(offset, offset + 400).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

/** Legacy contacts predate accounts and may have mixed-case emails. Scan in
 * document-ID pages to match case-insensitively without guessing Gmail aliases
 * or trusting a request-body/profile email. No other person's records qualify.
 * New UI no longer creates these calculator contacts; this covers old records.
 */
async function eraseLegacyCalculatorContacts(db: Firestore, verifiedEmail: string): Promise<number> {
  const target = verifiedEmail.trim().toLowerCase();
  let cursor: QueryDocumentSnapshot<any> | undefined;
  let deleted = 0;
  while (true) {
    let query = db.collection("leads").orderBy(FieldPath.documentId()).limit(400);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) return deleted;
    const matching = page.docs.filter(doc => {
      const email = (doc.data() as Record<string, unknown>).email;
      return typeof email === "string" && email.trim().toLowerCase() === target;
    });
    await removeReferences(db, matching.map(doc => doc.ref));
    deleted += matching.length;
    cursor = page.docs[page.docs.length - 1];
    if (page.size < 400) return deleted;
  }
}

export function createDeleteAccountHandler({ getDb, getAuth, deleteSavedResults }: Dependencies) {
  return async (req: AuthenticatedRequest, res: Response) => {
    const uid = req.userId;
    if (!uid) { res.status(401).json({ error: "Authentication required" }); return; }
    try {
      const db = getDb();
      const auth = getAuth();
      // Read current Firebase identity, rather than a possibly stale ID-token
      // email or an editable profile. Unverified email cannot prove ownership
      // of older contacts. Still allow deletion of the user's own account.
      let identity;
      try { identity = await auth.getUser(uid); }
      catch (error: any) {
        if (error?.code !== "auth/user-not-found") throw error;
      }
      const canEraseContacts = identity?.emailVerified === true && typeof identity.email === "string" && identity.email.trim().length > 0;
      const calculatorContactsDeleted = canEraseContacts
        ? await eraseLegacyCalculatorContacts(db, identity!.email!) : 0;

      // New per-user stores must be added here. Batch in bounded chunks so
      // active accounts do not fail erasure at Firestore's write-batch limit.
      for (const collection of ["userProfileLogs", "taxCalculationHistory", "toolUsage"]) {
        const snapshot = await db.collection(collection).where("userId", "==", uid).get();
        await removeReferences(db, snapshot.docs.map(doc => doc.ref));
      }
      await deleteSavedResults(uid);
      await removeReferences(db, [db.collection("crmNotes").doc(uid), db.collection("users").doc(uid)]);
      // Authentication goes last: a failed storage operation remains retryable.
      try { await auth.deleteUser(uid); }
      catch (error: any) { if (error?.code !== "auth/user-not-found") throw error; }
      res.json({ success: true, calculatorContactsDeleted, calculatorContactsErased: canEraseContacts });
    } catch {
      // Do not log email addresses, contact content or provider error payloads.
      console.error("[Account deletion] Erasure failed; request may be retried");
      res.status(500).json({ error: "Failed to delete account. Please try again or email us." });
    }
  };
}

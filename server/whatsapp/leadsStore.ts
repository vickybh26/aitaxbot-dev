/**
 * leadsStore.ts
 * Firestore-backed CRM for WhatsApp leads.
 * Migrated from flat JSON file to avoid race conditions under concurrent writes
 * and to prevent PII accumulation on disk.
 *
 * Firestore collection: "whatsapp_leads"
 * Document ID: phone number (E.164 without '+', e.g. "919876543210")
 */

import { getFirestore } from "../firebase.js";

export interface Lead {
  phone: string;        // WhatsApp phone number (E.164, e.g. "919876543210")
  name: string;         // Collected during onboarding
  firstContact: string; // ISO timestamp of first message
  lastContact: string;  // ISO timestamp of most recent message
  messageCount: number; // Total messages received
  queryType: string;    // Last detected intent (e.g. "HRA", "ITR", "general")
  notes: string;        // Any freeform notes (auto-populated by bot)
}

const COLLECTION = "whatsapp_leads";

// ── Public API ────────────────────────────────────────────────────────────────

export async function getLead(phone: string): Promise<Lead | null> {
  try {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION).doc(phone).get();
    if (!doc.exists) return null;
    return doc.data() as Lead;
  } catch (err) {
    console.error("[WhatsApp CRM] getLead failed:", err);
    return null;
  }
}

export async function upsertLead(phone: string, update: Partial<Lead>): Promise<Lead> {
  const db = getFirestore();
  const ref = db.collection(COLLECTION).doc(phone);
  const now = new Date().toISOString();

  // Use a Firestore transaction to atomically increment messageCount
  const lead = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as Lead) : null;

    const updated: Lead = {
      phone,
      name:         update.name        ?? existing?.name        ?? "",
      firstContact: existing?.firstContact                       ?? now,
      lastContact:  now,
      messageCount: (existing?.messageCount ?? 0) + 1,
      queryType:    update.queryType   ?? existing?.queryType   ?? "unknown",
      notes:        update.notes       ?? existing?.notes       ?? "",
    };

    tx.set(ref as FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, updated as FirebaseFirestore.DocumentData);
    return updated;
  });

  return lead;
}

export async function getAllLeads(): Promise<Lead[]> {
  try {
    const db = getFirestore();
    const snap = await db.collection(COLLECTION).orderBy("lastContact", "desc").get();
    return snap.docs.map((d) => d.data() as Lead);
  } catch (err) {
    console.error("[WhatsApp CRM] getAllLeads failed:", err);
    return [];
  }
}

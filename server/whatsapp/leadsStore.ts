/**
 * leadsStore.ts
 * Simple JSON-file CRM for WhatsApp leads.
 * Stores every user who contacts AiTaxBot on WhatsApp.
 * No dependencies — just Node.js fs.
 */

import fs from "fs";
import path from "path";

const LEADS_FILE = path.join(process.cwd(), "server", "whatsapp", "leads.json");

export interface Lead {
  phone: string;           // WhatsApp phone number (E.164, e.g. "919876543210")
  name: string;            // Collected during onboarding
  firstContact: string;    // ISO timestamp of first message
  lastContact: string;     // ISO timestamp of most recent message
  messageCount: number;    // Total messages received
  queryType: string;       // Last detected intent (e.g. "HRA", "ITR", "general")
  notes: string;           // Any freeform notes (auto-populated by bot)
}

// ── In-memory cache ──────────────────────────────────────────────────────────
let leadsCache: Record<string, Lead> = {};
let loaded = false;

function load(): void {
  if (loaded) return;
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const raw = fs.readFileSync(LEADS_FILE, "utf-8");
      leadsCache = JSON.parse(raw);
    } else {
      leadsCache = {};
      save();
    }
  } catch {
    leadsCache = {};
  }
  loaded = true;
}

function save(): void {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leadsCache, null, 2), "utf-8");
  } catch (err) {
    console.error("[WhatsApp CRM] Failed to save leads:", err);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getLead(phone: string): Lead | null {
  load();
  return leadsCache[phone] || null;
}

export function upsertLead(phone: string, update: Partial<Lead>): Lead {
  load();
  const now = new Date().toISOString();
  const existing = leadsCache[phone];

  leadsCache[phone] = {
    phone,
    name: update.name ?? existing?.name ?? "",
    firstContact: existing?.firstContact ?? now,
    lastContact: now,
    messageCount: (existing?.messageCount ?? 0) + 1,
    queryType: update.queryType ?? existing?.queryType ?? "unknown",
    notes: update.notes ?? existing?.notes ?? "",
  };

  save();
  return leadsCache[phone];
}

export function getAllLeads(): Lead[] {
  load();
  return Object.values(leadsCache).sort(
    (a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime()
  );
}

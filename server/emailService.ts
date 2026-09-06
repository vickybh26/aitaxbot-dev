/**
 * emailService.ts — single place all outbound email goes through.
 *
 * Before this file, four route modules (routes.ts, leadRoutes.ts,
 * adminRoutes.ts, caRoutes.ts) each defined their own local
 * `sendBrevoEmail()` helper, and two of them defaulted the sender to
 * `info@aitaxbot.in` while the other two defaulted to
 * `noreply@aitaxbot.co.in` — nobody had decided which address means what,
 * so it drifted per file. Vicky settled it 2026-09-06: `admin@aitaxbot.co.in`
 * for anything account-triggered (welcome, calculator results), and
 * `info@aitaxbot.in` for the weekly digest. SENDERS below is the one place
 * that decision lives.
 */

import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";
import { createHmac, timingSafeEqual } from "crypto";
import type { KeyDateItem } from "@shared/keyDates";
import type { SavedResult } from "./savedResults";

export const SENDERS = {
  // Account-triggered mail: welcome on signup, calculator results.
  transactional: {
    email: process.env.BREVO_SENDER_TRANSACTIONAL || process.env.BREVO_SENDER_EMAIL || "admin@aitaxbot.co.in",
    name: process.env.BREVO_SENDER_NAME || "AiTaxBot",
  },
  // Recurring/broadcast mail: the weekly digest.
  digest: {
    email: process.env.BREVO_SENDER_DIGEST || "info@aitaxbot.in",
    name: process.env.BREVO_SENDER_NAME || "AiTaxBot",
  },
} as const;

/** Escape user-supplied text before inserting into HTML (email bodies, etc.). */
export function escapeHtml(input: unknown): string {
  return String(input ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

export interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: { content: string; name: string }[];
  sender?: { email: string; name: string };
  replyTo?: { email: string; name?: string };
}

/**
 * Every call is wrapped so a Brevo outage or missing API key never turns a
 * successful request (form saved, PDF generated, account created) into a
 * failed one — callers get `{sent: false}` back and log it, not a thrown
 * exception. Matches the pattern every route already followed individually
 * before this file existed.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; reason?: string }> {
  if (!process.env.BREVO_API_KEY) {
    console.warn(`[Email] BREVO_API_KEY not set — skipping "${params.subject}" to ${params.to.map((t) => t.email).join(", ")}`);
    return { sent: false, reason: "missing_api_key" };
  }
  try {
    const apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
    await apiInstance.sendTransacEmail({
      sender: params.sender ?? SENDERS.transactional,
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
      ...(params.textContent ? { textContent: params.textContent } : {}),
      ...(params.attachment ? { attachment: params.attachment } : {}),
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });
    return { sent: true };
  } catch (err: any) {
    const detail = err?.response?.text || err?.message || String(err);
    console.error(`[Email] Brevo send failed for "${params.subject}":`, detail);
    return { sent: false, reason: detail };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Signed unsubscribe tokens (moved here from adminRoutes.ts 2026-09-06 to
// avoid a circular import once adminRoutes started calling sendEmail()).
//
// `type` scopes a token to one mail category — a digest-unsubscribe link
// can't be replayed to opt out of a different category. The only category
// today is "digest"; the old "nudge" profile-reminder category was retired
// 2026-07-26 (see the removal note in adminRoutes.ts) and its links are
// intentionally not honoured by this signature scheme.
// ─────────────────────────────────────────────────────────────────────────

export function unsubToken(uid: string, type: string = "digest"): string {
  const secret = process.env.EMAIL_TOKEN_SECRET || process.env.BREVO_API_KEY || "aitaxbot-unsub";
  return createHmac("sha256", secret).update(`unsub:${type}:${uid}`).digest("hex").slice(0, 32);
}

export function verifyUnsubToken(uid: string, token: string, type: string = "digest"): boolean {
  const expected = unsubToken(uid, type);
  if (token.length !== expected.length) return false;
  // Constant-time compare — avoids leaking the correct token through timing.
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

function unsubscribeUrl(uid: string): string {
  return `https://www.aitaxbot.co.in/api/email/unsubscribe?uid=${encodeURIComponent(uid)}&t=${unsubToken(uid, "digest")}`;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Welcome email — fired once, on genuine first signup only (see the
//    isNewUser check in storage.upsertUser() / the /api/user/sync handler).
// ─────────────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(user: { email?: string | null; firstName?: string | null }) {
  if (!user.email) return { sent: false, reason: "no_email" as const };
  const name = escapeHtml(user.firstName || "there");

  return sendEmail({
    to: [{ email: user.email, name: user.firstName || undefined }],
    sender: SENDERS.transactional,
    subject: "Welcome to AiTaxBot 👋",
    htmlContent: `
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1e293b">
        <div style="background:#1E3A8A;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">AiTaxBot</h1>
          <p style="color:#93C5FD;margin:4px 0 0;font-size:13px">www.aitaxbot.co.in · Smart Tax Tools for India</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="font-size:16px;margin:0 0 12px">Hi <strong>${name}</strong>,</p>
          <p style="font-size:14px;line-height:1.6;color:#475569">
            Welcome to AiTaxBot! Your account is ready. Here's what you can do right away:
          </p>
          <ul style="font-size:14px;line-height:1.9;color:#475569;padding-left:20px">
            <li>Compare Old vs New tax regime with the <a href="https://www.aitaxbot.co.in/calculators/income-tax" style="color:#2563eb">Income Tax Calculator</a></li>
            <li>Work out your HRA exemption with the <a href="https://www.aitaxbot.co.in/calculators/hra" style="color:#2563eb">HRA Calculator</a></li>
            <li>Check your AIS, 26AS and Form 16 against each other with our <a href="https://www.aitaxbot.co.in/tools/ais-26as-form16" style="color:#2563eb">reconciliation tool</a></li>
          </ul>
          <p style="font-size:13px;color:#64748b">Every result you calculate while signed in is saved to your <a href="https://www.aitaxbot.co.in/dashboard" style="color:#2563eb">dashboard</a> automatically.</p>
          <div style="margin:20px 0;text-align:center">
            <a href="https://www.aitaxbot.co.in/calculators" style="background:#1E3A8A;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block">Explore all calculators →</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
          <p style="font-size:12px;color:#94a3b8;margin:0">Questions? Reply to this email or reach us at admin@aitaxbot.co.in.</p>
        </div>
        <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px">AiTaxBot · Bengaluru, Karnataka, India</p>
      </body></html>
    `,
    textContent: `Hi ${user.firstName || "there"},\n\nWelcome to AiTaxBot! Your account is ready.\n\nIncome Tax Calculator: https://www.aitaxbot.co.in/calculators/income-tax\nHRA Calculator: https://www.aitaxbot.co.in/calculators/hra\nAIS/26AS/Form 16 reconciliation: https://www.aitaxbot.co.in/tools/ais-26as-form16\n\nEvery result you calculate while signed in is saved to your dashboard: https://www.aitaxbot.co.in/dashboard\n\n-- AiTaxBot Team`,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Calculator-result email — one per (user, tool), throttled elsewhere
//    (see maybeSendResultEmail in savedResults.ts). Generic over whatever
//    SavedResultInput a calculator submitted, so adding a 10th calculator
//    later needs no change here.
// ─────────────────────────────────────────────────────────────────────────

export async function sendCalculatorResultEmail(
  user: { email?: string | null; firstName?: string | null },
  result: Pick<SavedResult, "toolName" | "route" | "headline" | "details" | "kind">
) {
  if (!user.email) return { sent: false, reason: "no_email" as const };
  const name = escapeHtml(user.firstName || "there");
  const toolName = escapeHtml(result.toolName);
  const headlineLabel = escapeHtml(result.headline.label);
  const headlineValue = escapeHtml(result.headline.value);
  const detailsRows = (result.details ?? [])
    .map((d) => `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">${escapeHtml(d.label)}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600">${escapeHtml(d.value)}</td></tr>`)
    .join("");
  const resultUrl = `https://www.aitaxbot.co.in${result.route}`;

  return sendEmail({
    to: [{ email: user.email, name: user.firstName || undefined }],
    sender: SENDERS.transactional,
    subject: `Your ${toolName} result — AiTaxBot`,
    htmlContent: `
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1e293b">
        <div style="background:#1E3A8A;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">AiTaxBot</h1>
          <p style="color:#93C5FD;margin:4px 0 0;font-size:13px">${toolName}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="font-size:16px;margin:0 0 16px">Hi <strong>${name}</strong>, here's the result from your ${toolName} calculation:</p>
          <div style="background:#EFF6FF;border-left:4px solid #2563eb;padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:16px">
            <p style="margin:0;font-size:12px;color:#1d4ed8;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">${headlineLabel}</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#1e293b">${headlineValue}</p>
          </div>
          ${detailsRows ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px">${detailsRows}</table>` : ""}
          <div style="margin:16px 0;text-align:center">
            <a href="${resultUrl}" style="background:#1E3A8A;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block">Open this calculator again →</a>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:16px 0 0">This result is also saved on your <a href="https://www.aitaxbot.co.in/dashboard" style="color:#2563eb">dashboard</a>.</p>
        </div>
        <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px">
          AiTaxBot · Bengaluru, Karnataka, India — this is an estimate, not a filed return.
        </p>
      </body></html>
    `,
    textContent: `Hi ${user.firstName || "there"},\n\n${result.toolName} result:\n${result.headline.label}: ${result.headline.value}\n${(result.details ?? []).map((d) => `${d.label}: ${d.value}`).join("\n")}\n\nOpen again: ${resultUrl}\nDashboard: https://www.aitaxbot.co.in/dashboard\n\n-- AiTaxBot Team`,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Weekly digest — deadlines (always) + a short usage recap (only the
//    tools this user has actually used). Sent from SENDERS.digest, always
//    carries a working unsubscribe link (DPDP hygiene for recurring mail).
// ─────────────────────────────────────────────────────────────────────────

export async function sendWeeklyDigestEmail(
  user: { id: string; email?: string | null; firstName?: string | null },
  content: { dates: KeyDateItem[]; usage: SavedResult[] }
) {
  if (!user.email) return { sent: false, reason: "no_email" as const };
  const name = escapeHtml(user.firstName || "there");

  const datesRows = content.dates
    .map((d) => `<tr><td style="padding:8px 0;font-size:13px;color:#1e293b"><strong>${d.day} ${d.monthLabel}</strong> — ${escapeHtml(d.title)}</td><td style="padding:8px 0;text-align:right;font-size:12px;color:#64748b">${escapeHtml(d.detail)}</td></tr>`)
    .join("");

  const usageRows = content.usage
    .map((r) => `<tr><td style="padding:6px 0;font-size:13px;color:#1e293b">${escapeHtml(r.toolName)}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600">${escapeHtml(r.headline.value)}</td></tr>`)
    .join("");

  const usageSection = usageRows
    ? `<h3 style="font-size:14px;color:#1e293b;margin:20px 0 8px">Your recent calculations</h3><table style="width:100%;border-collapse:collapse">${usageRows}</table>`
    : "";

  return sendEmail({
    to: [{ email: user.email, name: user.firstName || undefined }],
    sender: SENDERS.digest,
    subject: "Your AiTaxBot weekly update",
    htmlContent: `
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1e293b">
        <div style="background:#1E3A8A;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">AiTaxBot</h1>
          <p style="color:#93C5FD;margin:4px 0 0;font-size:13px">Weekly update</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="font-size:15px;margin:0 0 8px">Hi <strong>${name}</strong>,</p>
          <h3 style="font-size:14px;color:#1e293b;margin:16px 0 8px">Dates to watch</h3>
          <table style="width:100%;border-collapse:collapse">${datesRows}</table>
          ${usageSection}
          <div style="margin:20px 0;text-align:center">
            <a href="https://www.aitaxbot.co.in/dashboard" style="background:#1E3A8A;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block">View your dashboard →</a>
          </div>
        </div>
        <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px">
          AiTaxBot · Bengaluru, Karnataka, India<br/>
          <a href="${unsubscribeUrl(user.id)}" style="color:#94a3b8">Unsubscribe from this weekly email</a>
        </p>
      </body></html>
    `,
    textContent: `Hi ${user.firstName || "there"},\n\nDates to watch:\n${content.dates.map((d) => `${d.day} ${d.monthLabel} — ${d.title} (${d.detail})`).join("\n")}\n${content.usage.length ? `\nYour recent calculations:\n${content.usage.map((r) => `${r.toolName}: ${r.headline.value}`).join("\n")}\n` : ""}\nDashboard: https://www.aitaxbot.co.in/dashboard\n\nUnsubscribe: ${unsubscribeUrl(user.id)}\n\n-- AiTaxBot Team`,
  });
}

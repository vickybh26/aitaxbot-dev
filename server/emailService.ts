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
 *
 * Each email is a `buildX()` (pure — returns {subject, htmlContent,
 * textContent}, no network call) plus a thin `sendX()` wrapper that calls
 * `sendEmail(buildX(...))`. The split exists so scripts/previewEmails.mjs
 * can render real HTML to local files for review without ever touching the
 * Brevo API — useful review here means never accidentally emailing a real
 * user while looking at a subject line.
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

export interface EmailContent {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendEmailParams extends EmailContent {
  to: { email: string; name?: string }[];
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

// Warm Ledger tokens, matching the site (index.css / tailwind.config.ts).
// Email clients don't run our CSS, so these are the literal hex values, not
// var() references — kept in one place here rather than repeated per string.
const INK = "#0F2A4A";
const PAPER = "#FAF8F4";
const CARD = "#FFFFFF";
const RULE = "#E5E0D6";
const BODY_TEXT = "#1F2937";
const MUTED = "#5B6572";
const FONT_DISPLAY = "Sora, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_BODY = "Manrope, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * Outlook desktop renders `<a>` styled as a button inconsistently (wrong
 * padding, no border-radius). This is the standard bulletproof-button
 * pattern — a real anchor for every other client, plus MSO-only conditional
 * comments that give Outlook a precise VML-free width/line-height instead —
 * ported from Lovable's React-Email output for the same template
 * (2026-09-06 — see /email-preview/welcome on their site).
 */
function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="line-height:100%;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;background-color:${INK};color:${CARD};font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px" target="_blank"><span><!--[if mso]><i style="mso-font-width:400%;mso-text-raise:18" hidden>&#8202;&#8202;&#8202;</i><![endif]--></span><span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px">${label}</span><span><!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8202;&#8203;</i><![endif]--></span></a>`;
}

/**
 * Hidden preheader text — controls the one-line snippet an inbox list shows
 * next to the subject, which is otherwise whatever plain text happens to
 * come first in the body. The zero-width padding after it stops the email
 * client from appending real body text to fill out the snippet length.
 */
function preheader(text: string): string {
  const pad = "‌​‍‎‏﻿".repeat(20);
  return `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0" data-skip-in-text="true">${escapeHtml(text)}<div>${pad}</div></div>`;
}

export function buildWelcomeEmail(user: { firstName?: string | null }): EmailContent {
  const name = escapeHtml(user.firstName || "there");
  return {
    subject: "Welcome to AiTaxBot — your taxes, made clear",
    htmlContent: `
      <!DOCTYPE html>
      <html dir="ltr" lang="en"><head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/><meta name="x-apple-disable-message-reformatting"/></head>
      <body style="background-color:${PAPER};margin:0;padding:0">
        ${preheader("Welcome to AiTaxBot — your taxes, made clear.")}
        <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center"><tbody><tr><td style="margin:0;padding:0;background-color:${PAPER}">
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:${FONT_BODY}"><tbody><tr style="width:100%"><td>
            <p style="font-size:18px;line-height:24px;font-family:${FONT_DISPLAY};font-weight:700;color:${INK};margin:0 0 32px;letter-spacing:-0.01em">AiTaxBot</p>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${CARD};border:1px solid ${RULE};border-radius:12px;padding:32px 28px"><tbody><tr><td>
              <h1 style="font-family:${FONT_DISPLAY};font-size:24px;font-weight:700;color:${INK};line-height:32px;margin:0 0 12px;letter-spacing:-0.01em">Welcome, ${name}.</h1>
              <p style="font-size:15px;line-height:24px;color:${BODY_TEXT};margin:0 0 8px">Thanks for joining AiTaxBot. You now have clear, CA-reviewed answers to Indian income-tax questions — plus calculators that do the maths for you.</p>
              <p style="font-size:15px;line-height:24px;color:${BODY_TEXT};margin:0 0 24px">A good first step: compare the old and new tax regimes with your own numbers. It takes about two minutes.</p>
              ${ctaButton("https://www.aitaxbot.co.in/calculators/income-tax", "Compare my tax regimes")}
              <hr style="width:100%;border:none;border-top:1px solid ${RULE};margin:28px 0"/>
              <p style="font-size:12px;line-height:24px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};margin:0 0 12px">What you can do here</p>
              <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0 0 6px">· Compare Old vs New tax regime with the Income Tax Calculator</p>
              <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0 0 6px">· Check your HRA exemption and NPS deductions</p>
              <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0 0 6px">· Reconcile your AIS, 26AS and Form 16 before you file</p>
              <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0">· Find a verified CA when you want a human to file for you</p>
            </td></tr></tbody></table>
            <p style="font-size:12px;line-height:18px;color:${MUTED};margin:24px 0 0">Questions? Just reply to this email — a person reads every message. You can also reach us at <a href="mailto:admin@aitaxbot.co.in" style="color:${INK};text-decoration-line:none">admin@aitaxbot.co.in</a>.</p>
            <p style="font-size:12px;line-height:18px;color:${MUTED};margin:8px 0 0">AiTaxBot · Smart Tax Tools for India</p>
          </td></tr></tbody></table>
        </td></tr></tbody></table>
      </body></html>
    `,
    textContent: `Welcome, ${user.firstName || "there"}.\n\nThanks for joining AiTaxBot. You now have clear, CA-reviewed answers to Indian income-tax questions — plus calculators that do the maths for you.\n\nA good first step: compare the old and new tax regimes with your own numbers. It takes about two minutes.\nCompare my tax regimes: https://www.aitaxbot.co.in/calculators/income-tax\n\nWhat you can do here:\n· Compare Old vs New tax regime with the Income Tax Calculator\n· Check your HRA exemption and NPS deductions\n· Reconcile your AIS, 26AS and Form 16 before you file\n· Find a verified CA when you want a human to file for you\n\nQuestions? Just reply to this email, or reach us at admin@aitaxbot.co.in.\n\n-- AiTaxBot Team`,
  };
}

export async function sendWelcomeEmail(user: { email?: string | null; firstName?: string | null }) {
  if (!user.email) return { sent: false, reason: "no_email" as const };
  return sendEmail({
    to: [{ email: user.email, name: user.firstName || undefined }],
    sender: SENDERS.transactional,
    ...buildWelcomeEmail(user),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Calculator-result email — one per (user, tool), throttled elsewhere
//    (see maybeSendResultEmail in savedResults.ts). Generic over whatever
//    SavedResultInput a calculator submitted, so adding a 10th calculator
//    later needs no change here.
// ─────────────────────────────────────────────────────────────────────────

type CalculatorResultInput = Pick<SavedResult, "toolName" | "route" | "headline" | "details" | "kind">;

export function buildCalculatorResultEmail(
  user: { firstName?: string | null },
  result: CalculatorResultInput
): EmailContent {
  const name = escapeHtml(user.firstName || "there");
  const toolName = escapeHtml(result.toolName);
  const headlineLabel = escapeHtml(result.headline.label);
  const headlineValue = escapeHtml(result.headline.value);
  const detailsRows = (result.details ?? [])
    .map((d) => `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">${escapeHtml(d.label)}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600">${escapeHtml(d.value)}</td></tr>`)
    .join("");
  const resultUrl = `https://www.aitaxbot.co.in${result.route}`;

  return {
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
  };
}

export async function sendCalculatorResultEmail(
  user: { email?: string | null; firstName?: string | null },
  result: CalculatorResultInput
) {
  if (!user.email) return { sent: false, reason: "no_email" as const };
  return sendEmail({
    to: [{ email: user.email, name: user.firstName || undefined }],
    sender: SENDERS.transactional,
    ...buildCalculatorResultEmail(user, result),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Weekly digest — deadlines (always) + a short usage recap (only the
//    tools this user has actually used). Sent from SENDERS.digest, always
//    carries a working unsubscribe link (DPDP hygiene for recurring mail).
// ─────────────────────────────────────────────────────────────────────────

type DigestContent = { dates: KeyDateItem[]; usage: SavedResult[] };

export function buildWeeklyDigestEmail(
  user: { id: string; firstName?: string | null },
  content: DigestContent
): EmailContent {
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

  return {
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
  };
}

export async function sendWeeklyDigestEmail(
  user: { id: string; email?: string | null; firstName?: string | null },
  content: DigestContent
) {
  if (!user.email) return { sent: false, reason: "no_email" as const };
  return sendEmail({
    to: [{ email: user.email, name: user.firstName || undefined }],
    sender: SENDERS.digest,
    ...buildWeeklyDigestEmail(user, content),
  });
}

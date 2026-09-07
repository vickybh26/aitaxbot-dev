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
 * `info@aitaxbot.in` for the monthly digest. SENDERS below is the one place
 * that decision lives.
 *
 * TRANSPORT: ZeptoMail (Zoho), moved off Brevo 2026-09-07. Brevo was a
 * marketing platform being used purely as an SMTP API — we held 2 contacts
 * and used none of its lists, campaigns or CRM — while its free tier's
 * 300/day cap became the binding constraint the moment the digest reached
 * 146 users: 146 recipients plus 146 admin BCC copies is 292 credits in one
 * 9am burst, 97% of the day's allowance. ZeptoMail is transactional-only,
 * bills in INR with a GST invoice, and its credits do not expire.
 *
 * There is no SDK here on purpose: ZeptoMail's send API is a single POST
 * with a JSON body, so plain fetch() removes a dependency rather than
 * adding one.
 *
 * Each email is a `buildX()` (pure — returns {subject, htmlContent,
 * textContent}, no network call) plus a thin `sendX()` wrapper that calls
 * `sendEmail(buildX(...))`. The split exists so scripts/previewEmails.mjs
 * can render real HTML to local files for review without ever touching the
 * mail API — useful review here means never accidentally emailing a real
 * user while looking at a subject line.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { daysUntil, type KeyDateItem } from "@shared/keyDates";
import { issueLabel, type DigestIssue } from "@shared/digest";
import type { SavedResult } from "./savedResults";

export const SENDERS = {
  // Account-triggered mail: welcome on signup, calculator results.
  transactional: {
    email: process.env.MAIL_SENDER_TRANSACTIONAL || process.env.BREVO_SENDER_TRANSACTIONAL || process.env.BREVO_SENDER_EMAIL || "admin@aitaxbot.co.in",
    name: process.env.MAIL_SENDER_NAME || process.env.BREVO_SENDER_NAME || "AiTaxBot",
  },
  // Recurring/broadcast mail: the monthly digest.
  //
  // There are exactly two real mailboxes, on two different mail systems:
  // admin@aitaxbot.co.in (Google Workspace) and info@aitaxbot.in (GoDaddy,
  // MX -> secureserver.net). No other address exists — do not invent one.
  //
  // The digest is therefore sent from admin@ rather than the info@ the
  // 2026-09-06 split intended. ZeptoMail only accepts a From address on a
  // domain verified in the account, and that account has one domain,
  // aitaxbot.co.in. info@aitaxbot.in would be rejected outright, and
  // info@aitaxbot.co.in — briefly the default here on 2026-09-07 — is worse
  // than rejected: the domain would pass, so mail would go out from an
  // address with no mailbox behind it, and every reply would bounce. On an
  // email whose whole pitch is that a person reads replies, that is the one
  // failure mode to avoid.
  //
  // To restore the split: add aitaxbot.in in ZeptoMail, publish its DKIM TXT
  // and bounce CNAME on that zone (it is GoDaddy-hosted, separate from the
  // Cloudflare zone for co.in), then set MAIL_SENDER_DIGEST=info@aitaxbot.in.
  digest: {
    email: process.env.MAIL_SENDER_DIGEST || "admin@aitaxbot.co.in",
    name: process.env.MAIL_SENDER_NAME || process.env.BREVO_SENDER_NAME || "AiTaxBot",
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
  bcc?: { email: string; name?: string }[];
}

/**
 * BCC target for the two ONE-TO-ONE emails (welcome, calculator results) so
 * Vicky's Google Workspace inbox becomes the sent+received log — Gmail
 * threads a user's reply against this copy automatically, no separate
 * email-log infrastructure needed. BCC-ing the sender address is the only
 * way to get a copy of your own outbound mail; being the "From" address
 * does not do that on its own.
 *
 * DELIBERATELY NOT ON THE DIGEST. Gmail threads on subject + participants
 * and every digest copy shares both, so the 2026-09-07 send collapsed all
 * 146 BCC copies into two threads of 46 and 100 messages. That is not a log,
 * it is a blob you cannot search or attribute, and it doubled the send cost
 * for the privilege. The digest's record is the send history written by
 * server/monthlyDigest.ts and shown on /admin/digest — strictly more useful,
 * because it records who was skipped and what failed, neither of which a
 * BCC copy can tell you.
 */
const ADMIN_BCC = { email: "admin@aitaxbot.co.in", name: "AiTaxBot Admin" };

/**
 * ZeptoMail's send endpoint. Defaults to the India data centre (.in) — the
 * account is Indian and the DC is fixed at signup, so a wrong host here
 * fails auth with a confusing 401 rather than an obvious routing error.
 * Override with ZEPTOMAIL_API_URL if the account lives in another DC.
 */
const ZEPTOMAIL_URL = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.in/v1.1/email";

/** ZeptoMail wants an explicit mime_type per attachment; Brevo inferred it. */
function mimeFor(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  return ({
    pdf: "application/pdf", csv: "text/csv", txt: "text/plain",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  } as Record<string, string>)[ext] || "application/octet-stream";
}

const zAddr = (a: { email: string; name?: string }) => ({
  email_address: { address: a.email, ...(a.name ? { name: a.name } : {}) },
});

/**
 * Every call is wrapped so a provider outage or missing API key never turns a
 * successful request (form saved, PDF generated, account created) into a
 * failed one — callers get `{sent: false}` back and log it, not a thrown
 * exception. Matches the pattern every route already followed individually
 * before this file existed.
 *
 * The failure `reason` carries ZeptoMail's own response body, truncated.
 * That matters more than it sounds: the likeliest failure on day one is an
 * unverified sending domain, and ZeptoMail says exactly that in the body
 * while the status code alone would just read 400.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  if (!token) {
    console.warn(`[Email] ZEPTOMAIL_TOKEN not set — skipping "${params.subject}" to ${params.to.map((t) => t.email).join(", ")}`);
    return { sent: false, reason: "missing_api_key" };
  }

  const sender = params.sender ?? SENDERS.transactional;
  const payload = {
    from: { address: sender.email, name: sender.name },
    to: params.to.map(zAddr),
    ...(params.bcc?.length ? { bcc: params.bcc.map(zAddr) } : {}),
    ...(params.replyTo
      ? { reply_to: [{ address: params.replyTo.email, ...(params.replyTo.name ? { name: params.replyTo.name } : {}) }] }
      : {}),
    subject: params.subject,
    htmlbody: params.htmlContent,
    ...(params.textContent ? { textbody: params.textContent } : {}),
    ...(params.attachment?.length
      ? { attachments: params.attachment.map((a) => ({ name: a.name, content: a.content, mime_type: mimeFor(a.name) })) }
      : {}),
  };

  try {
    const res = await fetch(ZEPTOMAIL_URL, {
      method: "POST",
      headers: {
        // The dashboard shows this token already prefixed on some screens and
        // bare on others; accept either rather than failing on a paste.
        Authorization: token.startsWith("Zoho-enczapikey") ? token : `Zoho-enczapikey ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 400);
      console.error(`[Email] ZeptoMail send failed (${res.status}) for "${params.subject}":`, detail);
      return { sent: false, reason: `http_${res.status}: ${detail}` };
    }
    return { sent: true };
  } catch (err: any) {
    const detail = err?.message || String(err);
    console.error(`[Email] ZeptoMail send failed for "${params.subject}":`, detail);
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
  // BREVO_API_KEY stays in this chain even though Brevo is gone: the 146
  // unsubscribe links sent on 2026-09-07 were signed with it, and dropping it
  // would silently reject every one of them. Keep the old key set in the
  // environment until those links have aged out, or set EMAIL_TOKEN_SECRET
  // and accept that the already-sent links stop working.
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
const CREDIT = "#0B7A55";
// Distinct from CREDIT (green) on purpose — CREDIT means "money the user
// gains," and a marketing badge isn't that. Matches the teal Lovable settled
// on for the same two badges (2026-09-06, /email-preview/*).
const BADGE_TEAL = "#0F766E";
const FONT_DISPLAY = "Sora, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_BODY = "Manrope, 'Segoe UI', Helvetica, Arial, sans-serif";

// Stable, unhashed public path — client/public/* is served as-is, unlike the
// @assets/* imports used on-site (those get a build-hashed filename, so the
// URL changes every deploy and can't be relied on inside an email that might
// sit unread for weeks).
const LOGO_URL = "https://www.aitaxbot.co.in/images/aitaxbot-icon.png";
// Native size 268x400 (see scripts/logo-work/ for the crop from the source
// logo) — displayed at a fixed small height, width computed to match its
// aspect ratio so it isn't squashed into a square.
const LOGO_DISPLAY_HEIGHT = 28;
const LOGO_DISPLAY_WIDTH = Math.round((LOGO_DISPLAY_HEIGHT * 268) / 400);

/** Icon + wordmark, used at the top of every email. */
function brandHeader(): string {
  return `<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 32px"><tbody><tr>
    <td style="vertical-align:middle;padding-right:8px"><img src="${LOGO_URL}" width="${LOGO_DISPLAY_WIDTH}" height="${LOGO_DISPLAY_HEIGHT}" alt="" style="display:block;border:0"/></td>
    <td style="vertical-align:middle;font-size:18px;line-height:24px;font-family:${FONT_DISPLAY};font-weight:700;color:${INK};letter-spacing:-0.01em">AiTaxBot</td>
  </tr></tbody></table>`;
}

/**
 * Two differentiators worth repeating across all three emails: the Income
 * Tax Calculator (genuinely one of the most complete free ones in India —
 * both regimes, every slab, surcharge, and the 87A rebate, each shown as its
 * own line) and the AIS/26AS/Form 16 reconciliation tool, which has no
 * direct equivalent among the free Indian tax sites AiTaxBot competes with
 * (see CLAUDE.md's competitor notes — INDmoney and others compute liability,
 * none cross-check the taxpayer's own documents against the department's
 * records the way this does).
 *
 * Card visual pattern — bordered box, uppercase pill badge, bold heading,
 * one-line pitch, text link with an arrow — matches Lovable's build of the
 * same two cards (2026-09-06, /email-preview/*), teal badge included; the
 * copy is ours, describing what our own calculator/tool actually does.
 */
function promoCard(badge: string, title: string, body: string, href: string, linkLabel: string): string {
  return `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${CARD};border:2px solid ${INK};border-radius:12px;padding:20px 20px 22px;margin-top:16px"><tbody><tr><td>
    <p style="font-size:11px;line-height:24px;display:inline-block;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${CARD};background-color:${BADGE_TEAL};border-radius:999px;padding:4px 10px;margin:0 0 10px">${badge}</p>
    <p style="font-size:17px;line-height:24px;font-family:${FONT_DISPLAY};font-weight:700;color:${INK};margin:0 0 6px;letter-spacing:-0.01em">${title}</p>
    <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0 0 12px">${body}</p>
    <a href="${href}" style="color:${INK};text-decoration-line:none;font-size:14px;font-weight:600" target="_blank">${linkLabel} →</a>
  </td></tr></tbody></table>`;
}

const incomeTaxPromo = () => promoCard(
  "Best in the market",
  "Income Tax Calculator",
  "Old vs new regime side by side, every slab, surcharge and rebate handled — the most complete calculator you'll find, and it explains each number instead of just showing a total.",
  "https://www.aitaxbot.co.in/calculators/income-tax",
  "Calculate my taxes"
);

const aisPromo = () => promoCard(
  "One of a kind",
  "AIS Reconciliation",
  "Upload your AIS, 26AS and Form 16 and we match every entry against each other, so mismatches surface before the department finds them. Nothing else does this for Indian filers.",
  "https://www.aitaxbot.co.in/tools/ais-26as-form16",
  "Reconcile my AIS"
);

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
            ${brandHeader()}
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${CARD};border:1px solid ${RULE};border-radius:12px;padding:32px 28px"><tbody><tr><td>
              <h1 style="font-family:${FONT_DISPLAY};font-size:24px;font-weight:700;color:${INK};line-height:32px;margin:0 0 12px;letter-spacing:-0.01em">Welcome, ${name}.</h1>
              <p style="font-size:15px;line-height:24px;color:${BODY_TEXT};margin:0 0 8px">Thanks for joining AiTaxBot. You now have clear, CA-reviewed answers to Indian income-tax questions — plus calculators that do the maths for you.</p>
              <p style="font-size:15px;line-height:24px;color:${BODY_TEXT};margin:0 0 24px">A good first step: run your own numbers through our Income Tax Calculator. It takes about two minutes.</p>
              ${ctaButton("https://www.aitaxbot.co.in/calculators/income-tax", "Calculate my taxes")}
              ${incomeTaxPromo()}
              ${aisPromo()}
              <hr style="width:100%;border:none;border-top:1px solid ${RULE};margin:28px 0"/>
              <p style="font-size:12px;line-height:24px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};margin:0 0 12px">What else you can do here</p>
              <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0 0 6px">· Work out capital gains on shares and mutual funds</p>
              <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0 0 6px">· Check your HRA exemption and NPS deductions</p>
              <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0 0 6px">· Find a verified CA when you want a human to file for you</p>
              <p style="font-size:14px;line-height:22px;color:${BODY_TEXT};margin:0">· Keep an eye on every tax deadline that matters</p>
            </td></tr></tbody></table>
            <p style="font-size:12px;line-height:18px;color:${MUTED};margin:24px 0 0">Questions? Just reply to this email — a person reads every message. You can also reach us at <a href="mailto:admin@aitaxbot.co.in" style="color:${INK};text-decoration-line:none">admin@aitaxbot.co.in</a>.</p>
            <p style="font-size:12px;line-height:18px;color:${MUTED};margin:8px 0 0">AiTaxBot · Smart Tax Tools for India</p>
          </td></tr></tbody></table>
        </td></tr></tbody></table>
      </body></html>
    `,
    textContent: `Welcome, ${user.firstName || "there"}.\n\nThanks for joining AiTaxBot. You now have clear, CA-reviewed answers to Indian income-tax questions — plus calculators that do the maths for you.\n\nA good first step: run your own numbers through our Income Tax Calculator. It takes about two minutes.\nCalculate my taxes: https://www.aitaxbot.co.in/calculators/income-tax\n\nBest in the market — Income Tax Calculator: old vs new regime side by side, every slab, surcharge and rebate handled. https://www.aitaxbot.co.in/calculators/income-tax\n\nOne of a kind — AIS Reconciliation: upload your AIS, 26AS and Form 16 and we match every entry against each other, so mismatches surface before the department finds them. https://www.aitaxbot.co.in/tools/ais-26as-form16\n\nWhat else you can do here:\n· Work out capital gains on shares and mutual funds\n· Check your HRA exemption and NPS deductions\n· Find a verified CA when you want a human to file for you\n· Keep an eye on every tax deadline that matters\n\nQuestions? Just reply to this email, or reach us at admin@aitaxbot.co.in.\n\n-- AiTaxBot Team`,
  };
}

export async function sendWelcomeEmail(user: { email?: string | null; firstName?: string | null }) {
  if (!user.email) return { sent: false, reason: "no_email" as const };
  return sendEmail({
    to: [{ email: user.email, name: user.firstName || undefined }],
    sender: SENDERS.transactional,
    bcc: [ADMIN_BCC],
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
    .map((d) => `<tr><td style="padding:6px 0;color:${MUTED};font-size:13px">${escapeHtml(d.label)}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:${BODY_TEXT}">${escapeHtml(d.value)}</td></tr>`)
    .join("");
  const resultUrl = `https://www.aitaxbot.co.in${result.route}`;
  // Don't promote a tool to someone who just used that exact tool.
  const isReconciliation = result.kind === "reconciliation";
  const isIncomeTax = result.route === "/calculators/income-tax";
  const promoCards = [
    isIncomeTax ? "" : incomeTaxPromo(),
    isReconciliation ? "" : aisPromo(),
  ].filter(Boolean).join("\n");

  return {
    subject: `Your ${toolName} result — AiTaxBot`,
    htmlContent: `
      <!DOCTYPE html>
      <html dir="ltr" lang="en"><head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/><meta name="x-apple-disable-message-reformatting"/></head>
      <body style="background-color:${PAPER};margin:0;padding:0">
        ${preheader(`Your ${result.toolName} result: ${result.headline.value}`)}
        <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center"><tbody><tr><td style="margin:0;padding:0;background-color:${PAPER}">
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:${FONT_BODY}"><tbody><tr style="width:100%"><td>
            ${brandHeader()}
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${CARD};border:1px solid ${RULE};border-radius:12px;padding:32px 28px"><tbody><tr><td>
              <h1 style="font-family:${FONT_DISPLAY};font-size:24px;font-weight:700;color:${INK};line-height:32px;margin:0 0 16px;letter-spacing:-0.01em">Hi ${name}, here's your ${toolName} result</h1>
              <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${PAPER};border-radius:8px;padding:16px 18px;margin:0 0 16px"><tbody><tr><td>
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${MUTED}">${headlineLabel}</p>
                <p style="margin:4px 0 0;font-size:26px;font-weight:700;font-family:${FONT_DISPLAY};color:${INK}">${headlineValue}</p>
              </td></tr></tbody></table>
              ${detailsRows ? `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 16px">${detailsRows}</table>` : ""}
              ${ctaButton(resultUrl, "Open this calculator again")}
              <p style="font-size:12px;line-height:20px;color:${MUTED};margin:16px 0 0">This result is also saved on your <a href="https://www.aitaxbot.co.in/dashboard" style="color:${INK}">dashboard</a>. This is an estimate, not a filed return.</p>
            </td></tr></tbody></table>
            ${promoCards}
            <p style="font-size:12px;line-height:18px;color:${MUTED};margin:24px 0 0">AiTaxBot · Bengaluru, Karnataka, India</p>
          </td></tr></tbody></table>
        </td></tr></tbody></table>
      </body></html>
    `,
    textContent: `Hi ${user.firstName || "there"},\n\n${result.toolName} result:\n${result.headline.label}: ${result.headline.value}\n${(result.details ?? []).map((d) => `${d.label}: ${d.value}`).join("\n")}\n\nOpen again: ${resultUrl}\nDashboard: https://www.aitaxbot.co.in/dashboard\n${isIncomeTax ? "" : "\nBest in the market — Income Tax Calculator: old vs new regime side by side, every slab, surcharge and rebate handled. https://www.aitaxbot.co.in/calculators/income-tax\n"}${isReconciliation ? "" : "\nOne of a kind — AIS Reconciliation: upload your AIS, 26AS and Form 16 and we match every entry against each other. https://www.aitaxbot.co.in/tools/ais-26as-form16\n"}\n-- AiTaxBot Team`,
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
    bcc: [ADMIN_BCC],
    ...buildCalculatorResultEmail(user, result),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Monthly digest — a written piece first, computed dates second.
//
// Replaced the weekly digest 2026-09-07. Two things changed and they are
// related. It is monthly rather than weekly because there is not a week's
// worth of worth-reading tax material and a thin recurring email trains
// people to ignore the sender. And it leads with prose a person wrote,
// because the generated version's whole substance was a date table the
// reader could not act on — the 2026-09-07 send went out one week before
// the 15 September advance-tax instalment and gave that fact exactly the
// same visual weight as a deadline six months away.
//
// Sent from SENDERS.digest, never automatically (see server/monthlyDigest.ts),
// and always with a working unsubscribe link — DPDP hygiene for recurring
// mail, and the one thing that must not break when the template changes.
// ─────────────────────────────────────────────────────────────────────────

type DigestContent = { issue: DigestIssue; dates: KeyDateItem[]; usage: SavedResult[] };

/**
 * Author-written plain text to HTML paragraphs. Escaped first, so a `<` in a
 * draft cannot produce broken markup or an injection path in mail addressed
 * to every registered user; blank lines become paragraphs and single
 * newlines become breaks, which is the whole formatting vocabulary the
 * admin editor offers.
 */
function prose(text: string | undefined, size = 15): string {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) =>
      `<p style="font-size:${size}px;line-height:${Math.round(size * 1.6)}px;color:${BODY_TEXT};margin:0 0 14px">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/**
 * One "dates to watch" row. Anything inside a week is promoted — bold, ink
 * rather than grey, and an explicit day count — because "15 Sept" alone
 * reads identically whether it is tomorrow or six months out, which is the
 * specific failure the September send demonstrated.
 */
function dateRow(d: KeyDateItem): string {
  const days = daysUntil(new Date(d.date));
  const urgent = days >= 0 && days <= 7;
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return `<tr>
    <td style="padding:9px 0;font-size:13px;line-height:20px;color:${urgent ? INK : BODY_TEXT};${urgent ? "font-weight:600" : ""}">
      <strong>${d.day} ${d.monthLabel}</strong> — ${escapeHtml(d.title)}
      ${urgent ? `<span style="color:${CREDIT};font-weight:700"> · ${when}</span>` : ""}
    </td>
    <td style="padding:9px 0;text-align:right;font-size:12px;line-height:20px;color:${MUTED};white-space:nowrap">${escapeHtml(d.detail)}</td>
  </tr>`;
}

export function buildMonthlyDigestEmail(
  user: { id: string; firstName?: string | null },
  content: DigestContent
): EmailContent {
  const name = escapeHtml(user.firstName || "there");
  const { issue, dates, usage } = content;

  const sections = (issue.sections || [])
    .filter((sec) => sec.heading?.trim() && sec.body?.trim())
    .map((sec) => `
      <h2 style="font-family:${FONT_DISPLAY};font-size:17px;line-height:24px;font-weight:700;color:${INK};margin:26px 0 10px;letter-spacing:-0.01em">${escapeHtml(sec.heading)}</h2>
      ${prose(sec.body)}`)
    .join("");

  const datesSection = issue.includeDates && dates.length
    ? `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${CARD};border:1px solid ${RULE};border-radius:12px;padding:24px 28px;margin-top:16px"><tbody><tr><td>
        <p style="font-size:12px;line-height:24px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};margin:0 0 4px">Dates to watch</p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">${dates.map(dateRow).join("")}</table>
      </td></tr></tbody></table>`
    : "";

  // headline.label is what says WHAT the figure is — "Your tax · New Regime"
  // against "Projected corpus". The weekly template dropped it and rendered
  // tool name against bare value, which put a ₹1.59 crore PF projection and a
  // ₹3,51,000 tax bill in the same two columns as though they were the same
  // kind of number. Never render one of these figures without its label.
  const usageRows = usage
    .map((r) => `<tr>
      <td style="padding:9px 0;font-size:13px;line-height:18px;color:${BODY_TEXT}">
        ${escapeHtml(r.toolName)}
        <span style="display:block;font-size:11px;line-height:16px;color:${MUTED}">${escapeHtml(r.headline.label)}</span>
      </td>
      <td style="padding:9px 0;text-align:right;font-size:14px;font-weight:600;color:${INK};white-space:nowrap">${escapeHtml(r.headline.value)}</td>
    </tr>`)
    .join("");

  const usageSection = issue.includeUsage && usageRows
    ? `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${CARD};border:1px solid ${RULE};border-radius:12px;padding:24px 28px;margin-top:16px"><tbody><tr><td>
        <p style="font-size:12px;line-height:24px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};margin:0 0 4px">Where you left off</p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">${usageRows}</table>
        <div style="margin:18px 0 0">${ctaButton("https://www.aitaxbot.co.in/dashboard", "View your dashboard")}</div>
      </td></tr></tbody></table>`
    : "";

  // Only pitch a tool to someone who hasn't already used it.
  const hasUsedReconciliation = usage.some((r) => r.kind === "reconciliation");
  const hasUsedIncomeTax = usage.some((r) => r.route === "/calculators/income-tax");
  const promoCards = [
    hasUsedIncomeTax ? "" : incomeTaxPromo(),
    hasUsedReconciliation ? "" : aisPromo(),
  ].filter(Boolean).join("\n");

  return {
    subject: issue.subject,
    htmlContent: `
      <!DOCTYPE html>
      <html dir="ltr" lang="en"><head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/><meta name="x-apple-disable-message-reformatting"/></head>
      <body style="background-color:${PAPER};margin:0;padding:0">
        ${preheader(issue.preheader || issue.subject)}
        <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center"><tbody><tr><td style="margin:0;padding:0;background-color:${PAPER}">
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:${FONT_BODY}"><tbody><tr style="width:100%"><td>
            ${brandHeader()}
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${CARD};border:1px solid ${RULE};border-radius:12px;padding:32px 28px"><tbody><tr><td>
              <p style="font-size:11px;line-height:20px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};margin:0 0 8px">Monthly update · ${escapeHtml(issueLabel(issue.id))}</p>
              <h1 style="font-family:${FONT_DISPLAY};font-size:24px;font-weight:700;color:${INK};line-height:32px;margin:0 0 16px;letter-spacing:-0.01em">${escapeHtml(issue.subject)}</h1>
              <p style="font-size:15px;line-height:24px;color:${BODY_TEXT};margin:0 0 4px">Hi ${name},</p>
              ${prose(issue.intro)}
              ${sections}
            </td></tr></tbody></table>
            ${datesSection}
            ${usageSection}
            ${promoCards}
            <p style="font-size:12px;line-height:18px;color:${MUTED};margin:24px 0 0">
              AiTaxBot · Bengaluru, Karnataka, India<br/>
              <a href="${unsubscribeUrl(user.id)}" style="color:${MUTED}">Unsubscribe from this monthly email</a>
            </p>
          </td></tr></tbody></table>
        </td></tr></tbody></table>
      </body></html>
    `,
    textContent: [
      `Hi ${user.firstName || "there"},`,
      "",
      issue.subject,
      issue.intro ? `\n${issue.intro}` : "",
      ...(issue.sections || [])
        .filter((sec) => sec.heading?.trim() && sec.body?.trim())
        .map((sec) => `\n${sec.heading}\n${sec.body}`),
      issue.includeDates && dates.length
        ? `\nDates to watch:\n${dates.map((d) => `${d.day} ${d.monthLabel} — ${d.title} (${d.detail})`).join("\n")}`
        : "",
      issue.includeUsage && usage.length
        ? `\nWhere you left off:\n${usage.map((r) => `${r.toolName} — ${r.headline.label}: ${r.headline.value}`).join("\n")}`
        : "",
      `\nDashboard: https://www.aitaxbot.co.in/dashboard`,
      hasUsedIncomeTax ? "" : `\nBest in the market — Income Tax Calculator: old vs new regime side by side, every slab, surcharge and rebate handled. https://www.aitaxbot.co.in/calculators/income-tax`,
      hasUsedReconciliation ? "" : `\nOne of a kind — AIS Reconciliation: upload your AIS, 26AS and Form 16 and we match every entry against each other. https://www.aitaxbot.co.in/tools/ais-26as-form16`,
      `\nUnsubscribe: ${unsubscribeUrl(user.id)}`,
      "",
      "-- AiTaxBot Team",
    ].filter((line) => line !== "").join("\n"),
  };
}

/**
 * No ADMIN_BCC here — see the note on ADMIN_BCC above for why the digest is
 * the one email that must not carry it.
 */
export async function sendMonthlyDigestEmail(
  user: { id: string; email?: string | null; firstName?: string | null },
  content: DigestContent
) {
  if (!user.email) return { sent: false, reason: "no_email" as const };
  return sendEmail({
    to: [{ email: user.email, name: user.firstName || undefined }],
    sender: SENDERS.digest,
    ...buildMonthlyDigestEmail(user, content),
  });
}

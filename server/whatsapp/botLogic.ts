/**
 * botLogic.ts
 * AiTaxBot WhatsApp Bot — core logic
 *
 * Features:
 *  1. Onboarding flow: welcome → collect name → show menu
 *  2. Keyword engine: maps words to tool links
 *  3. FAQ engine: answers common tax questions inline
 *  4. Lead capture: stores every user in leadsStore (JSON CRM)
 *  5. Fallback: graceful "I'll get back to you" with tool menu
 *
 * Uses Meta WhatsApp Cloud API (free tier).
 * No third-party SDKs — only Node.js built-in fetch.
 */

import { getLead, upsertLead } from "./leadsStore";

const BASE_URL = "https://www.aitaxbot.co.in";

// ── Session state (in-memory; resets on server restart) ──────────────────────
type BotState = "awaiting_name" | "active";

interface Session {
  state: BotState;
  name: string;
}

const sessions = new Map<string, Session>();

// ── Meta API ─────────────────────────────────────────────────────────────────
async function sendMessage(to: string, text: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token         = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    console.error("[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
    return;
  }

  const url  = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text, preview_url: false },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[WhatsApp] Send failed (${res.status}):`, err);
    }
  } catch (err) {
    console.error("[WhatsApp] Network error:", err);
  }
}

// ── Keyword → tool link map ───────────────────────────────────────────────────
interface ToolMatch {
  pattern: RegExp;
  label: string;
  url: string;
  intent: string;
}

const TOOLS: ToolMatch[] = [
  {
    pattern: /\bhra\b/i,
    label: "HRA Calculator",
    url: `${BASE_URL}/calculators/hra`,
    intent: "HRA",
  },
  {
    pattern: /\bsip\b/i,
    label: "SIP Calculator",
    url: `${BASE_URL}/calculators/sip`,
    intent: "SIP",
  },
  {
    pattern: /\bswp\b/i,
    label: "SWP Calculator",
    url: `${BASE_URL}/calculators/swp`,
    intent: "SWP",
  },
  {
    pattern: /\bnps\b/i,
    label: "NPS Calculator",
    url: `${BASE_URL}/calculators/nps`,
    intent: "NPS",
  },
  {
    pattern: /\bpf\b|provident fund/i,
    label: "PF Calculator",
    url: `${BASE_URL}/calculators/pf`,
    intent: "PF",
  },
  {
    pattern: /rent receipt|rent\b/i,
    label: "Rent Receipt Generator",
    url: `${BASE_URL}/tools/rent-receipt`,
    intent: "Rent Receipt",
  },
  {
    pattern: /\bitr\b|tax return|income tax return|file.*tax/i,
    label: "Income Tax Calculator",
    url: `${BASE_URL}/calculators/income-tax`,
    intent: "ITR",
  },
  {
    pattern: /income tax|tax calculat|new regime|old regime|80c|regime/i,
    label: "Income Tax Calculator",
    url: `${BASE_URL}/calculators/income-tax`,
    intent: "Income Tax",
  },
  {
    pattern: /\bnri\b|dtaa|nro|nre|repatri/i,
    label: "NRI Corner",
    url: `${BASE_URL}/nri`,
    intent: "NRI",
  },
];

// ── FAQ engine ────────────────────────────────────────────────────────────────
interface FAQ {
  pattern: RegExp;
  answer: string;
  intent: string;
}

const FAQS: FAQ[] = [
  {
    pattern: /80c limit|80c deduction|how much 80c/i,
    answer:
      "Section 80C allows deductions up to *Rs.1,50,000 per year* — but only under the *Old Tax Regime*. Instruments: ELSS, PPF, EPF, LIC premium, NSC, tax-saving FD, home loan principal, tuition fees.\n\nUnder the New Regime, 80C is not available.",
    intent: "80C FAQ",
  },
  {
    pattern: /itr deadline|last date.*itr|filing deadline|due date.*itr/i,
    answer:
      "*ITR Filing Deadlines for FY 2025-26:*\n\n• Jul 31, 2026 — Individuals (no audit)\n• Oct 31, 2026 — Businesses requiring audit\n• Dec 31, 2026 — Belated return (with penalty)\n\nFiling after Jul 31 attracts a Rs.5,000 penalty (Rs.1,000 if income < Rs.5L).",
    intent: "ITR Deadline FAQ",
  },
  {
    pattern: /advance tax|advance.*tax due|234b|234c/i,
    answer:
      "*Advance Tax Due Dates (FY 2025-26):*\n\n• Jun 15 — 15% of estimated tax\n• Sep 15 — 45% cumulative\n• Dec 15 — 75% cumulative\n• Mar 15 — 100% cumulative\n\nMiss a deadline? Pay ASAP — interest at 1% per month under Sec 234B/234C applies.",
    intent: "Advance Tax FAQ",
  },
  {
    pattern: /standard deduction|std deduction/i,
    answer:
      "*Standard Deduction for Salaried Employees:*\n\n• New Tax Regime: *Rs.75,000* (updated in Budget 2024)\n• Old Tax Regime: *Rs.50,000*\n\nThis is automatically applied — no proof needed.",
    intent: "Standard Deduction FAQ",
  },
  {
    pattern: /new regime.*slab|tax slab.*new|slab rate/i,
    answer:
      "*New Tax Regime Slabs (FY 2025-26):*\n\n• Up to Rs.3L — Nil\n• Rs.3L–7L — 5%\n• Rs.7L–10L — 10%\n• Rs.10L–12L — 15%\n• Rs.12L–15L — 20%\n• Above Rs.15L — 30%\n\nPlus 4% health & education cess on tax.\n\nCalculate yours free: ${BASE_URL}/calculators/income-tax",
    intent: "Tax Slab FAQ",
  },
  {
    pattern: /crypto.*tax|bitcoin.*tax|digital asset|vda/i,
    answer:
      "*Crypto / Digital Asset Tax Rules:*\n\n• Flat *30% tax* on every gain — no deductions allowed\n• *1% TDS* deducted by exchange on every sale\n• Losses cannot be set off against other income\n• Must declare in *Schedule VDA* in ITR-2 or ITR-3\n• Even a Rs.500 sale must be declared — no minimum threshold",
    intent: "Crypto Tax FAQ",
  },
  {
    pattern: /form 16|what is form 16/i,
    answer:
      "*Form 16 — TDS Certificate from Employer:*\n\n• *Part A*: TDS amount deducted and deposited with govt\n• *Part B*: Full salary breakup, deductions claimed\n\nIf you changed jobs, get Form 16 from *both* employers. File ITR only after combining both.\n\nDownload from your HR portal or TRACES website.",
    intent: "Form 16 FAQ",
  },
  {
    pattern: /ais|annual information|form 26as/i,
    answer:
      "*AIS — Annual Information Statement:*\n\nLists all financial transactions reported against your PAN — FD interest, dividends, property sales, mutual funds, salary TDS.\n\n*How to access:*\nincometax.gov.in → Login → e-File → AIS\n\nAlways check AIS *before* filing ITR. Any discrepancy? File feedback on the AIS portal first.",
    intent: "AIS FAQ",
  },
];

// ── Intent detection & response ───────────────────────────────────────────────
function detectAndReply(msg: string): { reply: string; intent: string } | null {
  // 1. FAQ match (more specific — check first)
  for (const faq of FAQS) {
    if (faq.pattern.test(msg)) {
      return { reply: faq.answer, intent: faq.intent };
    }
  }

  // 2. Tool keyword match
  for (const tool of TOOLS) {
    if (tool.pattern.test(msg)) {
      return {
        reply: `Here's the free *${tool.label}*:\n${tool.url}\n\nType anything else I can help with, or type *menu* to see all tools.`,
        intent: tool.intent,
      };
    }
  }

  return null;
}

// ── Main message handler ──────────────────────────────────────────────────────
export async function handleIncomingMessage(body: any): Promise<void> {
  try {
    // Parse Meta webhook payload
    const entry   = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return; // not a message event (e.g. status update)

    const msg     = messages[0];
    const from    = msg.from as string;           // phone number (E.164 without +)
    const text    = (msg.text?.body as string || "").trim();
    const lower   = text.toLowerCase();

    if (!text) return;

    console.log(`[WhatsApp] Incoming from ${from}: "${text}"`);

    // ── Get or init session ────────────────────────────────────────────────
    let session = sessions.get(from);
    const lead  = getLead(from);

    if (!session) {
      session = { state: lead?.name ? "active" : "awaiting_name", name: lead?.name ?? "" };
      sessions.set(from, session);
    }

    // ── Onboarding: collect name ───────────────────────────────────────────
    if (session.state === "awaiting_name") {
      // First message — send welcome and ask name
      if (!lead) {
        upsertLead(from, { queryType: "new_user" });
        await sendMessage(
          from,
          `Welcome to *AiTaxBot!*\n\nI'm your free Indian tax assistant. I can help with:\n• HRA, SIP, NPS, PF, SWP calculators\n• Income tax (New vs Old regime)\n• Rent receipts\n• ITR filing tips\n• Quick tax answers\n\nWhat's your name? I'll personalise your experience.`
        );
        return;
      }

      // Second message — treat it as their name
      const name = text.replace(/^(i am|my name is|this is)\s+/i, "").trim();
      session.name  = name;
      session.state = "active";
      sessions.set(from, session);
      upsertLead(from, { name, queryType: "onboarding" });

      await sendMessage(
        from,
        `Nice to meet you, *${name}!*\n\nJust type what you need:\n\n*Calculators:* HRA · SIP · SWP · NPS · PF · Income Tax\n*Tools:* Rent Receipt · NRI Corner\n*Questions:* 80C limit · ITR deadline · Advance tax · Tax slabs · Crypto tax · Form 16\n\nOr ask me anything — I'll do my best to answer!`
      );
      return;
    }

    // ── Active session ─────────────────────────────────────────────────────
    const name = session.name || lead?.name || "there";

    // Menu command
    if (/^menu$|^help$|^hi$|^hello$|^hey$|^start$/i.test(lower)) {
      upsertLead(from, { queryType: "menu" });
      await sendMessage(
        from,
        `Hi *${name}!* Here's what I can help with:\n\n*Free Calculators:*\n• HRA\n• SIP\n• SWP\n• NPS\n• PF\n• Income Tax (New vs Old Regime)\n\n*Free Tools:*\n• Rent Receipt Generator\n• NRI Corner (DTAA, NRO/NRE)\n\n*Just type the name* of what you need, or ask a tax question!\n\nAll tools are free at ${BASE_URL}`
      );
      return;
    }

    // Detect intent and reply
    const match = detectAndReply(text);
    if (match) {
      upsertLead(from, { queryType: match.intent });
      await sendMessage(from, match.reply);
      return;
    }

    // Fallback — unknown query
    upsertLead(from, { queryType: "unknown", notes: `Asked: ${text.slice(0, 100)}` });
    await sendMessage(
      from,
      `Thanks *${name}*, I've noted your question: _"${text}"_\n\nI'll get back to you shortly.\n\nMeanwhile, you can explore our free tools at:\n${BASE_URL}\n\nType *menu* to see what I can help with right now.`
    );
  } catch (err) {
    console.error("[WhatsApp] Error handling message:", err);
  }
}

// ── Webhook verification ──────────────────────────────────────────────────────
export function verifyWebhook(req: any, res: any): void {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verified successfully.");
    res.status(200).send(challenge);
  } else {
    console.warn("[WhatsApp] Webhook verification failed. Check WHATSAPP_VERIFY_TOKEN.");
    res.sendStatus(403);
  }
}

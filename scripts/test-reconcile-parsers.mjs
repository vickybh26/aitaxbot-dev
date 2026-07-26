#!/usr/bin/env node
/**
 * Reconciliation parser regression test
 * ─────────────────────────────────────
 * Runs the PRODUCTION prompts (extracted live from taxReconcileService.ts)
 * against real AIS / 26AS documents and asserts the figures a CA has already
 * verified by hand.
 *
 * WHY THIS EXISTS
 * Three separate parser bugs shipped to production in July 2026, each found
 * only by chance — someone happened to feed real family documents through the
 * tool and read the output carefully. Each bug had the same shape: data that
 * failed to extract was indistinguishable from data that genuinely wasn't
 * there, so the report looked confident and complete while silently omitting
 * income. This script turns that luck into a check.
 *
 * IMPORTANT — the prompts are read out of the source file at runtime, not
 * copy-pasted here. An earlier manual verification used a simplified
 * hand-written prompt and therefore never exercised the real (broken) one,
 * which is exactly how the AIS bug survived a "verification".
 *
 * PRIVACY
 * The fixture PDFs are real tax documents containing PAN, masked Aadhaar,
 * addresses and bank account numbers. They are deliberately NOT committed —
 * they live in a gitignored folder. Only this script and the expected figures
 * are in the repo. If the folder is absent the script skips, it does not fail.
 *
 * USAGE
 *   node scripts/test-reconcile-parsers.mjs
 *
 * Put fixtures in:  test-fixtures/reconcile/   (gitignored)
 *   mummy-ais.pdf     mummy-26as.pdf
 *   papa-ais.pdf
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES = join(ROOT, "test-fixtures", "reconcile");
const SERVICE = join(ROOT, "server", "taxReconcileService.ts");
const MODEL = "gemini-2.5-flash";
const TOLERANCE = 2; // rupees — AIS section totals occasionally differ by ±1 from the sum of their own rows

// ─── Load API key from .env ──────────────────────────────────────────────────
function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return {};
  return Object.fromEntries(
    readFileSync(p, "utf8")
      .split("\n")
      .filter(l => l.includes("=") && !l.trim().startsWith("#"))
      .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
}
const env = loadEnv();
const API_KEY = process.env.GOOGLE_API_KEY || env.GOOGLE_API_KEY || env.GEMINI_API_KEY;

// ─── Pull the live prompts out of the service file ───────────────────────────
// Deliberately reads the real source so this test breaks if someone edits a
// prompt in a way that stops it extracting correctly.
function extractPrompt(kind) {
  const src = readFileSync(SERVICE, "utf8");
  const anchor = kind === "ais"
    ? /const prompt = `(This is an Annual Information Statement[\s\S]*?)`;/
    : /const prompt = `(This is an Annual Tax Statement[\s\S]*?)`;/;
  const m = src.match(anchor);
  if (!m) throw new Error(`Could not extract the ${kind} prompt from taxReconcileService.ts — has the code changed shape?`);
  return m[1];
}

async function callGemini(pdfPath, prompt) {
  const pdf = readFileSync(pdfPath);
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "application/pdf", data: pdf.toString("base64") } },
            { text: prompt },
          ],
        }],
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const j = await resp.json();
  const raw = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Gemini response");
  return JSON.parse(match[0]);
}

// ─── Expected values — verified by hand against the source documents ─────────
// Every number here was cross-checked by a CA or read directly off the PDF.
// If one of these starts failing, the parser regressed — fix the parser, do
// NOT relax the expectation without re-reading the document.
const CASES = [
  {
    file: "mummy-ais.pdf",
    kind: "ais",
    label: "AIS — multi-bank interest + SFT-005 time deposit",
    expect: {
      interestFromSavings: 3094,    // SBI 2,146 + HDFC 948
      interestFromFD: 190420,       // SBI 1,49,030 + HDFC 41,390
    },
    // SFT-005 purchase of time deposits ₹13,54,000 must appear as a
    // high-value transaction — it is not income, but it must not vanish.
    expectHighValueContains: 1354000,
  },
  {
    file: "mummy-26as.pdf",
    kind: "26as",
    label: "26AS — TRACES summary-row layout, 194A interest TDS",
    expect: {
      // Deductor summary row shows the total; the section code (194A) only
      // appears on the itemised sub-rows. This layout returned null before
      // the 2026-07-18 fix, producing "No TDS credits found in 26AS".
      tdsNonSalary: 14918,
    },
  },
  {
    file: "papa-ais.pdf",
    kind: "ais",
    label: "AIS — 4-bank savings, 3-bank FD, equity sales, 194C business receipts",
    expect: {
      interestFromSavings: 3507,     // Bandhan 2,238 + Axis 607 + SBI 441 + HDFC 221
      interestFromFD: 132276,        // SBI 49,146 + Axis 42,262 + HDFC 40,868
      dividendIncome: 200,           // Bank of Maharashtra
      securitiesTransactions: 67992, // 3 listed equity sales
    },
    // The regression that motivated the catch-all: ₹45,500 of 194C contract
    // receipts had no named field and disappeared entirely from the report.
    expectOtherIncomeContains: 45500,
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────
function near(actual, expected) {
  return typeof actual === "number" && Math.abs(actual - expected) <= TOLERANCE;
}

async function main() {
  if (!existsSync(FIXTURES)) {
    console.log(`\n⏭  SKIPPED — no fixtures at ${FIXTURES}`);
    console.log("   These are real tax documents and are intentionally not committed.");
    console.log("   Place them there locally to enable this test.\n");
    process.exit(0);
  }
  if (!API_KEY) {
    console.error("\n❌ No GOOGLE_API_KEY found in .env or environment.\n");
    process.exit(1);
  }

  let failures = 0;
  let ran = 0;

  for (const c of CASES) {
    const path = join(FIXTURES, c.file);
    if (!existsSync(path)) {
      console.log(`⏭  ${c.file} — not present, skipping`);
      continue;
    }
    ran++;
    process.stdout.write(`\n▶  ${c.label}\n   ${c.file} ... `);

    let parsed;
    try {
      parsed = await callGemini(path, extractPrompt(c.kind));
    } catch (err) {
      console.log(`ERROR\n   ❌ ${err.message}`);
      failures++;
      continue;
    }
    console.log("parsed");

    for (const [field, expected] of Object.entries(c.expect)) {
      const actual = parsed[field];
      if (near(actual, expected)) {
        console.log(`   ✅ ${field}: ${actual}`);
      } else {
        console.log(`   ❌ ${field}: got ${JSON.stringify(actual)}, expected ${expected}`);
        failures++;
      }
    }

    if (c.expectHighValueContains != null) {
      const hit = (parsed.highValueTransactions || []).some(t => near(t.amount, c.expectHighValueContains));
      console.log(hit
        ? `   ✅ high-value transaction ${c.expectHighValueContains} present`
        : `   ❌ high-value transaction ${c.expectHighValueContains} MISSING — got ${JSON.stringify(parsed.highValueTransactions)}`);
      if (!hit) failures++;
    }

    if (c.expectOtherIncomeContains != null) {
      const hit = (parsed.otherIncomeItems || []).some(t => near(t.amount, c.expectOtherIncomeContains));
      console.log(hit
        ? `   ✅ other-income ${c.expectOtherIncomeContains} captured (catch-all working)`
        : `   ❌ other-income ${c.expectOtherIncomeContains} DROPPED — got ${JSON.stringify(parsed.otherIncomeItems)}`);
      if (!hit) failures++;
    }
  }

  console.log("\n" + "─".repeat(60));
  if (ran === 0) {
    console.log("⏭  No fixtures found — nothing verified.");
    process.exit(0);
  }
  if (failures > 0) {
    console.log(`❌ ${failures} assertion(s) FAILED across ${ran} document(s).`);
    console.log("   The parser has regressed. Do NOT deploy until this passes.\n");
    process.exit(1);
  }
  console.log(`✅ All assertions passed across ${ran} document(s).\n`);
}

main().catch(e => { console.error("\n❌ Runner crashed:", e.message, "\n"); process.exit(1); });

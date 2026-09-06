/**
 * scripts/previewEmails.ts — render the three new emails to local HTML
 * files with sample data, without touching the Brevo API.
 *
 * Deliberately imports only the pure buildX() functions from
 * emailService.ts, never sendX() — this must be safe to run against the
 * real .env (real BREVO_API_KEY, real Firestore) without ever emailing a
 * real person.
 *
 * Usage: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/previewEmails.ts [outDir]
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  buildWelcomeEmail,
  buildCalculatorResultEmail,
  buildWeeklyDigestEmail,
} from "../server/emailService";
import { getUpcomingKeyDates } from "../shared/keyDates";
import type { SavedResult } from "../server/savedResults";

const outDir = resolve(process.cwd(), process.argv[2] || "scripts/email-previews");
mkdirSync(outDir, { recursive: true });

const sampleUser = { id: "sample-uid-123", firstName: "Priya" };

const sampleResult: Pick<SavedResult, "toolName" | "route" | "headline" | "details" | "kind"> = {
  toolName: "Income Tax Calculator",
  route: "/calculators/income-tax",
  kind: "calculator",
  headline: { label: "New Regime Tax (FY 2026-27)", value: "₹97,500" },
  details: [
    { label: "Old Regime Tax", value: "₹2,10,600" },
    { label: "You Save", value: "₹1,13,100" },
    { label: "Taxable Income", value: "₹14,25,000" },
  ],
};

const sampleUsage: SavedResult[] = [
  {
    id: "sample-uid-123__income-tax",
    userId: sampleUser.id,
    toolKey: "income-tax",
    toolName: "Income Tax Calculator",
    route: "/calculators/income-tax",
    kind: "calculator",
    headline: { label: "New Regime Tax", value: "₹97,500" },
    details: [],
    inputs: {},
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sample-uid-123__hra",
    userId: sampleUser.id,
    toolKey: "hra",
    toolName: "HRA Calculator",
    route: "/calculators/hra",
    kind: "calculator",
    headline: { label: "HRA Exemption", value: "₹1,44,000" },
    details: [],
    inputs: {},
    updatedAt: new Date().toISOString(),
  },
];

const pages: { file: string; label: string; content: { subject: string; htmlContent: string; textContent?: string } }[] = [
  { file: "1-welcome.html", label: "Welcome email", content: buildWelcomeEmail(sampleUser) },
  { file: "2-calculator-result.html", label: "Calculator-result email", content: buildCalculatorResultEmail(sampleUser, sampleResult) },
  { file: "3-weekly-digest.html", label: "Weekly digest email", content: buildWeeklyDigestEmail(sampleUser, { dates: getUpcomingKeyDates(), usage: sampleUsage }) },
];

for (const { file, label, content } of pages) {
  writeFileSync(resolve(outDir, file), content.htmlContent, "utf8");
  console.log(`✓ ${label.padEnd(28)} → ${file}   Subject: "${content.subject}"`);
}

console.log(`\nAll previews written to: ${outDir}`);
console.log("Open each .html file directly in a browser to review — no email was sent.");

/** Integration check: real PDF route/generator, synthetic figures, no Firebase or external AI. */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import { PDFParse } from "pdf-parse";
import { registerTaxComputationRoutes } from "../server/taxComputationRoutes";
import { createEmptyWizardState, computeWizardTaxSummary } from "../client/src/features/income-tax/model";
import { buildTaxComputationData } from "../client/src/features/income-tax/resultExport";

const app = express();
app.use(express.json());
registerTaxComputationRoutes(app);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
const address = server.address();
assert.ok(address && typeof address !== "string");
const url = `http://127.0.0.1:${address.port}/api/tax-computation/generate-pdf`;

try {
  for (const invalid of [{}, { personalInfo: { name: "Test" }, taxBreakdown: {} }]) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invalid) });
    assert.equal(response.status, 400);
  }
  const state = createEmptyWizardState();
  state.incomeHeads.salary = state.incomeHeads.capitalGains = state.incomeHeads.houseProperty = true;
  state.salary.basicSalary = "1500000";
  state.deductions.section80C = "150000";
  state.capitalGains.stcgEquity = "100000";
  state.capitalGains.ltcgEquity = "200000";
  state.houseProperty.numberOfLetOut = "1";
  state.houseProperty.annualRentReceived = "100000";
  state.houseProperty.letOutHomeLoanInterest = "300000";
  const summary = computeWizardTaxSummary(state);
  const payload = buildTaxComputationData(state, summary, "Synthetic Test User");
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  assert.ok(result.text.includes("29,375"), "PDF must use engine tax on STCG + LTCG, not 12.5% of gross LTCG");
  assert.ok(result.text.includes("1,28,050"), "PDF must agree with the recommended engine result");
  assert.ok(result.text.includes("House-property loss not set off"));
  assert.ok(!result.text.includes("Sec 24(b) — Home Loan Interest (Max"), "property interest must not be deducted twice");
  await parser.destroy();
  const out = resolve(import.meta.dirname, "../tmp/income-tax-review");
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, "synthetic-computation.pdf"), buffer);
  writeFileSync(resolve(out, "synthetic-payload.json"), JSON.stringify(payload, null, 2));
  console.log(`PDF endpoint passed: invalid=400, valid=200 application/pdf; text and engine totals agree (${result.total} pages).`);
  console.log(`Synthetic review PDF: ${resolve(out, "synthetic-computation.pdf")}`);
} finally {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

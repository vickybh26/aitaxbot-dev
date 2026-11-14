/** Run: npm run test:income-tax. Exercises rules without mounting any UI. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createEmptyWizardState, computeWizardTaxSummary, parseAmount, computeHousePropertyIncome } from "../client/src/features/income-tax/model";
import { buildIncomeTaxSavedResult } from "../client/src/features/income-tax/savedResult";
import { postToolUsage } from "../client/src/lib/toolUsage";
import { canContinue, getActiveSteps } from "../client/src/features/income-tax/flow";
import { buildTaxAdviceInput, buildTaxComputationData } from "../client/src/features/income-tax/resultExport";

const state = createEmptyWizardState();
assert.equal(canContinue(state, "basicDetails"), false);
state.basicDetails = { name: "Test Taxpayer", mobile: "9876543210", email: "test@example.com" };
assert.equal(canContinue(state, "basicDetails"), true);
assert.equal(canContinue({ ...state, basicDetails: { ...state.basicDetails, mobile: "1234567890" } }, "basicDetails"), false);
assert.equal(canContinue({ ...state, basicDetails: { ...state.basicDetails, email: "invalid" } }, "basicDetails"), false);
assert.equal(canContinue(state, "fyAndHeads"), false);
assert.equal(canContinue(state, "deductions"), true); // Optional deductions never block progress.

// Exhaust every income-head combination, including removing a previously selected head.
const heads = ["salary", "houseProperty", "business", "capitalGains", "otherSources"] as const;
for (let mask = 0; mask < 32; mask++) {
  heads.forEach((head, i) => { state.incomeHeads[head] = Boolean(mask & (1 << i)); });
  const selected = heads.filter((head) => state.incomeHeads[head]);
  assert.deepEqual(getActiveSteps(state.incomeHeads).map((step) => step.id),
    ["basicDetails", "fyAndHeads", ...selected, "deductions", "result"]);
  assert.equal(canContinue(state, "fyAndHeads"), mask !== 0);
}
heads.forEach((head) => { state.incomeHeads[head] = head === "salary"; });
assert.equal(canContinue(state, "salary"), false);
state.salary.basicSalary = "1500000";
state.deductions.section80C = "150000";
assert.equal(canContinue(state, "salary"), true);

// Worked preservation fixture: old taxable 13L => 202500 + 8100 cess;
// new taxable 14.25L => 93750 + 3750 cess. No changes to tax rules here.
const before = JSON.stringify(state);
const summary = computeWizardTaxSummary(state);
assert.equal(summary.old.liability.totalTax, 210600);
assert.equal(summary.new.liability.totalTax, 97500);
assert.equal(summary.recommendedRegime, "new");
assert.equal(JSON.stringify(state), before, "calculation must not mutate inputs");
const pdf = buildTaxComputationData(state, summary, "Test Taxpayer");
assert.equal(pdf.oldRegimeData.totalTax, 210600);
assert.equal(pdf.newRegimeData.totalTax, 97500);
assert.equal(pdf.savings, 113100);
assert.equal(pdf.assessmentYear, "2027-28");
assert.equal(buildTaxAdviceInput(state, summary).newRegimeTax, 97500);

assert.equal(canContinue(state, "business"), false);
state.business.scheme = "44AE";
assert.equal(canContinue(state, "business"), true);
state.business.monthsHeld = "13";
assert.equal(canContinue(state, "business"), false);
state.business.monthsHeld = "12";
state.business.isHeavyVehicle = true;
assert.equal(canContinue(state, "business"), false);
state.business.avgTonnageMT = "10";
assert.equal(canContinue(state, "business"), true);
assert.equal(canContinue(state, "houseProperty"), true);
state.houseProperty.numberOfLetOut = "2";
assert.equal(canContinue(state, "houseProperty"), false);
state.houseProperty.numberOfLetOut = "1";
assert.equal(canContinue(state, "houseProperty"), false);
state.houseProperty.annualRentReceived = "120000";
assert.equal(canContinue(state, "houseProperty"), true);
assert.equal(canContinue(state, "capitalGains"), false);
state.capitalGains.stcgEquity = "10000";
assert.equal(canContinue(state, "capitalGains"), true);
assert.equal(canContinue(state, "otherSources"), false);
state.otherSources.savingsInterest = "5000";
assert.equal(canContinue(state, "otherSources"), true);

// Pasted money must be parsed completely; never accept a numeric prefix.
for (const text of ["1500000", "15,00,000", "1,500,000", "₹ 15,00,000.00"]) assert.equal(parseAmount(text), 1500000);
for (const text of ["-500", "1e6", "100oops", "1..2", "1,2,3", "Infinity", "12.345"]) assert.equal(parseAmount(text), null);
const salaryCase = createEmptyWizardState();
salaryCase.incomeHeads.salary = true;
salaryCase.salary.basicSalary = "15,00,000";
assert.equal(computeWizardTaxSummary(salaryCase).new.liability.totalTax, 97500);
for (const invalid of ["-500", "100abc", "1e6"]) {
  assert.equal(canContinue({ ...salaryCase, salary: { ...salaryCase.salary, basicSalary: invalid } }, "salary"), false);
}
salaryCase.capitalGains.stcgEquity = "100000"; // Stale draft in an unchecked head.
salaryCase.otherSources.savingsInterest = "100000";
salaryCase.salary.hraReceived = "";
assert.equal(computeWizardTaxSummary(salaryCase).new.stcgEquity, 0);
assert.equal(computeWizardTaxSummary(salaryCase).old.deductionsBreakdown.section80TTAorTTB, 0);
const hidden = buildTaxComputationData(salaryCase, computeWizardTaxSummary(salaryCase), "Test");
assert.equal(hidden.newRegimeData.capitalGainsSTC, undefined);
assert.equal(hidden.newRegimeData.dividendIncome, undefined);
salaryCase.incomeHeads.capitalGains = true;
salaryCase.capitalGains.ltcgEquity = "200000";
const gains = computeWizardTaxSummary(salaryCase);
// Salary exhausts the basic exemption: 20% of 1L STCG + 12.5% of (2L - 1.25L) LTCG.
assert.equal(gains.new.liability.specialRateTax, 29375);
assert.equal(gains.new.liability.totalTax, 128050);
const gainsPdf = buildTaxComputationData(salaryCase, gains, "Test");
assert.equal(gainsPdf.newRegimeData.specialRateTax, 29375);
assert.equal(gainsPdf.newRegimeData.taxAfterRebate, 123125);
assert.equal(gainsPdf.taxBreakdown.totalTax, gains[gains.recommendedRegime].liability.totalTax);

const property = createEmptyWizardState();
property.incomeHeads.salary = property.incomeHeads.houseProperty = true;
property.salary.basicSalary = "1500000";
property.houseProperty.numberOfLetOut = "1";
property.houseProperty.annualRentReceived = "100000";
property.houseProperty.letOutHomeLoanInterest = "300000";
property.houseProperty.selfOccupiedHomeLoanInterest = "200000"; // Hidden: all properties are let out.
assert.equal(computeHousePropertyIncome(property.houseProperty).selfOccupiedInterestCapped, 0);
const propertySummary = computeWizardTaxSummary(property);
assert.equal(propertySummary.old.housePropertyIncomeForSlab, -200000);
assert.equal(propertySummary.new.housePropertyIncomeForSlab, 0);
assert.equal(propertySummary.new.taxableIncome, 1425000);
assert.equal(propertySummary.new.liability.totalTax, 97500);
const propertyPdf = buildTaxComputationData(property, propertySummary, "Test");
assert.equal(propertyPdf.newRegimeData.housePropertyLossNotSetOff, 230000);
assert.equal(propertyPdf.oldRegimeData.housePropertyLossNotSetOff, 30000);
assert.equal(propertyPdf.newRegimeData.rentalIncome, undefined);

const relief = createEmptyWizardState();
relief.incomeHeads.salary = true;
relief.salary.basicSalary = "1285000"; // Taxable 12.1L, relief caps tax before cess to 10K.
const reliefSummary = computeWizardTaxSummary(relief);
const reliefPdf = buildTaxComputationData(relief, reliefSummary, "Test");
assert.equal(reliefSummary.new.liability.totalTax, 10400);
assert.equal(reliefPdf.newRegimeData.taxAfterRebate, 10000);
assert.equal(reliefPdf.newRegimeData.marginalRelief, 51500);

for (const [year, tax] of [["2024-25", 130000], ["2025-26", 97500], ["2026-27", 97500]] as const) {
  const current = createEmptyWizardState(); current.incomeHeads.salary = true;
  current.financialYear = year; current.salary.basicSalary = "1500000";
  assert.equal(computeWizardTaxSummary(current).new.liability.totalTax, tax);
}
const smallSalary = createEmptyWizardState();
smallSalary.incomeHeads.salary = smallSalary.incomeHeads.otherSources = true;
smallSalary.salary.basicSalary = "50000"; smallSalary.salary.professionalTax = "2400";
smallSalary.otherSources.otherInterest = "1000000";
assert.equal(computeWizardTaxSummary(smallSalary).old.taxableIncome, 1000000, "salary deductions cannot create a loss against other income");
const donation = createEmptyWizardState(); donation.incomeHeads.salary = true;
donation.salary.basicSalary = "1000000"; donation.salary.hraReceived = "200000"; donation.salary.rentPaid = "300000";
donation.deductions.section80G = "100000";
assert.equal(computeWizardTaxSummary(donation).old.deductionsBreakdown.section80G, 47500);

const invalidCounts = createEmptyWizardState(); invalidCounts.business.scheme = "44AE";
for (const count of ["1.5", "-1", "11"]) {
  invalidCounts.business.vehicleCount = count; assert.equal(canContinue(invalidCounts, "business"), false);
}
invalidCounts.business.scheme = "44ADA"; invalidCounts.business.digitalReceipts = "7600000";
assert.equal(canContinue(invalidCounts, "business"), false, "ineligible presumptive receipts must not produce a purported result");
invalidCounts.deductions.section80C = "-1";
assert.equal(canContinue(invalidCounts, "deductions"), false);

const saved = buildIncomeTaxSavedResult(state, computeWizardTaxSummary(state));
assert.equal(saved.inputs?.financialYear, "2026-27");
assert.equal(saved.inputs?.section80C, 150000);
assert.equal(Object.keys(saved.inputs || {}).some((key) => /name|email|mobile|pan/i.test(key)), false);
const sent: { url?: string; body?: any; authorization?: string } = {};
await postToolUsage({ token: "synthetic-test-token", tool: "Income Tax Calculator", route: saved.route, saved },
  (async (url, options) => {
    sent.url = String(url); sent.body = JSON.parse(options!.body as string);
    sent.authorization = (options!.headers as Record<string, string>).Authorization;
    return new Response("{}", { status: 200 });
  }) as typeof fetch);
assert.equal(sent.url, "/api/tool-usage");
assert.equal(sent.authorization, "Bearer synthetic-test-token");
assert.equal(sent.body.saved.toolKey, "income-tax");
assert.equal(sent.body.saved.headline.value, saved.headline.value);
await assert.rejects(postToolUsage({ token: "synthetic-test-token", tool: "Income Tax Calculator", route: saved.route, saved },
  (async () => new Response("{}", { status: 500 })) as typeof fetch), /rejected \(500\)/);

const ltaCase = createEmptyWizardState(); ltaCase.incomeHeads.salary = true;
ltaCase.salary.basicSalary = "1500000"; ltaCase.salary.lta = "100000";
assert.equal(computeWizardTaxSummary(ltaCase).old.ltaExemption, 0, "LTA received is not automatically exempt");
ltaCase.salary.eligibleLtaExemption = "40000";
assert.equal(computeWizardTaxSummary(ltaCase).old.ltaExemption, 40000);
assert.equal(computeWizardTaxSummary(ltaCase).new.ltaExemption, 0);
ltaCase.salary.eligibleLtaExemption = "110000";
assert.equal(canContinue(ltaCase, "salary"), false);
const senior = createEmptyWizardState(); senior.incomeHeads.otherSources = true;
senior.ageGroup = "60to80"; senior.otherSources.depositInterest = "100000";
assert.equal(computeWizardTaxSummary(senior).old.deductionsBreakdown.section80TTAorTTB, 50000);
senior.ageGroup = "below60";
assert.equal(computeWizardTaxSummary(senior).old.deductionsBreakdown.section80TTAorTTB, 0);
senior.ageGroup = "60to80"; senior.isNonResident = true;
assert.equal(computeWizardTaxSummary(senior).old.deductionsBreakdown.section80TTAorTTB, 0);
senior.otherSources.depositInterest = ""; senior.otherSources.otherInterest = "275000";
assert.equal(computeWizardTaxSummary(senior).old.liability.totalTax, 1300, "non-resident age does not raise old-regime basic exemption");

// Architecture guard: feature code must never depend on presentation components.
const featureRoot = resolve(import.meta.dirname, "../client/src/features/income-tax");
for (const file of readdirSync(featureRoot).filter((name) => name.endsWith(".ts"))) {
  const source = readFileSync(resolve(featureRoot, file), "utf8");
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)].map((match) => match[2]);
  assert.ok(!imports.some((path) => /(?:^|\/)(?:components|pages)(?:\/|$)/.test(path)),
    `${file}: feature logic must not import UI components or pages`);
  if (["model.ts", "validation.ts", "flow.ts", "resultExport.ts"].includes(file)) {
    assert.ok(!imports.includes("react"), `${file}: pure rules must not require React`);
    assert.ok(!/\b(?:window|document|fetch)\s*[.(]/.test(source), `${file}: pure rules must not use browser/network APIs`);
  }
}
console.log("Income-tax checks passed: 32 flow combinations; formatted/invalid inputs; deselected heads; three years; rental losses; capital gains; relief; LTA; deposit interest; PDF/save payloads; failed-save transport; UI boundaries.");

/** Native smoke test using synthetic data only. No provider calls or secrets. */
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { extractPrivateTaxText, PrivateExtractionError } from "../server/localTaxDocument";
import { extractTaxFacts } from "../server/taxDocumentFacts";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function fixture(options: { image?: Buffer; mixed?: boolean; password?: string; pages?: number } = {}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50,
    ...(options.password ? { userPassword: options.password, ownerPassword: "synthetic-owner-password" } : {}),
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  const textPage = () => {
    doc.fontSize(16).text("Financial Year: 2025-26");
    doc.text("Name: SYNTHETIC_PRIVATE_PERSON");
    doc.text("PAN: ABCPX1234Z");
    doc.text("Gross Salary 9,00,000.00");
    doc.text("Standard deduction 75,000.00");
  };
  if (options.image) {
    if (options.mixed) { textPage(); doc.addPage(); }
    doc.image(options.image, 0, 0, { width: doc.page.width, height: doc.page.height });
  } else textPage();
  for (let index = 1; index < (options.pages || 1); index++) { doc.addPage(); textPage(); }
  doc.end();
  return done;
}
const output = await extractPrivateTaxText(await fixture());
const facts = extractTaxFacts(output);
assert.equal(facts.financialYear, "2025-26");
assert.ok(facts.observations.some(row => row.category === "gross_salary" && row.amounts[0] === 900000));
assert.ok(!JSON.stringify(facts).includes("SYNTHETIC_PRIVATE_PERSON"));
console.log("PASS: native Poppler text-PDF extraction and financial projection.");

const before = new Set((await readdir(tmpdir())).filter(name => name.startsWith("aitaxbot-private-")));
const scratch = await mkdtemp(join(tmpdir(), "aitaxbot-native-fixture-"));
try {
  const source = join(scratch, "synthetic.pdf");
  const prefix = join(scratch, "scan");
  await writeFile(source, await fixture());
  await promisify(execFile)(process.env.PDFTOPPM_BIN || "pdftoppm", ["-singlefile", "-scale-to", "2400", "-png", source, prefix], { windowsHide: true });
  const image = await readFile(prefix + ".png");
  for (const options of [
    { image },
    { image, mixed: true },
    { image, password: "synthetic-secret" },
    { password: "synthetic-secret" },
  ]) {
    const pdf = await fixture(options);
    const extracted = await extractPrivateTaxText(pdf, options.password);
    const projected = extractTaxFacts(extracted);
    assert.equal(projected.financialYear, "2025-26");
    const salaries = projected.observations.filter(row => row.category === "gross_salary");
    assert.equal(salaries.length, options.mixed ? 2 : 1);
    assert.ok(salaries.every(row => row.amounts[0] === 900000));
    assert.ok(projected.observations.some(row => row.category === "standard_deduction" && row.amounts[0] === 75000));
    for (const sentinel of ["SYNTHETIC_PRIVATE_PERSON", "ABCPX1234Z", "synthetic-secret"]) {
      assert.ok(!JSON.stringify(projected).includes(sentinel));
    }
    if (options.password) await assert.rejects(extractPrivateTaxText(pdf, "wrong-password"), PrivateExtractionError);
    console.log(`PASS: native ${options.mixed ? "mixed text/scan" : options.image ? "scanned" : "text"} PDF${options.password ? " with password (wrong password rejected)" : ""}; expected financial facts and no identifiers.`);
  }
  await assert.rejects(extractPrivateTaxText(await fixture({ pages: 21 })), PrivateExtractionError);
  const leftovers = (await readdir(tmpdir())).filter(name => name.startsWith("aitaxbot-private-") && !before.has(name));
  assert.deepEqual(leftovers, [], "Processing scratch directories remain after native tests");
  console.log("PASS: 21-page limit and scratch cleanup after successful and failed native processing. All fixtures synthetic; no provider requests.");
} finally { await rm(scratch, { recursive: true, force: true }); }

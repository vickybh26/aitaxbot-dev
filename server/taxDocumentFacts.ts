/** An allowlist, not name/identifier redaction. No source-text strings are
 * copied into the provider payload: labels are constants and values are
 * numbers, booleans, bounded tax codes or explicitly labelled tax years.
 * Financial figures remain potentially personal data; never call this anonymous.
 */
const LABELS: Array<[string, RegExp]> = [
  ["gross_salary", /gross\s+(?:total\s+)?salary/i],
  ["salary_section_17_1", /salary.*section\s*17\s*\(1\)/i],
  ["salary_section_192", /(?:salary.*(?:192|annexure\s*ii)|TDS[- ]192\b)/i],
  ["standard_deduction", /standard\s+deduction|16\s*\(ia\)/i],
  ["professional_tax", /tax\s+on\s+employment|professional\s+tax/i],
  ["hra_exemption", /house\s+rent\s+allowance|10\s*\(13a\)/i],
  ["taxable_income", /total\s+taxable\s+income/i],
  ["salary_income", /income\s+chargeable.*salaries/i],
  ["tax_on_income", /tax\s+on\s+total\s+income/i],
  ["tax_payable", /(?:total\s+)?tax\s+payable/i],
  ["tax_deducted", /(?:total\s+)?tax\s+deducted|total\s+tds/i],
  ["tax_deposited", /(?:total\s+)?(?:tds|tax)\s+deposited/i],
  ["deduction_80c", /(?:section\s+)?80c\b/i],
  ["deduction_80d", /(?:section\s+)?80d\b/i],
  ["deductions_vi_a", /aggregate\s+of\s+deductible|total.*vi[- ]?a/i],
  ["rebate_87a", /rebate.*87a/i],
  ["cess", /(?:health\s+and\s+education|education)\s+cess/i],
  ["savings_interest", /interest.*savings|SFT[- ]016\s*\(SB\)/i],
  ["deposit_interest", /interest.*(?:deposit|fixed|term)|SFT[- ]016\s*\((?:TD|FD)\)/i],
  ["dividends", /dividend|SFT[- ]015\b/i],
  ["securities_sales", /sale.*(?:securities|equity|shares)/i],
  ["mutual_fund_sales", /(?:sale|redemption).*mutual\s+fund/i],
  ["vda_receipts", /virtual\s+digital\s+asset|TDS[- ]194S\b/i],
  ["lrs_remittance", /LRS\s+remittance|TCS[- ]206CQ\b/i],
  ["advance_tax", /advance\s+tax/i],
  ["self_assessment_tax", /self[- ]assessment\s+tax/i],
  ["time_deposit_purchase", /purchase\s+of\s+time\s+deposits/i],
  ["cash_deposits", /cash\s+deposits/i],
  ["property_purchase", /purchase.*immovable\s+property/i],
];

export interface PrivateTaxFacts {
  financialYear: string | null;
  assessmentYear: string | null;
  observations: Array<{ category: string; amounts: number[] }>;
  tdsTransactions: Array<{ section: string; paid: number; deducted: number; deposited: number }>;
  extractionComplete: false;
}

const MONEY = /(?<![\w.])(?:\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+\.\d{2})(?![\w.])/g;
const asAmount = (value: string) => Number(value.replace(/,/g, ""));

export function extractTaxFacts(text: string): PrivateTaxFacts {
  const year = (label: string) => {
    const match = text.match(new RegExp(`\\b(?:${label})\\s*[:.-]?\\s*(20\\d{2})\\s*[-–/]\\s*(\\d{2}|20\\d{2})\\b`, "i"));
    if (!match) return null;
    const end = match[2].slice(-2);
    return (Number(match[1]) + 1) % 100 === Number(end) ? `${match[1]}-${end}` : null;
  };
  const facts: PrivateTaxFacts = {
    financialYear: year("Financial\\s+Year|F\\.?\\s*Y\\.?"),
    assessmentYear: year("Assessment\\s+Year|A\\.?\\s*Y\\.?"),
    observations: [], tdsTransactions: [], extractionComplete: false,
  };
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    // TRACES itemized rows have a section, two dates, booking status and
    // exactly three monetary columns. Names, TAN and dates are never copied.
    const row = line.match(/^\s*(?:\d+\s+)?(192|19[234]\w{0,3})\s+\d{2}-[A-Za-z]{3}-\d{4}\s+[A-Z]\s+\d{2}-[A-Za-z]{3}-\d{4}\s+-\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/);
    if (row) {
      facts.tdsTransactions.push({ section: row[1], paid: asAmount(row[2]), deducted: asAmount(row[3]), deposited: asAmount(row[4]) });
      continue;
    }
    // Reject identifier/contact rows altogether, even if they mention salary.
    if (/\b(?:PAN|TAN|aadhaar|aadhar|account|phone|mobile|address|email|IFSC|name)\b|@/i.test(line)) continue;
    for (const [category, pattern] of LABELS) {
      const label = pattern.exec(line);
      if (!label) continue;
      // Only monetary cells AFTER the recognized label. No prose, identifiers,
      // transaction dates, raw headings or arbitrary integer strings leave here.
      let cells = line.slice(label.index + label[0].length);
      if (!cells.trim() && /^\s*[\d,.\s₹]+\s*$/.test(lines[index + 1] || "")) cells = lines[index + 1];
      const amounts = (cells.match(MONEY) || []).map(asAmount).filter(n => Number.isFinite(n) && n >= 0 && n <= 1e12);
      if (amounts.length) facts.observations.push({ category, amounts: amounts.slice(0, 6) });
      break;
    }
  }
  return facts;
}

export function financialFactsPrompt(facts: PrivateTaxFacts): string {
  if (!facts.observations.length && !facts.tdsTransactions.length) {
    throw new Error("No supported financial fields were extracted privately");
  }
  return "Only the following locally extracted financial facts are available. No PDF, document text, names or identifiers are supplied. Missing fields are UNKNOWN, never zero. Extraction is partial: never claim full document coverage or readiness to file. Use null for identifiers and source names; do not invent section totals.\n" + JSON.stringify(facts);
}

/**
 * Extracted Data Summary — single source of truth for BOTH renderers.
 *
 * WHY THIS FILE EXISTS
 * The on-screen report and the downloadable PDF were each built from their own
 * hand-written array of summary rows. They held identical data but drifted in
 * ordering and labelling: the web view showed "Standard Deduction (u/s 16ia)"
 * second and "Savings A/c Interest", while the PDF showed "Standard Deduction"
 * fourth and "Savings Interest (AIS)". A user comparing the two sees what looks
 * like two different reports for the same documents, which erodes trust in the
 * figures themselves even though nothing was actually wrong.
 *
 * Any change to this table — a new metric, a reworded label, a reordering —
 * must happen here once and will appear identically in both outputs. Do not
 * reintroduce a local rows array in either renderer.
 */

export interface SummaryRow {
  /** Metric label, shown identically on screen and in the PDF. */
  label: string;
  /** Pre-formatted display values, already run through the caller's currency formatter. */
  ais: string;
  form16: string;
  form26as: string;
}

/** Minimal shape needed to build the table — deliberately structural so both
 *  the server's ReconciliationReport and the client's local interface satisfy
 *  it without either importing the other's full type. */
export interface SummarySource {
  ais: {
    salaryIncome: number | null;
    interestFromSavings: number | null;
    interestFromFD: number | null;
    dividendIncome: number | null;
  };
  form16: {
    grossSalary: number | null;
    standardDeduction: number | null;
    taxableIncome: number | null;
    totalTaxDeducted: number | null;
  };
  form26as: {
    tdsSalary: number | null;
    tdsNonSalary: number | null;
    advanceTaxPaid: number | null;
  };
}

/** Placeholder for a cell that is not applicable to that document type at all
 *  (as distinct from a value the document should have had but didn't, which
 *  the caller's formatter renders as "N/A"). */
const NA = "—";

/**
 * Build the summary rows.
 *
 * @param data  extracted figures
 * @param fmt   currency formatter — callers pass their own so the PDF can use
 *              "Rs." (PDFKit's default fonts have no ₹ glyph) while the web
 *              uses the real ₹ symbol, without the row definitions diverging.
 */
export function buildSummaryRows(
  data: SummarySource,
  fmt: (n: number | null | undefined) => string
): SummaryRow[] {
  const { ais, form16, form26as } = data;
  return [
    { label: "Gross Salary / Salary Income", ais: fmt(ais.salaryIncome),          form16: fmt(form16.grossSalary),       form26as: NA },
    { label: "Standard Deduction (u/s 16ia)", ais: NA,                            form16: fmt(form16.standardDeduction), form26as: NA },
    { label: "Taxable Income",                ais: NA,                            form16: fmt(form16.taxableIncome),     form26as: NA },
    { label: "TDS on Salary",                 ais: NA,                            form16: fmt(form16.totalTaxDeducted),  form26as: fmt(form26as.tdsSalary) },
    { label: "TDS on Non-Salary",             ais: NA,                            form16: NA,                            form26as: fmt(form26as.tdsNonSalary) },
    { label: "Savings A/c Interest",          ais: fmt(ais.interestFromSavings),  form16: NA,                            form26as: NA },
    { label: "FD Interest",                   ais: fmt(ais.interestFromFD),       form16: NA,                            form26as: NA },
    { label: "Dividend Income",               ais: fmt(ais.dividendIncome),       form16: NA,                            form26as: NA },
    { label: "Advance Tax Paid",              ais: NA,                            form16: NA,                            form26as: fmt(form26as.advanceTaxPaid) },
  ];
}

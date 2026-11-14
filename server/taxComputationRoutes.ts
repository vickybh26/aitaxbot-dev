import type { Express } from "express";
import type { TaxComputationData } from "@shared/taxComputation";
import { generateTaxComputationPDF } from "./pdfGenerator";

/** Public, stateless PDF export. Kept independent of auth/storage for isolated checks. */
export function registerTaxComputationRoutes(app: Express): void {
  app.post("/api/tax-computation/generate-pdf", async (req, res) => {
    const data = req.body;
    const keys = ["taxableIncome", "taxOnIncome", "surcharge", "cess", "totalTax"];
    const validTotals = data?.taxBreakdown && keys.every((key) =>
      typeof data.taxBreakdown[key] === "number" && Number.isFinite(data.taxBreakdown[key]) && data.taxBreakdown[key] >= 0);
    const validRegime = (regime: unknown) => !regime || (typeof regime === "object"
      && Object.values(regime).every((value) => value == null || (typeof value === "number" && Number.isFinite(value))));
    if (!data?.personalInfo || typeof data.personalInfo.name !== "string" || !data.personalInfo.name.trim()
      || !validTotals || !validRegime(data.oldRegimeData) || !validRegime(data.newRegimeData)
      || !/^\d{4}-\d{2}$/.test(data.assessmentYear) || !/^\d{4}-\d{2}$/.test(data.financialYear)) {
      res.status(400).json({ error: "Invalid or missing computation data" });
      return;
    }
    try {
      const computationData: TaxComputationData = { ...data, computationDate: new Date() };
      const pdfBuffer = await generateTaxComputationPDF(computationData);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Tax_Computation_${computationData.assessmentYear}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
}

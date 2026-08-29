import { Helmet } from "react-helmet-async";
import CalcPageHeader from "@/components/CalcPageHeader";
import TaxWizard from "@/components/calculators/tax-wizard/TaxWizard";

/**
 * Preview-only route for the step-by-step calculator rebuild (see
 * client/src/components/calculators/tax-wizard/types.ts for the full plan).
 *
 * Deliberately NOT linked from any nav, footer, or sitemap, and marked
 * noindex — this is an in-progress internal preview, not a page real
 * visitors should land on yet. /calculators/income-tax (TaxCalculator.tsx)
 * keeps serving live traffic unchanged until this wizard covers every
 * income head it does and a final cutover PR swaps the route.
 */
export default function IncomeTaxCalculatorWizardPage() {
  return (
    <>
      <Helmet>
        <title>Income Tax Calculator (Preview) — AiTaxBot</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="bg-white min-h-screen">
        <CalcPageHeader
          title="Income Tax Calculator — Step by Step (Preview)"
          subtitle="Work in progress: this walks through your income one type at a time instead of one long form. Not yet linked from the site."
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Calculators", href: "/calculators" }, { label: "Income Tax Wizard (Preview)" }]}
          badge="Preview"
        />
        <section className="py-8 px-4">
          <TaxWizard />
        </section>
      </div>
    </>
  );
}

import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
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
 *
 * Deliberately does NOT use CalcPageHeader — that component (breadcrumb +
 * title + subtitle + 3 trust-badge chips + a colored badge pill) measured
 * 356px tall on a real 375x812 mobile viewport, 44% of the entire screen,
 * before the wizard card itself even started. That's the exact "too much
 * scroll before the first input" mistake fixed in the main calculator (PR
 * #7) — the trust badges make sense as SEO/E-E-A-T signal on an indexed,
 * public calculator page; they're dead weight on a noindex internal
 * preview, and a multi-step wizard's own progress bar + "Step X of Y"
 * label already does the orientation job a page header exists for. This
 * minimal header is a fraction of that height.
 */
export default function IncomeTaxCalculatorWizardPage() {
  return (
    <>
      <Helmet>
        <title>Income Tax Calculator (Preview) — AiTaxBot</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="bg-card min-h-screen">
        <div className="max-w-xl mx-auto px-4 pt-4">
          <nav className="flex items-center gap-1.5 text-xs text-ink/55 mb-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[hsl(var(--interactive-blue))]">Home</Link>
            <span className="text-ink/35">/</span>
            <Link href="/calculators" className="hover:text-[hsl(var(--interactive-blue))]">Calculators</Link>
            <span className="text-ink/35">/</span>
            <span className="text-ink/65 font-medium">Income Tax Wizard (Preview)</span>
          </nav>
          <h1 className="text-lg font-semibold text-ink">Income Tax Calculator — Step by Step (Preview)</h1>
        </div>
        <section className="py-4 px-4">
          <TaxWizard />
        </section>
      </div>
    </>
  );
}

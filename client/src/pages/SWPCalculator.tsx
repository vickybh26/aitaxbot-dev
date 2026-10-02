import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import FindCABanner from '@/components/FindCABanner';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import {
  generateCalculatorSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema
} from '@/lib/structuredData';
import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';
import { ResponsiveAd, RectangleAd } from '@/components/AdBanner';
import CalcPageHeader from '@/components/CalcPageHeader';
import SWPCalculator from '@/components/calculators/SWPCalculator';
import { SWP_FAQS, SWP_SOURCES } from '@shared/swpGuidance';

const swpFAQs = SWP_FAQS;

export default function SWPCalculatorPage() {
  useEffect(() => {
    trackPageView('/calculators/swp', 'SWP Calculator India FY 2026-27 | AiTaxBot');
  }, []);

  const calculatorSchema = generateCalculatorSchema({
    name: "SWP Calculator - Systematic Withdrawal Plan",
    description: "Free SWP Calculator India FY 2026-27. Calculate how long your retirement corpus lasts with systematic monthly withdrawals. Plan tax-efficient retirement income through SWP.",
    url: "https://www.aitaxbot.co.in/calculators/swp",
    applicationCategory: "FinanceApplication"
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.aitaxbot.co.in/" },
    { name: "Calculators", url: "https://www.aitaxbot.co.in/calculators" },
    { name: "SWP Calculator", url: "https://www.aitaxbot.co.in/calculators/swp" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>SWP Calculator India FY 2026-27 - Retirement Income Planning | AiTaxBot</title>
        <meta name="description" content="Free SWP Calculator India FY 2026-27. Calculate systematic withdrawals, corpus sustainability, and tax-efficient retirement income planning. See how long your corpus lasts with monthly SWP withdrawals." />
        <meta name="keywords" content="SWP calculator, systematic withdrawal plan, retirement income planning, mutual fund withdrawal, monthly pension calculator, corpus calculator, tax-efficient withdrawal, SWP LTCG tax, retirement planning India" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/calculators/swp" />
        <meta property="og:title" content="SWP Calculator India FY 2026-27 - Retirement Income Planning | AiTaxBot" />
        <meta property="og:description" content="Calculate systematic withdrawals and corpus longevity. Plan tax-efficient retirement income with SWP. See LTCG tax benefits vs FD interest." />
        <meta property="og:url" content="https://www.aitaxbot.co.in/calculators/swp" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/images/aitaxbot-logo.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(calculatorSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="bg-card">

        <CalcPageHeader
          title="SWP Calculator — Systematic Withdrawal Planning"
          subtitle="Plan your monthly income from a mutual fund corpus. Find out how long your investment lasts and the minimum corpus for your target withdrawal."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Calculators", href: "/calculators" },
            { label: "SWP Calculator" }
          ]}
        />

        {/* Calculator */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <SWPCalculator />
          </div>
        </section>

        {/* Shared guidance: same FAQ text for users and initial HTML. */}
        <section className="py-12 px-6 bg-card">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-ink mb-6">Withdrawal assumptions and tax treatment</h2>
            <p className="text-ink/65 mb-6">This is a pre-tax cash-flow simulation, not a capital-gains tax calculator.</p>
            <div className="space-y-6">
              {swpFAQs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="text-lg font-semibold text-ink mb-2">{faq.question}</h3>
                  <p className="text-ink/65">{faq.answer}</p>
                </div>
              ))}
            </div>
            <h3 className="text-lg font-semibold text-ink mt-8 mb-2">Sources</h3>
            <ul className="list-disc pl-5 space-y-2">
              {SWP_SOURCES.map((source) => (
                <li key={source.href}><a className="text-interactive-blue underline" href={source.href}
                  target="_blank" rel="noopener noreferrer">{source.label}</a></li>
              ))}
            </ul>
          </div>
        </section>

        <FAQSchema faqs={swpFAQs} />
        <AuthorBox />

        {/* Ads */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-4">
          <ResponsiveAd />
          <RectangleAd />
        </div>

        {/* Related Calculators */}
        <section className="py-12 px-6 bg-secondary">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-ink mb-2">Related Tax & Retirement Calculators</h2>
            <p className="text-ink/65 mb-6">
              Build your retirement corpus with SIP, then plan withdrawals with SWP. Layer NPS pension and EPF for complete retirement strategy.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculators/sip">
                <div className="p-4 bg-card rounded-lg border hover:border-credit hover:shadow transition-all">
                  <h3 className="font-semibold text-ink mb-1">SIP Calculator</h3>
                  <p className="text-sm text-ink/65">Build retirement corpus through systematic monthly investing</p>
                </div>
              </Link>
              <Link href="/calculators/nps">
                <div className="p-4 bg-card rounded-lg border hover:border-credit hover:shadow transition-all">
                  <h3 className="font-semibold text-ink mb-1">NPS Calculator</h3>
                  <p className="text-sm text-ink/65">Calculate NPS corpus and tax-free lump sum at retirement</p>
                </div>
              </Link>
              <Link href="/calculators/pf">
                <div className="p-4 bg-card rounded-lg border hover:border-green-300 hover:shadow transition-all">
                  <h3 className="font-semibold text-ink mb-1">PF Calculator</h3>
                  <p className="text-sm text-ink/65">Add EPF + VPF growth to your retirement planning</p>
                </div>
              </Link>
              <Link href="/calculators">
                <div className="p-4 bg-paper rounded-lg border border-rule hover:shadow transition-all">
                  <h3 className="font-semibold text-ink mb-1">All Calculators</h3>
                  <p className="text-sm text-ink">View complete suite of financial tools</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Lead Capture + CA Banner */}
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <LeadCaptureForm source="SWP Calculator" />
          <FindCABanner context="planning retirement income" />
        </div>
      </div>
    </>
  );
}

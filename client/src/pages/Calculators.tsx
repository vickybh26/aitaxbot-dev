import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import {
  Calculator, Home, TrendingUp, PiggyBank, Wallet, Shield,
  Award, FileText, Globe, Zap, Clock, ArrowRight, CheckCircle2
} from 'lucide-react';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';
import { ResponsiveAd } from '@/components/AdBanner';
import { generateBreadcrumbSchema, generateOrganizationSchema } from '@/lib/structuredData';

const hubFAQs = [
  {
    question: "Are the AiTaxBot calculators free to use?",
    answer: "Yes, all calculators on AiTaxBot are 100% free with unlimited usage — no fees, no paywall, ever. A free account (sign in or sign up) is required to view your result. We offer Income Tax, HRA, SIP, SWP, NPS, PF, Home Loan, Vehicle Loan, and Trading Tax calculators updated for FY 2026-27 (AY 2027-28)."
  },
  {
    question: "Are the calculators updated for the latest tax rules?",
    answer: "Yes, all tax calculators cover FY 2026-27 (AY 2027-28) under Income Tax Act, 1961 and Tax Year 2026-27 under the new Income Tax Act, 2025. We update our tools immediately when tax laws or interest rates change."
  },
  {
    question: "Who reviews the calculator accuracy?",
    answer: "All calculators are prepared and reviewed by our team of Chartered Accountants (CAs) and tax professionals to ensure compliance with Indian tax laws and financial regulations."
  },
  {
    question: "Which calculator should I use first?",
    answer: "Start with the Income Tax Calculator to understand your overall tax liability. Then use the HRA Calculator if you're salaried and paying rent, and the PF Calculator to plan your retirement corpus. For investment planning, use the SIP and SWP calculators."
  }
];

interface CalcDef {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  color: string;
  bg: string;
  features: string[];
  badge?: string;
}

const taxCalculators: CalcDef[] = [
  {
    title: 'Income Tax Calculator',
    description: 'Compare Old vs New regime for FY 2026-27. Includes Section 87A rebate, marginal relief, and surcharge at all thresholds.',
    icon: Calculator,
    link: '/calculators/income-tax',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    badge: 'Popular',
    features: [
      'Old vs New regime comparison',
      'Section 87A rebate (up to ₹60,000)',
      'Marginal relief at ₹12L, ₹50L, ₹1Cr',
      'Detailed tax breakdown + PDF'
    ]
  },
  {
    title: 'HRA Calculator',
    description: 'Compute your House Rent Allowance exemption under Section 10(13A). Now covers all 8 metro cities per IT Rules 2026.',
    icon: Home,
    link: '/calculators/hra',
    color: 'text-green-600',
    bg: 'bg-green-50',
    features: [
      'Section 10(13A) compliant',
      '8 metro cities (IT Rules 2026)',
      'Actual vs deemed rent calculation',
      'Exemption breakdown + PDF'
    ]
  }
];

const investmentCalculators: CalcDef[] = [
  {
    title: 'SIP Calculator',
    description: 'Plan your Systematic Investment Plan and estimate mutual fund returns. See how regular investments grow through compounding.',
    icon: TrendingUp,
    link: '/calculators/sip',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    features: [
      'Monthly investment planning',
      'Compounding returns visualised',
      'Target-based back-calculation',
      'Visual growth chart'
    ]
  },
  {
    title: 'SWP Calculator',
    description: 'Plan regular monthly income from mutual fund investments for retirement. Track corpus sustainability over your horizon.',
    icon: Wallet,
    link: '/calculators/swp',
    color: 'text-persian-blue-700',
    bg: 'bg-persian-blue-50',
    features: [
      'Regular withdrawal planning',
      'Remaining corpus tracking',
      'Duration to depletion estimate',
      'Income sustainability check'
    ]
  },
  {
    title: 'NPS Calculator',
    description: 'Calculate your National Pension System corpus, monthly pension, and the exclusive ₹50,000 extra deduction under Section 80CCD(1B).',
    icon: TrendingUp,
    link: '/calculators/nps',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    features: [
      'Section 80CCD(1B) +₹50,000 saving',
      'Employer contribution (80CCD2)',
      'Lump sum + monthly pension split',
      'NPS vs PPF vs EPF comparison'
    ]
  },
  {
    title: 'PF Calculator',
    description: 'Calculate EPF, VPF & PPF contributions with employer split breakdown and year-wise retirement corpus projection at 8.25% interest.',
    icon: Shield,
    link: '/calculators/pf',
    color: 'text-persian-blue-700',
    bg: 'bg-persian-blue-50',
    features: [
      'Employee-employer split breakdown',
      'VPF contribution planning',
      'Year-wise corpus growth table',
      'Early withdrawal tax guide'
    ]
  },
  {
    title: 'Home Loan Calculator',
    description: 'Check loan eligibility, calculate EMI, total interest, and annual tax savings under Section 24 and Section 80C.',
    icon: Home,
    link: '/calculators/home-loan',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    features: [
      'Loan eligibility from income (FOIR)',
      'EMI + total interest over tenure',
      'Section 24 & 80C tax benefit',
      'EMI reference table'
    ]
  },
  {
    title: 'Vehicle Loan Calculator',
    description: 'Calculate two-wheeler and car loan EMI with on-road cost breakdown. Switch between bike and car with pre-filled 2026 rates.',
    icon: TrendingUp,
    link: '/calculators/vehicle-loan',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    features: [
      'Two-wheeler & four-wheeler toggle',
      'On-road price to EMI in seconds',
      'Total interest cost breakdown',
      'Pre-filled rates for 2026 market'
    ]
  }
];

const tradingTools: CalcDef[] = [
  {
    title: 'US Stock & F&O Trading Tax',
    description: 'Calculate capital gains tax on US stocks with auto USD/INR rate, F&O business income, US dividend DTAA credit, and Schedule FA checklist.',
    icon: Globe,
    link: '/calculators/trading-tax',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    badge: 'New',
    features: [
      'US stocks: STCG (slab) vs LTCG 12.5% at 24 months',
      'Auto USD/INR rate fetch per trade date',
      'US dividend DTAA 25% tax credit (Form 67)',
      'Indian & US F&O + audit flag + ITR form selector'
    ]
  }
];

const documentTools: CalcDef[] = [
  {
    title: 'Rent Receipt Generator',
    description: 'Generate professional rent receipts for HRA claims. PDF with landlord PAN, revenue stamp notice, and payment mode. Email delivery included.',
    icon: FileText,
    link: '/tools/rent-receipt',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    features: [
      'PDF receipts for full year in one click',
      'Landlord PAN & revenue stamp guidance',
      'Email delivery with dashboard link',
      '100% free — sign in to generate'
    ]
  },
  {
    title: 'AIS · 26AS · Form 16 Recon',
    description: 'Upload all three PDFs and instantly detect mismatches before filing ITR. AI flags salary gaps, TDS mismatches, and unreported income.',
    icon: Award,
    link: '/tools/ais-26as-form16',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    badge: 'AI',
    features: [
      'AI extracts & compares all 3 documents',
      'Severity-rated mismatch cards (HIGH / MEDIUM / LOW)',
      'Downloadable PDF reconciliation report',
      'ITR filing action plan'
    ]
  }
];

function CalculatorCard({ calc }: { calc: CalcDef }) {
  const Icon = calc.icon;
  return (
    <Link href={calc.link} className="block group">
      <div className="h-full bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 ${calc.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Icon className={`h-5 w-5 ${calc.color}`} />
          </div>
          {calc.badge && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
              {calc.badge}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-slate-900 mb-2 text-base">{calc.title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-1">{calc.description}</p>
        <ul className="space-y-1.5 mb-5">
          {calc.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
          Open Calculator <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-slate-900 mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export default function Calculators() {
  useEffect(() => {
    trackPageView('/calculators', 'Free Tax & Financial Calculators India FY 2026-27 - AiTaxBot');
  }, []);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.aitaxbot.co.in/" },
    { name: "Financial Calculators", url: "https://www.aitaxbot.co.in/calculators" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>Free Tax & Financial Calculators India FY 2026-27 | AiTaxBot</title>
        <meta name="description" content="Free tax & financial calculators for India, updated for FY 2026-27 (AY 2027-28). Income Tax, HRA, SIP, SWP & PF calculators. Reviewed by Chartered Accountant." />
        <meta name="keywords" content="tax calculators india, income tax calculator, HRA calculator, SIP calculator, SWP calculator, PF calculator, EPF calculator, financial planning tools india, FY 2026-27" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/calculators" />
        <meta property="og:title" content="Free Tax & Financial Calculators India FY 2026-27 | AiTaxBot" />
        <meta property="og:description" content="Free tax & financial calculators for India. Income Tax, HRA, SIP, SWP & PF calculators updated for FY 2026-27. Reviewed by CA." />
        <meta property="og:url" content="https://www.aitaxbot.co.in/calculators" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className="bg-white">

        {/* Page header */}
        <header className="bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 pt-4">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 font-medium">Calculators</span>
            </nav>
          </div>
          <div className="max-w-7xl mx-auto px-6 pt-6 pb-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="border-l-4 border-blue-600 pl-4 mb-5">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                    Free Tax &amp; Financial Calculators
                  </h1>
                  <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                    All calculators built for Indian taxpayers — Income Tax, HRA, SIP, SWP, PF, NPS, Home Loan, Vehicle Loan, Trading Tax, and more. Updated for FY 2026-27 (AY 2027-28).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pl-4">
                  {[
                    { icon: Shield, text: "CA-Reviewed" },
                    { icon: Zap,    text: "IT Act 2025 Ready" },
                    { icon: Clock,  text: "FY 2026-27 Updated" },
                  ].map(({ icon: Icon, text }) => (
                    <span key={text} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                      <Icon className="h-3 w-3" />{text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-block px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  FY 2026-27 · AY 2027-28
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Intro text */}
        <section className="py-6 px-6 bg-slate-50 border-b border-slate-100">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-slate-600 leading-relaxed">
              Whether you are a salaried professional calculating income tax under the Old or New regime,
              a tenant computing HRA exemption, or planning your retirement through SIP, SWP, or Provident Fund,
              AiTaxBot provides accurate and easy-to-use tools for every financial need. Each tool is built for
              the Indian financial year and follows the latest government notifications and Income Tax Act 2025.
            </p>
          </div>
        </section>

        {/* Calculator sections */}
        <div className="max-w-7xl mx-auto px-6 py-14 space-y-16">

          <div>
            <SectionTitle
              title="Income Tax & Salary Calculators"
              subtitle="Calculate your tax liability and salary deductions for FY 2026-27. Compare tax regimes and optimise take-home pay."
            />
            <div className="grid gap-6 md:grid-cols-2">
              {taxCalculators.map((calc, i) => <CalculatorCard key={i} calc={calc} />)}
            </div>
          </div>

          <div>
            <SectionTitle
              title="Investment & Retirement Calculators"
              subtitle="Plan wealth creation through systematic investing, retirement withdrawals, and provident fund growth."
            />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {investmentCalculators.map((calc, i) => <CalculatorCard key={i} calc={calc} />)}
            </div>
          </div>

          <div>
            <SectionTitle
              title="Trading & Investing Tax Tools"
              subtitle="Specialised calculators for Indian investors trading US stocks, F&O, and crypto."
            />
            <div className="grid gap-6 md:grid-cols-2">
              {tradingTools.map((calc, i) => <CalculatorCard key={i} calc={calc} />)}
            </div>
          </div>

          <div>
            <SectionTitle
              title="Tools & Document Generators"
              subtitle="Generate tax-compliant documents instantly — free, sign in to access your result."
            />
            <div className="grid gap-6 md:grid-cols-2">
              {documentTools.map((calc, i) => <CalculatorCard key={i} calc={calc} />)}
            </div>
          </div>
        </div>

        {/* Why AiTaxBot */}
        <section className="py-14 px-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 text-center mb-10">Why Use Our Calculators?</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { icon: Award,      title: "CA Reviewed",          body: "All calculations are reviewed by a Chartered Accountant and follow the latest Income Tax Act provisions for maximum accuracy." },
                { icon: PiggyBank,  title: "Always Free",          body: "Use all our calculators unlimited times at no cost. No hidden fees — just a free account so you can view your result and access it later." },
                { icon: TrendingUp, title: "Updated for FY 2026-27", body: "We update our calculators immediately when tax laws or interest rates change so you always get current information." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FAQSchema faqs={hubFAQs} />
        <AuthorBox />

        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-center">
          <ResponsiveAd />
        </div>

      </div>
    </>
  );
}

import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { Calculator, Home, TrendingUp, PiggyBank, Wallet, Shield, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import { FAQSchema } from '@/components/faq-schema';
import AuthorBox from '@/components/AuthorBox';
import { ResponsiveAd } from '@/components/AdBanner';
import {
  generateBreadcrumbSchema,
  generateOrganizationSchema
} from '@/lib/structuredData';

const hubFAQs = [
  {
    question: "Are the AiTaxBot calculators free to use?",
    answer: "Yes, all calculators on AiTaxBot are 100% free with unlimited usage. No registration is required. We offer Income Tax, HRA, SIP, SWP, and PF calculators updated for FY 2025-26 (AY 2026-27)."
  },
  {
    question: "Are the calculators updated for the latest tax rules?",
    answer: "Yes, all tax calculators are updated for FY 2025-26 (AY 2026-27) including the new Income Tax Act, 2025 provisions. We update our tools immediately when tax laws or interest rates change."
  },
  {
    question: "Who reviews the calculator accuracy?",
    answer: "All calculators are prepared and reviewed by Vikrant Bhargav, a Chartered Accountant (CA), to ensure compliance with Indian tax laws and financial regulations."
  },
  {
    question: "Which calculator should I use first?",
    answer: "Start with the Income Tax Calculator to understand your overall tax liability. Then use the HRA Calculator if you're salaried and paying rent, and the PF Calculator to plan your retirement corpus. For investment planning, use the SIP and SWP calculators."
  }
];

const taxCalculators = [
  {
    title: 'Income Tax Calculator',
    description: 'Calculate your income tax liability for FY 2025-26 (AY 2026-27). Compare Old vs New regime with Section 87A rebate and marginal relief.',
    icon: Calculator,
    link: '/calculators/income-tax',
    color: 'persian-blue',
    features: [
      'Old vs New regime comparison',
      'Section 87A rebate (₹7L limit)',
      'Marginal relief computation',
      'Detailed tax breakdown'
    ]
  },
  {
    title: 'HRA Calculator',
    description: 'Compute your House Rent Allowance exemption under Section 10(13A) for FY 2025-26. Find out how much HRA you can claim as tax deduction.',
    icon: Home,
    link: '/calculators/hra',
    color: 'green',
    features: [
      'Section 10(13A) compliant',
      'Metro vs non-metro rates',
      'Actual vs deemed rent calculation',
      'Exemption breakdown'
    ]
  }
];

const investmentCalculators = [
  {
    title: 'SIP Calculator',
    description: 'Plan your Systematic Investment Plan (SIP) and estimate future mutual fund returns. See how regular investments grow through compounding.',
    icon: TrendingUp,
    link: '/calculators/sip',
    color: 'blue',
    features: [
      'Monthly investment planning',
      'Compounding returns',
      'Target-based calculation',
      'Visual growth chart'
    ]
  },
  {
    title: 'SWP Calculator',
    description: 'Calculate Systematic Withdrawal Plan returns for retirement. Plan regular monthly income from your mutual fund investments.',
    icon: Wallet,
    link: '/calculators/swp',
    color: 'purple',
    features: [
      'Regular withdrawal planning',
      'Remaining corpus tracking',
      'Duration estimation',
      'Income sustainability check'
    ]
  },
  {
    title: 'PF Calculator',
    description: 'Calculate EPF, VPF & PPF contributions for FY 2025-26 with employer split breakdown and year-wise retirement corpus projection at 8.25% interest.',
    icon: Shield,
    link: '/calculators/pf',
    color: 'indigo',
    features: [
      'Employee-employer split breakdown',
      'VPF contribution planning',
      'Year-wise corpus growth table',
      'Early withdrawal tax guide'
    ]
  },
  {
    title: 'NPS Calculator',
    description: 'Calculate your National Pension System corpus, monthly pension and tax savings including the exclusive ₹50,000 extra deduction under Section 80CCD(1B).',
    icon: TrendingUp,
    link: '/calculators/nps',
    color: 'violet',
    features: [
      'Section 80CCD(1B) +₹50,000 saving',
      'Employer contribution (80CCD2)',
      'Lump sum + monthly pension split',
      'NPS vs PPF vs EPF comparison'
    ]
  }
];

function CalculatorCard({ calc }: { calc: typeof taxCalculators[0] }) {
  const Icon = calc.icon;
  return (
    <Card
      className={`border-2 border-${calc.color}-100 hover:border-${calc.color}-300 hover:shadow-lg transition-all duration-300`}
      data-testid={`calculator-card-${calc.link.split('/').pop()}`}
    >
      <CardHeader>
        <div className={`w-14 h-14 bg-${calc.color}-100 rounded-full flex items-center justify-center mb-4`}>
          <Icon className={`h-7 w-7 text-${calc.color}-600`} />
        </div>
        <CardTitle className="text-2xl">{calc.title}</CardTitle>
        <CardDescription className="text-base">
          {calc.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h4 className="font-semibold text-sm text-slate-700 mb-3">Key Features:</h4>
          <ul className="space-y-2">
            {calc.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                <span className={`text-${calc.color}-600 mt-0.5`}>&#10003;</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <Link href={calc.link}>
          <Button
            className={`w-full bg-${calc.color}-600 hover:bg-${calc.color}-700`}
            data-testid={`button-open-${calc.link.split('/').pop()}`}
          >
            <Calculator className="mr-2 h-4 w-4" />
            Open Calculator
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Calculators() {
  useEffect(() => {
    trackPageView('/calculators', 'Free Tax & Financial Calculators India FY 2025-26 - AiTaxBot');
  }, []);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://aitaxbot.co.in/" },
    { name: "Financial Calculators", url: "https://aitaxbot.co.in/calculators" }
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <Helmet>
        <title>Free Tax & Financial Calculators India FY 2025-26 | AiTaxBot</title>
        <meta name="description" content="Free tax & financial calculators for India, updated for FY 2025-26 (AY 2026-27). Income Tax, HRA, SIP, SWP & PF calculators. Reviewed by Chartered Accountant." />
        <meta name="keywords" content="tax calculators india, income tax calculator, HRA calculator, SIP calculator, SWP calculator, PF calculator, EPF calculator, financial planning tools india, FY 2025-26" />
        <link rel="canonical" href="https://aitaxbot.co.in/calculators" />
        <meta property="og:title" content="Free Tax & Financial Calculators India FY 2025-26 | AiTaxBot" />
        <meta property="og:description" content="Free tax & financial calculators for India. Income Tax, HRA, SIP, SWP & PF calculators updated for FY 2025-26. Reviewed by CA." />
        <meta property="og:url" content="https://aitaxbot.co.in/calculators" />
        <meta property="og:type" content="website" />

        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Link href="/" className="hover:text-persian-blue-600">Home</Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">Financial Calculators</span>
            </div>
          </div>
        </header>

        <section className="py-16 px-6 bg-gradient-to-r from-persian-blue-600 to-persian-blue-700">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-block p-4 bg-white/10 rounded-full mb-6">
              <Calculator className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Free Tax & Financial Calculators India - FY 2025-26
            </h1>
            <p className="text-xl text-white/90 mb-4 max-w-3xl mx-auto">
              Plan your taxes and investments with our comprehensive suite of free financial calculators, 
              designed specifically for Indian taxpayers and investors. Updated for FY 2025-26 (AY 2026-27) 
              with the latest Income Tax Act, 2025 provisions.
            </p>
            <p className="text-base text-white/80 max-w-2xl mx-auto">
              All calculators are reviewed by a Chartered Accountant for accuracy and comply with CBDT rules, 
              EPFO guidelines, and SEBI regulations. No registration required.
            </p>
          </div>
        </section>

        <section className="py-6 px-6 bg-white border-b">
          <div className="max-w-6xl mx-auto">
            <p className="text-slate-700 leading-relaxed">
              Whether you are a salaried professional calculating income tax under the Old or New regime, 
              a tenant computing HRA exemption, or planning your retirement through SIP, SWP, or Provident Fund, 
              AiTaxBot provides accurate and easy-to-use tools for every financial need. Our calculators cover 
              income tax (with Section 87A rebate and marginal relief), HRA under Section 10(13A), SIP compounding 
              for mutual fund wealth creation, SWP for retirement income planning, and EPF/PPF contribution 
              estimation with employer split breakdown. Each tool is built for the Indian financial year and 
              follows the latest government notifications.
            </p>
          </div>
        </section>

        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Income Tax & Salary Calculators</h2>
              <p className="text-slate-600 mb-6">
                Calculate your income tax liability and salary-related deductions for FY 2025-26. 
                Compare tax regimes, compute HRA exemption, and optimise your take-home pay.
              </p>
              <div className="grid gap-8 md:grid-cols-2">
                {taxCalculators.map((calc, index) => (
                  <CalculatorCard key={index} calc={calc} />
                ))}
              </div>
            </div>

            <div className="mt-14">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Investment & Retirement Calculators</h2>
              <p className="text-slate-600 mb-6">
                Plan your wealth creation through systematic investing, retirement withdrawals, and 
                provident fund growth. Estimate your long-term corpus with compounding projections.
              </p>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {investmentCalculators.map((calc, index) => (
                  <CalculatorCard key={index} calc={calc} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
              Why Use Our Calculators?
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">CA Reviewed</h3>
                <p className="text-slate-600">
                  All calculations are reviewed by a Chartered Accountant and follow the latest Income Tax Act provisions for maximum accuracy.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PiggyBank className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Always Free</h3>
                <p className="text-slate-600">
                  Use all our calculators unlimited times at no cost. No hidden fees, no registration required.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Updated for FY 2025-26</h3>
                <p className="text-slate-600">
                  We update our calculators immediately when tax laws or interest rates change to ensure you always get current information.
                </p>
              </div>
            </div>
          </div>
        </section>

        <FAQSchema faqs={hubFAQs} />

        <AuthorBox />

        {/* Ad Unit */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-center">
          <ResponsiveAd />
        </div>

        <section className="py-16 px-6 bg-slate-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Choose any calculator above to start planning your finances today.
            </p>
            <Link href="/">
              <Button variant="outline" size="lg" className="border-2 border-persian-blue-600 text-persian-blue-600 hover:bg-persian-blue-600 hover:text-white">
                Return to Homepage
              </Button>
            </Link>
          </div>
        </section>

        <footer className="bg-slate-900 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm text-slate-400">
              &copy; 2025 AiTaxBot. All rights reserved. | Financial Calculators updated for FY 2025-26 (AY 2026-27)
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

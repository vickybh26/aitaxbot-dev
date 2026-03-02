import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Globe, Calculator, ArrowRight, BookOpen, TrendingUp, Send, CreditCard, ChevronRight } from "lucide-react";
import Footer from "@/components/Footer";

const nriTools = [
  {
    title: "DTAA Calculator",
    description: "Calculate your tax relief under Double Taxation Avoidance Agreements with 90+ countries. Stop paying tax twice on your Indian income.",
    icon: Globe,
    link: "/nri/dtaa-calculator",
    color: "orange",
    badge: "Most Popular",
    features: [
      "USA, UK, UAE, Canada, Australia coverage",
      "FTC vs Exemption method explained",
      "NRO interest TDS reduction to 15%",
      "Form 10F & TRC guidance",
    ],
  },
  {
    title: "NRO vs NRE vs FCNR",
    description: "The complete guide to NRI bank accounts. Understand which account saves the most tax and suits your situation best.",
    icon: CreditCard,
    link: "/nri/nro-nre-comparison",
    color: "teal",
    badge: "Essential Guide",
    features: [
      "NRO interest: 30% TDS (reducible)",
      "NRE interest: 100% tax-free",
      "FCNR: foreign currency, zero forex risk",
      "Repatriation rules comparison",
    ],
  },
  {
    title: "NRI Income Tax Calculator",
    description: "Calculate your Indian income tax with NRI-specific rules. No Section 87A rebate, special TDS rates, DTAA deductions included.",
    icon: Calculator,
    link: "/nri/income-tax-calculator",
    color: "rose",
    badge: "FY 2025-26",
    features: [
      "No 87A rebate for NRIs",
      "NRO interest at 30% flat",
      "LTCG & STCG on Indian investments",
      "Old vs New regime comparison",
    ],
  },
  {
    title: "Repatriation Planner",
    description: "Plan how to transfer Indian money abroad legally. Step-by-step guide for Form 15CA/15CB, FEMA limits, and timelines.",
    icon: Send,
    link: "/nri/repatriation-planner",
    color: "amber",
    badge: "Step-by-step",
    features: [
      "NRO: USD 1 million/year limit",
      "NRE/FCNR: freely repatriable",
      "Form 15CA + 15CB process",
      "Property sale proceeds guide",
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; icon: string }> = {
  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", icon: "text-orange-600" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700",   badge: "bg-teal-100 text-teal-700",   icon: "text-teal-600"   },
  rose:   { bg: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-700",   badge: "bg-rose-100 text-rose-700",   icon: "text-rose-600"   },
  amber:  { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700", icon: "text-amber-600"  },
};

const faqItems = [
  {
    question: "Who is an NRI for Indian tax purposes?",
    answer: "An individual is an NRI (Non-Resident Indian) if they stay in India for less than 182 days in a financial year, or less than 60 days in the current year AND less than 365 days in the preceding 4 years. NRIs are taxed only on income earned or accrued in India.",
  },
  {
    question: "Do NRIs need to file ITR in India?",
    answer: "NRIs must file ITR if their Indian income exceeds ₹2.5 lakh (basic exemption), or if they want to claim a refund of excess TDS, or to carry forward capital losses. Filing is also recommended for visa and loan applications.",
  },
  {
    question: "Is NRE account interest taxable?",
    answer: "No. Interest earned on NRE savings and fixed deposit accounts is completely exempt from Indian income tax under Section 10(4) of the Income Tax Act. However, if you return to India and become a resident, NRE interest becomes taxable.",
  },
  {
    question: "Can NRIs invest in Indian mutual funds?",
    answer: "Yes. NRIs can invest in Indian mutual funds through NRE or NRO accounts. NRE-funded investments have no TDS on redemption (profits are freely repatriable). NRO-funded investments are subject to TDS. US and Canada-based NRIs face restrictions with some fund houses due to FATCA.",
  },
  {
    question: "What is the FEMA annual repatriation limit?",
    answer: "NRIs can repatriate up to USD 1 million per financial year from their NRO accounts (combining all sources including property sale, NRO FDs, rental income). NRE and FCNR account funds are freely repatriable with no annual limit.",
  },
  {
    question: "When does an NRI become RNOR (Resident but Not Ordinarily Resident)?",
    answer: "When an NRI returns to India, they initially get RNOR status for 2-3 years. RNOR individuals are taxed like NRIs on foreign income — only Indian-source income is taxable. After RNOR period, they become full Residents and global income becomes taxable in India.",
  },
];

export default function NRICorner() {
  return (
    <>
      <Helmet>
        <title>NRI Tax Corner — DTAA, NRO/NRE Accounts, Repatriation | AiTaxBot</title>
        <meta name="description" content="Complete NRI tax resource: DTAA calculator, NRO vs NRE account comparison, NRI income tax calculator, and repatriation planner. Tax tools for Indians living abroad." />
        <meta name="keywords" content="NRI tax India, DTAA calculator, NRO NRE account, NRI income tax, repatriation India, NRI tax calculator, Form 15CA 15CB" />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-indigo-200 text-sm mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">NRI Corner</span>
          </nav>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-10 w-10 text-indigo-200" />
            <h1 className="text-4xl md:text-5xl font-bold">NRI Tax Corner</h1>
          </div>
          <p className="text-xl text-indigo-100 max-w-3xl mb-6">
            Tax tools and guides built specifically for Non-Resident Indians. Whether you're in the US, UK, UAE, Canada or anywhere in the world — manage your Indian taxes confidently.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full">🇺🇸 USA</span>
            <span className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full">🇬🇧 UK</span>
            <span className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full">🇦🇪 UAE</span>
            <span className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full">🇨🇦 Canada</span>
            <span className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full">🇦🇺 Australia</span>
            <span className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full">🇸🇬 Singapore</span>
            <span className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full">+ 85 more countries</span>
          </div>
        </div>
      </section>

      {/* NRI Tools Grid */}
      <section className="py-14 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">NRI Tax Tools</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Everything an NRI needs to stay tax-compliant in India and maximise take-home income.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nriTools.map((tool) => {
              const c = colorMap[tool.color];
              const Icon = tool.icon;
              return (
                <Link key={tool.link} href={tool.link}>
                  <div className={`bg-white border ${c.border} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group h-full`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${c.icon}`} />
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>{tool.badge}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">{tool.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">{tool.description}</p>
                    <ul className="space-y-1.5 mb-5">
                      {tool.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className={`font-bold ${c.text} mt-0.5`}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className={`flex items-center gap-1 text-sm font-semibold ${c.text} group-hover:gap-2 transition-all`}>
                      Open Tool <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why NRI Section */}
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Why Indian Tax Is Complex for NRIs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-red-50 border border-red-100 rounded-xl p-6">
              <div className="text-2xl mb-3">⚠️</div>
              <h3 className="font-bold text-gray-900 mb-2">No 87A Rebate</h3>
              <p className="text-sm text-gray-700">Resident Indians earning up to ₹12 lakh pay zero tax under Section 87A. NRIs don't get this benefit — they start paying tax from ₹3 lakh itself.</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
              <div className="text-2xl mb-3">💸</div>
              <h3 className="font-bold text-gray-900 mb-2">30% TDS on NRO Interest</h3>
              <p className="text-sm text-gray-700">Banks deduct 30% TDS on NRO account interest — no threshold. DTAA can reduce this to 15% for US/UK/Canada NRIs, but most don't claim it.</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
              <div className="text-2xl mb-3">📋</div>
              <h3 className="font-bold text-gray-900 mb-2">Repatriation Paperwork</h3>
              <p className="text-sm text-gray-700">Moving money from India to abroad requires Form 15CA, Form 15CB (from a CA), and compliance with FEMA's USD 1 million annual limit for NRO accounts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">NRI Tax — Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details key={i} className="bg-white border border-slate-200 rounded-xl p-5 group">
                <summary className="font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                  {item.question}
                  <ChevronRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="mt-3 text-gray-700 text-sm leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqItems.map(f => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": { "@type": "Answer", "text": f.answer },
          })),
        })}} />
      </section>

      {/* Also explore */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Also Explore — Indian Tax Calculators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: "Income Tax Calculator", link: "/calculators/income-tax", icon: "🧮" },
              { title: "HRA Calculator", link: "/calculators/hra", icon: "🏠" },
              { title: "SIP Calculator", link: "/calculators/sip", icon: "📈" },
              { title: "NPS Calculator", link: "/calculators/nps", icon: "🏦" },
            ].map((item) => (
              <Link key={item.link} href={item.link}>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

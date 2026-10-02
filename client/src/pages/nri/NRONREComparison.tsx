import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Globe, ChevronRight, AlertCircle, CreditCard, TrendingUp, BookOpen } from "lucide-react";
import AuthorBox from "@/components/AuthorBox";
import { AdBanner, ResponsiveAd, RectangleAd } from "@/components/AdBanner";
import { NAVY, SLATE_200 } from "@/lib/chartColors";
import { NRI_ACCOUNT_FAQS, NRI_ACCOUNT_SOURCES } from '@shared/nriAccountGuidance';

export default function NRONREComparison() {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const recommendations: Record<number, { account: string; benefit: string; note: string }> = {
    1: {
      account: "NRO Account",
      benefit: "Perfect for collecting rent, salary, pension and other Indian-source income",
      note: "NRO interest is generally subject to withholding at 30% plus applicable surcharge and cess. Treaty relief depends on eligibility and the particular treaty; TDS is not the final tax liability.",
    },
    2: {
      account: "NRE Account",
      benefit: "Eligible NRE deposit interest can be exempt in India; investment returns are assessed separately",
      note: "Ideal for building long-term wealth in India. Funds are always freely repatriable to any country.",
    },
    3: {
      account: "FCNR Account",
      benefit: "Hold a deposit in foreign currency; Indian interest exemption depends on eligibility.",
      note: "Compare the deposit terms and currency needs with your bank. Exemption conditions differ from NRE; foreign-country taxation may also apply.",
    },
    4: {
      account: "NRE Account",
      benefit: "Eligible NRE deposit interest is exempt in India; this is not an exemption for all earnings.",
      note: "Check account eligibility, permitted transfers and source-income taxes with your bank before moving funds.",
    },
  };

  const faqData = NRI_ACCOUNT_FAQS;

  return (
    <>
      <Helmet>
        <title>NRO vs NRE vs FCNR Account — Complete Comparison | AiTaxBot</title>
        <meta
          name="description"
          content="Complete guide comparing NRO, NRE and FCNR accounts for NRIs. Understand tax treatment, repatriation rules, and which account saves the most tax."
        />
        <meta property="og:title" content="NRO vs NRE vs FCNR Account — Complete Comparison | AiTaxBot" />
        <meta
          property="og:description"
          content="Complete guide comparing NRO, NRE and FCNR accounts for NRIs. Understand tax treatment, repatriation rules, and which account saves the most tax."
        />
        <meta name="keywords" content="NRO account, NRE account, FCNR account, NRI bank accounts, tax-free NRI interest, repatriation limits" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqData.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm md:text-base mb-6 opacity-90">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <ChevronRight size={16} />
            <Link href="/nri" className="hover:underline">
              NRI Corner
            </Link>
            <ChevronRight size={16} />
            <span>NRO vs NRE vs FCNR</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">NRO vs NRE vs FCNR Account</h1>
          <p className="text-lg md:text-xl opacity-95 max-w-3xl">
            The complete guide to NRI bank accounts in India. Understand tax treatment, repatriation limits, and which account is right for you.
          </p>
        </div>
      </section>

      {/* Misconception Buster */}
      <section className="bg-red-50 border-l-4 border-red-200 py-8 md:py-12 px-4 md:px-6 my-12 max-w-6xl mx-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-4 items-start">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={28} />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-red-700 mb-4">
                Most NRIs Use Only NRO — And Overpay Tax by ₹1,50,000+ Every Year
              </h2>
              <p className="text-ink leading-relaxed">
                Eligible NRE deposit interest can be exempt in India, while NRO interest is generally taxable. Moving funds does not erase tax on income already earned, and NRE-funded investments do not automatically receive the deposit-interest exemption. Check FEMA eligibility and any foreign-country tax before comparing accounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Account Selector */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-secondary">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Find Your Ideal Account</h2>
          <p className="text-center text-ink/65 mb-10 text-lg max-w-2xl mx-auto">
            Answer one question to get a personalized recommendation:
          </p>

          <div className="bg-card rounded-lg shadow-md p-8 max-w-3xl mx-auto mb-12">
            <h3 className="text-xl md:text-2xl font-semibold mb-8">What best describes your situation?</h3>

            <div className="space-y-4 mb-10">
              {[
                "I earn income in India (rent, salary, pension)",
                "I want to bring foreign earnings to India and invest",
                "I want to save in foreign currency and avoid exchange risk",
                "I want tax-free interest on Indian rupee deposits",
              ].map((option, index) => (
                <label key={index + 1} className="flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer hover:bg-secondary transition" style={{ borderColor: selectedOption === index + 1 ? NAVY : SLATE_200 }}>
                  <input
                    type="radio"
                    name="account-selector"
                    value={index + 1}
                    checked={selectedOption === index + 1}
                    onChange={(e) => setSelectedOption(Number(e.target.value))}
                    className="mt-1 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-base md:text-lg text-ink">{option}</span>
                </label>
              ))}
            </div>

            {selectedOption && (
              <div className="bg-teal-50 border-l-4 border-teal-600 p-6 rounded-r-lg">
                <h4 className="text-lg font-bold text-teal-700 mb-2">Recommended: {recommendations[selectedOption].account}</h4>
                <p className="text-ink mb-3">{recommendations[selectedOption].benefit}</p>
                <p className="text-sm text-ink/80 italic border-t pt-3 border-teal-200">{recommendations[selectedOption].note}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Comparison Table */}
      <section className="py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">Detailed Account Comparison</h2>

          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="px-4 md:px-6 py-4 text-left font-semibold border-b">Feature</th>
                  <th className="px-4 md:px-6 py-4 text-left font-semibold border-b">NRO Account</th>
                  <th className="px-4 md:px-6 py-4 text-left font-semibold border-b">NRE Account</th>
                  <th className="px-4 md:px-6 py-4 text-left font-semibold border-b">FCNR Account</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-card border-b hover:bg-secondary">
                  <td className="px-4 md:px-6 py-4 font-semibold text-ink">Full Form</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Non-Resident Ordinary</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Non-Resident External</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Foreign Currency Non-Resident</td>
                </tr>
                <tr className="bg-secondary border-b hover:bg-secondary">
                  <td className="px-4 md:px-6 py-4 font-semibold text-ink">Currency</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Indian Rupee</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Indian Rupee</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Foreign Currency (USD, GBP, EUR, etc.)</td>
                </tr>
                <tr className="bg-card border-b hover:bg-secondary">
                  <td className="px-4 md:px-6 py-4 font-semibold text-ink">Source of Funds</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Indian income (rent, salary, pension)</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Foreign earnings only</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Foreign earnings only</td>
                </tr>
                <tr className="bg-secondary border-b hover:bg-secondary">
                  <td className="px-4 md:px-6 py-4 font-semibold text-ink">Tax on Interest</td>
                  <td className="px-4 md:px-6 py-4 text-red-600 font-semibold">Withholding; treaty relief may apply</td>
                  <td className="px-4 md:px-6 py-4 text-green-600 font-semibold">Exempt only if conditions are met</td>
                  <td className="px-4 md:px-6 py-4 text-green-600 font-semibold">Exempt only if conditions are met</td>
                </tr>
                <tr className="bg-card border-b hover:bg-secondary">
                  <td className="px-4 md:px-6 py-4 font-semibold text-ink">Repatriation</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Up to USD 1 million/year (with CA certificate)</td>
                  <td className="px-4 md:px-6 py-4 text-green-600 font-semibold">Fully and freely repatriable</td>
                  <td className="px-4 md:px-6 py-4 text-green-600 font-semibold">Fully and freely repatriable</td>
                </tr>
                <tr className="bg-secondary border-b hover:bg-secondary">
                  <td className="px-4 md:px-6 py-4 font-semibold text-ink">Joint Account</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">With another NRI or resident Indian</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">With another NRI only</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">With another NRI only</td>
                </tr>
                <tr className="bg-card border-b hover:bg-secondary">
                  <td className="px-4 md:px-6 py-4 font-semibold text-ink">Mutual Fund Investment</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Yes (but subject to TDS)</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Yes (gains/dividends may be taxable)</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Yes</td>
                </tr>
                <tr className="bg-secondary hover:bg-secondary">
                  <td className="px-4 md:px-6 py-4 font-semibold text-ink">Best For</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Collecting Indian income</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Bringing foreign money to India</td>
                  <td className="px-4 md:px-6 py-4 text-ink/80">Long-term FDs in foreign currency</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Three Account Types */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-secondary">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">What is Each Account / When to Open</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* NRO Card */}
            <div className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="bg-teal-50 px-6 py-4 border-b border-teal-200">
                <h3 className="text-xl font-bold text-teal-700 flex items-center gap-2">
                  <CreditCard size={24} />
                  NRO Account
                </h3>
              </div>
              <div className="p-6">
                <p className="text-ink leading-relaxed">
                  Commonly used for Indian-source receipts such as rent, dividends and pension. Interest is generally taxable; withholding and treaty relief depend on your facts. Ask your bank about permitted credits.
                </p>
              </div>
            </div>

            {/* NRE Card */}
            <div className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="bg-secondary px-6 py-4 border-b border-rule">
                <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                  <TrendingUp size={24} />
                  NRE Account
                </h3>
              </div>
              <div className="p-6">
                <p className="text-ink leading-relaxed">
                  Used for eligible repatriable rupee funds. Qualifying deposit interest is exempt in India, but dividends and investment gains are not exempt merely because the investment was funded from NRE.
                </p>
              </div>
            </div>

            {/* FCNR Card */}
            <div className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="bg-paper px-6 py-4 border-b border-rule">
                <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                  <Globe size={24} />
                  FCNR Account
                </h3>
              </div>
              <div className="p-6">
                <p className="text-ink leading-relaxed">
                  Foreign-currency term deposits can avoid conversion into rupees, but currency risk remains relative to your spending currency. Check the bank's terms and the separate conditions for Indian interest exemption, especially after returning to India.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Worked Examples */}
      <section className="py-12 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Compare interest, withholding and final tax separately</h2>
          <p className="text-ink/80 mb-4">
            At an illustrative 7% rate, a <span className="money">₹50,00,000</span> deposit earns
            <span className="money"> ₹3,50,000</span> annually. A base 30% withholding illustration is
            <span className="money"> ₹1,05,000</span>, before applicable surcharge and cess.
            Withholding is not the final tax payable: treaty relief, other income and return calculations matter.
            Eligible NRE deposit interest can be exempt in India, but changing accounts cannot remove tax on prior income.
          </p>
          <p className="text-ink/80 mb-4">
            Rental income and mutual-fund gains follow their own tax rules. Do not apply an interest-article
            treaty rate to rent or assume that receiving investment proceeds in NRE makes them exempt.
          </p>
          <h3 className="text-lg font-semibold mb-2">Official references</h3>
          <ul className="list-disc pl-5 space-y-2">
            {NRI_ACCOUNT_SOURCES.map((source) => (
              <li key={source.href}><a className="text-interactive-blue underline" href={source.href}
                target="_blank" rel="noopener noreferrer">{source.label}</a></li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pro Tips */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-amber-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">6 Pro Tips Every NRI Should Know</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Convert NRO to NRE Strategically",
                description: "Permitted NRO-to-NRE transfers require bank checks and applicable tax compliance. A transfer does not exempt past income or future dividends and capital gains.",
              },
              {
                title: "Submit Form 15G/15H Carefully",
                description: "NRIs CANNOT submit Form 15G/15H to avoid TDS on NRO accounts (only residents can). Don't let your bank mislead you — NRO TDS is mandatory.",
              },
              {
                title: "Check the applicable treaty",
                description: "Treaty relief varies by country, income type and eligibility. Ask about the applicable article, tax-residency certificate, Form 10F and any further documentation; do not assume a universal 15% rate.",
              },
              {
                title: "NRE Account for SIPs and Mutual Funds",
                description: "NRE funding does not exempt mutual-fund dividends or redemption gains. Check fund classification, holding period, tax rates and NRI withholding before investing.",
              },
              {
                title: "Joint NRO with Resident Parents",
                description: "Ask the bank about eligible resident-relative joint holders, the required account mandate and permitted operations. Joint access is subject to banking rules.",
              },
              {
                title: "Repatriation Deadline",
                description: "NRE balances are repatriable subject to account rules. NRO current-income remittances and capital-balance transfers have different conditions; the USD 1 million facility is not a universal limit for every remittance. Check which tax forms and bank documents your transaction actually needs.",
              },
            ].map((tip, index) => (
              <div key={index} className="bg-card rounded-lg shadow-md p-6 border-l-4 border-amber-500 hover:shadow-lg transition">
                <h3 className="text-lg font-bold text-ink mb-3">
                  {index + 1}. {tip.title}
                </h3>
                <p className="text-ink/80">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad Banner */}
      <section className="py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <ResponsiveAd />
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {faqData.map((item, index) => (
              <details key={index} className="group border border-rule rounded-lg p-6 bg-card hover:bg-secondary transition cursor-pointer">
                <summary className="flex items-start gap-4 font-semibold text-ink list-none">
                  <span className="text-teal-600 font-bold text-lg flex-shrink-0 mt-1">{index + 1}.</span>
                  <span className="text-lg">{item.question}</span>
                </summary>
                <p className="text-ink/80 mt-4 ml-8 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related Tools */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-secondary">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Explore Related Tools</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "DTAA Calculator",
                description: "Calculate tax benefits under Double Taxation Avoidance Agreements",
                link: "/nri/dtaa-calculator",
                icon: <TrendingUp className="text-teal-600" size={32} />,
              },
              {
                title: "NRI Income Tax Calculator",
                description: "Calculate your NRI income tax liability accurately",
                link: "/nri/income-tax-calculator",
                icon: <BookOpen className="text-credit" size={32} />,
              },
              {
                title: "Repatriation Planner",
                description: "Plan your fund repatriation strategy and limits",
                link: "/nri/repatriation-planner",
                icon: <Globe className="text-ink" size={32} />,
              },
              {
                title: "Income Tax Calculator",
                description: "General income tax calculator for all taxpayers",
                link: "/calculators/income-tax",
                icon: <CreditCard className="text-orange-600" size={32} />,
              },
            ].map((tool, index) => (
              <Link key={index} href={tool.link}>
                <a className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition h-full">
                  <div className="mb-4">{tool.icon}</div>
                  <h3 className="text-lg font-bold text-ink mb-2">{tool.title}</h3>
                  <p className="text-sm text-ink/65">{tool.description}</p>
                </a>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Rectangle Ad Banner */}
      <section className="py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <RectangleAd />
        </div>
      </section>

      {/* Author Box */}
      <section className="py-12 md:py-16 px-4 md:px-6 bg-secondary">
        <div className="max-w-4xl mx-auto">
          <AuthorBox />
        </div>
      </section>


    </>
  );
}

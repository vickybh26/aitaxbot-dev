import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Globe, ChevronRight, AlertCircle, CreditCard, TrendingUp, BookOpen } from "lucide-react";
import AuthorBox from "@/components/AuthorBox";
import { AdBanner, ResponsiveAd, RectangleAd } from "@/components/AdBanner";
import { NAVY, SLATE_200 } from "@/lib/chartColors";

export default function NRONREComparison() {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const recommendations: Record<number, { account: string; benefit: string; note: string }> = {
    1: {
      account: "NRO Account",
      benefit: "Perfect for collecting rent, salary, pension and other Indian-source income",
      note: "TDS will apply at 30% (may reduce to 15% under DTAA). You must have an NRO account if you have any Indian income.",
    },
    2: {
      account: "NRE Account",
      benefit: "100% tax-free interest and returns on your foreign earnings invested in India",
      note: "Ideal for building long-term wealth in India. Funds are always freely repatriable to any country.",
    },
    3: {
      account: "FCNR Account",
      benefit: "Preserve foreign currency value without forex risk. Interest is tax-free.",
      note: "Lock your USD/GBP/EUR for 1-5 years with guaranteed tax-free returns. Perfect for medium-term parking.",
    },
    4: {
      account: "NRE Account",
      benefit: "100% tax-free interest means you keep all your earnings. No TDS whatsoever.",
      note: "This is the single biggest tax advantage for NRIs. Transfer funds from NRO to NRE strategically each year.",
    },
  };

  const faqData = [
    {
      question: "Can I have both NRO and NRE accounts simultaneously?",
      answer:
        "Yes, absolutely. In fact, most NRIs should have both. Use NRO for Indian-source income (rent, salary, pension) and NRE for foreign-source income and investments. You can hold both accounts at the same bank or different banks.",
    },
    {
      question: "What happens to my existing savings account when I become an NRI?",
      answer:
        "Your resident rupee savings account automatically converts to an NRO account. You cannot maintain a regular resident savings account once you become an NRI. The conversion happens automatically, but you should inform your bank about your NRI status to avoid complications.",
    },
    {
      question: "Can I invest in Indian mutual funds through NRE account?",
      answer:
        "Yes, you can invest in Indian mutual funds through NRE account and all returns are tax-free. However, if you're investing a lump sum that will mature and be repatriated, you may face higher forex compliance. SIPs (Systematic Investment Plans) from NRE accounts are excellent — no TDS on returns.",
    },
    {
      question: "Is NRE interest really 100% tax-free?",
      answer:
        "Yes, completely. NRE account interest, dividend income, and capital gains are all 100% tax-free under Income Tax Act Section 115E. This applies only to non-residents. Interest is credited directly to your account — no TDS deduction.",
    },
    {
      question: "What documents do I need to open an NRI account?",
      answer:
        "You'll need: (1) Valid passport, (2) Proof of overseas residence (rental agreement, utility bill, work contract), (3) PAN card, (4) Address proof in India (if you own property). Different banks may have slightly different requirements. NRI status needs to be established through your Income Tax records or self-declaration with supporting documents.",
    },
    {
      question: "Can I use NRO/NRE accounts for UPI payments?",
      answer:
        "Most banks restrict UPI access from NRI accounts due to RBI regulations around resident vs non-resident fund flows. You can use net banking and international wire transfers. For domestic payments, you may need to convert NRE to NRO funds (which has tax implications). Always check with your bank before attempting UPI transactions.",
    },
  ];

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
            <Link href="/nri-corner" className="hover:underline">
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
                NRO account interest is taxed at 30% TDS. NRE account interest is 100% tax-free in India. Yet most NRIs park all their Indian savings in NRO accounts because their bank didn't explain the difference. Simply moving fixed deposits to an NRE account can save ₹1.5 lakh or more in annual TDS for a ₹50 lakh deposit.
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
                  <td className="px-4 md:px-6 py-4 text-red-600 font-semibold">30% TDS (may reduce via DTAA)</td>
                  <td className="px-4 md:px-6 py-4 text-green-600 font-semibold">Completely tax-free in India</td>
                  <td className="px-4 md:px-6 py-4 text-green-600 font-semibold">Completely tax-free in India</td>
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
                  <td className="px-4 md:px-6 py-4 text-ink/80">Yes (tax-free returns)</td>
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
                  Use for collecting Indian-source income: rent from property, dividends, pension, salary if still employed in India part-time. Every NRI who has Indian income needs an NRO account. Interest taxed at 30% + surcharge (may reduce under DTAA).
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
                  Ideal for NRIs who want to invest their foreign earnings in India — FDs, mutual funds, stocks. Interest is completely tax-free. Funds can be freely moved back abroad. Best choice for growing Indian corpus with foreign money.
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
                  Fixed deposits in foreign currency (USD, GBP, EUR, AUD, CAD, JPY, SGD). Eliminates currency risk since you deposit and withdraw in the same currency. Interest tax-free. Tenure: 1 to 5 years. Best for long-term parking of foreign funds without forex exposure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Worked Examples */}
      <section className="py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Real-World Examples: How Much Can You Save?</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Example 1 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-8 border-l-4 border-orange-500">
              <h3 className="text-2xl font-bold text-orange-700 mb-6">Example 1: ₹50 Lakh FD</h3>

              <div className="bg-card rounded-lg p-4 mb-4 border-l-4 border-red-500">
                <p className="text-sm font-semibold text-red-600 uppercase mb-2">Scenario A: All in NRO</p>
                <p className="text-ink mb-2">₹50L FD at 7% interest</p>
                <p className="text-ink/80 text-sm">Interest earned: ₹3.5L</p>
                <p className="text-ink/80 text-sm">TDS at 30%: ₹1.05L</p>
                <p className="text-lg font-bold text-red-600">Net received: ₹2.45L</p>
              </div>

              <div className="bg-card rounded-lg p-4 mb-6 border-l-4 border-green-500">
                <p className="text-sm font-semibold text-green-600 uppercase mb-2">Scenario B: Move to NRE</p>
                <p className="text-ink mb-2">Same ₹50L at 7% interest</p>
                <p className="text-ink/80 text-sm">Interest earned: ₹3.5L</p>
                <p className="text-ink/80 text-sm">TDS: ₹0 (100% tax-free)</p>
                <p className="text-lg font-bold text-green-600">Net received: ₹3.5L</p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-600">
                <p className="text-sm font-semibold text-yellow-700 uppercase mb-1">Annual Savings by Switching:</p>
                <p className="text-2xl font-bold text-yellow-700">₹1.05 Lakh per year</p>
              </div>
            </div>

            {/* Example 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-8 border-l-4 border-blue-500">
              <h3 className="text-2xl font-bold text-ink mb-6">Example 2: Rental Income</h3>

              <div className="bg-card rounded-lg p-4 mb-4">
                <p className="text-ink font-semibold mb-3">Monthly rent: ₹40,000</p>
                <p className="text-ink/80 text-sm mb-2">Annual rental income: ₹4.8L</p>

                <div className="bg-red-50 p-3 rounded border-l-4 border-red-500 my-4">
                  <p className="text-sm text-red-700 font-semibold">Must go to NRO Account</p>
                  <p className="text-xs text-red-600 mt-1">Indian income cannot be credited to NRE account</p>
                </div>

                <p className="text-ink/80 text-sm mb-2">TDS deducted by tenant at 30% (on income above threshold)</p>
                <p className="text-ink/80 text-sm mb-4">Potential TDS: ~₹1.44L</p>

                <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                  <p className="text-sm text-green-700 font-semibold">DTAA Benefit</p>
                  <p className="text-xs text-green-600 mt-1">If you're a resident of US, UK, Canada, Singapore — you can submit Form 10F + Tax Residency Certificate to reduce TDS to 15%</p>
                  <p className="text-sm font-bold text-green-700 mt-2">Potential savings: ₹72,000 per year</p>
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-4 border-l-4 border-blue-600 mt-4">
                <p className="text-sm font-semibold text-ink uppercase mb-1">Repatriation</p>
                <p className="text-sm text-ink">Can repatriate NRO balance up to USD 1 million/year with Form 15CA/15CB + CA certificate</p>
              </div>
            </div>
          </div>
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
                description: "You can transfer up to USD 1 million/year from NRO to NRE after paying applicable taxes — effectively converting taxable funds to tax-free ones going forward.",
              },
              {
                title: "Submit Form 15G/15H Carefully",
                description: "NRIs CANNOT submit Form 15G/15H to avoid TDS on NRO accounts (only residents can). Don't let your bank mislead you — NRO TDS is mandatory.",
              },
              {
                title: "DTAA Can Reduce NRO TDS to 15%",
                description: "US, UK, Canada, Singapore NRIs can submit Form 10F + Tax Residency Certificate to reduce NRO interest TDS from 30% to 15%.",
              },
              {
                title: "NRE Account for SIPs and Mutual Funds",
                description: "Systematic Investment Plans in equity mutual funds from NRE account means tax-free SIP returns (no TDS on redemption if NRE-funded). Significantly better than NRO-funded investments.",
              },
              {
                title: "Joint NRO with Resident Parents",
                description: "You can open a joint NRO account with resident Indian family members (parents, spouse). Useful for giving them access to manage funds in your absence.",
              },
              {
                title: "Repatriation Deadline",
                description: "There's no time limit on repatriating NRE funds — they're always freely repatriable. NRO repatriation requires CA certificate (Form 15CA/15CB) and is capped at USD 1 million per financial year.",
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

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import PageHeader from "@/components/PageHeader";
import { trackPageView } from "@/lib/analytics";

export default function About() {
  useEffect(() => {
    trackPageView('/about', 'About Us - AiTaxBot');
  }, []);

  return (
    <>
      <Helmet>
        <title>About Us - AiTaxBot Free Tax Calculator & Financial Tools India</title>
        <meta name="description" content="Learn about AiTaxBot — India's free AI-powered tax platform. Income tax calculator, HRA, SIP, NPS, rent receipt generator, CA directory and more. Built for Indian taxpayers." />
        <meta name="keywords" content="about aitaxbot, tax calculator India, Indian tax tools, financial planning India, find CA India" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/about" />
        <meta property="og:title" content="About AiTaxBot - Free Tax Tools for India" />
        <meta property="og:description" content="Making taxes simple and accessible for all Indians. Free AI-powered calculators, rent receipt generator, CA directory and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aitaxbot.co.in/about" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/apple-touch-icon.png" />
      </Helmet>

      <PageHeader
        title="About AiTaxBot"
        subtitle="Making Indian taxes simple, accurate, and free — for every taxpayer."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About" }
        ]}
      />

      <div>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              At AiTaxBot, we believe taxes shouldn't be stressful. Our mission is simple — to make tax
              calculation and financial planning easy, accurate, and accessible for every Indian. Whether
              you're a salaried professional, a freelancer, a property owner, or a crypto trader, AiTaxBot
              is designed to help you understand your finances better and take control of your tax journey —
              completely free.
            </p>

            {/* What We Do */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">What We Do</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">🧮 Income Tax Calculator</h3>
                  <p className="text-gray-700">Compare Old vs New regime, estimate your tax liability under ITA 2025, and find out exactly how much you save — updated for AY 2026-27.</p>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-green-900 mb-3">🛠️ Financial Calculators</h3>
                  <p className="text-gray-700">HRA exemption, SIP returns, SWP planning, NPS corpus, PF maturity, home loan EMI, vehicle loan — all free, all instant.</p>
                </div>

                <div className="bg-teal-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-teal-900 mb-3">🧾 Rent Receipt Generator</h3>
                  <p className="text-gray-700">Generate rent receipts as a PDF in seconds and get them emailed directly to you — no sign-up required for basic use.</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-orange-900 mb-3">📈 Trading Tax Calculator</h3>
                  <p className="text-gray-700">Calculate STCG and LTCG on equity, F&amp;O, and crypto trades. Understand your US stocks tax liability under DTAA.</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-purple-900 mb-3">🔍 Find a CA — Free Directory</h3>
                  <p className="text-gray-700">Browse verified Chartered Accountants across India by city and specialisation. Send enquiries directly — no platform fee, ever.</p>
                </div>

                <div className="bg-indigo-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-indigo-900 mb-3">📰 Tax Blog & Guides</h3>
                  <p className="text-gray-700">Simplified explanations of ITR filing, ITA 2025 changes, HRA rules, capital gains, 80C deductions — written in plain English.</p>
                </div>
              </div>
            </section>

            {/* Why AiTaxBot */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Why AiTaxBot?</h2>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 rounded-full p-2 mt-1 flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Completely Free</h3>
                    <p className="text-gray-700">No hidden charges, no subscriptions, no paywalls. Every calculator, tool, and article is free to use.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 mt-1 flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Built for India</h3>
                    <p className="text-gray-700">Fully aligned with Indian tax law — Income Tax Act 2025, IT Rules 2026, AY 2026-27 slabs, 8-metro HRA rules, and crypto taxation. Not a generic global tool adapted for India.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 rounded-full p-2 mt-1 flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Simple &amp; Transparent</h3>
                    <p className="text-gray-700">No jargon, no complex forms. Straightforward answers and tools you can trust. Every calculation is explained step by step.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-yellow-100 rounded-full p-2 mt-1 flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">CA-Backed Accuracy</h3>
                    <p className="text-gray-700">Every calculator and article is reviewed by a qualified Chartered Accountant. We cite the relevant sections of the Income Tax Act so you can verify every figure yourself.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-red-100 rounded-full p-2 mt-1 flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Data, Your Control</h3>
                    <p className="text-gray-700">Calculator inputs stay in your browser session and are never stored without your consent. When you sign up and save a calculation, you can delete your account and all associated data at any time.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Find a CA section */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Find a CA — Free Directory Service</h2>
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100 rounded-lg p-8">
                <p className="text-gray-800 leading-relaxed mb-4">
                  Calculators answer "how much" — but sometimes you need a qualified professional to answer
                  "what next." That's why AiTaxBot maintains a free directory of Chartered Accountants across India.
                </p>
                <p className="text-gray-800 leading-relaxed mb-4">
                  CAs list their own profiles voluntarily. Users can browse by city and service area, and send
                  an enquiry directly to any CA. <strong>AiTaxBot charges no fee</strong> — to users or to CAs —
                  for this service.
                </p>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  <strong>Important:</strong> AiTaxBot is an informational platform. We do not recommend, refer,
                  rank, or endorse any CA. Profiles are displayed in alphabetical order. We advise all users to
                  verify a CA's ICAI membership number at{" "}
                  <a
                    href="https://www.icai.org/post.html?post_id=11967"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    icai.org
                  </a>{" "}
                  before engaging their services.
                </p>
                <a
                  href="/find-ca"
                  className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                >
                  Browse CA Directory →
                </a>
              </div>
            </section>

            {/* About the Founder */}
            <section className="mb-10" id="author">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">About the Founder</h2>
              <div className="bg-blue-50 rounded-lg p-8 border border-blue-100">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-blue-600">CA</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Chartered Accountant & Founder</h3>
                    <p className="text-blue-700 font-semibold mb-3">AiTaxBot · aitaxbot.co.in</p>
                    <p className="text-gray-700 leading-relaxed">
                      AiTaxBot was founded by a qualified Chartered Accountant who saw firsthand how confusing
                      India's tax system can be for ordinary taxpayers. The platform was built to bridge that gap
                      — giving individuals the same clarity that CA clients receive, for free. Every calculator,
                      tool, and article is verified against the latest provisions of the Income Tax Act 2025 and
                      IT Rules 2026 before publication.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Our Vision */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Our Vision</h2>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
                <p className="text-lg text-gray-800 leading-relaxed">
                  To become India's most trusted free tax and finance platform — empowering every Indian taxpayer
                  to file with confidence, plan with clarity, and never overpay a rupee.
                </p>
              </div>
            </section>

            {/* Disclaimer */}
            <section className="mb-10">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Disclaimer</h3>
                <p className="text-yellow-800 text-sm leading-relaxed">
                  AiTaxBot provides tax calculators and financial tools for informational and educational purposes
                  only. Results from our calculators do not constitute professional tax, legal, or financial advice.
                  Tax laws are subject to change. Always consult a qualified Chartered Accountant or tax professional
                  before filing your ITR or making financial decisions. AiTaxBot is not liable for any errors in
                  calculations or decisions made based on this platform.
                </p>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center">
              <div className="bg-gray-50 rounded-lg p-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Ready to take control of your taxes?</h3>
                <p className="text-gray-600 mb-6">Start with our free income tax calculator — compare Old vs New Regime in under a minute.</p>
                <a
                  href="/calculators/income-tax"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block"
                  data-testid="button-start-calculating"
                >
                  Start Calculating →
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

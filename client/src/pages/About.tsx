import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";
import { trackPageView } from "@/lib/analytics";

export default function About() {
  useEffect(() => {
    trackPageView('/about', 'About Us - AiTaxBot');
  }, []);

  return (
    <>
      <Helmet>
        <title>About Us - AiTaxBot Tax Calculator & Financial Tools</title>
        <meta name="description" content="Learn about AiTaxBot's mission to make tax calculation and financial planning easy for Indian taxpayers. AI-powered tools for income tax, SIP, SWP, and HRA calculations." />
        <meta name="keywords" content="about aitaxbot, tax calculator company, Indian tax tools, financial planning India" />
        <link rel="canonical" href="https://aitaxbot.co.in/about" />
        
        <meta property="og:title" content="About AiTaxBot - Smart Tax Solutions for India" />
        <meta property="og:description" content="Making taxes simple and accessible for all Indians. Free AI-powered calculators and financial tools." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitaxbot.co.in/about" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
      </Helmet>
      
      <div>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">About Ai Tax Bot</h1>
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              At Ai Tax Bot, we believe taxes shouldn't be stressful. Our mission is simple — to make tax calculation and financial planning easy, accurate, and accessible for everyone. Whether you're a salaried professional, freelancer, property owner, or a crypto trader, Ai Tax Bot is designed to help you understand your finances better and take control of your tax journey.
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">What We Do</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">🤖 AI-Powered Tax Calculator</h3>
                  <p className="text-gray-700">Instantly estimate your tax liability based on the latest Indian tax rules.</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-green-900 mb-3">🛠️ Smart Financial Tools</h3>
                  <p className="text-gray-700">Access calculators for income tax, HRA, SIP, SWP, and even crypto gains.</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-purple-900 mb-3">📊 Market Insights</h3>
                  <p className="text-gray-700">Track stock prices, mutual fund NAVs, and compare investments side by side.</p>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-orange-900 mb-3">📰 Latest Tax Updates</h3>
                  <p className="text-gray-700">Stay informed with simplified tax news, law changes, and financial alerts.</p>
                </div>

                <div className="bg-teal-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-teal-900 mb-3">🔍 Find a CA Directory</h3>
                  <p className="text-gray-700">Browse verified Chartered Accountants and send your tax enquiry directly — free, with no platform fee.</p>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Why Ai Tax Bot?</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 rounded-full p-2 mt-1">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Completely Free</h3>
                    <p className="text-gray-700">No hidden charges, no subscriptions.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 mt-1">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Tailored for Indians</h3>
                    <p className="text-gray-700">Built specifically for Indian tax laws, including the latest regimes, rebates, and crypto taxation.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 rounded-full p-2 mt-1">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Simple & Transparent</h3>
                    <p className="text-gray-700">No jargon, no complex forms. Just straightforward answers and tools you can trust.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-yellow-100 rounded-full p-2 mt-1">
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Built by a Chartered Accountant</h3>
                    <p className="text-gray-700">Designed with the expertise of a CA who understands the challenges of tax filing and compliance.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Find a CA section */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Find a CA — Free Directory Service</h2>
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100 rounded-lg p-8">
                <p className="text-gray-800 leading-relaxed mb-4">
                  We understand that calculators answer "how much" — but sometimes you need a qualified
                  professional to answer "what next." That's why AiTaxBot maintains a free directory of
                  Chartered Accountants (CAs) across India.
                </p>
                <p className="text-gray-800 leading-relaxed mb-4">
                  CAs list their own profiles voluntarily. Users can browse by city and service area, and
                  send an enquiry directly to any CA. <strong>AiTaxBot charges no fee</strong> — to users
                  or to CAs — for this service.
                </p>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  <strong>Important:</strong> AiTaxBot is an informational platform only. We do not recommend,
                  refer, rank, or endorse any CA. Profiles are shown in alphabetical order. We advise all users
                  to verify a CA's ICAI membership number at{" "}
                  <a
                    href="https://www.icai.org/post.html?post_id=11967"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    icai.org
                  </a>{" "}
                  before engaging their services. Full terms are available in our{" "}
                  <a href="/find-ca#disclaimer" className="text-blue-600 underline">Find a CA Disclaimer</a>.
                </p>
                <a
                  href="/find-ca"
                  className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                >
                  Browse CA Directory →
                </a>
              </div>
            </section>

            <section className="mb-10" id="author">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">About the Author</h2>
              <div className="bg-persian-blue-50 rounded-lg p-8 border border-persian-blue-200">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-persian-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-persian-blue-600">CA</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">AiTaxBot Expert Team</h3>
                    <p className="text-persian-blue-700 font-semibold mb-3">Chartered Accountants & Tax Professionals</p>
                    <p className="text-gray-700 leading-relaxed">
                      AiTaxBot is built and maintained by a team of qualified Chartered Accountants and tax professionals with deep expertise in Indian taxation, financial planning, and regulatory compliance. Our mission is to help everyday taxpayers navigate India's complex tax system with confidence. Every calculator, tool, and article on this platform is reviewed and verified by our team to ensure accuracy with the latest Income Tax Act provisions.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Our Vision</h2>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
                <p className="text-lg text-gray-800 leading-relaxed">
                  To become India's most trusted AI-driven tax and finance companion, empowering individuals to make informed financial decisions with confidence and ease.
                </p>
              </div>
            </section>

            <section className="text-center">
              <div className="bg-gray-50 rounded-lg p-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Ready to take control of your taxes?</h3>
                <p className="text-gray-600 mb-6">Start with our free AI-powered tax calculator and discover how much you can save.</p>
                <a 
                  href="/" 
                  className="bg-persian-blue-600 text-white px-8 py-3 rounded-lg hover:bg-persian-blue-700 transition-colors font-medium inline-block"
                  data-testid="button-start-calculating"
                >
                  Start Calculating
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
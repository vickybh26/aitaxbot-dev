import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trackPageView } from "@/lib/analytics";

export default function TermsOfService() {
  useEffect(() => {
    trackPageView('/terms-of-service', 'Terms of Service - AiTaxBot');
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms of Service - AiTaxBot Usage Agreement</title>
        <meta name="description" content="AiTaxBot Terms of Service. Usage guidelines, disclaimers, and legal agreements for our tax calculators, financial tools, and services." />
        <meta name="keywords" content="terms of service, user agreement, aitaxbot terms, legal disclaimer" />
        <link rel="canonical" href="https://aitaxbot.in/terms-of-service" />
        <meta property="og:image" content="https://aitaxbot.in/images/aitaxbot-logo.png" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <Header />
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> January 31, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using AiTaxBot (aitaxbot.in), you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Description of Service</h2>
              <p className="text-gray-700 mb-4">
                AiTaxBot provides AI-powered financial calculators, tax computation tools, and market data services 
                for informational and educational purposes.
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Income tax calculators for Indian tax slabs</li>
                <li>SIP, SWP, and HRA calculators</li>
                <li>Real-time stock market data and mutual fund information</li>
                <li>Financial news and market insights</li>
                <li>Document upload and automatic data extraction</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Financial Disclaimer</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-yellow-800">
                  <strong>Important:</strong> AiTaxBot provides calculators and tools for informational purposes only. 
                  Results should not be considered as professional financial or tax advice.
                </p>
              </div>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Always consult qualified tax professionals for official tax filing</li>
                <li>Verify calculations independently before making financial decisions</li>
                <li>Tax laws may change; ensure you're using current regulations</li>
                <li>We are not liable for any financial decisions based on our calculations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Responsibilities</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-3">Acceptable Use</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Use the service for lawful purposes only</li>
                <li>Provide accurate information in calculators</li>
                <li>Respect intellectual property rights</li>
                <li>Do not attempt to reverse engineer or hack our systems</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">Prohibited Activities</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Uploading malicious files or viruses</li>
                <li>Attempting to access unauthorized areas</li>
                <li>Using automated systems to access our service excessively</li>
                <li>Violating any applicable laws or regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy and Data Protection</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Financial data entered in calculators is processed locally</li>
                <li>Uploaded documents are automatically deleted after session</li>
                <li>We collect anonymous usage analytics to improve our service</li>
                <li>Third-party services (Google Analytics, AdSense) may collect data as per their policies</li>
              </ul>
              <p className="text-gray-700">
                For detailed information, please read our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                Our service integrates with various third-party APIs and services:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li><strong>Financial Data:</strong> Finnhub, Upstox, MF API for market data</li>
                <li><strong>Analytics:</strong> Google Analytics, Microsoft Clarity</li>
                <li><strong>Advertising:</strong> Google AdSense</li>
                <li><strong>Storage:</strong> Firebase for temporary document storage</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the fullest extent permitted by law, AiTaxBot shall not be liable for:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Any errors or inaccuracies in calculations or data</li>
                <li>Financial losses resulting from use of our service</li>
                <li>Interruptions or downtime of the service</li>
                <li>Third-party content or services</li>
                <li>Any indirect, incidental, or consequential damages</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Intellectual Property</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>All content and software on AiTaxBot is our proprietary property</li>
                <li>You may use our service for personal, non-commercial purposes</li>
                <li>Reproduction or distribution of our content requires written permission</li>
                <li>Trademarks and logos are property of their respective owners</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Service Availability</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>We strive to maintain 99%+ uptime but cannot guarantee continuous availability</li>
                <li>Maintenance windows may cause temporary interruptions</li>
                <li>Third-party API limitations may affect real-time data</li>
                <li>We reserve the right to modify or discontinue features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Modifications to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these terms at any time. Users will be notified of significant 
                changes through website announcements or email notifications.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For questions about these Terms of Service, contact us at:
              </p>
              <ul className="text-gray-700">
                <li><strong>Email:</strong> info@aitaxbot.in</li>
                <li><strong>Website:</strong> aitaxbot.in</li>
                <li><strong>Business Hours:</strong> Monday-Friday, 9 AM - 6 PM IST</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-700">
                These terms shall be governed by and construed in accordance with the laws of India. 
                Any disputes arising from these terms shall be subject to the jurisdiction of courts in India.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
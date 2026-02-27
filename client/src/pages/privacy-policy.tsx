import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trackPageView } from "@/lib/analytics";

export default function PrivacyPolicy() {
  useEffect(() => {
    trackPageView('/privacy-policy', 'Privacy Policy - AiTaxBot');
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy - AiTaxBot</title>
        <meta name="description" content="AiTaxBot Privacy Policy - Learn how we collect, use, and protect your information, including cookie usage and Google AdSense data practices." />
        <link rel="canonical" href="https://aitaxbot.in/privacy-policy" />
      </Helmet>
      <Header />
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="heading-privacy">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">
            <strong>Last Updated:</strong> October 26, 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-800 mb-8">
              At AiTaxBot, your privacy is our top priority. We are committed to maintaining transparency and ensuring that your personal and financial information remains secure. This privacy policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information Collection</h2>
              <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-6">
                <p className="text-green-800 font-medium mb-3">
                  <strong>AiTaxBot does not collect, store, or share any personal or financial data</strong> you provide while using our calculators and tools.
                </p>
                <p className="text-green-700">
                  All calculations happen instantly in your browser session and are purged once you leave or refresh the page.
                </p>
              </div>
              
              <p className="text-gray-700 mb-4">However, we do collect certain non-personal information automatically:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Browser Information:</strong> Browser type, operating system, device type</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent on pages, navigation patterns</li>
                <li><strong>Location Data:</strong> General geographic location (country/city level)</li>
                <li><strong>IP Address:</strong> For analytics and security purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Any financial data entered (such as income details, investments, or expenses) is used only for showing you real-time calculations</li>
                <li><strong>No financial information is stored on our servers, databases, or logs</strong></li>
                <li>Non-personal information is used to improve our website, understand user behavior, and serve relevant advertisements</li>
                <li>Analytics data helps us identify popular features and optimize user experience</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cookies & Tracking Technologies</h2>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
                <p className="text-blue-800 font-medium">
                  We use cookies and similar tracking technologies to enhance your browsing experience and deliver personalized advertisements.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">What Are Cookies?</h3>
              <p className="text-gray-700 mb-4">
                Cookies are small text files placed on your device by websites you visit. They are widely used to make websites work efficiently and provide information to website owners.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Types of Cookies We Use:</h3>
              
              <div className="space-y-4 mb-6">
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Essential Cookies</h4>
                  <p className="text-gray-700">Required for the website to function properly. These cannot be disabled.</p>
                </div>
                
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Analytics Cookies</h4>
                  <p className="text-gray-700">Help us understand how visitors interact with our website through Google Analytics and Microsoft Clarity.</p>
                </div>
                
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Advertising Cookies</h4>
                  <p className="text-gray-700">Used by Google AdSense and other ad networks to display relevant advertisements based on your browsing history.</p>
                </div>
                
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Preference Cookies</h4>
                  <p className="text-gray-700">Remember your settings and preferences (like cookie consent choices).</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Google AdSense & Third-Party Advertising</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
                <p className="text-yellow-800 font-medium mb-3">
                  <strong>Important Disclosure:</strong> Third-party vendors, including Google, use cookies to serve ads on our site based on your prior visits to our website or other websites.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Google AdSense Cookie Usage:</h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Google uses cookies to serve ads</strong> based on a user's prior visits to our website or other websites on the internet</li>
                <li>Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our site and/or other sites on the internet</li>
                <li>These cookies collect information such as:
                  <ul className="list-circle pl-6 mt-2 space-y-1">
                    <li>Your IP address</li>
                    <li>Browser type and version</li>
                    <li>Pages you visit on our website</li>
                    <li>Time and date of your visit</li>
                    <li>Time spent on pages</li>
                    <li>Previous websites you visited</li>
                  </ul>
                </li>
                <li>This information is used to display personalized advertisements that may be of interest to you</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">How to Opt Out of Personalized Advertising:</h3>
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <p className="text-gray-800 mb-4">You may opt out of personalized advertising by visiting the following pages:</p>
                <ul className="space-y-2">
                  <li>
                    <a 
                      href="https://www.google.com/settings/ads" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-persian-blue-600 hover:text-persian-blue-700 transition-colors font-medium"
                      data-testid="link-google-ads-settings"
                    >
                      → Google Ads Settings
                    </a>
                  </li>
                  <li>
                    <a 
                      href="http://www.aboutads.info/choices/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-persian-blue-600 hover:text-persian-blue-700 transition-colors font-medium"
                      data-testid="link-aboutads"
                    >
                      → Network Advertising Initiative (NAI) Opt-Out Page
                    </a>
                  </li>
                  <li>
                    <a 
                      href="http://www.youronlinechoices.eu/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-persian-blue-600 hover:text-persian-blue-700 transition-colors font-medium"
                      data-testid="link-youronlinechoices"
                    >
                      → Your Online Choices (for EU users)
                    </a>
                  </li>
                </ul>
                <p className="text-gray-600 text-sm mt-4">
                  Note: Opting out does not mean you will no longer see ads. It means the ads you see will not be personalized based on your browsing history.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Other Third-Party Services</h2>
              <p className="text-gray-700 mb-4">We also use the following third-party services that may collect information:</p>
              
              <div className="space-y-3">
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Google Analytics</h4>
                  <p className="text-gray-700 text-sm">Tracks website traffic and user behavior. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-persian-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
                
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Microsoft Clarity</h4>
                  <p className="text-gray-700 text-sm">Provides heatmaps and session recordings. <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" className="text-persian-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
                
                <div className="border-l-4 border-gray-300 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Firebase (Google)</h4>
                  <p className="text-gray-700 text-sm">Authentication and data storage services. <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-persian-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Since no financial data is stored on our servers, there is no risk of unauthorized access to your tax or investment information</li>
                <li>All financial processing is session-based and temporary</li>
                <li>We use industry-standard security measures including HTTPS encryption for all data transmission</li>
                <li>Firebase Authentication provides secure user authentication with automatic logout after 30 minutes of inactivity</li>
                <li>All uploaded documents are automatically deleted from our servers after processing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Privacy Rights</h2>
              <p className="text-gray-700 mb-4">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Right to Access:</strong> Request access to the personal information we hold about you</li>
                <li><strong>Right to Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Right to Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Right to Object:</strong> Object to certain types of data processing</li>
                <li><strong>Right to Data Portability:</strong> Request a copy of your data in a machine-readable format</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for cookie usage at any time</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, please contact us at <a href="mailto:info@aitaxbot.in" className="text-persian-blue-600 hover:underline">info@aitaxbot.in</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700">
                Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700">
                Your information may be transferred to and processed in countries other than your own. These countries may have different data protection laws. By using our website, you consent to such transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Third-Party Links</h2>
              <p className="text-gray-700">
                Our website may contain links to third-party sites (e.g., market data providers, news sources, Google Ads Settings). We are not responsible for the privacy practices of those websites. We encourage you to read their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. User Control</h2>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
                <p className="text-blue-800 font-medium mb-3">
                  You are in full control of the financial information you enter.
                </p>
                <p className="text-blue-700">
                  Once you exit the page, refresh it, or close your browser, all entered financial data is automatically cleared from your session.
                </p>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Managing Cookies:</h3>
              <p className="text-gray-700 mb-4">You can control cookies through:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li><strong>Browser Settings:</strong> Most browsers allow you to refuse cookies or delete existing cookies</li>
                <li><strong>Cookie Consent Banner:</strong> Manage your preferences through our cookie consent tool</li>
                <li><strong>Opt-Out Tools:</strong> Use the links provided in Section 4 to opt out of personalized advertising</li>
              </ul>
              <p className="text-gray-600 text-sm">
                Note: Disabling cookies may affect the functionality of certain features on our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Updates to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or other factors. Any changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this policy regularly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-800 font-medium mb-2">📧 Email:</p>
                <p className="mb-4">
                  <a href="mailto:info@aitaxbot.in" className="text-persian-blue-600 hover:text-persian-blue-700 transition-colors text-lg" data-testid="link-contact-email">
                    info@aitaxbot.in
                  </a>
                </p>
                
                <p className="text-gray-800 font-medium mb-2">🌐 Website:</p>
                <p className="mb-4">
                  <a href="https://aitaxbot.in" className="text-persian-blue-600 hover:text-persian-blue-700 transition-colors" data-testid="link-website">
                    aitaxbot.in
                  </a>
                </p>
                
                <p className="text-gray-600 text-sm mt-4">
                  We will respond to your inquiry within 48 hours.
                </p>
              </div>
            </section>

            <div className="border-t border-gray-200 pt-8 mt-12">
              <p className="text-sm text-gray-600 italic">
                By using AiTaxBot, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

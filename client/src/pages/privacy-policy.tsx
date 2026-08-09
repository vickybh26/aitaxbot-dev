import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import PageHeader from "@/components/PageHeader";
import { trackPageView } from "@/lib/analytics";

export default function PrivacyPolicy() {
  useEffect(() => {
    trackPageView('/privacy-policy', 'Privacy Policy - AiTaxBot');
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy - AiTaxBot | How We Protect Your Data</title>
        <meta name="description" content="AiTaxBot Privacy Policy — learn how we collect, use, store, and protect your personal information in compliance with India's Digital Personal Data Protection Act 2023." />
        <link rel="canonical" href="https://www.aitaxbot.co.in/privacy-policy" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
      </Helmet>
      <PageHeader
        title="Privacy Policy"
        subtitle="Applies to aitaxbot.co.in and www.aitaxbot.co.in · Governed by India's Digital Personal Data Protection Act, 2023 (DPDPA)"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Privacy Policy" }
        ]}
        badge="Last Updated: July 11, 2026"
      />
      <div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="prose prose-lg max-w-none" data-testid="heading-privacy">

            {/* Intro */}
            <p className="text-lg text-slate-800 mb-8">
              AiTaxBot ("we", "us", "our") is committed to protecting your privacy. This policy explains
              what personal data we collect, why we collect it, how we use and store it, and your rights
              as a Data Principal under the Digital Personal Data Protection Act, 2023 (DPDPA). Please
              read this policy carefully before using our platform.
            </p>

            {/* 1. What Data We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. What Data We Collect</h2>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">1a. Calculator Inputs</h3>
              <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-6">
                <p className="text-green-800 font-medium mb-2">
                  The tax and investment maths runs in your browser. If you are not signed in, we do not
                  store anything you type into a calculator, and it is cleared when you close the page.
                </p>
                <p className="text-green-700 text-sm mb-2">
                  <strong>If you are signed in</strong>, the figures you entered and the result are saved to
                  your account so the tool can show you your latest result on your dashboard and pre-fill
                  itself when you return. You can delete any saved result from your dashboard, and deleting
                  your account removes all of them.
                </p>
                <p className="text-green-700 text-sm">
                  <strong>AI tax tips.</strong> Where a calculator offers AI-generated suggestions, the
                  figures for that calculation are sent to our AI provider (Google Gemini) to produce them.
                  They are used only to answer that request and are not used to train models.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">1b. Account Registration (Optional)</h3>
              <p className="text-slate-700 mb-3">
                You do not need an account to use a calculator or to see your headline result. A free
                account unlocks the detailed breakdown, regime comparison, saved history and PDF download.
                Educational content — blog articles and the NRI Corner — is open to everyone. When you
                create an account, we collect and store in Firebase:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Mobile number (optional, if provided)</li>
                <li>Saved calculation history (linked to your account)</li>
                <li>Account creation timestamp</li>
              </ul>
              <p className="text-slate-600 text-sm">
                Account creation is always free — there is no fee or paywall of any kind.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">1c. Download Gate (Lead Capture)</h3>
              <p className="text-slate-700 mb-3">
                Some tools may offer a guest download option requiring name, email, and mobile number
                instead of a full account. When available and used, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-1">
                <li>Name</li>
                <li>Email address</li>
                <li>WhatsApp / mobile number (optional)</li>
                <li>A brief text summary of the calculation type (e.g., "Income Tax — New Regime")</li>
              </ul>
              <p className="text-slate-600 text-sm">
                This information is stored in our Firestore database and used to email you the PDF. We ask
                for two separate consents at the point of collection: one to send you the computation
                itself (required), and a second, optional opt-in to also receive occasional tax tips and
                deadline reminders. You may unsubscribe from the optional emails at any time.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">1d. CA Directory Profiles</h3>
              <p className="text-slate-700 mb-3">
                Chartered Accountants who voluntarily register on our platform provide:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-1">
                <li>Name and ICAI membership number</li>
                <li>City and state</li>
                <li>Specialisation and services offered</li>
                <li>Contact email and phone (voluntarily disclosed)</li>
              </ul>
              <p className="text-slate-600 text-sm">
                This data is publicly displayed in the CA directory. CAs can request removal at any time
                by emailing us.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">1e. WhatsApp Bot</h3>
              <p className="text-slate-700 mb-3">
                If you interact with our WhatsApp assistant, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-1">
                <li>Your WhatsApp phone number (E.164 format)</li>
                <li>Your first name (if you share it)</li>
                <li>Message count and query type (for service improvement)</li>
              </ul>
              <p className="text-slate-600 text-sm">
                We do not read or store the full text of your WhatsApp messages beyond the first 100
                characters of unrecognised queries. No financial data sent over WhatsApp is stored.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">1f. Automatic Technical Data</h3>
              <p className="text-slate-700 mb-2">We automatically collect non-personal technical data:</p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-1">
                <li>Browser type, operating system, device type</li>
                <li>Pages visited and navigation patterns</li>
                <li>General geographic location (country/city level — not precise)</li>
                <li>IP address (for security and analytics; not linked to your account)</li>
                <li>Referring URL</li>
              </ul>
            </section>

            {/* 2. How We Use Your Data */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. How We Use Your Data</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900">Data</th>
                      <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900">Purpose</th>
                      <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900">Legal Basis (DPDPA)</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    <tr>
                      <td className="border border-slate-200 px-4 py-3">Account data (name, email)</td>
                      <td className="border border-slate-200 px-4 py-3">Login, saved calculations, account management</td>
                      <td className="border border-slate-200 px-4 py-3">Consent (at sign-up)</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-200 px-4 py-3">Download lead data</td>
                      <td className="border border-slate-200 px-4 py-3">Email PDF, tax update notifications</td>
                      <td className="border border-slate-200 px-4 py-3">Consent (at download)</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-4 py-3">CA profile data</td>
                      <td className="border border-slate-200 px-4 py-3">Public directory display</td>
                      <td className="border border-slate-200 px-4 py-3">Consent (at registration)</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border border-slate-200 px-4 py-3">WhatsApp data</td>
                      <td className="border border-slate-200 px-4 py-3">Bot responses, query routing</td>
                      <td className="border border-slate-200 px-4 py-3">Legitimate use</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-4 py-3">Technical / analytics data</td>
                      <td className="border border-slate-200 px-4 py-3">Website performance, security, ad serving</td>
                      <td className="border border-slate-200 px-4 py-3">Legitimate use</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-slate-600 text-sm mt-4">
                We never sell your personal data to third parties. We never use your data for automated
                decision-making that produces legal or similarly significant effects.
              </p>
            </section>

            {/* 3. Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Data Retention</h2>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li><strong>Calculator inputs &amp; results (signed out):</strong> Never stored — cleared immediately on session end</li>
                <li><strong>Calculator inputs &amp; results (signed in):</strong> Your most recent result for each calculator is saved to your account so it is waiting for you on your dashboard next time. Each new calculation replaces the previous one for that calculator. You can clear any of them from your dashboard at any time, and all of them are erased when you delete your account.</li>
                <li><strong>AIS / 26AS / Form 16 documents:</strong> Never stored. Your uploaded PDFs are processed in memory and discarded as soon as your report is produced — they are never written to disk or to our database.</li>
                <li><strong>AIS / 26AS / Form 16 report summary (signed in):</strong> We save only the outcome of your most recent check — the status, how many items need attention, and the short action list. This lets your dashboard remind you of what is still outstanding before you file. It is replaced each time you run a new check, and erased when you delete your account.</li>
                <li><strong>User accounts:</strong> Retained until you delete your account</li>
                <li><strong>Download leads:</strong> Retained for 90 days, then archived or deleted</li>
                <li><strong>CA profiles:</strong> Retained while active; deleted within 7 days of removal request</li>
                <li><strong>WhatsApp records:</strong> Retained for 90 days</li>
                <li><strong>Tax computation PDFs:</strong> Auto-deleted from our servers within 60 seconds of generation</li>
                <li><strong>Server access logs:</strong> Retained for 30 days for security monitoring</li>
              </ul>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-sm text-blue-900">
                <p className="font-semibold mb-1">The difference between your documents and your results</p>
                <p>
                  We keep the <strong>figures we calculated for you</strong>, so that your dashboard is useful when
                  you return. We do not keep the <strong>documents you uploaded</strong>. Your AIS, Form 26AS and
                  Form 16 files exist only for the few seconds it takes to read them, and are never saved.
                </p>
              </div>
            </section>

            {/* 4. Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Cookies &amp; Tracking Technologies</h2>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
                <p className="text-blue-800 font-medium">
                  We use cookies and similar technologies to enhance your experience and serve relevant
                  advertisements. You can manage your cookie preferences through our cookie consent banner.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Essential Cookies</h4>
                  <p className="text-slate-700 text-sm">Required for login sessions and site functionality. Cannot be disabled.</p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Analytics Cookies</h4>
                  <p className="text-slate-700 text-sm">Google Analytics (GA4) and Microsoft Clarity — help us understand how visitors use the site. Session recordings (Clarity) are anonymised.</p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Advertising Cookies</h4>
                  <p className="text-slate-700 text-sm">Google AdSense and Google Ads — serve personalised advertisements based on your browsing history. You can opt out using the links in Section 5.</p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Preference Cookies</h4>
                  <p className="text-slate-700 text-sm">Remember your cookie consent choice and display preferences.</p>
                </div>
              </div>
            </section>

            {/* 5. Third-Party Services */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Third-Party Services &amp; Advertising</h2>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
                <p className="text-yellow-800 font-medium">
                  <strong>Disclosure:</strong> Third-party vendors, including Google, use cookies to serve
                  ads on our site based on your prior visits to our website or other websites on the internet.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Google Analytics 4</h4>
                  <p className="text-slate-700 text-sm">Traffic, user behaviour, conversion tracking. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Google AdSense</h4>
                  <p className="text-slate-700 text-sm">Serves display ads. Uses advertising cookies linked to your Google account or browser history. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Google Ads (Performance Max)</h4>
                  <p className="text-slate-700 text-sm">Conversion tracking for paid campaigns. Tag: AW-17983211580.</p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Microsoft Clarity</h4>
                  <p className="text-slate-700 text-sm">Heatmaps and anonymised session recordings to improve UX. <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Firebase (Google)</h4>
                  <p className="text-slate-700 text-sm">Authentication, Firestore database, App Check. All data stored on Google Cloud servers. <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Brevo (Sendinblue)</h4>
                  <p className="text-slate-700 text-sm">Transactional email service — used to send you PDF calculations and account notifications. <a href="https://www.brevo.com/legal/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
                <div className="border-l-4 border-slate-300 pl-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Meta (WhatsApp Cloud API)</h4>
                  <p className="text-slate-700 text-sm">Powers our WhatsApp assistant. Messages are processed via Meta's Cloud API. <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-slate-900 mb-3">Opt Out of Personalised Advertising</h3>
              <div className="bg-slate-50 rounded-lg p-6">
                <ul className="space-y-2">
                  <li>
                    <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium" data-testid="link-google-ads-settings">
                      → Google Ads Settings
                    </a>
                  </li>
                  <li>
                    <a href="http://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium" data-testid="link-aboutads">
                      → Network Advertising Initiative Opt-Out
                    </a>
                  </li>
                  <li>
                    <a href="http://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium" data-testid="link-youronlinechoices">
                      → Your Online Choices (EU users)
                    </a>
                  </li>
                </ul>
                <p className="text-slate-500 text-sm mt-4">
                  Opting out means ads won't be personalised — you will still see ads.
                </p>
              </div>
            </section>

            {/* 6. Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Data Security</h2>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>All data transmission uses HTTPS / TLS encryption</li>
                <li>Calculator inputs are never transmitted to our servers</li>
                <li>User accounts are protected by Firebase Authentication with secure session management</li>
                <li>Firebase App Check validates all requests to prevent unauthorised database access</li>
                <li>Firestore Security Rules restrict each user to their own data only</li>
                <li>Tax computation PDFs are auto-deleted from our servers within 60 seconds of generation</li>
                <li>API endpoints are rate-limited to prevent abuse and denial-of-service attacks</li>
                <li>All dependencies are regularly audited for known vulnerabilities (npm audit)</li>
              </ul>
              <p className="text-slate-600 text-sm">
                While we take reasonable security measures, no internet transmission is 100% secure. In the
                event of a data breach affecting your personal data, we will notify you and the Data Protection
                Board of India within 72 hours as required under DPDPA 2023.
              </p>
            </section>

            {/* 7. DPDPA Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Your Rights Under DPDPA 2023</h2>
              <p className="text-slate-700 mb-4">
                As a Data Principal under India's Digital Personal Data Protection Act, 2023, you have the
                following rights with respect to your personal data held by AiTaxBot:
              </p>
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Right to Access</h4>
                  <p className="text-slate-700 text-sm">Request a summary of the personal data we hold about you and how it is being processed.</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Right to Correction &amp; Erasure</h4>
                  <p className="text-slate-700 text-sm">Request correction of inaccurate data or deletion of your personal data. Account users can delete their account from the Profile page. Others may email us.</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Right to Withdraw Consent</h4>
                  <p className="text-slate-700 text-sm">Withdraw consent for data processing at any time by deleting your account or emailing us. Withdrawal does not affect the lawfulness of processing before withdrawal.</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Right to Grievance Redressal</h4>
                  <p className="text-slate-700 text-sm">Raise a grievance with our Grievance Officer (contact details below). We will respond within 48 hours and resolve within 30 days.</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-1">Right to Nominate</h4>
                  <p className="text-slate-700 text-sm">Nominate another person to exercise your rights in the event of your death or incapacity, as provided under DPDPA 2023.</p>
                </div>
              </div>
            </section>

            {/* 8. Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Children's Privacy</h2>
              <p className="text-slate-700">
                Our services are not directed at individuals under 18 years of age. We do not knowingly
                collect personal data from minors. If you believe a child has provided us with personal data,
                please contact us immediately and we will delete it within 7 days.
              </p>
            </section>

            {/* 9. International Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. International Data Transfers</h2>
              <p className="text-slate-700">
                Your data is stored on Google Firebase infrastructure, which may process data outside India.
                Google Cloud and Firebase comply with applicable data protection standards. By creating an
                account or submitting a download request, you consent to such transfer. Under DPDPA 2023,
                cross-border transfer is permitted to any country except ones the Central Government
                specifically restricts by notification — as of this policy's last update, no such
                restricted-country list has been notified. We will update this section immediately if that
                changes.
              </p>
            </section>

            {/* 10. Third-Party Links */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Third-Party Links</h2>
              <p className="text-slate-700">
                Our website links to third-party sites (tax authority portals, ICAI, news sources). We are
                not responsible for the privacy practices of those websites. Please read their privacy
                policies before sharing any information with them.
              </p>
            </section>

            {/* 11. Updates */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Updates to This Policy</h2>
              <p className="text-slate-700">
                We may update this Privacy Policy periodically to reflect changes in our services, legal
                requirements, or data practices. Material changes will be communicated via a notice on our
                website at least 7 days before they take effect. The "Last Updated" date at the top of this
                page will always reflect the most recent version.
              </p>
            </section>

            {/* 12. Contact / Grievance Officer */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Contact &amp; Grievance Officer</h2>
              <p className="text-slate-700 mb-4">
                For privacy queries, data requests, or grievances under DPDPA 2023, contact our Grievance Officer:
              </p>
              <div className="bg-slate-50 rounded-lg p-6">
                <p className="text-slate-800 font-semibold mb-1">Pragati Jyotishi — Grievance Officer, AiTaxBot</p>
                <p className="text-slate-700 mb-1">
                  📧 Email:{" "}
                  <a href="mailto:admin@aitaxbot.co.in" className="text-blue-600 hover:underline" data-testid="link-contact-email">
                    admin@aitaxbot.co.in
                  </a>
                </p>
                <p className="text-slate-700 mb-1">
                  🌐 Website:{" "}
                  <a href="https://www.aitaxbot.co.in" className="text-blue-600 hover:underline" data-testid="link-website">
                    www.aitaxbot.co.in
                  </a>
                </p>
                <p className="text-slate-600 text-sm mt-4">
                  We acknowledge grievances within 48 hours and resolve them within 30 days. If unsatisfied,
                  you may approach the Data Protection Board of India, constituted 14 November 2025 under DPDPA 2023.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-200 pt-8 mt-12">
              <p className="text-sm text-slate-600 italic">
                By using AiTaxBot, you acknowledge that you have read and understood this Privacy Policy
                and agree to our data practices as described herein. This policy is governed by the laws of India.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

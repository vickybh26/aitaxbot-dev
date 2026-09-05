import { useEffect } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import PageHeader from "@/components/PageHeader";
import { trackPageView } from "@/lib/analytics";

export default function TermsOfService() {
  useEffect(() => {
    trackPageView('/terms-of-service', 'Terms of Service & Disclaimer - AiTaxBot');
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms of Service & Disclaimer - AiTaxBot</title>
        <meta name="description" content="AiTaxBot Terms of Service and Disclaimer. Read our usage guidelines, financial disclaimer, CA directory terms, and legal agreement before using our free tax tools." />
        <meta name="keywords" content="terms of service, disclaimer, aitaxbot terms, tax calculator disclaimer, legal" />
        <link rel="canonical" href="https://www.aitaxbot.co.in/terms-of-service" />
        <meta property="og:image" content="https://www.aitaxbot.co.in/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageHeader
        title="Terms of Service & Disclaimer"
        subtitle="Please read these terms carefully before using AiTaxBot. Governing law: India."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Terms of Service" }
        ]}
        badge="Last Updated: June 20, 2026"
      />
      <div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="prose prose-lg max-w-none">

            {/* Financial Disclaimer — prominent at top */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6 mb-10">
              <h2 className="text-xl font-bold text-yellow-900 mb-3">⚠️ Important Financial Disclaimer</h2>
              <p className="text-yellow-800 mb-3">
                AiTaxBot provides tax calculators, financial tools, and educational content for
                <strong> informational and educational purposes only.</strong>
              </p>
              <ul className="list-disc pl-5 text-yellow-800 space-y-1 text-sm">
                <li>Results from our calculators do <strong>not</strong> constitute professional tax, legal, or financial advice.</li>
                <li>AiTaxBot is <strong>not a registered tax consultant, investment adviser, or financial planner</strong> under any Indian regulation.</li>
                <li>Tax laws change frequently. Always verify figures against the latest CBDT notifications and Income Tax Act provisions.</li>
                <li>Always consult a qualified Chartered Accountant or tax professional before filing your ITR or making financial decisions.</li>
                <li>AiTaxBot is not liable for errors, omissions, or any financial loss arising from use of this platform.</li>
              </ul>
            </div>

            {/* 1. Acceptance */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">1. Acceptance of Terms</h2>
              <p className="text-ink/80 mb-4">
                By accessing or using AiTaxBot (aitaxbot.co.in / www.aitaxbot.co.in), you agree to be bound
                by these Terms of Service and our <Link href="/privacy-policy" className="text-credit hover:underline">Privacy Policy</Link>.
                If you do not agree, please do not use this platform.
              </p>
              <p className="text-ink/80">
                These terms apply to all visitors, registered users, Chartered Accountants listed in our
                directory, and any other person who accesses the platform in any capacity.
              </p>
            </section>

            {/* 2. Services */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">2. Description of Services</h2>
              <p className="text-ink/80 mb-4">
                AiTaxBot provides the following free services:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li>Income Tax Calculator (Old &amp; New Regime, AY 2026-27)</li>
                <li>Trading Tax Calculator (equity, F&amp;O, crypto, US stocks)</li>
                <li>HRA, SIP, SWP, NPS, PF, Home Loan, and Vehicle Loan calculators</li>
                <li>Rent Receipt Generator (PDF + email delivery)</li>
                <li>NRI Corner (DTAA, NRO/NRE, Repatriation)</li>
                <li>Tax blog and educational articles</li>
                <li>CA Directory — free listing and enquiry service</li>
                <li>WhatsApp tax assistant</li>
                <li>User accounts with saved calculation history</li>
              </ul>
              <p className="text-ink/80">
                All services are provided free of charge to end users. AiTaxBot reserves the right to
                add, modify, or discontinue any service at any time without prior notice.
              </p>
            </section>

            {/* 3. Financial & Tax Disclaimer (detailed) */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">3. Financial &amp; Tax Disclaimer</h2>

              <h3 className="text-xl font-medium text-ink mb-3">3.1 No Professional Advice</h3>
              <p className="text-ink/80 mb-4">
                All content on AiTaxBot — including calculator outputs, blog articles, FAQs, and WhatsApp
                responses — is provided for general informational and educational purposes only. Nothing on
                this platform constitutes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li>Tax advice within the meaning of any professional or regulatory framework</li>
                <li>Legal advice or legal opinion</li>
                <li>Investment advice or a recommendation to buy or sell any financial instrument</li>
                <li>Accounting services or audit opinion</li>
              </ul>

              <h3 className="text-xl font-medium text-ink mb-3">3.2 Calculator Accuracy</h3>
              <p className="text-ink/80 mb-4">
                Our calculators are built to reflect the Income Tax Act 2025, IT Rules 2026, and applicable
                Finance Act provisions as understood at the time of development. However:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li>Tax laws are subject to amendment, CBDT circulars, and court decisions that may not be immediately reflected on this platform</li>
                <li>Individual tax situations may involve facts, exemptions, or deductions not captured by a general calculator</li>
                <li>Calculations are estimates only — actual tax liability must be verified with official ITR e-filing tools or a qualified CA</li>
              </ul>

              <h3 className="text-xl font-medium text-ink mb-3">3.3 Limitation of Liability</h3>
              <p className="text-ink/80 mb-4">
                To the fullest extent permitted under Indian law, AiTaxBot, its founder, employees, and
                agents shall not be liable for:
              </p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li>Any errors, inaccuracies, or omissions in calculator results or editorial content</li>
                <li>Any financial loss, tax penalty, interest, or demand arising from reliance on this platform</li>
                <li>Interruptions, downtime, or data loss</li>
                <li>Actions, advice, or services provided by CAs listed in our directory</li>
                <li>Any indirect, incidental, consequential, or punitive damages</li>
              </ul>
              <p className="text-ink/80">
                Your sole remedy for dissatisfaction with the platform is to discontinue use.
              </p>
            </section>

            {/* 4. CA Directory Disclaimer */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">4. CA Directory — Terms &amp; Disclaimer</h2>

              <div className="bg-teal-50 border-l-4 border-teal-400 p-6 mb-6">
                <p className="text-teal-800 font-medium">
                  AiTaxBot operates a free directory of Chartered Accountants. We are a neutral listing
                  platform — we do not recommend, endorse, rank, or verify the quality of any CA's services.
                </p>
              </div>

              <h3 className="text-xl font-medium text-ink mb-3">4.1 For Users Searching for a CA</h3>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li>CA profiles are displayed in alphabetical order — no ranking or recommendation is implied</li>
                <li>AiTaxBot does not verify the current standing, disciplinary record, or competence of any listed CA</li>
                <li>Always verify a CA's ICAI membership number at <a href="https://www.icai.org" target="_blank" rel="noopener noreferrer" className="text-credit hover:underline">icai.org</a> before engaging their services</li>
                <li>AiTaxBot is not a party to any engagement between a user and a CA — all engagements are private contractual arrangements</li>
                <li>AiTaxBot charges no fee to users for this service and earns no commission or referral fee from CAs</li>
                <li>AiTaxBot is not liable for any dispute, loss, or harm arising from your engagement with a listed CA</li>
              </ul>

              <h3 className="text-xl font-medium text-ink mb-3">4.2 For CAs Registering a Profile</h3>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li>By registering, you confirm that you are a member in good standing of ICAI and that all information provided is accurate</li>
                <li>You grant AiTaxBot a non-exclusive, royalty-free licence to display your profile publicly on the platform</li>
                <li>AiTaxBot reserves the right to remove any profile that contains false information, violates professional conduct rules, or generates user complaints</li>
                <li>Profile listing is free and carries no exclusivity or priority placement</li>
                <li>You may request removal of your profile at any time by emailing <a href="mailto:admin@aitaxbot.co.in" className="text-credit hover:underline">admin@aitaxbot.co.in</a></li>
              </ul>
            </section>

            {/* 5. User Accounts */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">5. User Accounts</h2>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>Account creation is optional. You must provide accurate registration information.</li>
                <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You may delete your account at any time from the Profile page. Deletion is permanent and removes all saved calculations.</li>
                <li>AiTaxBot reserves the right to suspend or terminate accounts that violate these terms.</li>
              </ul>
            </section>

            {/* 6. User Responsibilities */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">6. Acceptable Use</h2>

              <h3 className="text-xl font-medium text-ink mb-3">You agree to:</h3>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li>Use AiTaxBot for lawful personal or professional purposes only</li>
                <li>Provide accurate inputs into calculators and forms</li>
                <li>Respect the intellectual property rights of AiTaxBot and third parties</li>
              </ul>

              <h3 className="text-xl font-medium text-ink mb-3">You agree not to:</h3>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li>Attempt to reverse engineer, decompile, or hack any part of the platform</li>
                <li>Upload malicious files, viruses, or harmful code</li>
                <li>Use automated scripts or bots to access the platform excessively</li>
                <li>Scrape, reproduce, or redistribute our content without written permission</li>
                <li>Misrepresent your identity or professional credentials</li>
                <li>Use the platform to facilitate tax evasion, fraud, or any illegal activity</li>
              </ul>
            </section>

            {/* 7. Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">7. Privacy &amp; Data Protection</h2>
              <p className="text-ink/80 mb-4">
                Our data practices are governed by India's Digital Personal Data Protection Act, 2023.
                Please read our full <Link href="/privacy-policy" className="text-credit hover:underline">Privacy Policy</Link> for
                details on what we collect, how we use it, and your rights as a Data Principal.
              </p>
              <p className="text-ink/80">
                Key points: calculations run in your browser and nothing is saved unless you are signed in;
                account data and saved results are stored in Firebase; figures are sent to our AI provider
                only when you use an AI-assisted feature; you may request deletion of your data at any time.
              </p>
            </section>

            {/* 8. Third-Party Services */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">8. Third-Party Services</h2>
              <p className="text-ink/80 mb-4">AiTaxBot integrates with third-party services including:</p>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-1">
                <li><strong>Google Firebase</strong> — authentication and database</li>
                <li><strong>Google Analytics &amp; Microsoft Clarity</strong> — usage analytics</li>
                <li><strong>Google AdSense &amp; Google Ads</strong> — advertising</li>
                <li><strong>Brevo</strong> — transactional email delivery</li>
                <li><strong>Meta WhatsApp Cloud API</strong> — WhatsApp assistant</li>
              </ul>
              <p className="text-ink/80">
                These services operate under their own terms and privacy policies. AiTaxBot is not
                responsible for their actions or data practices.
              </p>
            </section>

            {/* 9. Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">9. Intellectual Property</h2>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>All content on AiTaxBot — including calculator logic, blog articles, UI design, and branding — is the proprietary property of AiTaxBot.</li>
                <li>You may use our platform for personal, non-commercial purposes.</li>
                <li>Reproduction, redistribution, or commercial use of our content requires prior written permission.</li>
                <li>The AiTaxBot name and logo are trademarks of AiTaxBot. Unauthorised use is prohibited.</li>
              </ul>
            </section>

            {/* 10. Service Availability */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">10. Service Availability</h2>
              <ul className="list-disc pl-6 mb-4 text-ink/80 space-y-2">
                <li>We strive to maintain high availability but do not guarantee uninterrupted access</li>
                <li>Planned maintenance may cause temporary downtime</li>
                <li>AiTaxBot is not liable for losses arising from service unavailability</li>
                <li>We reserve the right to modify, suspend, or discontinue any feature or the entire platform at any time</li>
              </ul>
            </section>

            {/* 11. Modifications */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">11. Modifications to Terms</h2>
              <p className="text-ink/80">
                We may update these Terms at any time. Material changes will be notified via a banner on
                the website at least 7 days before they take effect. Continued use of the platform after
                the effective date constitutes acceptance of the revised terms.
              </p>
            </section>

            {/* 12. Governing Law */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">12. Governing Law &amp; Jurisdiction</h2>
              <p className="text-ink/80">
                These Terms are governed by and construed in accordance with the laws of India. Any dispute
                arising out of or relating to these Terms or your use of the platform shall be subject to
                the exclusive jurisdiction of courts in India. You agree to attempt informal resolution by
                contacting us before initiating any legal proceeding.
              </p>
            </section>

            {/* 13. Contact */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-ink mb-4">13. Contact</h2>
              <div className="bg-secondary rounded-lg p-6">
                <p className="text-ink font-semibold mb-2">AiTaxBot</p>
                <p className="text-ink/80 mb-1">
                  📧 <a href="mailto:admin@aitaxbot.co.in" className="text-credit hover:underline">admin@aitaxbot.co.in</a>
                </p>
                <p className="text-ink/80 mb-1">
                  🌐 <a href="https://www.aitaxbot.co.in" className="text-credit hover:underline">www.aitaxbot.co.in</a>
                </p>
                <p className="text-ink/55 text-sm mt-3">We respond to queries within 48 hours on business days.</p>
              </div>
            </section>

            <div className="border-t border-rule pt-8 mt-12">
              <p className="text-sm text-ink/65 italic">
                By using AiTaxBot, you confirm that you have read, understood, and agreed to these Terms
                of Service and Disclaimer. These terms were last updated on June 20, 2026.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

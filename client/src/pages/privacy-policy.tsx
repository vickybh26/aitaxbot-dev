import { useEffect } from "react";
import { PrivacyPolicyContent } from '@shared/legalContent';
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
        <meta name="description" content="AiTaxBot Privacy Policy — how calculator figures, account information and uploaded tax documents are collected, processed and shared, including AI processing and your privacy choices." />
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
        badge="Last Updated: October 2, 2026"
      />
      <div>
        <div className="max-w-4xl mx-auto px-6 py-8">
<PrivacyPolicyContent />
        </div>
      </div>
    </>
  );
}

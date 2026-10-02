import { useEffect } from "react";
import { TermsOfServiceContent } from '@shared/legalContent';
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
<TermsOfServiceContent />
        </div>
      </div>
    </>
  );
}

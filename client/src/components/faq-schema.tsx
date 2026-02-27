import React from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const safeJson = JSON.stringify(schemaData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}

// Common tax FAQ data
export const taxFAQs: FAQItem[] = [
  {
    question: "Which tax regime is better - old or new?",
    answer: "The choice depends on your income level and deductions. New regime offers lower tax rates but fewer deductions. Old regime allows more deductions but has higher rates. Use our AI tax calculator to compare both regimes for your specific situation."
  },
  {
    question: "What is the standard deduction for FY 2025-26 (AY 2026-27)?",
    answer: "The standard deduction for salaried individuals is ₹75,000 under the New Tax Regime and ₹50,000 under the Old Tax Regime for FY 2025-26 (AY 2026-27) and Tax Year 2026-27 (IT Act 2025) onwards. This deduction is automatically applied to reduce your taxable income."
  },
  {
    question: "Can I switch between tax regimes every year?",
    answer: "Yes, salaried individuals and pensioners can choose between old and new tax regime every financial year. However, if you have business income, you can switch only once during your lifetime."
  },
  {
    question: "What is Section 87A / Section 156 rebate?",
    answer: "Section 87A (now Section 156 under Income Tax Act, 2025) provides tax rebate for lower income groups. Under the New Regime (Section 202), complete tax exemption up to ₹12 lakh with rebate of ₹60,000. Under the Old Regime, rebate up to ₹12,500 for income up to ₹5 lakh."
  },
  {
    question: "How accurate is the AiTaxBot tax calculator?",
    answer: "Our AI tax calculator uses official government tax slabs and rates for FY 2025-26 (AY 2026-27). It includes all applicable deductions, rebates, and cess calculations. The results are verified by certified tax experts for maximum accuracy."
  },
  {
    question: "What documents do I need for tax calculation?",
    answer: "You need your salary certificate/Form 16, investment proofs (80C, 80D, etc.), house rent receipts, and details of other income sources. Our calculator guides you through each step to ensure accurate computation."
  }
];

export default FAQSchema;
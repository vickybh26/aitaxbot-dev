// Structured Data (JSON-LD) utilities for SEO

export interface CalculatorSchemaProps {
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateCalculatorSchema(props: CalculatorSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": props.name,
    "description": props.description,
    "url": props.url,
    "applicationCategory": props.applicationCategory,
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    },
    "creator": {
      "@type": "Organization",
      "name": "AiTaxBot",
      "url": "https://www.aitaxbot.co.in"
    }
  };
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.aitaxbot.co.in/#organization",
    "name": "AiTaxBot",
    "url": "https://www.aitaxbot.co.in",
    "logo": "https://www.aitaxbot.co.in/images/aitaxbot-logo.png",
    "description": "India's premier AI-powered Income Tax filing platform offering tax calculators, investment tools, and crypto tax compliance.",
    "sameAs": [
      "https://twitter.com/aitaxbot"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "info@aitaxbot.in",
      "contactType": "Customer Service"
    }
  };
}

export function generateWebPageSchema(props: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": props.name,
    "description": props.description,
    "url": props.url,
    "publisher": {
      "@type": "Organization",
      "name": "AiTaxBot"
    }
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://www.aitaxbot.co.in/#website",
    "name": "AiTaxBot",
    "url": "https://www.aitaxbot.co.in",
    "description": "AI-powered Income Tax Calculator and Financial Tools Platform for India",
    "publisher": {
      "@id": "https://www.aitaxbot.co.in/#organization"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.aitaxbot.co.in/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
}

export function generateHomePageSchema() {
  return [
    generateOrganizationSchema(),
    generateWebSiteSchema()
  ];
}

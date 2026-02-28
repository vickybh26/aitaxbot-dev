import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: string;
  keywords?: string;
  noIndex?: boolean;
}

const BASE_URL = "https://aitaxbot.co.in";

export function SEOHead({
  title,
  description,
  canonicalPath,
  ogImage = "/apple-touch-icon.png",
  ogType = "website",
  keywords,
  noIndex = false,
}: SEOHeadProps) {
  const canonicalUrl = `${BASE_URL}${canonicalPath === "/" ? "" : canonicalPath}`;
  const fullTitle = title.includes("AiTaxBot") ? title : `${title} | AiTaxBot`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {keywords && <meta name="keywords" content={keywords} />}
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`} />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`} />
    </Helmet>
  );
}

export default SEOHead;

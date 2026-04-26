import React, { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { trackPageView } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  ArrowLeft,
  ChevronRight,
  Share2,
  UserCheck,
  ShieldCheck
} from "lucide-react";
import { getBlogPost } from "@/data/blogPosts";
import { ResponsiveAd, RectangleAd } from "@/components/AdBanner";

export default function BlogPost() {
  const [match, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  const post = getBlogPost(slug);

  useEffect(() => {
    if (post) {
      trackPageView(`/blog/${slug}`, `${post.metaTitle} - AiTaxBot Blog`);
    }
  }, [slug, post]);

  if (!match || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
          <Link href="/blog">
            <Button data-testid="button-back-to-blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.metaTitle,
        text: post.metaDescription,
        url: window.location.href,
      });
    }
  };

  // Inline formatter: handles **bold**, *italic*, `code`
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
            return <em key={i}>{part.slice(1, -1)}</em>;
          if (part.startsWith('`') && part.endsWith('`'))
            return <code key={i} className="bg-gray-100 rounded px-1 font-mono text-sm">{part.slice(1, -1)}</code>;
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  // Table renderer: converts markdown table lines into a styled <table>
  const renderTable = (tableLines: string[], keyBase: number) => {
    const parseRow = (line: string) =>
      line.split('|').slice(1, -1).map(c => c.trim());
    const headers = parseRow(tableLines[0]);
    // tableLines[1] is the |---|---| separator — skip it
    const rows = tableLines.slice(2).map(parseRow);
    return (
      <div key={`tbl-${keyBase}`} className="overflow-x-auto my-6 rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-700 text-white">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold border-r border-blue-600 last:border-r-0 whitespace-nowrap">
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={`border-b border-gray-100 last:border-b-0 transition-colors hover:bg-blue-50 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 text-gray-700 border-r border-gray-100 last:border-r-0">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Block-level markdown renderer: tables, lists, headings, paragraphs
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const trimmed = lines[i].trim();

      // Empty line — skip (sections provide their own spacing)
      if (!trimmed) { i++; continue; }

      // Sub-sub heading: ### Foo
      if (trimmed.startsWith('### ')) {
        nodes.push(
          <h4 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3">
            {renderInline(trimmed.slice(4))}
          </h4>
        );
        i++; continue;
      }

      // Sub heading: ## Foo
      if (trimmed.startsWith('## ')) {
        nodes.push(
          <h3 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            {renderInline(trimmed.slice(3))}
          </h3>
        );
        i++; continue;
      }

      // Horizontal rule
      if (trimmed === '---') {
        nodes.push(<hr key={i} className="border-gray-200 my-6" />);
        i++; continue;
      }

      // Markdown table block — collect all consecutive | lines
      if (trimmed.startsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        nodes.push(renderTable(tableLines, i));
        continue;
      }

      // Unordered list: lines starting with "- " or "* "
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items: string[] = [];
        while (i < lines.length) {
          const t = lines[i].trim();
          if (t.startsWith('- ') || t.startsWith('* ')) { items.push(t.slice(2)); i++; }
          else break;
        }
        nodes.push(
          <ul key={`ul-${i}`} className="list-disc pl-6 space-y-1 mb-4 text-gray-700">
            {items.map((item, idx) => <li key={idx}>{renderInline(item)}</li>)}
          </ul>
        );
        continue;
      }

      // Ordered list: lines starting with "1. " "2. " etc.
      if (/^\d+\.\s/.test(trimmed)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
          i++;
        }
        nodes.push(
          <ol key={`ol-${i}`} className="list-decimal pl-6 space-y-1 mb-4 text-gray-700">
            {items.map((item, idx) => <li key={idx}>{renderInline(item)}</li>)}
          </ol>
        );
        continue;
      }

      // Checkmark / emoji list: lines starting with ✅ or ✔
      if (trimmed.startsWith('✅') || trimmed.startsWith('✔')) {
        const items: string[] = [];
        while (i < lines.length) {
          const t = lines[i].trim();
          if (t.startsWith('✅') || t.startsWith('✔')) { items.push(t); i++; }
          else break;
        }
        nodes.push(
          <ul key={`chk-${i}`} className="space-y-2 mb-4">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Regular paragraph
      nodes.push(
        <p key={i} className="mb-3 leading-relaxed text-gray-700">
          {renderInline(trimmed)}
        </p>
      );
      i++;
    }

    return <>{nodes}</>;
  };

  return (
    <>
      <Helmet>
        <title>{post.metaTitle}</title>
        <meta name="description" content={post.metaDescription} />
        <meta name="keywords" content={post.keywords.join(', ')} />
        
        <meta property="og:title" content={post.ogTitle} />
        <meta property="og:description" content={post.ogDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://aitaxbot.co.in/blog/${post.slug}`} />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.ogTitle} />
        <meta name="twitter:description" content={post.ogDescription} />
        
        <link rel="canonical" href={`https://aitaxbot.co.in/blog/${post.slug}`} />
        
        <script type="application/ld+json">
          {JSON.stringify(post.schema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/blog" className="hover:text-blue-600">Blog</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900">{post.tags[0]}</span>
            </div>
          </div>
        </div>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map(tag => (
                <Badge key={tag} variant="secondary" data-testid={`tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}>
                  {tag}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" data-testid="post-title">
              {post.metaTitle}
            </h1>
            
            <div className="flex items-center gap-6 text-gray-600 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{post.publishedAt || "October 21, 2025"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{post.readingTimeMinutes} min read</span>
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                data-testid="button-share"
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Author byline — E-E-A-T signal */}
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Written by AiTaxBot Editorial Team
                </p>
                <p className="text-xs text-gray-500">
                  Reviewed by a Chartered Accountant · Updated {post.publishedAt || "2025"} · All tax figures follow CBDT guidelines for FY 2026-27
                </p>
              </div>
            </div>

            {post.disclaimer && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8" data-testid="disclaimer">
                <p className="text-sm text-yellow-800">
                  <strong>Disclaimer:</strong> {post.disclaimer}
                </p>
              </div>
            )}
          </div>

          {/* Hero Image */}
          {post.heroImage && (
            <div className="mb-12 rounded-xl overflow-hidden shadow-lg" data-testid="hero-image">
              <img
                src={post.heroImage}
                alt={post.metaTitle}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Article Content */}
          <div className="prose prose-lg max-w-none">
            {post.bodySections.map((section, index) => {
              // Render each section
              let sectionContent = null;

              if (section.type === 'intro' || section.type === 'outro') {
                sectionContent = (
                  <div key={index} className="mb-8 text-lg leading-relaxed text-gray-700">
                    {section.content_md && renderMarkdown(section.content_md)}
                  </div>
                );
              }

              if (section.type === 'h2') {
                sectionContent = (
                  <div key={index} className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4 mt-12" data-testid={`heading-${index}`}>
                      {section.title}
                    </h2>
                    {section.content_md && (
                      <div className="text-gray-700 leading-relaxed">
                        {renderMarkdown(section.content_md)}
                      </div>
                    )}
                  </div>
                );
              }

              if (section.type === 'h3') {
                sectionContent = (
                  <div key={index} className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-8" data-testid={`subheading-${index}`}>
                      {section.title}
                    </h3>
                    {section.content_md && (
                      <div className="text-gray-700 leading-relaxed">
                        {renderMarkdown(section.content_md)}
                      </div>
                    )}
                  </div>
                );
              }

              if (section.type === 'faq') {
                sectionContent = (
                  <Card key={index} className="p-6 mb-8 bg-blue-50 border-blue-200" data-testid="faq-section">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
                    <div className="space-y-4">
                      {section.items?.map((faq, faqIdx) => (
                        <div key={faqIdx} className="border-b border-blue-200 last:border-b-0 pb-4 last:pb-0">
                          <p className="font-semibold text-gray-900 mb-2" data-testid={`faq-question-${faqIdx}`}>
                            Q: {faq.q}
                          </p>
                          <p className="text-gray-700" data-testid={`faq-answer-${faqIdx}`}>
                            A: {faq.a}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              }

              if (section.type === 'cta') {
                sectionContent = (
                  <Card key={index} className="p-8 mb-8 bg-gradient-to-r from-blue-600 to-green-600 text-white" data-testid="cta-section">
                    <div className="mb-6 text-white">
                      {section.content_md && renderMarkdown(section.content_md)}
                    </div>
                    {section.internal_links && section.internal_links.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {section.internal_links.map((link, linkIdx) => (
                          <Link key={linkIdx} href={link.href}>
                            <Button
                              variant="secondary"
                              className="bg-white text-blue-600 hover:bg-gray-100"
                              data-testid={`cta-link-${linkIdx}`}
                            >
                              {link.label}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              }

              // Add ads at strategic positions
              if (index === 1) {
                // Add ad after first section (intro)
                return (
                  <div key={`section-ad-${index}`}>
                    {sectionContent}
                    <div className="my-8 flex justify-center">
                      <ResponsiveAd />
                    </div>
                  </div>
                );
              }

              if (index === Math.floor(post.bodySections.length / 2) && post.bodySections.length > 5) {
                // Add ad in the middle of long articles
                return (
                  <div key={`section-ad-mid-${index}`}>
                    {sectionContent}
                    <div className="my-8 flex justify-center">
                      <RectangleAd />
                    </div>
                  </div>
                );
              }

              return sectionContent;
            })}
          </div>

          {/* Ad before Back to Blog */}
          <div className="mt-12 mb-8 flex justify-center">
            <ResponsiveAd />
          </div>

          {/* Editorial Disclaimer — AdSense / E-E-A-T requirement */}
          <div className="mt-12 bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  Editorial Disclaimer
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  This article is intended for general informational purposes only and does not constitute professional tax, legal, or financial advice. Tax laws and rates may change — always verify figures with the latest CBDT notifications or consult a qualified Chartered Accountant before making tax or investment decisions. AiTaxBot does not accept liability for decisions made based on this content.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Last reviewed by AiTaxBot Editorial Team · {post.publishedAt || "2025"} · Figures based on Income Tax Act, 1961 &amp; Union Budget 2025 provisions.
                </p>
              </div>
            </div>
          </div>

          {/* Related Posts */}
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <div className="mt-12 pt-8 border-t" data-testid="related-posts">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Related Articles</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {post.relatedPosts.map((related) => (
                  <Link key={related.slug} href={`/blog/${related.slug}`}>
                    <div className="group flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                      <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 leading-snug">
                        {related.title}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog */}
          <div className="mt-8 pt-6 border-t">
            <Link href="/blog">
              <Button variant="outline" data-testid="button-back-to-blog-bottom">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Articles
              </Button>
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}

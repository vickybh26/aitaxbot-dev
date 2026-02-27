import { useEffect } from "react";
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
  Share2
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

  const renderMarkdown = (content: string) => {
    return content.split('\n').map((line, idx) => {
      line = line.trim();
      if (!line) return <br key={idx} />;
      
      if (line.startsWith('**') && line.endsWith('**')) {
        const text = line.replace(/\*\*/g, '');
        return <p key={idx} className="font-bold mb-2">{text}</p>;
      }
      
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const rendered = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>;
        }
        return part;
      });
      
      return <p key={idx} className="mb-2 leading-relaxed">{rendered}</p>;
    });
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
        <meta property="og:url" content={`https://aitaxbot.in/blog/${post.slug}`} />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.ogTitle} />
        <meta name="twitter:description" content={post.ogDescription} />
        
        <link rel="canonical" href={`https://aitaxbot.in/blog/${post.slug}`} />
        
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
            
            <div className="flex items-center gap-6 text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>October 21, 2025</span>
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

          {/* Back to Blog */}
          <div className="mt-12 pt-8 border-t">
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

import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { trackPageView } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, TrendingUp, FileText, Calculator } from "lucide-react";
import { blogPosts, getBlogPostExcerpt } from "@/data/blogPosts";

interface BlogListItem {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
}

const blogListItems: BlogListItem[] = blogPosts.map(post => {
  const introSection = post.bodySections.find(section => section.type === 'intro');
  const excerpt = introSection?.content_md 
    ? getBlogPostExcerpt(introSection.content_md, 150)
    : post.metaDescription;

  return {
    slug: post.slug,
    title: post.metaTitle,
    excerpt,
    category: post.tags[0] || 'General',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    readTime: `${post.readingTimeMinutes} min read`
  };
});

const categories = ["All", ...Array.from(new Set(blogPosts.flatMap(p => p.tags)))];

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    trackPageView('/blog', 'Blog - AiTaxBot');
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Tax Updates":
        return <TrendingUp className="h-4 w-4" />;
      case "GST & Invoicing":
        return <FileText className="h-4 w-4" />;
      case "Crypto Tax":
      case "Investment":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Calculator className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Tax & Finance Blog - Investment Tips, Tax Updates</title>
        <meta name="description" content="Expert articles on Indian taxation, investments, SIP planning, crypto tax, GST filing, and financial strategies. Stay updated with latest tax news and money-saving tips." />
        <meta name="keywords" content="tax blog, investment articles, financial planning India, crypto tax, GST guide, SIP tips, tax saving strategies" />
        <link rel="canonical" href="https://aitaxbot.co.in/blog" />
        
        <meta property="og:title" content="AiTaxBot Blog - Tax & Investment Insights" />
        <meta property="og:description" content="Expert articles on taxation, investments, and financial planning for Indian taxpayers." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitaxbot.co.in/blog" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            AiTaxBot Blog
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl">
            Stay updated with the latest tax news, financial tips, and investment strategies
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 px-6 bg-white border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                  selectedCategory === category ? "bg-blue-600 text-white hover:bg-blue-700" : ""
                }`}
                data-testid={`filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Filter info */}
          <div className="mb-6">
            <p className="text-gray-600">
              {selectedCategory === "All" 
                ? `Showing all ${blogListItems.length} articles`
                : `Showing ${blogListItems.filter(post => post.category === selectedCategory).length} articles in ${selectedCategory}`
              }
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogListItems
              .filter(post => selectedCategory === "All" || post.category === selectedCategory)
              .map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card
                  className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group h-full"
                  data-testid={`blog-post-${post.slug}`}
                >
                  {/* Placeholder Image */}
                  <div className="h-48 bg-gradient-to-br from-blue-500 to-green-500 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {getCategoryIcon(post.category)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {post.category}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>

                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{post.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          
          {/* No results message */}
          {blogListItems.filter(post => selectedCategory === "All" || post.category === selectedCategory).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No articles found in this category.</p>
            </div>
          )}
        </div>
      </section>
    </div>
    </>
  );
}

import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { trackPageView } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, ArrowRight, Search, TrendingUp, FileText,
  Calculator, Landmark, Wallet, PiggyBank, BarChart2, BookOpen, X
} from "lucide-react";
import { blogPosts, getBlogPostExcerpt } from "@/data/blogPosts";

// ─── Date helper ─────────────────────────────────────────────────────────────
// Newest post is index (length-1). Space posts ~21 days apart going backwards.
const BASE_DATE = new Date("2026-03-05");
const DAYS_BETWEEN = 21;

function deriveDate(index: number, total: number, publishedAt?: string): string {
  if (publishedAt) return publishedAt;
  const daysAgo = (total - 1 - index) * DAYS_BETWEEN;
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isNew(dateStr: string): boolean {
  const d = new Date(dateStr);
  const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 45;
}

// ─── Category normalisation ───────────────────────────────────────────────────
type Category = "All" | "Tax Planning" | "Investing" | "Personal Finance" | "GST & Business" | "Retirement";

const TAG_TO_CATEGORY: Record<string, Category> = {
  // Tax
  "Tax Planning": "Tax Planning",
  "tax": "Tax Planning",
  "Tax Updates": "Tax Planning",
  "planning": "Tax Planning",
  "FY 2026-27": "Tax Planning",
  "80C": "Tax Planning",
  "HRA": "Tax Planning",
  "salary": "Tax Planning",
  "tax saving": "Tax Planning",
  "marginal relief": "Tax Planning",
  "surcharge": "Tax Planning",
  "high income": "Tax Planning",
  "CA tips": "Tax Planning",
  "Income Tax Act 2025": "Tax Planning",
  "Tax Year 2026-27": "Tax Planning",
  "capital gains": "Tax Planning",
  // Investing
  "Investing": "Investing",
  "Investing Basics": "Investing",
  "investment": "Investing",
  "mutual fund": "Investing",
  "stock market": "Investing",
  "2025": "Investing",
  "calculator": "Investing",
  // Personal Finance
  "Personal Finance": "Personal Finance",
  "personal finance": "Personal Finance",
  "hra": "Personal Finance",
  // GST & Business
  "gst": "GST & Business",
  "business": "GST & Business",
  "compliance": "GST & Business",
  "GST & Invoicing": "GST & Business",
  // Retirement
  "retirement": "Retirement",
  "financial planning": "Retirement",
};

function getCategory(tags: string[]): Category {
  for (const tag of tags) {
    const cat = TAG_TO_CATEGORY[tag];
    if (cat) return cat;
  }
  return "Investing";
}

const CATEGORIES: Category[] = ["All", "Tax Planning", "Investing", "Personal Finance", "GST & Business", "Retirement"];

// ─── Category styling ─────────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<Category, { banner: string; badge: string; icon: JSX.Element }> = {
  "All": {
    banner: "bg-gradient-to-br from-persian-blue-600 to-persian-blue-800",
    badge: "bg-persian-blue-50 text-persian-blue-700",
    icon: <BookOpen className="h-4 w-4" />,
  },
  "Tax Planning": {
    banner: "bg-gradient-to-br from-persian-blue-600 to-persian-blue-900",
    badge: "bg-persian-blue-50 text-persian-blue-700",
    icon: <Calculator className="h-4 w-4" />,
  },
  "Investing": {
    banner: "bg-gradient-to-br from-emerald-500 to-teal-700",
    badge: "bg-emerald-50 text-emerald-700",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  "Personal Finance": {
    banner: "bg-gradient-to-br from-orange-400 to-amber-600",
    badge: "bg-orange-50 text-orange-700",
    icon: <Wallet className="h-4 w-4" />,
  },
  "GST & Business": {
    banner: "bg-gradient-to-br from-teal-500 to-cyan-700",
    badge: "bg-teal-50 text-teal-700",
    icon: <Landmark className="h-4 w-4" />,
  },
  "Retirement": {
    banner: "bg-gradient-to-br from-violet-500 to-purple-700",
    badge: "bg-violet-50 text-violet-700",
    icon: <PiggyBank className="h-4 w-4" />,
  },
};

// ─── Build post list ──────────────────────────────────────────────────────────
const total = blogPosts.length;

const enrichedPosts = blogPosts.map((post, index) => {
  const introSection = post.bodySections.find(s => s.type === "intro");
  const excerpt = introSection?.content_md
    ? getBlogPostExcerpt(introSection.content_md, 140)
    : post.metaDescription.slice(0, 140);
  const date = deriveDate(index, total, post.publishedAt);
  const category = getCategory(post.tags);

  return {
    slug: post.slug,
    title: post.metaTitle.replace(/\s*[|—–-]\s*AiTaxBot.*$/i, "").trim(),
    excerpt,
    category,
    date,
    readTime: `${post.readingTimeMinutes} min read`,
    isNew: isNew(date),
    tags: post.tags,
  };
}).reverse(); // newest first

// Featured = first item (newest)
const featuredPost = enrichedPosts[0];
const restPosts = enrichedPosts.slice(1);

// ─── Component ───────────────────────────────────────────────────────────────
export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    trackPageView("/blog", "Blog - AiTaxBot");
  }, []);

  const filtered = useMemo(() => {
    let posts = restPosts;
    if (selectedCategory !== "All") {
      posts = posts.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return posts;
  }, [selectedCategory, searchQuery]);

  const featuredStyle = CATEGORY_STYLES[featuredPost.category];

  return (
    <>
      <Helmet>
        <title>Tax & Finance Blog — Expert Guides for Indian Taxpayers | AiTaxBot</title>
        <meta
          name="description"
          content="In-depth guides on Indian taxation, ITR filing, tax saving, capital gains, GST, SIP, and the new Income Tax Act 2025. CA-verified articles updated for FY 2026-27 & Tax Year 2026-27."
        />
        <meta name="keywords" content="income tax blog India, tax saving tips, IT act 2025, capital gains tax, GST guide, SIP calculator, AiTaxBot blog" />
        <link rel="canonical" href="https://aitaxbot.co.in/blog" />
        <meta property="og:title" content="AiTaxBot Blog — Tax & Finance Insights for India" />
        <meta property="og:description" content="CA-verified guides on income tax, investments, GST, and the new Income Tax Act 2025. Trusted by Indian taxpayers." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitaxbot.co.in/blog" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
      </Helmet>

      <div className="min-h-screen bg-slate-50">

        {/* ── Hero / Page Header ─────────────────────────────────────────── */}
        <section className="bg-white border-b border-slate-100 py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-persian-blue-600" />
              <span className="text-sm font-semibold text-persian-blue-600 uppercase tracking-wider">AiTaxBot Blog</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 leading-tight">
              Tax & Finance Insights
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mb-8">
              CA-verified guides on income tax, ITR filing, investments, and the new Income Tax Act 2025 — written for Indian taxpayers.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search articles…"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-persian-blue-300 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Category Filters ──────────────────────────────────────────────── */}
        <section className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const style = CATEGORY_STYLES[cat];
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      active
                        ? "bg-persian-blue-600 text-white border-persian-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-persian-blue-300 hover:text-persian-blue-700"
                    }`}
                  >
                    {cat !== "All" && <span className={active ? "text-white" : ""}>{style.icon}</span>}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 py-10">

          {/* ── Featured Article (always shown when no active search/filter) ── */}
          {selectedCategory === "All" && !searchQuery && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-4 w-4 text-persian-blue-600" />
                <span className="text-sm font-bold text-persian-blue-600 uppercase tracking-wide">Featured Article</span>
              </div>

              <Link href={`/blog/${featuredPost.slug}`}>
                <div className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row">
                  {/* Left colour band */}
                  <div className={`${featuredStyle.banner} md:w-2/5 min-h-[200px] flex flex-col justify-end p-8 relative`}>
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_30%,white,transparent)]" />
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white mb-3 self-start`}>
                      {featuredStyle.icon}
                      {featuredPost.category}
                    </span>
                    <div className="flex gap-3 text-white/80 text-xs">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{featuredPost.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{featuredPost.readTime}</span>
                    </div>
                  </div>

                  {/* Right content */}
                  <div className="p-8 md:w-3/5 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">New</span>
                      <span className="text-xs text-slate-400">{featuredPost.date}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 group-hover:text-persian-blue-600 transition-colors leading-snug mb-4">
                      {featuredPost.title}
                    </h2>
                    <p className="text-slate-500 leading-relaxed mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-persian-blue-600 group-hover:gap-3 transition-all">
                      Read full article <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* ── Results count ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-500">
              {searchQuery
                ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${searchQuery}"`
                : selectedCategory === "All"
                ? `${filtered.length} more articles`
                : `${filtered.length} article${filtered.length !== 1 ? "s" : ""} in ${selectedCategory}`}
            </p>
          </div>

          {/* ── Articles Grid ─────────────────────────────────────────────── */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(post => {
                const style = CATEGORY_STYLES[post.category];
                return (
                  <Link key={post.slug} href={`/blog/${post.slug}`}>
                    <article className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer h-full flex flex-col">

                      {/* Category colour strip */}
                      <div className={`${style.banner} h-2 w-full`} />

                      <div className="p-6 flex flex-col flex-1">
                        {/* Category + New badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.badge}`}>
                            {style.icon}
                            {post.category}
                          </span>
                          {post.isNew && (
                            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">New</span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-persian-blue-600 transition-colors leading-snug mb-3 flex-1">
                          {post.title}
                        </h3>

                        {/* Excerpt */}
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-5">
                          {post.excerpt}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />{post.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />{post.readTime}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-persian-blue-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No articles found.</p>
              <button
                onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
                className="mt-4 text-sm text-persian-blue-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* ── Bottom CTA ────────────────────────────────────────────────── */}
          <div className="mt-16 bg-persian-blue-600 rounded-2xl p-8 md:p-10 text-white text-center">
            <h3 className="text-2xl font-bold mb-2">Have a tax question?</h3>
            <p className="text-persian-blue-100 mb-6 max-w-md mx-auto">
              Ask AiTaxBot and get instant, CA-verified answers on ITR filing, deductions, capital gains, and more.
            </p>
            <Link href="/">
              <button className="bg-white text-persian-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-persian-blue-50 transition-colors inline-flex items-center gap-2">
                Ask AiTaxBot <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { SEO_CONTENT_BY_PATH, type SeoPageContent } from "@shared/seoContent";

const viteLogger = createLogger();

/**
 * Escapes text for safe insertion into HTML. Every string injected below
 * comes from shared/seoContent.ts (static, developer-authored content, not
 * user input) — this is defence in depth, not the primary safety boundary.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/**
 * The AdSense/Googlebot crawler pass — and any bot that doesn't execute
 * client JS — reads exactly this HTML. Before this function existed, every
 * route on the site served the identical shell: same <title>, same 60-word
 * <noscript> block, same canonical (hardcoded to the homepage). A crawler
 * had no way to tell /calculators/hra apart from /contact, which is a
 * textbook "Thin Content" trigger, and the shared canonical told Google
 * every subpage was a duplicate of the homepage not worth indexing.
 *
 * This looks up the requested path in SEO_CONTENT_BY_PATH (shared/seoContent.ts,
 * sourced verbatim from each page's own <Helmet> block and on-page FAQ copy)
 * and, if found:
 *   - swaps <title> / meta description / canonical / OG+Twitter tags for the
 *     real per-route values (removing the one hardcoded canonical link,
 *     replacing it with the route's own)
 *   - inserts a static, server-rendered content block (H1 + intro + FAQ,
 *     ~300-800 words depending on the route) before <div id="root">, plus a
 *     matching FAQPage JSON-LD block
 *
 * The static block is removed by an inline, non-module <script> immediately
 * after it in the markup. Classic inline scripts execute synchronously as
 * the parser reaches them — before the deferred `type="module"` React entry
 * point ever runs — so a JS-enabled browser never shows duplicate content
 * once React mounts its own copy of the same FAQ. A crawler that doesn't
 * execute JS (the actual problem here) sees the full static block, because
 * it never runs the removal script in the first place.
 *
 * Routes with no entry in SEO_CONTENT_BY_PATH (blog posts, /login,
 * /dashboard, admin pages, etc.) are returned unchanged — deliberately out
 * of scope for this pass; see the note in shared/seoContent.ts.
 */
export function injectSeoContent(html: string, pathname: string): string {
  // Normalize: strip trailing slash except for the root path itself.
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  const page: SeoPageContent | undefined = SEO_CONTENT_BY_PATH[normalized];
  if (!page) return html;

  let out = html;

  // <title>
  out = out.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(page.title)}</title>`);

  // meta description
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeAttr(page.description)}">`,
  );

  // canonical — the static template hardcodes this to the homepage; replace
  // it with the route's real canonical rather than appending a second tag.
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeAttr(page.canonical)}" />`,
  );

  // OG / Twitter — same drift risk as canonical if left pointing at the
  // homepage on every subpage, so keep them in sync with the same data.
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeAttr(page.title)}">`,
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeAttr(page.description)}">`,
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeAttr(page.canonical)}">`,
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}">`,
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}">`,
  );

  const faqItemsHtml = page.faqs
    .map(
      (f) =>
        `<div class="seo-faq-item"><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></div>`,
    )
    .join("\n      ");

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const staticBlock = `
    <div id="seo-static-content" style="max-width:960px;margin:0 auto;padding:24px 16px;font-family:system-ui,sans-serif;line-height:1.6;">
      <h1>${escapeHtml(page.h1)}</h1>
      <p>${escapeHtml(page.intro)}</p>
      ${page.faqs.length > 0 ? `<h2>Frequently Asked Questions</h2>\n      ${faqItemsHtml}` : ""}
    </div>
    <script>document.getElementById('seo-static-content')?.remove();</script>
    <script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>
    <!-- Fallback H1 for non-JS crawlers (Semrush, Googlebot with JS disabled) -->`;

  // Insert immediately before the existing generic <noscript> H1 fallback,
  // which stays as-is (it only fires when JS is fully disabled, a narrower
  // case than "bot never executes JS").
  out = out.replace(
    /<!-- Fallback H1 for non-JS crawlers[\s\S]*?-->/,
    staticBlock,
  );

  return out;
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      let page = await vite.transformIndexHtml(url, template);

      // Path-aware static content for the AdSense/Googlebot crawler pass —
      // see injectSeoContent() above. Runs before nonce injection so the
      // <script> tags it adds get the same CSP nonce as everything else.
      const pathname = req.originalUrl.split("?")[0];
      page = injectSeoContent(page, pathname);

      // Inject CSP nonce into inline scripts (dev mode)
      const nonce = res.locals.cspNonce as string | undefined;
      if (nonce) {
        page = injectNonce(page, nonce);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Injects a CSP nonce into all <script> tags (except JSON-LD data blocks)
 * in the given HTML string.
 */
function injectNonce(html: string, nonce: string): string {
  // Match opening <script> tags that are NOT type="application/ld+json"
  // (those are data blocks, not executable scripts — CSP does not restrict them)
  return html.replace(
    /<script\b(?![^>]*\btype=["']application\/ld\+json["'])/gi,
    `<script nonce="${nonce}"`,
  );
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets (JS bundles, CSS, images, etc.) — these have no inline
  // scripts so no nonce injection is needed. `index: false` is required: by
  // default express.static auto-serves distPath/index.html for a request to
  // "/", which would hand the homepage the raw, un-injected template and
  // skip injectSeoContent() entirely — every other route has no matching
  // file on disk so it already fell through to the "*" handler below, but
  // "/" always resolved directly here. Confirmed live: after the first
  // deploy of injectSeoContent(), every route except "/" showed the new
  // per-page content while the homepage still served the old generic shell.
  app.use(express.static(distPath, { index: false }));

  // Cache the HTML template in memory (read once, inject nonce per request).
  let htmlTemplate: string | null = null;
  const indexPath = path.resolve(distPath, "index.html");

  // SPA fallback: serve index.html dynamically so the CSP nonce can be
  // injected into the two inline scripts (GTM config + Clarity snippet), and
  // so route-specific static content can be injected for the AdSense/
  // Googlebot crawler pass — see injectSeoContent() above. This is the path
  // that matters in production: it's what the ad crawler actually reads.
  app.use("*", (req, res) => {
    if (!htmlTemplate) {
      htmlTemplate = fs.readFileSync(indexPath, "utf-8");
    }
    const pathname = req.originalUrl.split("?")[0];
    let html = injectSeoContent(htmlTemplate, pathname);

    const nonce = res.locals.cspNonce as string | undefined;
    if (nonce) {
      html = injectNonce(html, nonce);
    }
    res.set("Content-Type", "text/html").send(html);
  });
}

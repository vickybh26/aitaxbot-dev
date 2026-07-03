import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

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
  // scripts so no nonce injection is needed.
  app.use(express.static(distPath));

  // Cache the HTML template in memory (read once, inject nonce per request).
  let htmlTemplate: string | null = null;
  const indexPath = path.resolve(distPath, "index.html");

  // SPA fallback: serve index.html dynamically so the CSP nonce can be
  // injected into the two inline scripts (GTM config + Clarity snippet).
  app.use("*", (_req, res) => {
    if (!htmlTemplate) {
      htmlTemplate = fs.readFileSync(indexPath, "utf-8");
    }
    const nonce = res.locals.cspNonce as string | undefined;
    const html = nonce ? injectNonce(htmlTemplate, nonce) : htmlTemplate;
    res.set("Content-Type", "text/html").send(html);
  });
}
